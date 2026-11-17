import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { BASELINE, BRAND_RENAMES, digest, headerLayout, presentation, protectedContent, RESET_EDITOR } from '../feasibility/fork-ui-contract.mjs'

const root = resolve(import.meta.dirname, '../..')
const homeConnectionContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-connection-ui.json'), 'utf8')) as { presentation: string }
function inheritedPresentation(path: string): string {
  const source = readFileSync(resolve(root, path), 'utf8')
  // The user explicitly authorized exactly one additional metric tile. Keep
  // the 0.0.2 contract unchanged for everything outside its marked subtree.
  return presentation(path === 'src/components/NodeCard.vue'
    ? source.replace(/<!-- TCP\/UDP connection counts -->[\s\S]*?<!-- \/TCP\/UDP connection counts -->/, '')
    : source)
}
const displayContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/display-ui-0.0.2.json'), 'utf8')) as { components: Record<string, string>, protectedFiles: Record<string, string>, headerLayout: string }
const contract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/fork-ui-contract.json'), 'utf8')) as {
  baseline: string
  configurationReference: string
  components: Record<string, string>
  protectedFiles: Record<string, string>
  headerLayout: string
  financeDialogPresentation: string
}

test('fork UI contract is bound to the immutable original source', () => {
  expect(contract.baseline).toBe(BASELINE)
  expect(contract.configurationReference).toBe(RESET_EDITOR)
  const files = readdirSync(resolve(root, 'src'), { recursive: true }).map(String).filter(path => path.endsWith('.vue')).map(path => `src/${path.replaceAll('\\', '/')}`).sort()
  expect(files).toEqual([...new Set([...Object.keys(contract.components).map(path => BRAND_RENAMES[path as keyof typeof BRAND_RENAMES] ?? path), ...Object.keys(displayContract.components)])].sort())
})

for (const [path, expected] of Object.entries(contract.components)) {
  test(`inherited element layout, visual attributes and styles: ${path}`, () => {
    const currentPath = BRAND_RENAMES[path as keyof typeof BRAND_RENAMES] ?? path
    // The 2026-11-17 request permits only the finance dialog's closed border
    // and compact layout. All other inherited presentation remains pinned.
    const accepted = displayContract.components[currentPath] ?? (path === 'src/components/FinanceDetailsDialog.vue' ? contract.financeDialogPresentation : expected)
    expect(inheritedPresentation(currentPath)).toBe(accepted)
  })
}

test('header layout helpers exactly match the inherited grid and dimensions', () => {
  expect(headerLayout(readFileSync(resolve(root, 'src/components/NodeGeneralCards.vue'), 'utf8'))).toBe(displayContract.headerLayout)
})

test('fork globe/map sources, image assets, styles, defaults and screenshot references stay unchanged', () => {
  for (const [path, expected] of Object.entries(contract.protectedFiles)) {
    const value = readFileSync(resolve(root, path))
    expect(digest(protectedContent(path, value)), path).toBe(displayContract.protectedFiles[path] ?? expected)
  }
})

test('0.0.2 UI exceptions are limited to the requested display surfaces', () => {
  expect(Object.keys(displayContract.components).sort()).toEqual(['src/components/CarrierOrderEditor.vue', 'src/components/LoadChart.vue', 'src/components/NodeCard.vue', 'src/components/NodeGeneralCards.vue', 'src/components/NodePingListCell.vue', 'src/components/PingHistoryLine.vue', 'src/components/ThemeSettingsPanel.vue', 'src/views/InstanceDetail.vue'].sort())
  expect(Object.keys(displayContract.protectedFiles).sort()).toEqual(['komari-theme.json', 'src/stores/app.ts'])
  for (const [path, expected] of Object.entries(displayContract.components))
    expect(inheritedPresentation(path), path).toBe(expected)
})

test('homepage connection tile is the sole newly authorized presentation subtree', () => {
  const source = readFileSync(resolve(root, 'src/components/NodeCard.vue'), 'utf8')
  expect(source.match(/<!-- TCP\/UDP connection counts -->/g)).toHaveLength(1)
  expect(source.match(/<!-- \/TCP\/UDP connection counts -->/g)).toHaveLength(1)
  expect(presentation(source)).toBe(homeConnectionContract.presentation)
})

test('the required source credit can only reuse the exact existing text style and target', () => {
  const original = '<template><p class="text-xs text-muted-foreground">{{ sourceLabels[source] }} {{ formatRateUpdatedAt() }}</p></template>'
  const credit = '<template><a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" class="text-xs text-muted-foreground">{{ sourceLabels[source] }} {{ formatRateUpdatedAt() }} Rates By Exchange Rate API</a></template>'
  expect(presentation(credit)).toBe(presentation(original))
  expect(presentation(credit.replace('text-xs', 'text-xl'))).not.toBe(presentation(original))
  expect(presentation(credit.replace('www.exchangerate-api.com', 'example.com'))).not.toBe(presentation(original))
})
