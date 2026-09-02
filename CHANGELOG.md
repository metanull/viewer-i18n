# Changelog

## 1.0.0

- Initial release: the `core`, `layout`, `gallery` and `exhibition` namespaces
  in English, the `namespaces.json` registry, the three per-class bundles
  (`standalone`, `gallery`, `exhibition`), and `viewer-i18n-check` — the rules
  of the dictionary, usable against this repository, a website's `locales/`,
  and a website's call sites.
- English only. The `core` and `layout` entries are the strings that were
  hardcoded in `viewer-core` and `viewer-layout`; the `gallery` and
  `exhibition` entries are the strings the four DXA websites vendored, re-keyed
  into the `section.group.name` grammar and reduced to what their code
  actually uses.

## 1.1.0

- Arabic, Spanish and French for `core` and `layout`.
- The `gallery` and `exhibition` entries the first three websites needed.
- Fixed: the checker did nothing at all when run as a program. npm installs a
  `bin` as a symlink, and the guard that decides "was I run, or imported?"
  compared the path as written against the path of this file, which never
  matched. Every website's text check had been passing without running.

## 1.2.0

- `exhibition.sponsors.footerOne` … `footerFour`, named after the slot they
  fill rather than after one exhibition's wording. `patronage` and `support`
  were named after Water in Islam's headings, and four of the five exhibitions
  say something different there. Both old entries still exist.

## 1.3.0

- Removed the rule that rejected HTML in a text. viewer-core escapes raw HTML
  when it renders, so a tag reaches the page as the characters that were typed;
  the rule was a second, weaker copy of a decision already enforced where it
  matters. It was also wrong — written as a regular expression, it rejected
  `<https://example.org/>`, `<office@museumwnf.net>` and `` `<div>` `` (an
  autolink, an email autolink and a code span, all ordinary Markdown) and told
  the translator to write Markdown instead, which is what they had done.
- The checker has no dependencies again, so a translator's pull request still
  runs no npm install.

## 1.4.0

- A language file's name is now read by `Intl` rather than matched against a
  regular expression. The platform knows BCP 47, so nothing here re-describes
  it: `Intl.getCanonicalLocales` parses the tag and rejects what is not one.
- One spelling per language. `pt-br.json` is now reported and told to be
  `pt-BR.json`, so two files cannot both claim a language and leave the
  filesystem to decide which one a reader gets.
- The length rule stays ours: an ISO 639 code is two or three letters, and
  BCP 47's grammar happily accepts `common` and `index` as languages.
- `LANG_RE` is replaced by `languageOf(name)`, which returns the canonical
  spelling or null.
