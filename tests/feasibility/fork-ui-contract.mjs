// Capture the inherited presentation independently from business text/bindings.
import { createHash } from 'node:crypto'
import { NodeTypes, parse as parseTemplate } from '@vue/compiler-dom'
import { parse } from '@vue/compiler-sfc'

export const BASELINE = '0332d5f7c73f7994ba21c01e4b739d04835120b1'
export const digest = value => createHash('sha256').update(value).digest('hex')
const visualBindings = new Set(['class', 'style', 'width', 'height', 'size', 'variant', 'orientation', 'placement', 'align', 'side', 'is'])

function elements(node) {
  return (node.children ?? []).filter(child => child.type === NodeTypes.ELEMENT).map((child) => {
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
