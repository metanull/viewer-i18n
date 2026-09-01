// The checker as a program, not as a module.
//
// Every other test imports `check.mjs` and calls into it, which says nothing
// about whether running it does anything at all. It did not: npm installs a
// `bin` on Linux as a symlink, the "am I the program?" test compared the paths
// as written, and `npx viewer-i18n-check` in CI printed nothing, exited 0, and
// reported a green blocking check that had checked nothing.
//
// These run the file the way a shell does — including through a symlink, which
// is the case that failed — and assert that it says something.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, symlinkSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const CHECKER = fileURLToPath(new URL('./check.mjs', import.meta.url))
const REPO = fileURLToPath(new URL('..', import.meta.url))

/** Runs the checker and returns { status, out }, never throwing on exit 1. */
function run(entry, args, cwd = REPO) {
  try {
    return { status: 0, out: execFileSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8' }) }
  } catch (error) {
    return { status: error.status, out: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

test('run directly, it validates the dictionary and says so', () => {
  const { status, out } = run(CHECKER, ['--dictionary', REPO])
  assert.equal(status, 0)
  assert.match(out, /All texts are valid/)
})

test('run through a symlink — how npm installs a bin — it still runs', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'viewer-i18n-bin-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const link = join(dir, 'viewer-i18n-check')
  try {
    symlinkSync(CHECKER, link)
  } catch {
    // Windows refuses symlinks without a developer mode or elevation; the case
    // this guards is Linux, where CI runs, and where the link always succeeds.
    t.skip('this platform does not allow creating symlinks')
    return
  }
  const { status, out } = run(link, ['--dictionary', REPO])
  assert.equal(status, 0)
  assert.match(out, /All texts are valid/, 'the program printed nothing — it did not run')
})

test('with no mode it explains itself and fails', () => {
  const { status, out } = run(CHECKER, [])
  assert.equal(status, 2)
  assert.match(out, /Usage: viewer-i18n-check/)
})

test('a broken site is reported, and the report is written for the comment', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'viewer-i18n-site-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ viewerI18n: { class: 'gallery', namespace: 'carpets' } })
  )
  mkdirSync(join(dir, 'locales'))
  writeFileSync(join(dir, 'locales', 'en.json'), JSON.stringify({ 'not a name': 'x' }))

  const { status, out } = run(CHECKER, ['--site', dir], dir)
  assert.equal(status, 1)
  assert.match(out, /is not a valid entry name/)
})
