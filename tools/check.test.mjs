// The checks are the only thing standing between a translator's edit and a
// live website, so each rule the architecture states is pinned by a test that
// fails when the rule stops being enforced.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'

import {
  KEY_RE, checkApp, checkDictionary, checkSite, languageOf, offeredLanguages, scanSources,
} from './check.mjs'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = []

function scratch(files) {
  const dir = mkdtempSync(join(tmpdir(), 'viewer-i18n-'))
  temporary.push(dir)
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content), 'utf8')
  }
  return dir
}

after(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true })
})

const registry = {
  namespaces: ['core', 'layout', 'gallery', 'exhibition'],
  bundles: { standalone: ['core', 'layout'], gallery: ['core', 'layout', 'gallery'] },
}

/** A dictionary that is valid, so a test can break exactly one thing in it. */
function dictionary(overrides = {}) {
  return scratch({
    'namespaces.json': registry,
    'core/en.json': { 'core.nav.home': 'Home' },
    'layout/en.json': { 'layout.nav.label': 'Main navigation' },
    'gallery/en.json': { 'gallery.sheet.name': 'Name of Object:' },
    'exhibition/en.json': { 'exhibition.nav.introduction': 'Introduction' },
    ...overrides,
  })
}

const messagesOf = (result) => result.problems.join('\n')

describe('the entry-name grammar', () => {
  it('accepts three camelCase parts', () => {
    assert.ok(KEY_RE.test('gallery.sheet.inventoryNumber'))
    assert.ok(KEY_RE.test('core.nav.home'))
  })

  it('rejects anything else', () => {
    for (const key of ['gallery.name', 'a.b.c.d', 'Gallery.sheet.name', 'gallery..name', '']) {
      assert.ok(!KEY_RE.test(key), `${key} should be rejected`)
    }
  })
})

describe('the name of a language file', () => {
  it('accepts a language, and says how it is spelled', () => {
    assert.equal(languageOf('en'), 'en')
    assert.equal(languageOf('pt-BR'), 'pt-BR')
    // One spelling per language, so two files cannot both claim it and leave
    // the filesystem to decide which one a reader gets.
    assert.equal(languageOf('pt-br'), 'pt-BR')
    assert.equal(languageOf('EN'), 'en')
  })

  it('rejects what is not a language tag', () => {
    for (const name of ['e', 'zz9', 'en_US', '']) {
      assert.equal(languageOf(name), null, `${name} should be rejected`)
    }
  })

  it('rejects a word that BCP 47 would accept as a language', () => {
    // `Intl` reads both of these as valid tags — the grammar allows a five to
    // eight letter primary subtag, though none are assigned. This is the only
    // part of the rule that is ours rather than the standard's.
    assert.equal(languageOf('common'), null)
    assert.equal(languageOf('index'), null)
  })
})

describe('the dictionary', () => {
  it('accepts the real catalogues of this repository', () => {
    const { problems } = checkDictionary(repo)
    assert.deepEqual(problems, [])
  })

  it('accepts a valid fixture', () => {
    assert.deepEqual(checkDictionary(dictionary()).problems, [])
  })

  it('rejects an entry whose name does not follow the grammar', () => {
    const result = checkDictionary(dictionary({ 'core/en.json': { 'core.home': 'Home' } }))
    assert.match(messagesOf(result), /is not a valid entry name/)
  })

  it('rejects an entry filed under the wrong section', () => {
    const result = checkDictionary(dictionary({ 'core/en.json': { 'layout.nav.home': 'Home' } }))
    assert.match(messagesOf(result), /which this file may not use/)
  })

  it('rejects two entries differing only in capitalisation', () => {
    const result = checkDictionary(
      dictionary({
        'gallery/en.json': {
          'gallery.sheet.inventoryNumber': 'Museum Inventory Number:',
          'gallery.sheet.inventorynumber': 'Museum Inventory Number:',
        },
      })
    )
    assert.match(messagesOf(result), /differ only in capitalisation/)
  })

  it('rejects an empty text, which would hide the English one', () => {
    const result = checkDictionary(dictionary({ 'core/en.json': { 'core.nav.home': '  ' } }))
    assert.match(messagesOf(result), /is empty/)
  })

  it('says nothing about angle brackets, whatever they turn out to be', () => {
    // Not an oversight, and not a rule waiting to be written: viewer-core's
    // Markdown pipeline escapes raw HTML, pinned by its own test "escapes raw
    // HTML instead of rendering it". A tag typed here reaches the page as the
    // characters that were typed. Judging which of these is a tag, an autolink
    // or arithmetic is a job for a Markdown parser, and a parser here would put
    // an npm install in front of every translator for no safety at all.
    for (const text of [
      '<b>Home</b>',
      'The operators < and > rank results.',
      'See <https://example.org/>.',
      'Write to <office@museumwnf.net>.',
    ]) {
      const result = checkDictionary(dictionary({ 'core/en.json': { 'core.nav.home': text } }))
      assert.deepEqual(result.problems, [], `${text} should be accepted`)
    }
  })

  it('rejects a placeholder, because nothing is inserted into a text', () => {
    const result = checkDictionary(
      dictionary({ 'core/en.json': { 'core.nav.home': 'Page {page}' } })
    )
    assert.match(messagesOf(result), /contains a curly brace/)
  })

  it('requires English', () => {
    const dir = dictionary()
    rmSync(join(dir, 'core', 'en.json'))
    writeFileSync(join(dir, 'core', 'fr.json'), JSON.stringify({ 'core.nav.home': 'Accueil' }))
    assert.match(messagesOf(checkDictionary(dir)), /core\/en\.json\*\* is missing/)
  })

  it('rejects an entry a translation invents', () => {
    const result = checkDictionary(
      dictionary({ 'core/fr.json': { 'core.nav.away': 'Ailleurs' } })
    )
    assert.match(messagesOf(result), /do not exist in/)
  })

  it('does not require a translation to be complete', () => {
    const result = checkDictionary(
      dictionary({
        'core/en.json': { 'core.nav.home': 'Home', 'core.nav.back': 'Back' },
        'core/fr.json': { 'core.nav.home': 'Accueil' },
      })
    )
    assert.deepEqual(result.problems, [])
    assert.ok(result.notes.some((note) => note.includes('core/fr: 1/2')))
  })

  // A website offers the languages its data package declares, and a visitor
  // who picks one reads the whole page in it. Islamic Art declares ten; every
  // site shipped English chrome in all of them until the dictionary carried
  // the languages too. This is the rule that keeps it carrying them.
  describe('the languages a bundle promises', () => {
    const promising = { ...registry, languages: { gallery: ['en', 'fr'] } }

    it('requires every section of the bundle to exist in each of them', () => {
      const result = checkDictionary(dictionary({ 'namespaces.json': promising }))
      const messages = messagesOf(result)
      assert.match(messages, /\*\*core\/fr\.json\*\* is missing/)
      assert.match(messages, /\*\*gallery\/fr\.json\*\* is missing/)
      // exhibition is not in the gallery bundle, so nothing is asked of it.
      assert.doesNotMatch(messages, /exhibition\/fr/)
    })

    it('requires each of those files to be complete', () => {
      const result = checkDictionary(
        dictionary({
          'namespaces.json': { ...promising, bundles: { gallery: ['core'] } },
          'core/en.json': { 'core.nav.home': 'Home', 'core.nav.back': 'Back' },
          'core/fr.json': { 'core.nav.home': 'Accueil' },
        })
      )
      assert.match(messagesOf(result), /core\/fr\.json\*\* is missing 1 entry .*`core\.nav\.back`/)
    })

    it('is satisfied by complete files, and asks nothing of a bundle that promises none', () => {
      const result = checkDictionary(
        dictionary({
          'namespaces.json': { ...promising, bundles: { gallery: ['core'], standalone: ['core'] } },
          'core/fr.json': { 'core.nav.home': 'Accueil' },
        })
      )
      assert.deepEqual(result.problems, [])
    })
  })
})

describe('a website', () => {
  const site = (overrides = {}) =>
    scratch({
      'package.json': { name: 'carpets', viewerI18n: { class: 'gallery', namespace: 'carpets' } },
      'locales/en.json': { 'carpets.identity.title': 'Discover Carpet Art' },
      ...overrides,
    })

  it('may name its own entries and overload received ones', () => {
    const dir = site({
      'locales/en.json': {
        'carpets.identity.title': 'Discover Carpet Art',
        'gallery.sheet.name': 'Name of Carpet:',
      },
    })
    assert.deepEqual(checkSite(dir).problems, [])
  })

  it('may not write into a section it does not receive', () => {
    const dir = site({ 'locales/en.json': { 'exhibition.nav.introduction': 'Introduction' } })
    assert.match(messagesOf(checkSite(dir)), /which this file may not use/)
  })

  it('must say which texts it receives', () => {
    const dir = site({ 'package.json': { name: 'carpets' } })
    assert.match(messagesOf(checkSite(dir)), /does not say which texts it receives/)
  })

  it('may not claim a shared section as its own name', () => {
    const dir = site({
      'package.json': { name: 'x', viewerI18n: { class: 'gallery', namespace: 'gallery' } },
    })
    assert.match(messagesOf(checkSite(dir)), /is a shared section name/)
  })
})

describe('the call sites', () => {
  /** A component whose `t` is the one that looks a text up. */
  const withI18n = (body) =>
    `<script setup>import { useI18n } from '@metanull/viewer-core'\nconst { t } = useI18n()\n${body}</script>`

  it('finds every way a text is asked for, and ignores lookalikes', async () => {
    const dir = scratch({
      'src/A.vue': `<template><p>{{ $t('core.nav.home') }}</p>
        <I18nText keypath="gallery.about.body" /></template>
        ${withI18n("const x = t('gallery.sheet.name'); const y = list.split(',')")}`,
    })
    const { references, dynamic } = await scanSources(dir)
    assert.deepEqual(
      [...references.keys()].sort(),
      ['core.nav.home', 'gallery.about.body', 'gallery.sheet.name']
    )
    assert.deepEqual(dynamic, [])
  })

  it('reads a bound keypath as well as a written one', async () => {
    const dir = scratch({
      'src/A.vue': `<template><I18nText :keypath="'gallery.about.body'" /></template>`,
    })
    assert.deepEqual([...(await scanSources(dir)).references.keys()], ['gallery.about.body'])
  })

  it('reports a text asked for with a value rather than a name', async () => {
    const dir = scratch({ 'src/A.vue': withI18n('const label = t(key)') })
    assert.equal((await scanSources(dir)).dynamic.length, 1)
  })

  it('does not read a component\'s own t() as a text being asked for', async () => {
    // This is why the rule is parsed rather than matched. `t` here is a local
    // helper — a real component had one, and the regular expression reported
    // every call to it as a text asked for by value.
    const dir = scratch({
      'src/A.vue': "<script setup>const t = (item) => item.title ?? item.name\nconst a = t(first)</script>",
    })
    const { references, dynamic } = await scanSources(dir)
    assert.deepEqual([...references.keys()], [])
    assert.deepEqual(dynamic, [])
  })

  it('follows the lookup into a function it is handed to', async () => {
    // `water-in-islam/src/composables/useCollection.js` uses the name both
    // ways in one file: the lookup arrives as a parameter here, and thirty
    // lines further down `const t = tr('items', …)` is a translated record.
    // Reading the file as text has to guess, and guessing either way costs
    // nine references.
    const dir = scratch({
      'src/facets.js': [
        "export function facetLabels(t) {",
        "  return { type: t('exhibition.facet.type') }",
        '}',
        'function labelOf(item, defaultLang) {',
        "  const t = tr('items', item.id, defaultLang)",
        '  return t(item)',
        '}',
      ].join('\n'),
    })
    const { references, dynamic } = await scanSources(dir)
    assert.deepEqual([...references.keys()], ['exhibition.facet.type'])
    assert.deepEqual(dynamic, [])
  })

  it('does not read a name written in a comment as a call', async () => {
    // Also from the rollout: a comment explaining the rule tripped the rule.
    const dir = scratch({
      'src/A.vue': withI18n("// passing the item to t(item) would read as a lookup\nconst a = 1"),
    })
    const { references, dynamic } = await scanSources(dir)
    assert.deepEqual([...references.keys()], [])
    assert.deepEqual(dynamic, [])
  })

  it('rejects a name the website cannot resolve', async () => {
    const dir = scratch({
      'package.json': { name: 'carpets', viewerI18n: { class: 'gallery', namespace: 'carpets' } },
      'locales/en.json': {},
      'src/A.vue': withI18n("const a = t('gallery.sheet.missing')"),
      'node_modules/@metanull/viewer-i18n/dist/gallery/en.json': { 'gallery.sheet.name': 'Name:' },
    })
    assert.match(messagesOf(await checkApp(dir)), /does not exist/)
  })

  it('accepts a name that comes from the shared texts', async () => {
    const dir = scratch({
      'package.json': { name: 'carpets', viewerI18n: { class: 'gallery', namespace: 'carpets' } },
      'locales/en.json': { 'carpets.identity.title': 'Discover Carpet Art' },
      'src/A.vue': withI18n(
        "const a = t('gallery.sheet.name'); const b = t('carpets.identity.title')"
      ),
      'node_modules/@metanull/viewer-i18n/dist/gallery/en.json': { 'gallery.sheet.name': 'Name:' },
    })
    assert.deepEqual((await checkApp(dir)).problems, [])
  })
})

describe('the languages a website offers', () => {
  const app = (files = {}) =>
    scratch({
      'package.json': { name: 'carpets', viewerI18n: { class: 'gallery', namespace: 'carpets' } },
      'locales/en.json': {},
      'node_modules/@metanull/viewer-i18n/dist/gallery/en.json': {
        'gallery.sheet.name': 'Name:',
        'gallery.nav.about': 'About',
      },
      'node_modules/@metanull/carpets-data/manifest.json': {
        site: { languages: [{ code: 'ar', label: 'العربية' }, { code: 'en', label: 'English' }] },
      },
      ...files,
    })

  it('are read from the data package, the way the website reads them', () => {
    const dir = app()
    assert.deepEqual(offeredLanguages(dir), { languages: ['ar', 'en'], from: '@metanull/carpets-data' })
  })

  it('must each reach the shared texts', async () => {
    // The gallery bundle installed here has no Arabic at all.
    assert.match(messagesOf(await checkApp(app())), /offers \*\*ar\*\*.*no ar at all/)
  })

  it('must each reach every shared text', async () => {
    const dir = app({
      'node_modules/@metanull/viewer-i18n/dist/gallery/ar.json': { 'gallery.sheet.name': 'الاسم:' },
    })
    assert.match(messagesOf(await checkApp(dir)), /offers \*\*ar\*\*.*lack 1 of their 2 entries/)
  })

  it('are satisfied by a complete bundle, and say where the own entries fall back', async () => {
    const dir = app({
      'node_modules/@metanull/viewer-i18n/dist/gallery/ar.json': {
        'gallery.sheet.name': 'الاسم:',
        'gallery.nav.about': 'نبذة',
      },
    })
    const result = await checkApp(dir)
    assert.deepEqual(result.problems, [])
    assert.ok(result.notes.some((note) => note.includes('own entries have no file for ar')))
  })

  it('can be asked about another set with --languages', async () => {
    const result = await checkApp(app(), { languages: ['en', 'fr'] })
    assert.match(messagesOf(result), /offers \*\*fr\*\* \(declared by the --languages option\)/)
    assert.doesNotMatch(messagesOf(result), /\*\*ar\*\*/)
  })
})
