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

## 1.5.0

- The call sites are parsed, not matched. `@vue/compiler-sfc` — the parser the
  website already builds with — reads the scripts and the compiled template,
  and the names asked for are taken from the syntax tree.
- Two regular expressions are gone, and with them two ways of being wrong:
  `t(item)` written inside a prose comment was read as a text being asked for,
  and a component's own `const t = (item) => …` could not be told apart from
  the one that looks a text up. Both cost real edits during the rollout.
- `t` is now followed properly through scope, because one file uses the name
  both ways: `export function facetLabels(t)` receives the lookup as a
  parameter, while `const t = tr('items', …)` below it is a translated record.
- Verified against all seven websites: the same entries are found as before,
  with the false positives gone.
- The parser is resolved from the website being checked, so `--site` — the mode
  a translator's pull request runs — still loads nothing and installs nothing.
- `scanSources`, `checkApp` and `main` are async.

## 1.6.0

- `core.notFound.page`, read by viewer-core 1.6.0's `NotFoundView` — the
  page every website's catch-all lands on, now that the router owns it.
- `layout.nav.menu`, the label of the hamburger button viewer-layout 2.1.0's
  navigation shows on a narrow screen, so no website keeps a menu of its own.
- Both in English, French, Spanish and Arabic.

## 1.7.0

Wave A of the shared-pages epic (metanull/inventory-app#1691): the vocabulary
the list pages and the record page of every website share, in every language
any website offers.

- Three namespaces in every bundle: `catalogue` (the filters, the search
  form, the results and their pages — 59 entries), `sheet` (the labels of a
  record's sheet, `sheet.field.*` — 43), `record` (what surrounds the sheet:
  back, timeline, related, credits, citation, glossary — 27). A shared label
  carries no trailing colon; the page decides that.
- `core.action.*` — the verbs of the landing cards and the controls (add,
  apply, back, browse, close, explore, go, read, reset, search, viewDetails)
  — and `core.project.*`, one entry per project of `mwnf3.projectnames`, so
  a project name is looked up once rather than written into six files.
- **Every language a website offers.** The data packages declare Islamic
  Art in ten site languages, Baroque Art in five, the galleries in four; the
  bundles had English chrome for all but four of them. `core`, `layout`,
  `catalogue`, `sheet` and `record` now exist, complete, in
  `ar cs de el en es fr it pt se tr`, and `gallery` in `ar es fr` besides
  English. The legacy websites' term tables are the source wherever they had
  a real translation of the same label; [`sources.md`](sources.md) is the
  trace. `se` is Swedish, named after the code the packages declare.
- `namespaces.json` names, per kind of website, the languages its websites
  offer (`languages`), and `--dictionary` refuses a section that is missing
  one of them or an entry in one. `--app` reads the languages a website
  offers from its data package's `manifest.site.languages` and refuses an
  installed bundle that does not cover them; `--languages` asks about another
  set.
- `gallery.*` and `exhibition.*` keep every entry they had, including the
  ~170 the two share and the ones the new namespaces now say again. Nothing
  reads the new ones yet; the websites move over one by one, and the
  duplicates go in a later major once nothing reads them.
