#!/usr/bin/env node
// The rules of the dictionary, in one place, enforced identically wherever
// texts live: here, in a website's locales/, and at the call sites that read
// them. Nothing beyond what the architecture defines is checked — a rule that
// is not in the epic is not in this file.
//
// Three modes, because there are three kinds of repository:
//
//   --dictionary  this repo: the namespace catalogues
//   --site        a website: its own locales/, on its own (no install needed,
//                 so a translator's pull request is validated in seconds)
//   --app         a website with its dependencies installed: every key the
//                 code asks for must resolve against bundle + local file
//
// Messages are written for the person who has to fix them, who is usually a
// translator and not a programmer.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// namespace.section.label — camelCase segments, dots only as separators.
export const KEY_RE = /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/
// A language file is named after its language: en.json, fr.json, pt-BR.json.
// What a language tag may look like is BCP 47's business and the platform
// already knows it, so nothing here re-describes the grammar: `Intl` parses the
// tag, canonicalises its spelling and rejects what is not one.
//
// The one rule that is ours is the length. An ISO 639 code is two or three
// letters; BCP 47 also allows five to eight, none of which are assigned, so
// without this `common.json` and `index.json` both read as valid languages.
/** The language a file is named after, canonically spelled, or null. */
export function languageOf(name) {
  let canonical
  try {
    ;[canonical] = Intl.getCanonicalLocales(name)
  } catch {
    return null
  }
  if (!canonical) return null
  return new Intl.Locale(canonical).language.length > 3 ? null : canonical
}
const BASE_LANGUAGE = 'en'

// There is deliberately no rule here about HTML in a text. viewer-core's
// Markdown pipeline escapes raw HTML rather than rendering it, so a tag a
// translator types appears on the page as the characters they typed and can do
// nothing else. Checking for it here bought no safety and cost accuracy: the
// rule was a regular expression, and it rejected `<https://example.org/>`,
// `<office@museumwnf.net>` and `` `<div>` `` — an autolink, an email autolink
// and a code span, all ordinary Markdown — telling the translator to "write
// formatting in Markdown instead", which is what they had done.
//
// Reading the Markdown grammar properly would have needed a parser, which
// means a dependency, which means npm in every translator's pull request: real
// cost, for a rule whose only remaining job was to prevent literal angle
// brackets on a page. The escape is the guarantee. Keep it that way — if this
// rule ever looks necessary again, check viewer-core's `renderBlock` first.

const SOURCE_EXTENSIONS = ['.vue', '.js', '.mjs']

// How a text is asked for is a question about code, so the code is parsed.
// `@vue/compiler-sfc` is the parser the website already builds with — vite
// hands it every one of these files — so this reads them the way the bundler
// does, and needs nothing installed that was not there already. It is resolved
// from the website being checked rather than declared here, which is also what
// keeps `--site` free of it: only this mode ever loads a parser.
//
// It replaced two regular expressions that were wrong in both directions.
// `t(item)` written inside a prose comment was read as a text being asked for,
// and a component's own `const t = (item) => …` could not be told apart from
// the one that looks a text up — both cost real edits during the rollout.
async function loadCompiler(dir) {
  // The website's own copy first, so the code is read by the version that
  // builds it. Ours second, which is what lets these rules be tested here.
  for (const from of [join(dir, 'package.json'), fileURLToPath(import.meta.url)]) {
    try {
      return await import(pathToFileURL(createRequire(from).resolve('@vue/compiler-sfc')).href)
    } catch {
      continue
    }
  }
  return null
}

/** The name a call is made under: `t`, `$t`, `_ctx.$t` — all read as the last part. */
function calleeName(callee) {
  if (callee?.type === 'Identifier') return callee.name
  if (callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
    return callee.property.name
  }
  return null
}

const FUNCTIONS = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
])

/** Whether a `t` bound by this block is the one that looks a text up — null if it binds none. */
function tBoundIn(block) {
  let verdict = null
  for (const statement of block.body ?? []) {
    if (statement.type === 'FunctionDeclaration' && statement.id?.name === 't') verdict = false
    if (statement.type !== 'VariableDeclaration') continue
    for (const declarator of statement.declarations) {
      const id = declarator.id
      const binds =
        (id?.type === 'Identifier' && id.name === 't') ||
        (id?.type === 'ObjectPattern' &&
          id.properties.some((p) => p.value?.name === 't' || p.key?.name === 't'))
      if (!binds) continue
      verdict =
        declarator.init?.type === 'CallExpression' &&
        calleeName(declarator.init.callee) === 'useI18n'
    }
  }
  return verdict
}

/**
 * Every node, carrying what `t` means where it stands.
 *
 * Which is the whole reason this is parsed rather than matched. One real file,
 * `water-in-islam/src/composables/useCollection.js`, uses the name both ways:
 * `export function facetLabels(t)` receives the text lookup as a parameter,
 * while `const t = tr('items', item.id, defaultLang)` further down is a
 * translated record. A rule that reads the file as text has to guess, and
 * either invents nine references or loses them.
 */
function eachNode(node, scope, visit) {
  if (Array.isArray(node)) {
    for (const item of node) eachNode(item, scope, visit)
    return
  }
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return

  // A `t` handed to a function is the lookup being passed down; a block that
  // declares its own says for itself which it is.
  if (FUNCTIONS.has(node.type) && node.params?.some((p) => p.type === 'Identifier' && p.name === 't')) {
    scope = true
  }
  if (node.type === 'Program' || node.type === 'BlockStatement') {
    const own = tBoundIn(node)
    if (own !== null) scope = own
  }

  visit(node, scope)
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue
    eachNode(value, scope, visit)
  }
}

/**
 * Collect the names asked for in one piece of JavaScript.
 *
 * `line` offsets a block back onto the file it came from; a template is
 * compiled before it is read, so its lines are the compiled ones and it
 * reports the file instead.
 */
function collectFromScript(compiler, code, where, { line = 0, detectT = true, i18nT = false, found, namespaces = null }) {
  let ast
  try {
    ast = compiler.babelParse(code, { sourceType: 'module', errorRecovery: true })
  } catch (error) {
    found.unreadable.push(`${where}: ${error.message}`)
    return false
  }
  const at = (node) => (line === null ? where : `${where}:${(node.loc?.start.line ?? 1) + line}`)
  const record = (key, node) => {
    if (!found.references.has(key)) found.references.set(key, at(node))
  }

  // A script says for itself what `t` is at its top level; a compiled template
  // has no declarations of its own and inherits the script's answer.
  eachNode(ast.program, detectT ? false : i18nT, (node, tIsLookup) => {
    if (
      node.type === 'ObjectProperty' &&
      (node.key?.name === 'keypath' || node.key?.value === 'keypath')
    ) {
      if (node.value?.type === 'StringLiteral') record(node.value.value, node)
      else found.dynamic.push(at(node))
      return
    }
    // A name written in a spec — `title: 'carpets.identity.title'` in a
    // dataset.config.js, a label in a catalogue or sheet spec the composed
    // views render — is asked for by the platform, not by a call the
    // website makes. It reads as one when its first part is a section this
    // website receives; any other three-part string is left alone.
    if (
      namespaces &&
      node.type === 'StringLiteral' &&
      KEY_RE.test(node.value) &&
      namespaces.has(node.value.split('.')[0])
    ) {
      record(node.value, node)
      return
    }
    if (node.type !== 'CallExpression') return
    const name = calleeName(node.callee)
    if (name !== 't' && name !== '$t') return
    // A bare `t` counts only where `t` is the lookup. `$t` is the global one,
    // so it counts wherever it appears.
    if (name === 't' && !tIsLookup) return
    const [first] = node.arguments
    if (first?.type === 'StringLiteral') record(first.value, node)
    else found.dynamic.push(at(node))
  })

  return tBoundIn(ast.program) === true
}

// ── helpers ────────────────────────────────────────────────────────────────

function readJson(file, problems, label) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    problems.push(`The file **${label}** could not be read.`)
    return null
  }
  try {
    const value = JSON.parse(text)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      problems.push(`The file **${label}** must contain a list of entries between { and }.`)
      return null
    }
    return value
  } catch (error) {
    problems.push(
      `The file **${label}** is not valid JSON, so it cannot be used. This is usually ` +
        `a missing or extra comma, quote or brace. Technical detail: ${error.message}`
    )
    return null
  }
}

function languageFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
}

/**
 * Everything that is true of one language file, whatever repository it is in.
 * `namespaces` is the set of prefixes this file is allowed to use.
 */
function checkEntries(label, data, namespaces, problems) {
  const seen = new Map()
  for (const [key, value] of Object.entries(data)) {
    if (!KEY_RE.test(key)) {
      problems.push(
        `In **${label}**, \`${key}\` is not a valid entry name. A name is made of three ` +
          `parts separated by dots — section.group.name — each starting with a lowercase ` +
          `letter, for example \`gallery.sheet.inventoryNumber\`.`
      )
      continue
    }
    const namespace = key.slice(0, key.indexOf('.'))
    if (!namespaces.includes(namespace)) {
      problems.push(
        `In **${label}**, \`${key}\` starts with \`${namespace}\`, which this file may not ` +
          `use. Allowed here: ${namespaces.map((n) => `\`${n}\``).join(', ')}.`
      )
      continue
    }
    const lower = key.toLowerCase()
    if (seen.has(lower) && seen.get(lower) !== key) {
      problems.push(
        `In **${label}**, \`${key}\` and \`${seen.get(lower)}\` differ only in capitalisation. ` +
          `Entry names must differ by more than their capitals.`
      )
    }
    seen.set(lower, key)

    if (typeof value !== 'string') {
      problems.push(`In **${label}**, the text for \`${key}\` must be written between quotes.`)
      continue
    }
    if (value.trim() === '') {
      problems.push(
        `In **${label}**, the text for \`${key}\` is empty. Remove the whole line instead — ` +
          `an entry with no text hides the English one rather than falling back to it.`
      )
    }
    if (/[{}]/.test(value)) {
      problems.push(
        `In **${label}**, the text for \`${key}\` contains a curly brace. Texts are complete ` +
          `on their own: nothing is inserted into them, so { and } have no meaning here.`
      )
    }
  }
}

/** A language file may not invent an entry the English file does not have. */
function checkAgainstBase(label, data, base, baseLabel, problems) {
  const extra = Object.keys(data).filter((key) => !(key in base))
  if (extra.length) {
    problems.push(
      `The file **${label}** contains entries that do not exist in **${baseLabel}**: ` +
        `${extra.map((k) => `\`${k}\``).join(', ')}. Remove them, or check the spelling — ` +
        `English is where an entry is created.`
    )
  }
}

function coverage(name, data, base) {
  const translated = Object.keys(base).filter((key) => key in data).length
  const total = Object.keys(base).length
  const percent = total === 0 ? 100 : Math.round((translated / total) * 100)
  return `${name}: ${translated}/${total} (${percent}%)`
}

// ── the registry ───────────────────────────────────────────────────────────

/**
 * The dictionary's own namespaces.json when checking the dictionary; the
 * installed package's copy otherwise. This file ships with the package, so a
 * website never has to carry a second copy of the registry.
 */
export function loadRegistry(dir) {
  const local = join(dir, 'namespaces.json')
  const file = existsSync(local)
    ? local
    : fileURLToPath(new URL('../namespaces.json', import.meta.url))
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** How a website declares what it is. Read from its package.json. */
export function siteDeclaration(dir, registry, problems) {
  const pkgFile = join(dir, 'package.json')
  const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')) : {}
  const declared = pkg.viewerI18n
  if (!declared?.class || !declared?.namespace) {
    problems.push(
      'This website does not say which texts it receives. Add to **package.json**:\n' +
        '  "viewerI18n": { "class": "gallery", "namespace": "carpets" }\n' +
        `  class is one of: ${Object.keys(registry.bundles).join(', ')}`
    )
    return null
  }
  const received = registry.bundles[declared.class]
  if (!received) {
    problems.push(
      `In **package.json**, "viewerI18n.class" is \`${declared.class}\`, which is not a ` +
        `kind of website. Use one of: ${Object.keys(registry.bundles).join(', ')}.`
    )
    return null
  }
  if (!/^[a-z][a-zA-Z0-9]*$/.test(declared.namespace)) {
    problems.push(
      `In **package.json**, "viewerI18n.namespace" is \`${declared.namespace}\`. It must be ` +
        'a single word starting with a lowercase letter, for example `carpets`.'
    )
    return null
  }
  if (registry.namespaces.includes(declared.namespace)) {
    problems.push(
      `In **package.json**, "viewerI18n.namespace" is \`${declared.namespace}\`, which is a ` +
        'shared section name. A website needs a name of its own.'
    )
    return null
  }
  return { ...declared, received, allowed: [...received, declared.namespace] }
}

// ── modes ──────────────────────────────────────────────────────────────────

/**
 * The languages a bundle's websites offer, as declared in `namespaces.json`
 * under `languages`: every section the bundle contains must exist, complete,
 * in each of them. Not declared means not required, which is how the rule
 * stays optional for a fixture and mandatory for the real dictionary.
 */
function requiredLanguages(registry, bundle) {
  const declared = registry.languages?.[bundle]
  return Array.isArray(declared) ? declared : []
}

/** The entries of `base` that `data` lacks — what a translator has to add. */
function missingEntries(data, base) {
  return Object.keys(base).filter((key) => !(key in data))
}

export function checkDictionary(dir) {
  const problems = []
  const notes = []
  const registry = loadRegistry(dir)
  const catalogues = {}

  for (const namespace of registry.namespaces) {
    const nsDir = join(dir, namespace)
    if (!existsSync(nsDir) || !statSync(nsDir).isDirectory()) {
      problems.push(`The folder **${namespace}/** is declared in namespaces.json but missing.`)
      continue
    }
    const files = languageFiles(nsDir)
    const parsed = {}
    for (const file of files) {
      const language = file.slice(0, -'.json'.length)
      const label = `${namespace}/${file}`
      const canonical = languageOf(language)
      if (canonical === null) {
        problems.push(
          `**${label}** is not named after a language. Use the two-letter code, ` +
            'for example `fr.json`.'
        )
        continue
      }
      if (canonical !== language) {
        problems.push(
          `**${label}** should be named \`${canonical}.json\`. A language is spelled one ` +
            'way, so that two files cannot both claim it with only the filesystem ' +
            'deciding which one a reader gets.'
        )
        continue
      }
      const data = readJson(join(nsDir, file), problems, label)
      if (!data) continue
      checkEntries(label, data, [namespace], problems)
      parsed[language] = data
    }

    const base = parsed[BASE_LANGUAGE]
    if (!base) {
      problems.push(
        `**${namespace}/${BASE_LANGUAGE}.json** is missing. English is where every entry is ` +
          'created; the other languages are compared against it.'
      )
      continue
    }
    for (const [language, data] of Object.entries(parsed)) {
      if (language === BASE_LANGUAGE) continue
      checkAgainstBase(`${namespace}/${language}.json`, data, base, `${namespace}/en.json`, problems)
      notes.push(coverage(`${namespace}/${language}`, data, base))
    }
    notes.push(`${namespace}: ${Object.keys(base).length} entries in English`)
    catalogues[namespace] = parsed
  }

  for (const bundle of Object.keys(registry.bundles)) {
    const unknown = registry.bundles[bundle].filter((n) => !registry.namespaces.includes(n))
    if (unknown.length) {
      problems.push(
        `In **namespaces.json**, the \`${bundle}\` bundle lists unknown sections: ` +
          unknown.join(', ')
      )
    }

    // A website offers the languages its data package declares, and a visitor
    // who picks one reads the whole page in it — the records from the package,
    // the chrome from here. A section that has no file for that language, or
    // an incomplete one, shows that visitor English labels between records in
    // their language. So a bundle names the languages its websites offer, and
    // every section it contains has to be complete in each of them. The
    // shared sections are in every bundle, so they need the union.
    for (const language of requiredLanguages(registry, bundle)) {
      for (const namespace of registry.bundles[bundle]) {
        const parsed = catalogues[namespace]
        if (!parsed?.[BASE_LANGUAGE]) continue
        const data = parsed[language]
        if (!data) {
          problems.push(
            `**${namespace}/${language}.json** is missing. The \`${bundle}\` websites offer ` +
              `\`${language}\`, so every section they receive has to exist in it — copy ` +
              `${namespace}/en.json and translate it.`
          )
          continue
        }
        const missing = missingEntries(data, parsed[BASE_LANGUAGE])
        if (missing.length) {
          const shown = missing.slice(0, 8).map((k) => `\`${k}\``).join(', ')
          problems.push(
            `**${namespace}/${language}.json** is missing ${missing.length} entr` +
              `${missing.length === 1 ? 'y' : 'ies'} that ${namespace}/en.json has: ${shown}` +
              `${missing.length > 8 ? ', …' : ''}. The \`${bundle}\` websites offer ` +
              `\`${language}\`, so this section has to be complete in it.`
          )
        }
      }
    }
  }

  return { problems, notes }
}

export function checkSite(dir) {
  const problems = []
  const notes = []
  const registry = loadRegistry(dir)
  const site = siteDeclaration(dir, registry, problems)
  const localesDir = join(dir, 'locales')

  if (!existsSync(localesDir)) {
    problems.push('This website has no **locales/** folder, so it has no texts of its own.')
    return { problems, notes }
  }
  if (!site) return { problems, notes }

  const parsed = {}
  for (const file of languageFiles(localesDir)) {
    const language = file.slice(0, -'.json'.length)
    const label = `locales/${file}`
    const canonical = languageOf(language)
    if (canonical === null) {
      problems.push(
        `**${label}** is not named after a language. Use the two-letter code, ` +
          'for example `fr.json`.'
      )
      continue
    }
    if (canonical !== language) {
      problems.push(
        `**${label}** should be named \`${canonical}.json\`. A language is spelled one ` +
          'way, so that two files cannot both claim it with only the filesystem ' +
          'deciding which one a reader gets.'
      )
      continue
    }
    const data = readJson(join(localesDir, file), problems, label)
    if (!data) continue
    checkEntries(label, data, site.allowed, problems)
    parsed[language] = data
  }

  const base = parsed[BASE_LANGUAGE]
  if (!base) {
    problems.push(
      `**locales/${BASE_LANGUAGE}.json** is missing. English is where every entry of this ` +
        'website is created; the other languages are compared against it.'
    )
    return { problems, notes }
  }
  for (const [language, data] of Object.entries(parsed)) {
    if (language === BASE_LANGUAGE) continue
    checkAgainstBase(`locales/${language}.json`, data, base, 'locales/en.json', problems)
    notes.push(coverage(`locales/${language}`, data, base))
  }
  notes.push(
    `receives ${site.received.join(' + ')}; own entries: ${Object.keys(base).length} in English`
  )
  return { problems, notes }
}

function sourceFiles(dir) {
  const found = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) found.push(full)
    }
  }
  if (existsSync(dir)) walk(dir)
  return found.sort()
}

/** Every key the code asks for, and every place it asks with something else. */
export async function scanSources(dir, compiler, { namespaces = null } = {}) {
  const found = { references: new Map(), dynamic: [], unreadable: [] }
  const parser = compiler ?? (await loadCompiler(dir))
  if (!parser) {
    found.unreadable.push('no parser')
    return found
  }

  for (const file of sourceFiles(join(dir, 'src'))) {
    const text = readFileSync(file, 'utf8')
    const where = relative(dir, file).replaceAll('\\', '/')

    if (!file.endsWith('.vue')) {
      collectFromScript(parser, text, where, { found, namespaces })
      continue
    }

    const { descriptor, errors } = parser.parse(text, { filename: where })
    if (errors.length) {
      found.unreadable.push(`${where}: ${errors[0].message}`)
      continue
    }

    // The script first: whether the template's `t` is the i18n one is decided
    // by what the script bound it to.
    let i18nT = false
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (!block) continue
      const line = (block.loc?.start.line ?? 1) - 1
      i18nT = collectFromScript(parser, block.content, where, { line, found, namespaces }) || i18nT
    }

    if (!descriptor.template) continue
    const compiled = parser.compileTemplate({
      source: descriptor.template.content,
      filename: where,
      id: where,
    })
    if (compiled.errors.length) {
      found.unreadable.push(`${where}: ${compiled.errors[0].message ?? compiled.errors[0]}`)
      continue
    }
    collectFromScript(parser, compiled.code, where, { line: null, detectT: false, i18nT, found, namespaces })
  }

  return found
}

/**
 * The languages a website offers: what its data package's `manifest.site.languages`
 * declares — the same list viewer-core's `offeredLanguages()` reads — or the
 * `--languages` option when the check is asked about a different set. A
 * website has one data package, so the first `@metanull/*-data` found is it.
 */
export function offeredLanguages(dir, override) {
  if (override) return { languages: override, from: 'the --languages option' }
  const scope = join(dir, 'node_modules', '@metanull')
  if (!existsSync(scope)) return null
  for (const name of readdirSync(scope).sort()) {
    if (!name.endsWith('-data')) continue
    const manifest = join(scope, name, 'manifest.json')
    if (!existsSync(manifest)) continue
    let declared
    try {
      declared = JSON.parse(readFileSync(manifest, 'utf8'))?.site?.languages
    } catch {
      continue
    }
    if (!Array.isArray(declared)) continue
    const languages = declared
      .map((entry) => (typeof entry === 'string' ? entry : entry?.code))
      .filter(Boolean)
    return { languages, from: `@metanull/${name}` }
  }
  return null
}

export async function checkApp(dir, { languages: override } = {}) {
  const problems = []
  const notes = []
  const registry = loadRegistry(dir)
  const site = siteDeclaration(dir, registry, problems)
  if (!site) return { problems, notes }

  const bundleDir = join(dir, 'node_modules', '@metanull', 'viewer-i18n', 'dist', site.class)
  const bundleFile = join(bundleDir, `${BASE_LANGUAGE}.json`)
  if (!existsSync(bundleFile)) {
    problems.push(
      `The shared texts are not installed, so the entries this website uses cannot be ` +
        `checked. Run \`npm install\` first (looked for ${relative(dir, bundleFile)}).`
    )
    return { problems, notes }
  }
  const shared = readJson(bundleFile, problems, 'the shared texts')
  const localFile = join(dir, 'locales', `${BASE_LANGUAGE}.json`)
  const local = existsSync(localFile) ? readJson(localFile, problems, 'locales/en.json') : {}
  if (!shared || !local) return { problems, notes }
  const effective = { ...shared, ...local }

  // The languages the website offers are the languages a visitor can pick,
  // and each of them has to reach the shared texts as well as the records.
  // This is checked against what is installed — the bundle as delivered —
  // rather than against a promise in the registry.
  const offered = offeredLanguages(dir, override)
  if (offered) {
    const withoutLocal = []
    for (const language of offered.languages) {
      if (language === BASE_LANGUAGE) continue
      const file = join(bundleDir, `${language}.json`)
      const translated = existsSync(file) ? readJson(file, problems, `the shared texts in ${language}`) : null
      if (!translated) {
        problems.push(
          `This website offers **${language}** (declared by ${offered.from}), but the shared ` +
            `texts have no ${language} at all: a visitor choosing it would read every label, ` +
            `button and heading in English. The dictionary's \`${site.class}\` languages ` +
            `have to include \`${language}\`.`
        )
        continue
      }
      const missing = missingEntries(translated, shared)
      if (missing.length) {
        problems.push(
          `This website offers **${language}** (declared by ${offered.from}), but the shared ` +
            `texts in ${language} lack ${missing.length} of their ${Object.keys(shared).length} ` +
            `entries, which would show in English. The dictionary has to complete them.`
        )
      }
      if (!existsSync(join(dir, 'locales', `${language}.json`))) withoutLocal.push(language)
    }
    notes.push(`offers ${offered.languages.join(', ')} (from ${offered.from})`)
    if (withoutLocal.length) {
      notes.push(
        `own entries have no file for ${withoutLocal.join(', ')}: those show in English`
      )
    }
  } else {
    notes.push('no data package installed, so the offered languages were not checked')
  }

  const { references, dynamic, unreadable } = await scanSources(dir, undefined, {
    namespaces: new Set(site.allowed),
  })
  if (unreadable.includes('no parser')) {
    problems.push(
      'The website\'s own Vue compiler could not be found, so its code cannot be read. ' +
        'Run `npm install` first — this check reads the sources with the same parser the ' +
        'website builds with, and takes it from this directory.'
    )
    return { problems, notes }
  }
  for (const where of unreadable) {
    problems.push(
      `The file ${where} could not be parsed, so the texts it asks for cannot be checked.`
    )
  }
  for (const where of dynamic) {
    problems.push(
      `At ${where}, a text is asked for with something other than a written-out name. ` +
        'Every name must be spelled out where it is used, so that the checks below can ' +
        'see it — map the value to a name explicitly instead.'
    )
  }
  for (const [key, where] of references) {
    if (!KEY_RE.test(key)) {
      problems.push(
        `At ${where}, \`${key}\` is not a valid entry name (three dot-separated parts, ` +
          'each starting with a lowercase letter).'
      )
    } else if (!(key in effective)) {
      problems.push(
        `At ${where}, \`${key}\` does not exist. Add it to **locales/en.json** if it belongs ` +
          'to this website, or to the shared dictionary if every website of this kind needs it.'
      )
    }
  }

  const unused = Object.keys(local).filter((key) => !references.has(key))
  if (unused.length) {
    notes.push(`unused entries in locales/en.json: ${unused.join(', ')}`)
  }
  notes.push(`${references.size} entries used; ${Object.keys(effective).length} available`)
  return { problems, notes }
}

// ── CLI ────────────────────────────────────────────────────────────────────

const MODES = { '--dictionary': checkDictionary, '--site': checkSite, '--app': checkApp }

/** The pull-request comment a translator reads instead of a build log. */
export function report(problems) {
  return [
    '<!-- locale-validate -->',
    'Thank you for the text update! The automatic check found a few things to fix before ' +
      'it can be merged:',
    '',
    ...problems.map((problem) => `- ${problem}`),
    '',
    'Once you push a fix, the check runs again automatically. No further action is needed ' +
      'after it turns green.',
  ].join('\n')
}

export async function main(argv, { writeReport } = {}) {
  const mode = argv.find((arg) => arg in MODES)
  if (!mode) {
    console.error(
      'Usage: viewer-i18n-check --dictionary|--site|--app [directory] [--languages ar,en,…]'
    )
    return 2
  }
  // `--languages` asks --app about a set other than the data package's — a
  // website about to offer a language, or a check with no package installed.
  const options = {}
  const at = argv.indexOf('--languages')
  if (at !== -1) {
    options.languages = (argv[at + 1] ?? '').split(',').map((l) => l.trim()).filter(Boolean)
    argv = argv.filter((_, i) => i !== at && i !== at + 1)
  }
  const dir = resolve(argv[argv.indexOf(mode) + 1] ?? '.')
  const { problems, notes } = await MODES[mode](dir, options)

  for (const note of notes) console.log(`  ${note}`)
  if (!problems.length) {
    console.log('All texts are valid.')
    return 0
  }
  console.error(`\n${problems.length} problem(s) found:`)
  for (const problem of problems) console.error(`- ${problem}`)
  writeReport?.(report(problems))
  return 1
}

/**
 * Whether this file is the program, as opposed to a module someone imported.
 *
 * Both sides are resolved through their symlinks, which is the whole point: npm
 * installs a `bin` on Linux as a symlink in `node_modules/.bin`, so `argv[1]` is
 * that link and not this file. Comparing the paths as written made the test
 * false in exactly the place it mattered — `npx viewer-i18n-check` in CI ran,
 * printed nothing, exited 0, and reported a green blocking check that had
 * checked nothing. On Windows npm writes a shim that passes the real path
 * instead, which is why it worked everywhere it was tried by hand.
 */
function invokedAsProgram() {
  if (!process.argv[1]) return false
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (invokedAsProgram()) {
  const { writeFileSync } = await import('node:fs')
  process.exit(
    await main(process.argv.slice(2), {
      writeReport: (body) => writeFileSync('locale-problems.md', body),
    })
  )
}
