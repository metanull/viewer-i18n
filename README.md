# viewer-i18n

The texts shared by the MWNF websites: menu labels, buttons, the labels of an
item sheet, and the editorial blocks that are the same on every website of a
kind. A text that belongs to **one** website is not here — it lives in that
website's own `locales/` folder.

The museum content itself — the objects, the exhibitions, the partners — is not
here either. It arrives already translated with each website's data.

## Editing a text

You need a GitHub account and a browser; nothing else.

1. **Open the folder for the section you want** — `core/`, `layout/`,
   `gallery/` or `exhibition/` — and click the file for your language.
   `en.json` is English, `fr.json` French, and so on.
2. **Click the pencil** (✏️, top right). Change only the text between the
   second pair of quotation marks on a line. The part before the colon is the
   name of the entry and must stay exactly as it is.
3. **Click "Commit changes…", then "Propose changes".**
4. **Wait for the automatic check.** After a minute or two the page shows a
   green tick and the change is merged by itself. If something is off, a
   comment appears explaining in plain language what to fix; edit again on the
   same page and the check runs afresh.

The websites pick the change up at their next platform update.

## Starting a new language

Open `en.json` in a section, copy all of it, then **Add file → Create new
file**, name it with the two-letter code (`ar.json`, `es.json`, `fr.json`, …),
paste, and translate. Do the same in each section the language needs.

A language does not have to be complete: any text you have not translated yet
shows in English. There is nothing to declare anywhere and no code to change.

## What a text may contain

A text is **just text**. It may be formatted with Markdown — `**bold**`,
`*italic*`, `[a link](https://example.org)`, blank lines between paragraphs —
and that is all.

It may not contain `{` or `}`. Nothing is ever inserted into a text: a number,
a date or a name is placed next to the text by the website, never inside it.
This is why a text can be translated freely, without having to preserve
anything.

Writing an HTML tag is not forbidden, because it does not work: the websites
escape HTML instead of rendering it, so `<b>Home</b>` appears on the page as
those exact characters, angle brackets and all. Use Markdown.

## The sections

| Folder | Holds the texts of |
| --- | --- |
| `core/` | the pages every website builds on |
| `layout/` | the frame around a page: navigation, language chooser, footer |
| `gallery/` | the galleries (Carpets, Amulets, …) |
| `catalogue/` | the list pages every website has: the filters, the search form, the results and their pages |
| `sheet/` | the labels of a record's sheet — name, date, dimensions, provenance, who prepared it |
| `record/` | what surrounds the sheet: back, timeline, related items, credits, citation, the glossary |
| `exhibition/` | the exhibitions (Water in Islam, The Use of Colours in Art, …) |
| `timeline/` | the timeline pages: the country and period form, the results, the errors — worded so the same text serves a gallery, an exhibition or a standalone site |
| `partner/` | the partner pages: the profile fields, the map, the list and its sorting, "not found" — worded the same way |

`gallery/` and `exhibition/` hold only what a gallery or an exhibition says and no other kind of website does — the sections, the navigation, the partner page's intro, the timeline page's intro, the notices, the themes. What every website says the same way lives once, in `catalogue/`, `sheet/`, `record/`, `timeline/` and `partner/`, so that the seven websites read one vocabulary rather than seven; since 2.0.0 the two family sections carry no copy of it. `timeline/` and `partner/` carry no product name: they say "in this site", never "Gallery" or "Exhibition", so the one text serves every kind of website — the few entries whose wording is a product's own stay in `gallery` and `exhibition`.

Entry names are written as `section.group.name` — three parts, so
`gallery.sheet.inventoryNumber` reads as "in the galleries, on the item sheet,
the inventory number", and `sheet.field.inventoryNumber` "on any sheet, the
field, the inventory number".

A shared label carries no trailing colon: whether a label ends in a colon is a
matter of layout, which the page decides.

## Which languages a section must exist in

A website offers the languages its data package declares, and a visitor who
picks one reads the whole page in it — the records from the package, the
texts from here. So each kind of website names, in `namespaces.json` under
`languages`, the languages its websites offer, and **every section that kind
receives has to be complete in each of them**. The shared sections are in
every bundle, so they need the union: today `ar cs de el en es fr it pt se tr`.
The automatic check refuses a section that is missing a language, or an entry
in one, that a website of that kind offers.

To add a language a website is about to offer: add it to the kind's list,
then create the file in every section that kind receives. [`sources.md`](sources.md)
says where the existing translations came from.

`se` is Swedish: the data packages declare it with the legacy code, and the
websites match codes as written, so the file is named after what they say.

## For developers

Each kind of website receives one prebuilt bundle, and nothing else:

| Kind | Bundle | Contains |
| --- | --- | --- |
| Products (Islamic Art, Baroque Art, Sharing History) | `@metanull/viewer-i18n/standalone` | `core` + `layout` + `catalogue` + `sheet` + `record` + `exhibition` + `timeline` + `partner` |
| Galleries | `@metanull/viewer-i18n/gallery` | the same, with `gallery` in place of `exhibition` |
| Exhibitions | `@metanull/viewer-i18n/exhibition` | the same as Products |

```js
import { catalogues } from '@metanull/viewer-i18n/gallery'
// { en: { 'core.nav.home': 'Home', … } }
```

A website merges its own `locales/<lang>.json` over that bundle, and the local
value wins. That is the only merge rule in the system: a website may overload
any entry it receives and add entries of its own, but it cannot delete one.

It says which bundle it receives, and what its own entries are called, in its
`package.json`:

```json
"viewerI18n": { "class": "gallery", "namespace": "carpets" }
```

`class` is one of `standalone`, `gallery`, `exhibition`. `namespace` is one
lowercase word, no hyphens (`carpets`, `waterInIslam`) — it cannot be one of
the shared section names, and it is the prefix the website's own entries carry.
The checks below read this to know what a file may contain, so they refuse to
run without it.

`namespaces.json` is the registry: the sections that exist and what each bundle
contains. `tools/build.mjs` produces the bundles; `tools/check.mjs` is the
whole rulebook, and also ships with the package so websites enforce the same
rules on their own texts:

```bash
npx viewer-i18n-check --site .   # a website's locales/, on its own
npx viewer-i18n-check --app .    # …and every entry its code asks for
npx viewer-i18n-check --app . --languages ar,en,fr   # …for a set other than the package's
```

`--app` reads a name wherever the website asks for one: a `t('…')` or `$t('…')`
call, an `I18nText` keypath, and — since 2.1.0 — a name written in a spec the
platform renders, such as `title: 'carpets.identity.title'` in a
`dataset.config.js` or a label in a catalogue or sheet spec for viewer-layout's
composed views. A plain string reads as a name when it has three parts and its
first is a section the website receives; every name found has to exist.

`--app` also reads the languages the website offers — `manifest.site.languages`
of the installed `@metanull/<dataset>-data`, the list the website itself reads —
and fails when the installed bundle has no complete file for one of them: that
visitor would read the records in their language and every label in English.
`--languages` asks about another set, for a website about to offer one.

## Release procedure

1. Merge to `main` via a pull request (CI validates the texts and builds every
   website against the packed tarball).
2. Create a GitHub release tagged `vX.Y.Z` — CI publishes to GitHub Packages.
3. Semver: **patch** = a text changed; **minor** = an entry or a language
   added; **major** = an entry renamed or removed.

Websites receive it through the platform's propagation run — see
[MAINTENANCE.md](https://github.com/metanull/viewer-workflows/blob/main/MAINTENANCE.md)
in `viewer-workflows`.
