# Where the translations come from

Decision D6 of the shared-pages epic (metanull/inventory-app#1691): the texts
the legacy websites already had in a language are reused, and only what
legacy never had is translated new. This file is the trace, so that a
translator reviewing an entry can find the sentence it descends from.

The legacy source is the `translation` table of the `mwnf3` database
(`.legacy-database/data/mwnf3_translation.sql` in the inventory repository),
keyed by `group_id:word_id`. Group 3 is `generic` (all sites), group 4 is
`museum` (Discover Islamic Art, Discover Baroque Art), group 13 is Sharing
History, 15 the thematic galleries, 18 the Carpet Art API.

A legacy value was taken when it was a real translation of the same label;
trailing colons, `<br/>` and stray spaces were removed, since punctuation is
the page's and not the text's. A legacy row that merely repeated the English
(`Type`, `Page`, `Source Database`, `Citation:` in most languages) counts as
absent. Where two legacy rows carried the same English, the museum group was
preferred over the generic one.

## Entries with a legacy source

| Entry | Legacy word | Languages taken |
|---|---|---|
| `catalogue.facet.country` | 3:Country | ar de es fr it pt tr |
| `catalogue.facet.endDate` | 3:end_date | ar |
| `catalogue.facet.holdingInstitution` | 13:sh_db_holdingmuseum | ar cs de es fr it pt tr |
| `catalogue.facet.periodDynasty` | 4:db_dynasty | ar de el es fr it pt tr |
| `catalogue.facet.selectCountry` | 3:selected_country | ar es fr it |
| `catalogue.facet.startDate` | 3:start_date | ar es fr |
| `catalogue.facet.subject` | 6:atrium_feedback_subject | ar es fr |
| `catalogue.facet.type` | 13:sh_type | de it pt tr |
| `catalogue.filter.from` | 3:gn_databaseSearchFormCriteria_from | ar es fr |
| `catalogue.filter.to` | 3:gn_databaseSearchFormCriteria_to | ar de es fr |
| `catalogue.pagination.first` | 4:IslDyn_PageNav_First | ar es fr |
| `catalogue.pagination.last` | 4:IslDyn_PageNav_Last | ar es fr |
| `catalogue.results.objects` | 4:pc_objects | ar es fr it |
| `catalogue.search.and` | 3:gn_and | ar de es fr it pt tr |
| `catalogue.search.keyword` | 3:mwnf_dbsearch_keywords | ar es fr |
| `catalogue.search.newSearch` | 3:gn_newsearch | ar es fr |
| `catalogue.search.or` | 3:gn_or | ar es fr |
| `catalogue.search.submit` | 3:search | ar es fr |
| `core.action.back` | 3:back | ar de es fr it |
| `core.action.close` | 3:museum_home_com_close | de es fr it pt tr |
| `core.nav.home` | 3:back_to_section | ar es fr pt tr |
| `core.pagination.next` / `previous` | 3:Next / 3:Previous | ar es fr |
| `core.project.explorePartners` | 3:dia_supporttexthead2 | ar es fr |
| `core.project.islamicArt` | 3:dia_supporttexthead | ar es fr pt se tr (de/it: the data package's own names) |
| `core.project.galleries` | 3:gn_galleries | ar |
| `core.project.sharingHistory` | 4:my_museum_select_sh | ar |
| `record.action.addToCollection` | 4:add_to_collection | ar es fr |
| `record.action.download` | 3:gn_download | ar es fr it pt se tr |
| `record.action.downloadPdf` | 3:gn_aspdf_img | ar de es fr it pt se tr |
| `record.action.hideShortDescription` | 3:pc_hide_sdesc | ar es fr |
| `record.action.viewShortDescription` | 4:pc_view_sdesc | ar de es fr |
| `record.citation.in` | 3:gn_in | ar es fr it |
| `record.citation.ofThisPage` | 4:db_citation | ar cs el fr |
| `record.glossary.close` | 3:museum_home_com_close | de es fr it pt tr |
| `record.glossary.definition` | 4:Glos_Spell_popup_definition | es fr |
| `record.glossary.heading` | 4:IslDyn_GlossPopUp_Header | es fr |
| `record.glossary.instructions` | 4:Glos_Spell_popup_txt1 | ar es fr |
| `record.media.photograph` | 4:db_photographer | ar de es fr it pt tr |
| `record.related.exhibitions` | 13:sh_home_exhibitions | de it pt se tr |
| `record.related.onDisplayIn` | 3:on_display_in | ar es fr |
| `record.related.timelineForItem` | 4:pc_view_hcr_item | ar es fr |
| `record.sheet.credits` | 3:footer4 | ar es fr it pt tr |
| `record.sheet.languages` | 3:languages | ar fr |
| `sheet.field.alsoKnownAs` | 3:db_alsoknowas | cs de es fr it pt tr |
| `sheet.field.artists` | 4:db_artists | de it pt |
| `sheet.field.bibliography` | 4:db_bibliography | ar cs de es fr it pt tr |
| `sheet.field.binding` | 4:db_binding_txt | ar es fr |
| `sheet.field.catalogueLink` | 4:db_catalogue_link_txt | ar es fr |
| `sheet.field.copyeditedBy` | 4:db_copyeditedby | ar cs de es fr it pt tr |
| `sheet.field.copyrightInformation` | 4:db_notice_b_title | ar cs fr it pt |
| `sheet.field.currentOwner` | 3:db_currentowner | cs de it pt |
| `sheet.field.datationMethod` | 3:objectdatationmethod | ar cs it pt |
| `sheet.field.date` | 3:gn_databaseSearchFormCriteria_dates | ar cs el es fr pt |
| `sheet.field.dateOfMonument` | 4:db_monumentdate | ar de fr it pt tr |
| `sheet.field.dateOfObject` | 4:db_objectdate | ar cs de el es fr it pt tr |
| `sheet.field.description` | 3:hcr_description | ar cs de el es fr it pt tr |
| `sheet.field.dimensions` | 4:db_dimensions | ar cs de el es fr it pt tr |
| `sheet.field.history` | 4:db_history | ar cs de es fr it pt tr |
| `sheet.field.holdingInstitution` | 13:sh_db_holdingmuseum | ar cs de es fr it pt tr |
| `sheet.field.holdingMuseum` | 4:db_holdingmuseum | ar cs de el es fr it pt tr |
| `sheet.field.inventoryNumber` | 4:db_museumnumberforobject | ar cs de el es fr it pt tr |
| `sheet.field.location` | 3:gn_dbsearch_location | cs de el es fr it pt |
| `sheet.field.materials` | 4:db_material | ar cs de el es fr it pt tr |
| `sheet.field.name` | 3:gn_dbsearch_name | ar de es fr it pt tr |
| `sheet.field.obtentionMethod` | 4:db_obtentionmethod | ar cs de es fr it pt tr |
| `sheet.field.originalOwner` | 4:db_originalowner | ar de es fr it pt tr |
| `sheet.field.patrons` | 4:db_Patrons | ar cs de es fr it pt tr |
| `sheet.field.periodDynasty` | 4:db_dynasty | ar de el es fr it pt tr |
| `sheet.field.placeOfProduction` | 4:db_production_db_place | ar cs es fr it pt |
| `sheet.field.preparedBy` | 4:db_preparedby | ar cs de es fr it pt tr |
| `sheet.field.provenance` | 3:gn_dbsearch_provenance | ar it pt |
| `sheet.field.provenanceMethod` | 4:db_provenanceestablished | ar de es fr it pt tr |
| `sheet.field.scribe` | 4:db_scribe | ar es fr |
| `sheet.field.shortDescription` | 8:short_descr | ar |
| `sheet.field.translationBy` | 4:db_translationby | ar de es fr it pt tr |
| `sheet.field.translationCopyeditedBy` | 4:db_translationcopyeditedby | ar de es fr it pt tr |
| `sheet.field.type` | 4:db_notice | ar cs de es fr it pt |
| `sheet.field.workingNumber` | 4:db_workingnumber | ar cs de el es fr it pt tr |
| `sheet.field.workshop` | 58:objWorkshop | ar de es fr it pt tr |
| `gallery.*` (ar es fr) | the rows listed above for the same labels, plus 3:footer1, 3:footer2, 3:cookie_policy, 3:legal_notice_title, 3:about, 3:home_artistic_intro, 4:my_collection, 18:overallDatabase, 18:searchRelatedDatabase, 4:db_partner, 3:timeline_header, 3:hcr_all_country, 4:item_relatedobjects, 3:gn_related_context, 4:see_database, 3:gn_see_gallery, 4:viewobjects, 4:pm_partner_profile, 3:read_more, 3:map, 4:logo | ar es fr |

Everything not listed — the Czech, Greek, Swedish and Turkish of most
entries, every `catalogue.results.*` sentence, the `record.*` chrome that the
legacy sites hard-coded in English, and the gallery essays (`about.body`,
`collection.intro`, `search.howTo`, `timeline.intro`), which the legacy
gallery client shipped in English only — was translated for this dictionary.

`se` is Swedish. The data packages declare it with the legacy code `se`
rather than the standard `sv`, and viewer-core matches codes as written, so
the file is named after what the packages say. If the exporters ever move to
`sv`, rename the six files in the same release.
