// Read the fixed historical source, never the modified working tree.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { BASELINE, digest, headerLayout, presentation, protectedContent, RESET_EDITOR, RESET_EDITOR_COMPONENTS } from './fork-ui-contract.mjs'

const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', BASELINE], { encoding: 'utf8' }).trim().split('\n')
const read = (path, ref = BASELINE) => execFileSync('git', ['show', `${ref}:${path}`], { maxBuffer: 64 * 1024 * 1024 })
const components = Object.fromEntries(paths.filter(path => path.startsWith('src/') && path.endsWith('.vue')).map(path => [path, presentation(read(path, RESET_EDITOR_COMPONENTS.has(path) ? RESET_EDITOR : BASELINE).toString('utf8'))]))
const protectedPaths = paths.filter(path => path.startsWith('src/components/NodeEarth')
  || path.startsWith('public/images/') || path.startsWith('src/styles/')
  || path.startsWith('tests/visual/snapshots/')
  || ['komari-theme.json', 'src/stores/app.ts', 'src/utils/earthArcs.ts', 'src/composables/useNodeGeoClusters.ts'].includes(path))
const protectedFiles = Object.fromEntries(protectedPaths.map((path) => {
  const value = read(path)
  return [path, digest(protectedContent(path, value))]
}))
mkdirSync('tests/fixtures', { recursive: true })
writeFileSync('tests/fixtures/fork-ui-contract.json', `${JSON.stringify({ baseline: BASELINE, configurationReference: RESET_EDITOR, components, protectedFiles, headerLayout: headerLayout(read('src/components/NodeGeneralCards.vue').toString('utf8')) }, null, 2)}\n`)
process.stdout.write(`Captured ${Object.keys(components).length} inherited components and ${protectedPaths.length} protected files from ${BASELINE}.\n`)
