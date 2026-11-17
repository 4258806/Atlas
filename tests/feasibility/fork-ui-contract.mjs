// Capture the inherited presentation independently from business text/bindings.
import { createHash } from 'node:crypto'
import { NodeTypes, parse as parseTemplate } from '@vue/compiler-dom'
import { parse } from '@vue/compiler-sfc'

export const BASELINE = '0332d5f7c73f7994ba21c01e4b739d04835120b1'
export const RESET_EDITOR = '2d658f641ef9401b7426527014ec73bfa9404f5f'
export const RESET_EDITOR_COMPONENTS = new Set(['src/components/TrafficCycleRow.vue', 'src/components/TrafficCycleManager.vue'])
export const digest = value => createHash('sha256').update(value).digest('hex')
export const BRAND_RENAMES = { 'src/components/EnhancedManagementDialog.vue': 'src/components/AtlasManagementDialog.vue' }
const visualBindings = new Set(['class', 'style', 'width', 'height', 'size', 'variant', 'orientation', 'placement', 'align', 'side', 'is'])
const TEXT_FILE = /\.(?:vue|ts|css|json|svg)$/

export function protectedContent(path, value) {
  if (path === 'komari-theme.json') {
    const manifest = JSON.parse(value.toString('utf8'))
    delete manifest.version // Independent release metadata, not a UI default.
    // Exact user-authorized brand metadata only; configuration/defaults remain protected.
    if (manifest.name === 'Atlas' && manifest.short === 'Atlas' && manifest.author === 'MagnetOscar'
      && manifest.url === 'https://github.com/MagnetOscar/Atlas'
      && manifest.description === 'Atlas — Komari theme with independent reset schedules and native-currency node billing') {
      manifest.name = 'Glassmorphism Enhanced'
      manifest.short = 'Enhanced'
      manifest.author = 'casiuna'
      manifest.url = 'https://github.com/casiuna/Glassmorphism-Enhanced'
      manifest.description = 'Glassmorphism Enhanced with three-network latency/loss panels and automatic globe arcs'
    }
    return JSON.stringify(manifest)
  }
  return TEXT_FILE.test(path) ? value.toString('utf8').replaceAll('\r\n', '\n') : value
}

function elements(node) {
  return (node.children ?? []).filter(child => child.type === NodeTypes.ELEMENT).map((child) => {
    // Required API attribution occupies the pre-existing rate-source text slot.
    // Only this exact link may normalize to its inherited paragraph; the same
    // visual class is required, and no nested styled elements are allowed.
    const attrs = Object.fromEntries(child.props.filter(prop => prop.type === NodeTypes.ATTRIBUTE).map(prop => [prop.name, prop.value?.content ?? true]))
    if (child.tag === 'a' && child.props.length === 4
      && attrs.href === 'https://www.exchangerate-api.com' && attrs.target === '_blank'
      && attrs.rel === 'noopener noreferrer' && attrs.class === 'text-xs text-muted-foreground'
      && child.loc.source.includes('sourceLabels[source]') && child.loc.source.includes('formatRateUpdatedAt()')
      && !child.children.some(value => value.type === NodeTypes.ELEMENT)) {
      return ['p', [['class', 'text-xs text-muted-foreground']], []]
    }
    const attributes = child.props.flatMap((prop) => {
      if (prop.type === NodeTypes.ATTRIBUTE)
        return [[prop.name, prop.value?.content ?? true]]
      if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION && visualBindings.has(prop.arg.content))
        return [[`:${prop.arg.content}`, prop.exp?.content ?? '']]
      return []
    })
    return [child.tag, attributes, elements(child)]
  })
}

export function presentation(source) {
  // Branding changes only text and the exact footer project link. Preserve all
  // visual attributes/styles, including for the renamed manager component.
  source = source.replaceAll('AtlasManagementDialog', 'EnhancedManagementDialog')
    .replaceAll('data-atlas-', 'data-enhanced-')
    .replaceAll('atlas-tab-', 'enhanced-tab-')
    .replaceAll('atlas-panel-', 'enhanced-panel-')
    .replaceAll('atlas-emerald-grid', 'glassmorphism-emerald-grid')
    .replaceAll('title="Atlas 集中管理"', 'title="Enhanced 集中管理"')
    .replaceAll('aria-label="Atlas 主题设置分类"', 'aria-label="Enhanced 主题设置分类"')
    .replaceAll('href="https://github.com/MagnetOscar/Atlas"', 'href="https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism"')
  const { descriptor, errors } = parse(source)
  if (errors.length)
    throw new Error('Invalid Vue source in UI contract')
  return digest(JSON.stringify({
    template: descriptor.template ? elements(parseTemplate(descriptor.template.content)) : [],
    styles: descriptor.styles.map(style => [style.attrs, style.content.replaceAll('\r\n', '\n')]),
  }))
}

export function headerLayout(source) {
  const start = source.indexOf('const visibleCards = ')
  const end = source.indexOf('function activateCard(')
  if (start < 0 || end < start)
    throw new Error('Missing inherited header layout helpers')
  return digest(source.slice(start, end).replaceAll('\r\n', '\n'))
}
