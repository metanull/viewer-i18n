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

It may not contain HTML tags, and it may not contain `{` or `}`. Nothing is
ever inserted into a text: a number, a date or a name is placed next to the
text by the website, never inside it. This is why a text can be translated
freely, without having to preserve anything.

## The sections

| Folder | Holds the texts of |
| --- | --- |
| `core/` | the pages every website builds on |
| `layout/` | the frame around a page: navigation, language chooser, footer |
| `gallery/` | the galleries (Carpets, Amulets, …) |
| `exhibition/` | the exhibitions (Water in Islam, The Use of Colours in Art, …) |

`gallery/` and `exhibition/` stay separate even where they say the same thing.
A change to a gallery text must never reach an exhibition by surprise, and that
is worth repeating a label for.

Entry names are written as `section.group.name` — three parts, so
`gallery.sheet.inventoryNumber` reads as "in the galleries, on the item sheet,
the inventory number".

## For developers

Each kind of website receives one prebuilt bundle, and nothing else:

| Kind | Bundle | Contains |
| --- | --- | --- |
| Products (Islamic Art, Baroque Art, Sharing History) | `@metanull/viewer-i18n/standalone` | `core` + `layout` |
| Galleries | `@metanull/viewer-i18n/gallery` | `core` + `layout` + `gallery` |
| Exhibitions | `@metanull/viewer-i18n/exhibition` | `core` + `layout` + `exhibition` |

```js
import { catalogues } from '@metanull/viewer-i18n/gallery'
// { en: { 'core.nav.home': 'Home', … } }
```

A website merges its own `locales/<lang>.json` over that bundle, and the local
value wins. That is the only merge rule in the system: a website may overload
any entry it receives and add entries of its own, but it cannot delete one.

`namespaces.json` is the registry: the sections that exist and what each bundle
contains. `tools/build.mjs` produces the bundles; `tools/check.mjs` is the
whole rulebook, and also ships with the package so websites enforce the same
rules on their own texts:

```bash
npx viewer-i18n-check --site .   # a website's locales/, on its own
npx viewer-i18n-check --app .    # …and every entry its code asks for
```

## Release procedure

1. Merge to `main` via a pull request (CI validates the texts and builds every
   website against the packed tarball).
2. Create a GitHub release tagged `vX.Y.Z` — CI publishes to GitHub Packages.
3. Semver: **patch** = a text changed; **minor** = an entry or a language
   added; **major** = an entry renamed or removed.

Websites receive it through the platform's propagation run — see
[MAINTENANCE.md](https://github.com/metanull/viewer-workflows/blob/main/MAINTENANCE.md)
in `viewer-workflows`.
