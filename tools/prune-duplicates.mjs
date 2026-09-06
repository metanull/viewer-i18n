#!/usr/bin/env node
// One-off for viewer-i18n 2.0.0 (viewer-i18n#13): remove from `gallery/` and
// `exhibition/` every entry that a `core.*`, `catalogue.*`, `sheet.*` or
// `record.*` entry replaced in 1.7.0. Kept in the repository so the CHANGELOG's
// list can be regenerated and so the rule is readable: an entry goes when a
// shared one says the same thing; what only a gallery or an exhibition says
// stays.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

// The suffixes (after the namespace) that a shared entry replaces.
const REPLACED = [
  // catalogue.era.*
  'era.ad', 'era.after', 'era.bc', 'era.before',
  // catalogue.facet.*
  'facet.any', 'facet.artist', 'facet.country', 'facet.endDate', 'facet.filterBy', 'facet.filterFurtherBy',
  'facet.material', 'facet.periodDynasty', 'facet.selectCountry', 'facet.startDate', 'facet.subject', 'facet.type',
  // catalogue.filter.*
  'filter.from', 'filter.to',
  // record.glossary.*
  'glossary.definition', 'glossary.instructions',
  // record.action.* / record.citation.* / record.related.* / record.media.* / record.sheet.*
  'item.addToCollection', 'item.citation', 'item.download', 'item.downloadPdf', 'item.in', 'item.onDisplayIn',
  'item.photograph', 'item.sourceDatabase', 'item.timeline',
  // catalogue.pagination.*
  'pagination.first', 'pagination.last', 'pagination.page',
  // core.project.*
  'project.baroqueArt', 'project.carpetArt', 'project.explorePartners', 'project.glassArt', 'project.islamicArt',
  'project.sharingHistory', 'project.tableIsSet',
  // record.related.audioVideo
  'related.audioVideos',
  // catalogue.results.*
  'results.allObjects', 'results.forProject', 'results.heading', 'results.noResults', 'results.objects',
  'results.outOf', 'results.timelineForSearch',
  // catalogue.search.*
  'search.howTo', 'search.howToLink', 'search.submit',
  // sheet.field.*
  'sheet.alsoKnownAs', 'sheet.artists', 'sheet.bibliography', 'sheet.binding', 'sheet.catalogueLink',
  'sheet.copyeditedBy', 'sheet.copyrightInformation', 'sheet.currentOwner', 'sheet.datationMethod', 'sheet.date',
  'sheet.description', 'sheet.dimensions', 'sheet.holdingMuseum', 'sheet.inventoryNumber', 'sheet.location',
  'sheet.materials', 'sheet.name', 'sheet.obtentionMethod', 'sheet.originalOwner', 'sheet.periodDynasty',
  'sheet.placeOfProduction', 'sheet.preparedBy', 'sheet.provenance', 'sheet.provenanceMethod', 'sheet.scribe',
  'sheet.shortDescription', 'sheet.translationBy', 'sheet.translationCopyeditedBy', 'sheet.type',
  'sheet.workingNumber', 'sheet.workshop',
  // core.action.back / core.action.go / catalogue.results.resetFilters / core.action.close
  'action.back', 'action.go', 'action.resetFilters', 'ui.close',
  // layout.nav.menu / record.glossary.heading / record.related.exhibitions
  'nav.menu', 'nav.glossary', 'nav.exhibitions',
]

const removed = {}
for (const namespace of ['gallery', 'exhibition']) {
  const dir = join(root, namespace)
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, file)
    const entries = JSON.parse(readFileSync(path, 'utf8'))
    const kept = {}
    for (const [key, value] of Object.entries(entries)) {
      const suffix = key.slice(namespace.length + 1)
      if (REPLACED.includes(suffix)) {
        ;(removed[namespace] ??= new Set()).add(key)
      } else {
        kept[key] = value
      }
    }
    writeFileSync(path, JSON.stringify(kept, null, 2) + '\n', 'utf8')
  }
}

for (const [namespace, keys] of Object.entries(removed)) {
  console.log(`${namespace}: ${keys.size} entries removed`)
  for (const key of [...keys].sort()) console.log(`  - \`${key}\``)
}
