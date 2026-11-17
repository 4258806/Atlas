// Read the fixed historical source, never the modified working tree.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { BASELINE, digest, headerLayout, presentation } from './fork-ui-contract.mjs'

const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', BASELINE], { encoding: 'utf8' }).trim().split('\n')
const read = path => execFileSync('git', ['show', `${BASELINE}:${path}`], { maxBuffer: 64 * 1024 * 1024 })
const TEXT_FILE = /\.(?:vue|ts|css|json|svg)$/
const components = Object.fromEntries(paths.filter(path => path.startsWith('src/') && path.endsWith('.vue')).map(path => [path, presentation(read(path).toString('utf8'))]))
const protectedPaths = paths.filter(path => path.startsWith('src/components/NodeEarth')
  || path.startsWith('public/images/') || path.startsWith('src/styles/')
  || path.startsWith('tests/visual/snapshots/')
  || ['komari-theme.json', 'src/stores/app.ts', 'src/utils/earthArcs.ts', 'src/composables/useNodeGeoClusters.ts'].includes(path))
const protectedFiles = Object.fromEntries(protectedPaths.map((path) => {
  const value = read(path)
  return [path, digest(TEXT_FILE.test(path) ? value.toString('utf8').replaceAll('\r\n', '\n') : value)]
}))
mkdirSync('tests/fixtures', { recursive: true })
writeFileSync('tests/fixtures/fork-ui-contract.json', `${JSON.stringify({ baseline: BASELINE, components, protectedFiles, headerLayout: headerLayout(read('src/components/NodeGeneralCards.vue').toString('utf8')) }, null, 2)}\n`)
process.stdout.write(`Captured ${Object.keys(components).length} inherited components and ${protectedPaths.length} protected files from ${BASELINE}.\n`)
