// The checks are the only thing standing between a translator's edit and a
// live website, so each rule the architecture states is pinned by a test that
// fails when the rule stops being enforced.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'

import { KEY_RE, checkApp, checkDictionary, checkSite, scanSources } from './check.mjs'

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

  it('rejects HTML, and allows the < > that appears in prose', () => {
    const withTag = checkDictionary(
      dictionary({ 'core/en.json': { 'core.nav.home': '<b>Home</b>' } })
    )
    assert.match(messagesOf(withTag), /contains HTML/)

    const withProse = checkDictionary(
      dictionary({ 'core/en.json': { 'core.nav.home': 'The operators < and > rank results.' } })
    )
    assert.deepEqual(withProse.problems, [])
  })

  it('allows an autolink, which is Markdown and not HTML', () => {
    // The rule used to reject this and tell the translator to write Markdown,
    // which is what they had written. html.test.mjs holds the rest of the cases.
    const result = checkDictionary(
      dictionary({ 'core/en.json': { 'core.nav.home': 'See <https://example.org/>.' } })
    )
    assert.deepEqual(result.problems, [])
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
