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
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// namespace.section.label — camelCase segments, dots only as separators.
export const KEY_RE = /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/
// A language file is named after its language: en.json, fr.json, pt-BR.json.
export const LANG_RE = /^[a-z]{2,3}(-[A-Za-z]{2,8})*$/
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
// `t('key')`, `$t('key')` — never preceded by an identifier character, so
// `split(`, `format(` and friends do not match.
const CALL_RE = /(?<![\w$.])\$?t\(\s*(?:(['"])([^'"]*)\1)?/g
const KEYPATH_RE = /\bkeypath\s*=\s*"(?:'([^']*)'|([^"]*))"/g

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

export function checkDictionary(dir) {
  const problems = []
  const notes = []
  const registry = loadRegistry(dir)

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
      if (!LANG_RE.test(language)) {
        problems.push(
          `**${label}** is not named after a language. Use the two-letter code, ` +
            'for example `fr.json`.'
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
  }

  for (const bundle of Object.keys(registry.bundles)) {
    const unknown = registry.bundles[bundle].filter((n) => !registry.namespaces.includes(n))
    if (unknown.length) {
      problems.push(
        `In **namespaces.json**, the \`${bundle}\` bundle lists unknown sections: ` +
          unknown.join(', ')
      )
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
    if (!LANG_RE.test(language)) {
      problems.push(
        `**${label}** is not named after a language. Use the two-letter code, ` +
          'for example `fr.json`.'
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
export function scanSources(dir) {
  const references = new Map()
  const dynamic = []
  for (const file of sourceFiles(join(dir, 'src'))) {
    const text = readFileSync(file, 'utf8')
    const where = relative(dir, file).replaceAll('\\', '/')
    const lineOf = (index) => text.slice(0, index).split('\n').length

    for (const match of text.matchAll(CALL_RE)) {
      const key = match[2]
      if (key === undefined) dynamic.push(`${where}:${lineOf(match.index)}`)
      else if (!references.has(key)) references.set(key, `${where}:${lineOf(match.index)}`)
    }
    for (const match of text.matchAll(KEYPATH_RE)) {
      const key = match[1] ?? match[2]
      if (!references.has(key)) references.set(key, `${where}:${lineOf(match.index)}`)
    }
  }
  return { references, dynamic }
}

export function checkApp(dir) {
  const problems = []
  const notes = []
  const registry = loadRegistry(dir)
  const site = siteDeclaration(dir, registry, problems)
  if (!site) return { problems, notes }

  const bundleFile = join(
    dir, 'node_modules', '@metanull', 'viewer-i18n', 'dist', site.class, `${BASE_LANGUAGE}.json`
  )
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

  const { references, dynamic } = scanSources(dir)
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

export function main(argv, { writeReport } = {}) {
  const mode = argv.find((arg) => arg in MODES)
  if (!mode) {
    console.error('Usage: viewer-i18n-check --dictionary|--site|--app [directory]')
    return 2
  }
  const dir = resolve(argv[argv.indexOf(mode) + 1] ?? '.')
  const { problems, notes } = MODES[mode](dir)

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
    main(process.argv.slice(2), {
      writeReport: (body) => writeFileSync('locale-problems.md', body),
    })
  )
}
