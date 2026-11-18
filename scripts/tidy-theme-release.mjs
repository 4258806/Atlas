import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import process from 'node:process'

const [tag, apply] = process.argv.slice(2)
if (!tag || !/^atlas-v\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/.test(tag) || (apply && apply !== '--apply')) {
  console.error('Usage: node scripts/tidy-theme-release.mjs atlas-v<version> [--apply]')
  process.exit(1)
}
const repo = 'MagnetOscar/Atlas'
const themeName = /^komari-theme-Atlas-build-[0-9a-f]+\.zip$/
function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
}
const release = JSON.parse(gh(['api', `repos/${repo}/releases/tags/${tag}`]))
const themes = release.assets.filter(asset => themeName.test(asset.name))
const metadata = release.assets.filter(asset => ['SHA256SUMS.txt', 'theme-build-verification.json', 'theme-code-verification.json'].includes(asset.name))
if (release.draft || release.prerelease || themes.length !== 1 || release.assets.length !== themes.length + metadata.length)
  throw new Error('Expected one stable theme ZIP and only recognized build metadata; component/unknown assets are never deleted')
const theme = themes[0]
if (!/^sha256:[0-9a-f]{64}$/.test(theme.digest ?? ''))
  throw new Error('GitHub theme digest is missing')
const digest = theme.digest.slice(7)
if (apply === '--apply') {
  const bytes = execFileSync('gh', ['api', `repos/${repo}/releases/assets/${theme.id}`, '-H', 'Accept: application/octet-stream'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
  if (createHash('sha256').update(bytes).digest('hex') !== digest)
    throw new Error('Downloaded theme digest mismatch')
  const body = release.body.includes(digest) ? release.body : `${release.body ?? ''}\n\nSHA256 (${theme.name}): \`${digest}\`\n`
  // Update the reviewable checksum before removing its separate attachment.
  execFileSync('gh', ['api', `repos/${repo}/releases/${release.id}`, '--method', 'PATCH', '--input', '-'], { input: Buffer.from(JSON.stringify({ body })), windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] })
  for (const asset of metadata)
    gh(['release', 'delete-asset', tag, asset.name, '--repo', repo, '--yes'])
}
console.log(JSON.stringify({ tag, theme: theme.name, sha256: digest, metadata: metadata.map(asset => asset.name), applied: apply === '--apply' }))
