// The checks are the only thing standing between a translator's edit and a
// live website, so each rule the architecture states is pinned by a test that
// fails when the rule stops being enforced.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'

import { KEY_RE, checkApp, checkDictionary, checkSite, languageOf, scanSources } from './check.mjs'

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
  it('finds every way a text is asked for, and ignores lookalikes', () => {
    const dir = scratch({
      'src/A.vue': `<template><p>{{ $t('core.nav.home') }}</p>
        <I18nText keypath="gallery.about.body" /></template>
        <script setup>const x = t('gallery.sheet.name'); const y = list.split(',')</script>`,
    })
    const { references, dynamic } = scanSources(dir)
    assert.deepEqual(
      [...references.keys()].sort(),
      ['core.nav.home', 'gallery.about.body', 'gallery.sheet.name']
    )
    assert.deepEqual(dynamic, [])
  })

  it('reports a text asked for with a value rather than a name', () => {
    const dir = scratch({ 'src/A.vue': '<script setup>const label = t(key)</script>' })
    assert.equal(scanSources(dir).dynamic.length, 1)
  })

  it('rejects a name the website cannot resolve', () => {
    const dir = scratch({
      'package.json': { name: 'carpets', viewerI18n: { class: 'gallery', namespace: 'carpets' } },
      'locales/en.json': {},
      'src/A.vue': "<script setup>const a = t('gallery.sheet.missing')</script>",
      'node_modules/@metanull/viewer-i18n/dist/gallery/en.json': { 'gallery.sheet.name': 'Name:' },
    })
    assert.match(messagesOf(checkApp(dir)), /does not exist/)
  })

  it('accepts a name that comes from the shared texts', () => {
    const dir = scratch({
      'package.json': { name: 'carpets', viewerI18n: { class: 'gallery', namespace: 'carpets' } },
      'locales/en.json': { 'carpets.identity.title': 'Discover Carpet Art' },
      'src/A.vue':
        "<script setup>const a = t('gallery.sheet.name'); const b = t('carpets.identity.title')</script>",
      'node_modules/@metanull/viewer-i18n/dist/gallery/en.json': { 'gallery.sheet.name': 'Name:' },
    })
    assert.deepEqual(checkApp(dir).problems, [])
  })
})
