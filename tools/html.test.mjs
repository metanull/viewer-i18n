// What counts as HTML in a text.
//
// Every case here was decided by a regular expression before, and it got five
// of the first seven wrong. They are written out one per assertion because the
// point of the rule is what a translator is allowed to type, and each line is
// one thing they are or are not allowed to type.

import test from 'node:test'
import assert from 'node:assert/strict'
import { htmlIn } from './check.mjs'

test('Markdown that merely looks like HTML is not HTML', async (t) => {
  await t.test('a bare web address in angle brackets is an autolink', () => {
    assert.deepEqual(htmlIn('See <https://example.org/> for more.'), [])
  })

  await t.test('an email address in angle brackets is an autolink', () => {
    assert.deepEqual(htmlIn('Write to <office@museumwnf.net>.'), [])
  })

  await t.test('a tag inside a code span is code, not markup', () => {
    assert.deepEqual(htmlIn('Write `<div>` to start a block.'), [])
  })

  await t.test('a tag inside a fenced block is code, not markup', () => {
    assert.deepEqual(htmlIn('```\n<div>hello</div>\n```'), [])
  })

  await t.test('comparison signs in prose are prose', () => {
    assert.deepEqual(htmlIn('Use 3 < 5 and 9 > 2.'), [])
  })

  await t.test('ordinary Markdown is ordinary', () => {
    assert.deepEqual(htmlIn('A **bold** [link](https://example.org) and *italics*.'), [])
  })
})

test('HTML is HTML', async (t) => {
  await t.test('an inline tag pair', () => {
    assert.deepEqual(htmlIn('This is <em>emphasis</em> the wrong way.'), ['<em>', '</em>'])
  })

  await t.test('a block element', () => {
    assert.deepEqual(htmlIn('<div class="x">block</div>'), ['<div class="x">block</div>'])
  })

  await t.test('a self-closing tag', () => {
    assert.deepEqual(htmlIn('A line<br/>break.'), ['<br/>'])
  })

  await t.test('a tag nested inside a list item is still found', () => {
    assert.ok(htmlIn('- one\n- two <b>three</b>').length > 0)
  })
})

test('nothing that is not a string reaches the lexer as one', async (t) => {
  await t.test('a number', () => assert.deepEqual(htmlIn(42), []))
  await t.test('null', () => assert.deepEqual(htmlIn(null), []))
})
