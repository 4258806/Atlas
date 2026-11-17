import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { BASELINE, digest, headerLayout, presentation } from '../feasibility/fork-ui-contract.mjs'

const root = resolve(import.meta.dirname, '../..')
const contract = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/fork-ui-contract.json'), 'utf8')) as {
  baseline: string
  components: Record<string, string>
  protectedFiles: Record<string, string>
  headerLayout: string
}

test('fork UI contract is bound to the immutable original source', () => {
  expect(contract.baseline).toBe(BASELINE)
  const files = readdirSync(resolve(root, 'src'), { recursive: true }).map(String).filter(path => path.endsWith('.vue')).map(path => `src/${path.replaceAll('\\', '/')}`).sort()
  expect(files).toEqual(Object.keys(contract.components).sort())
})

for (const [path, expected] of Object.entries(contract.components)) {
  test(`inherited element layout, visual attributes and styles: ${path}`, () => {
    expect(presentation(readFileSync(resolve(root, path), 'utf8'))).toBe(expected)
  })
}

test('header layout helpers exactly match the inherited grid and dimensions', () => {
  expect(headerLayout(readFileSync(resolve(root, 'src/components/NodeGeneralCards.vue'), 'utf8'))).toBe(contract.headerLayout)
})

test('fork globe/map sources, image assets, styles, defaults and screenshot references stay unchanged', () => {
  for (const [path, expected] of Object.entries(contract.protectedFiles)) {
    const value = readFileSync(resolve(root, path))
    const normalized = /\.(?:vue|ts|css|json|svg)$/.test(path) ? value.toString('utf8').replaceAll('\r\n', '\n') : value
    expect(digest(normalized), path).toBe(expected)
  }
})
