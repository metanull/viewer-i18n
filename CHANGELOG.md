## 2.4.0

Part of epic metanull/inventory-app#1692, wave I partner adoptions (metanull/inventory-app#1697), story metanull/inventory-app#1703 (metanull/viewer-i18n#26).

- **partner.map.openInOpenStreetMap** ("Open in OpenStreetMap"): the neutral entry for the partner map's link, shared across all website kinds. The two product entries (gallery.action.openInOpenStreetMap, xhibition.action.openInOpenStreetMap) stay until every site reads the shared one (removal last, metanull/viewer-layout#67).

# Changelog

## 2.3.0

Wave G of the shared-pages epic (metanull/inventory-app#1692/#1695), walkthrough
step 30 (metanull/viewer-i18n#19): two new sections, `timeline` and `partner`,
in every bundle. Decision D6: neutral wording — "in this site", never
"Gallery" or "Exhibition" — so the one text serves a gallery, an exhibition
and a standalone site; product wording stays only in `gallery` and
`exhibition`. Additive: nothing removed, nothing renamed.

- **`timeline/`**, 24 entries (`timeline.nav.*`, `.form.*`, `.results.*`,
  `.action.*`): the twelve entries byte-identical between `gallery` and
  `exhibition` (`allCountries`, `backToEvents`, `beginFullSearch`, `earliest`,
  `latest`, `galleryHeading`, `noEvents`, `noResults`, `searchIntro`,
  `selectCountry`, `to`, `countryDescription`), plus fourteen more identical
  across islamicart, baroqueart and sharinghistory's own `timeline.*`,
  `results.*`, `action.*` and `filter.*` prefixes. `selectCountry`, `to`,
  `startDate`, `endDate` and `yearSuffix` reuse `catalogue.facet.*` and
  `catalogue.era.ad` rather than the gallery/exhibition wording, since the
  meaning and the existing eleven-language translations are the same. One
  entry, `seeGallery` ("See Gallery"), keeps the word "Gallery" on purpose —
  it names the object grid a timeline period links to (legacy's
  `gn_see_gallery`, decision D1 restoring it to the standalone sites too),
  not the product family, so it is not a D6 violation.
- **`partner/`**, 22 entries (`partner.info.*`, `.map.*`, `.list.*`, `.nav.*`,
  `.item.*`): fifteen entries identical between `gallery.partner.*` and
  `exhibition.partner.*`, plus entries the three standalone sites already
  triplicate under their own `partner.*` and `notFound.partner` /
  `results.partnersFound`. Two wording forks, resolved:
  - `fax` and `phone` were `"F"` / `"T"` in `gallery`/`exhibition` (a
    letter prefixing a number) and `"Fax"` / `"Phone"` on the three
    standalone sites; the full word won, since it reads on its own wherever
    the shared entry is used without the number beside it. The `gallery` and
    `exhibition` namespaces keep their own abbreviated entries unchanged.
  - `associated` was `"Associated Museums"` / `"Associated Institutions"`
    (islamicart, baroqueart) against sharinghistory's single
    `"Associated Partners"`; the generic form won, since the new entry has
    no `typeMuseum`/`typeInstitution` split of its own.
  - `back` takes islamicart/baroqueart/sharinghistory's `"Back to Partners"`;
    their separate `"Return to Partners"` (`returnLink`) is untouched — a
    second, different link on the same pages, not a duplicate of this one.
  - `objectsInSite` rewrites `gallery.partner.objectsInGallery` /
    `exhibition.partner.objectsInExhibition` ("object(s) in this Gallery" /
    "…Exhibition") to "object(s) in this site" per D6; the ar/es/fr
    translations are the same mechanical substitution, the site-type word
    swapped for the neutral one, on the existing gallery translations.
- Translations: `ar`, `es` and `fr` are real wherever the entry already
  existed in `gallery/{ar,es,fr}.json` (all of `timeline` but the seven
  standalone-only entries above; most of `partner`). `selectCountry`, `to`,
  `startDate`, `endDate` and `yearSuffix` are real in all eleven languages,
  reused from `catalogue/`. `partner.info.about`, `.contact`, `.fax`,
  `.logo` and `.phone` additionally carry real `de`, `it`, `pt` and/or `tr`
  from the legacy `mwnf3` translation table (word IDs `About`/`about`,
  `Contact`/`contact`, `Fax`, `logo`, `Phone`) — a legacy row that merely
  repeated the English was skipped, as `sources.md` already does (this
  dropped French `Phone`, which legacy left untranslated). Everything else —
  `cs`, `el` and `se` throughout, and every language for the sixteen
  entries sourced only from islamicart/baroqueart/sharinghistory's
  English-only `locales/en.json` (`errorSelect`, `errorPeriod`, `backLink`,
  `eventsFound`, `viewItemsFromPeriod`, `fromYearHint`,
  `toYearHint`, `none`, `typeMuseum`, `typeInstitution`, `museums`,
  `institutions`, `associated`, `partnersFound`, `back`, `notFound`) — is
  English, as 2.2.0 did for `exhibition`; none of these was ever translated
  by MWNF for any site that reads it.

Walkthrough step 31 (metanull/viewer-i18n#20): the search vocabulary the
three standalone sites triplicated, the DXA theme pages' wording, and the
glossary/dynasty popout labels the item sheet needs. Additive.

- **`catalogue/`**, 9 entries (`catalogue.field.artist`, `.keywords`,
  `.material`, `.other`, `.patron`, `catalogue.search.howToEssay`, `.intro`,
  `.keywordOne`, `.keywordTwo`, `.keywordThree`): the search essay
  `gallery.search.howTo` / `exhibition.search.howTo` restored by 2.0.1 —
  still byte-identical between the two — plus the field names and search
  intro the three standalone sites triplicate under their own
  `<site>.search.*` / `<site>.field.*`. The essay is named
  `catalogue.search.howToEssay`, not `catalogue.search.howTo`: that shorter
  name is already taken, by the *link label* "How to search" 2.0.1 tells the
  story of restoring the essay away from — `SearchResults.vue` /
  `CollectionSearch.vue` in colours, water-in-islam, amulets and carpets
  render it as a `RouterLink`'s clickable text, and giving it the essay
  would turn that link into the whole Boolean-search write-up.
  `fromYearHint` / `toYearHint` are not duplicated here — #19 already added
  them as `timeline.form.fromYearHint` / `.toYearHint`, and the meaning is
  the same wherever a year hint is shown.
- **`record/`**, 3 entries: `record.glossary.tool` ("Glossary tool"), beside
  the existing `record.glossary.heading` / `.instructions` / `.definition`,
  which already say what the DXA item sheets' glossary popout needs and are
  untouched. `record.dynasty.heading` and `record.dynasty.list`, both
  "Dynasties" — the neutral form of two different wordings on the same item
  sheet: `gallery.nav.dynastiesHeading` ("THE DYNASTIES", a dynasty
  popout's own title) and `gallery.nav.islamicDynasties` ("Islamic
  Dynasties / Period", the heading above the list of an item's dynasties).
  Two UI slots, the same neutral word for both — neither needs the
  "Islamic" qualifier once it is read beyond islamicart.
- **`exhibition/`**, 14 entries (`exhibition.theme.romanLabel`,
  `.seeGalleryFor`, `.seeAllInTheme`, `.galleryLabel`, `.recordNotInSite`,
  `exhibition.related.notAvailable`, `exhibition.relatedCategory.furtherReading`,
  `.mwnfContent`, `.partnerContent`, `.otherContent`, `.unknown`,
  `exhibition.chapter.previous`, `.next`, `.returnToExhibitions`): the theme
  and related-content wording the-use-of-colours-in-art added in wave 0
  under its own `colours.*` prefix, plus sharinghistory's chapter
  navigation (`nextChapter` / `previousChapter` / `returnLink`, renamed to
  the neutral `chapter.next` / `.previous` / `.returnToExhibitions`).
  Decision D6 reaches one entry here even though `exhibition/` is a product
  section: `recordNotInSite` rewrites colours' `theme.recordNotInExhibition`
  ("…is not part of this exhibition") to "…is not part of this site",
  because `exhibition/` has been in the `standalone` bundle since 2.2.0 and
  a product site reading it should not be told about an "exhibition" it
  isn't one. The other four theme entries keep "Theme" and "Gallery"
  unchanged — "Gallery" names the object grid a theme links into, the
  README's standing exception, not the product.
- Translations: `catalogue.search.howToEssay` is real in `ar`, `es` and
  `fr`, copied from `gallery.search.howTo` — the pre-2.0.0 gallery
  translations already carried it. Everything else this walkthrough step
  adds — the rest of `catalogue.field.*` / `catalogue.search.*`, all of
  `record.glossary.tool` and `record.dynasty.*`, and all fourteen new
  `exhibition.*` entries, in every one of the eleven languages including
  `ar`, `es` and `fr` — is English. None of it existed anywhere as a
  translated string to reuse: the three standalone sites never had a
  non-English `locales/` file, and `exhibition/`'s non-English files have
  been English copies since 2.2.0, MWNF never having translated the
  exhibition write-ups.

## 2.2.0

Wave 0 of the shared-pages epic (metanull/inventory-app#1692/#1693), walkthrough
step 11 (metanull/viewer-i18n#18): the `exhibition` namespace joins the
`standalone` bundle.

- islamicart, baroqueart and sharinghistory each carried nine
  `<site>.exhibition.*` entries whose English duplicated `exhibition.*`
  word for word, and had no way to read `exhibition.theme.*` at all — the
  `exhibition` namespace was built only into the `gallery` and `exhibition`
  bundles. `namespaces.json` now lists it under `standalone` too, so the
  three product sites read the one shared copy instead of keeping their
  own, and gain the theme entries besides. Additive: a bundle gains
  entries, nothing is removed.
- `exhibition/ar.json`, `cs.json`, `de.json`, `el.json`, `es.json`,
  `fr.json`, `it.json`, `pt.json`, `se.json` and `tr.json` — English, like
  `en.json`. MWNF never translated the exhibition write-ups; that is
  already the standing rule for the section, not something this change
  invents — the `exhibition` bundle's own websites have only ever promised
  `en` for it (`namespaces.json`'s `languages.exhibition`), and the nine
  duplicated entries the three sites are dropping were themselves English
  in every language they shipped. Joining `standalone`, which promises
  eleven languages, means the section's files have to exist in all of
  them for `viewer-i18n-check` to pass; the files exist so the check
  passes and a visitor in any language still reads the same English
  exhibition text they already did. A real translation, if MWNF ever
  commissions one, replaces these files without touching the registry.

## 2.1.0

- `viewer-i18n-check --app` reads a name written in a spec — `title:
  'carpets.identity.title'` in a `dataset.config.js`, a label in a catalogue
  or sheet spec that viewer-layout's composed views render — as a name the
  website asks for: it has to exist, and it counts as used. A plain string
  reads as one when it has three parts and its first is a section the
  website receives. Before this, a website on the composed views had its
  own entries reported unused and a misspelt label in a spec went unseen.
  Additive; no entry changes.

## 2.0.1

- Restored `gallery.search.howTo` and `exhibition.search.howTo` — the essay on
  the boolean search operators that the "How to search" page of every DXA
  website renders. 2.0.0 removed them as duplicates of
  `catalogue.search.howTo`, which is the *link label* "How to search", not the
  essay; the mistake survived the release because the downstream check
  builds and tests a website but does not run its text check, and the essay
  is asked for through an `I18nText` keypath the removal's grep did not read.
  The four websites' text checks caught it on the first bump. Additive.
## 2.0.0

Wave E of the shared-pages epic (metanull/inventory-app#1691), the last
step (#13): the `gallery` and `exhibition` entries that `catalogue`,
`sheet`, `record` and `core` replaced in 1.7.0 are removed. **Breaking**
for any website still asking for one — it would render as its own name.
Every website's `main` was moved onto the shared entries before this
release (the seven wave D adoptions, then metanull/carpets#26,
metanull/amulets#24, metanull/water-in-islam#26 and
metanull/the-use-of-colours-in-art#24 for the last handful), and this
release's downstream check built and tested all seven against it.

The rule: an entry goes when a shared one says the same thing — the era
words, the facet labels, the filter words, the glossary heading and
instructions, what surrounds the sheet (add to collection, citation,
download, on display in, photograph, source database, timeline for this
item), the pagination words, the project names, the results words, the
search form's button and "how to search", every sheet label, back, go,
reset, close, menu, "Exhibition(s)". What only a gallery or an
exhibition says stays: the sections, the navigation, the partner page,
the timeline pages, the notices, the about and intro texts, the
sponsors, the themes.

`tools/prune-duplicates.mjs` is the list, applied; it stays in the
repository so the rule is readable.

- **`gallery/`** loses 87 entries: `gallery.action.back`, `gallery.action.go`, `gallery.action.resetFilters`, `gallery.era.ad`, `gallery.era.after`, `gallery.era.bc`, `gallery.era.before`, `gallery.facet.any`, `gallery.facet.artist`, `gallery.facet.country`, `gallery.facet.endDate`, `gallery.facet.filterBy`, `gallery.facet.filterFurtherBy`, `gallery.facet.material`, `gallery.facet.periodDynasty`, `gallery.facet.selectCountry`, `gallery.facet.startDate`, `gallery.facet.subject`, `gallery.facet.type`, `gallery.filter.from`, `gallery.filter.to`, `gallery.glossary.definition`, `gallery.glossary.instructions`, `gallery.item.addToCollection`, `gallery.item.citation`, `gallery.item.download`, `gallery.item.downloadPdf`, `gallery.item.in`, `gallery.item.onDisplayIn`, `gallery.item.photograph`, `gallery.item.sourceDatabase`, `gallery.item.timeline`, `gallery.nav.exhibitions`, `gallery.nav.glossary`, `gallery.nav.menu`, `gallery.pagination.first`, `gallery.pagination.last`, `gallery.pagination.page`, `gallery.project.baroqueArt`, `gallery.project.carpetArt`, `gallery.project.explorePartners`, `gallery.project.glassArt`, `gallery.project.islamicArt`, `gallery.project.sharingHistory`, `gallery.project.tableIsSet`, `gallery.related.audioVideos`, `gallery.results.allObjects`, `gallery.results.forProject`, `gallery.results.heading`, `gallery.results.noResults`, `gallery.results.objects`, `gallery.results.outOf`, `gallery.results.timelineForSearch`, `gallery.search.howTo`, `gallery.search.howToLink`, `gallery.search.submit`, `gallery.sheet.alsoKnownAs`, `gallery.sheet.artists`, `gallery.sheet.bibliography`, `gallery.sheet.binding`, `gallery.sheet.catalogueLink`, `gallery.sheet.copyeditedBy`, `gallery.sheet.copyrightInformation`, `gallery.sheet.currentOwner`, `gallery.sheet.datationMethod`, `gallery.sheet.date`, `gallery.sheet.description`, `gallery.sheet.dimensions`, `gallery.sheet.holdingMuseum`, `gallery.sheet.inventoryNumber`, `gallery.sheet.location`, `gallery.sheet.materials`, `gallery.sheet.name`, `gallery.sheet.obtentionMethod`, `gallery.sheet.originalOwner`, `gallery.sheet.periodDynasty`, `gallery.sheet.placeOfProduction`, `gallery.sheet.preparedBy`, `gallery.sheet.provenance`, `gallery.sheet.provenanceMethod`, `gallery.sheet.scribe`, `gallery.sheet.shortDescription`, `gallery.sheet.translationBy`, `gallery.sheet.translationCopyeditedBy`, `gallery.sheet.type`, `gallery.sheet.workingNumber`, `gallery.sheet.workshop`.
- **`exhibition/`** loses 88 entries: `exhibition.action.back`, `exhibition.action.go`, `exhibition.action.resetFilters`, `exhibition.era.ad`, `exhibition.era.after`, `exhibition.era.bc`, `exhibition.era.before`, `exhibition.facet.any`, `exhibition.facet.artist`, `exhibition.facet.country`, `exhibition.facet.endDate`, `exhibition.facet.filterBy`, `exhibition.facet.filterFurtherBy`, `exhibition.facet.material`, `exhibition.facet.periodDynasty`, `exhibition.facet.selectCountry`, `exhibition.facet.startDate`, `exhibition.facet.subject`, `exhibition.facet.type`, `exhibition.filter.from`, `exhibition.filter.to`, `exhibition.glossary.definition`, `exhibition.glossary.instructions`, `exhibition.item.addToCollection`, `exhibition.item.citation`, `exhibition.item.download`, `exhibition.item.downloadPdf`, `exhibition.item.in`, `exhibition.item.onDisplayIn`, `exhibition.item.photograph`, `exhibition.item.sourceDatabase`, `exhibition.item.timeline`, `exhibition.nav.exhibitions`, `exhibition.nav.glossary`, `exhibition.nav.menu`, `exhibition.pagination.first`, `exhibition.pagination.last`, `exhibition.pagination.page`, `exhibition.project.baroqueArt`, `exhibition.project.carpetArt`, `exhibition.project.explorePartners`, `exhibition.project.glassArt`, `exhibition.project.islamicArt`, `exhibition.project.sharingHistory`, `exhibition.project.tableIsSet`, `exhibition.related.audioVideos`, `exhibition.results.allObjects`, `exhibition.results.forProject`, `exhibition.results.heading`, `exhibition.results.noResults`, `exhibition.results.objects`, `exhibition.results.outOf`, `exhibition.results.timelineForSearch`, `exhibition.search.howTo`, `exhibition.search.howToLink`, `exhibition.search.submit`, `exhibition.sheet.alsoKnownAs`, `exhibition.sheet.artists`, `exhibition.sheet.bibliography`, `exhibition.sheet.binding`, `exhibition.sheet.catalogueLink`, `exhibition.sheet.copyeditedBy`, `exhibition.sheet.copyrightInformation`, `exhibition.sheet.currentOwner`, `exhibition.sheet.datationMethod`, `exhibition.sheet.date`, `exhibition.sheet.description`, `exhibition.sheet.dimensions`, `exhibition.sheet.holdingMuseum`, `exhibition.sheet.inventoryNumber`, `exhibition.sheet.location`, `exhibition.sheet.materials`, `exhibition.sheet.name`, `exhibition.sheet.obtentionMethod`, `exhibition.sheet.originalOwner`, `exhibition.sheet.periodDynasty`, `exhibition.sheet.placeOfProduction`, `exhibition.sheet.preparedBy`, `exhibition.sheet.provenance`, `exhibition.sheet.provenanceMethod`, `exhibition.sheet.scribe`, `exhibition.sheet.shortDescription`, `exhibition.sheet.translationBy`, `exhibition.sheet.translationCopyeditedBy`, `exhibition.sheet.type`, `exhibition.sheet.workingNumber`, `exhibition.sheet.workshop`, `exhibition.ui.close`.


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
