import { Buffer } from 'node:buffer'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { BASELINE, BRAND_RENAMES, digest, headerLayout, presentation, protectedContent, RESET_EDITOR } from '../feasibility/fork-ui-contract.mjs'

const root = resolve(import.meta.dirname, '../..')
const homeConnectionContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-connection-ui.json'), 'utf8')) as { presentation: string }
const homeRouteContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-route-ui-0.0.3.json'), 'utf8')) as { components: Record<string, string>, protectedFiles: Record<string, string> }
const qualityContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-route-ui-0.0.4.json'), 'utf8')) as { components: Record<string, string> }
const homeUi005Contract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-ui-0.0.5.json'), 'utf8')) as { components: Record<string, string>, protectedFiles: Record<string, string> }
const globeContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-ui-0.0.6.json'), 'utf8')) as { components: Record<string, string>, protectedFiles: Record<string, string> }
const pulseContract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/home-ui-0.0.7.json'), 'utf8')) as { components: Record<string, string>, protectedFiles: Record<string, string> }
const homeUiContract = {
  components: { ...homeUi005Contract.components, ...globeContract.components, ...pulseContract.components },
  protectedFiles: { ...homeUi005Contract.protectedFiles, ...globeContract.protectedFiles, ...pulseContract.protectedFiles },
}

test('0.0.7 UI exception covers only the reviewed PR23 pulse timing', () => {
  const paths = ['src/components/NodeEarthRealisticGlobe.vue']
  expect(Object.keys(pulseContract.components)).toEqual(paths)
  expect(Object.keys(pulseContract.protectedFiles)).toEqual(paths)
})

test('0.0.6 UI exception covers only the two reviewed PR22 globe renderers', () => {
  const paths = ['src/components/NodeEarthCobeGlobe.vue', 'src/components/NodeEarthRealisticGlobe.vue']
  expect(Object.keys(globeContract.components).sort()).toEqual(paths)
  expect(Object.keys(globeContract.protectedFiles).sort()).toEqual(paths)
})
function withoutRouteTile(source: string): string {
  return source.replace(/<!-- Homepage return-route tile -->[\s\S]*?<!-- \/Homepage return-route tile -->/, '').replace('NodeReturnRoutes v-if="!appStore.returnRouteHomeTileEnabled"', 'NodeReturnRoutes')
}
function inheritedPresentation(path: string): string {
  const source = readFileSync(resolve(root, path), 'utf8')
  // The user explicitly authorized exactly one additional metric tile. Keep
  // the 0.0.2 contract unchanged for everything outside its marked subtree.
  return presentation(path === 'src/components/NodeCard.vue'
    ? withoutRouteTile(source).replace(/<!-- TCP\/UDP connection counts -->[\s\S]*?<!-- \/TCP\/UDP connection counts -->/, '')
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
  expect(files).toEqual([...new Set([...Object.keys(contract.components).map(path => BRAND_RENAMES[path as keyof typeof BRAND_RENAMES] ?? path), ...Object.keys(displayContract.components), ...Object.keys(homeRouteContract.components)])].sort())
})

for (const [path, expected] of Object.entries(contract.components)) {
  test(`inherited element layout, visual attributes and styles: ${path}`, () => {
    const currentPath = BRAND_RENAMES[path as keyof typeof BRAND_RENAMES] ?? path
    // The 2026-11-18 PR #20 UI revision covers the listed components in
    // home-ui-0.0.5.json; all other inherited presentation remains pinned.
    const accepted = homeUiContract.components[currentPath]
      ?? displayContract.components[currentPath]
      ?? (path === 'src/components/FinanceDetailsDialog.vue' ? contract.financeDialogPresentation : expected)
    const actual = homeUiContract.components[currentPath]
      ? presentation(readFileSync(resolve(root, currentPath), 'utf8'))
      : inheritedPresentation(currentPath)
    expect(actual).toBe(accepted)
  })
}

test('header layout helpers exactly match the inherited grid and dimensions', () => {
  expect(headerLayout(readFileSync(resolve(root, 'src/components/NodeGeneralCards.vue'), 'utf8'))).toBe(displayContract.headerLayout)
})

test('fork globe/map sources, image assets, styles, defaults and screenshot references stay unchanged', () => {
  for (const [path, expected] of Object.entries(contract.protectedFiles)) {
    let value = readFileSync(resolve(root, path))
    if (path === 'komari-theme.json') {
      const manifest = JSON.parse(value.toString())
      expect(manifest.configuration.data.filter((f: { key?: string }) => f.key === 'returnRouteHomeTileEnabled')).toHaveLength(1)
      manifest.configuration.data = manifest.configuration.data.filter((f: { key?: string }) => f.key !== 'returnRouteHomeTileEnabled')
      value = Buffer.from(JSON.stringify(manifest))
    }
    if (path === 'src/stores/app.ts')
      value = Buffer.from(value.toString().replace(/^.*const returnRouteHomeTileEnabled = .*\r?\n/m, '').replace(/^ {4}returnRouteHomeTileEnabled,\r?\n/m, ''))
    expect(digest(protectedContent(path, value)), path).toBe(homeUiContract.protectedFiles[path] ?? displayContract.protectedFiles[path] ?? expected)
  }
})

test('0.0.2 UI exceptions are limited to the requested display surfaces', () => {
  expect(Object.keys(displayContract.components).sort()).toEqual(['src/components/CarrierOrderEditor.vue', 'src/components/LoadChart.vue', 'src/components/NodeCard.vue', 'src/components/NodeGeneralCards.vue', 'src/components/NodePingListCell.vue', 'src/components/PingHistoryLine.vue', 'src/components/ThemeSettingsPanel.vue', 'src/views/InstanceDetail.vue'].sort())
  expect(Object.keys(displayContract.protectedFiles).sort()).toEqual(['komari-theme.json', 'src/stores/app.ts'])
  for (const [path, expected] of Object.entries(displayContract.components)) {
    const actual = homeUiContract.components[path]
      ? presentation(readFileSync(resolve(root, path), 'utf8'))
      : inheritedPresentation(path)
    expect(actual, path).toBe(homeUiContract.components[path] ?? expected)
  }
})

test('homepage connection tile is the sole newly authorized presentation subtree', () => {
  const source = readFileSync(resolve(root, 'src/components/NodeCard.vue'), 'utf8')
  expect(source.match(/<!-- TCP\/UDP connection counts -->/g)).toHaveLength(1)
  expect(source.match(/<!-- \/TCP\/UDP connection counts -->/g)).toHaveLength(1)
  expect(presentation(source)).toBe(homeUiContract.components['src/components/NodeCard.vue'] ?? homeConnectionContract.presentation)
})

test('0.0.3 surrounding UI stays fixed; only the authorized 0.0.4/0.0.5 panel and globe avoidance change', () => {
  expect(Object.keys(homeRouteContract.components).sort()).toEqual(['src/components/NodeCard.vue', 'src/components/NodeReturnRouteTile.vue'])
  expect(Object.keys(qualityContract.components).sort()).toEqual(['src/components/NodeCard.vue', 'src/components/NodeReturnRouteTile.vue'])
  for (const [path, hash] of Object.entries(homeRouteContract.components))
    expect(presentation(readFileSync(resolve(root, path), 'utf8'))).toBe(homeUiContract.components[path] ?? qualityContract.components[path] ?? hash)
  for (const [path, hash] of Object.entries(homeRouteContract.protectedFiles))
    expect(digest(protectedContent(path, readFileSync(resolve(root, path))))).toBe(hash)
})

test('the required source credit can only reuse the exact existing text style and target', () => {
  const original = '<template><p class="text-xs text-muted-foreground">{{ sourceLabels[source] }} {{ formatRateUpdatedAt() }}</p></template>'
  const credit = '<template><a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" class="text-xs text-muted-foreground">{{ sourceLabels[source] }} {{ formatRateUpdatedAt() }} Rates By Exchange Rate API</a></template>'
  expect(presentation(credit)).toBe(presentation(original))
  expect(presentation(credit.replace('text-xs', 'text-xl'))).not.toBe(presentation(original))
  expect(presentation(credit.replace('www.exchangerate-api.com', 'example.com'))).not.toBe(presentation(original))
})
