// Bounded live-provider check. Prints metadata, never redistributes raw rates.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { createServer } from 'vite'

async function main() {
  const vite = await createServer({ configFile: false, resolve: { alias: { '@': resolve('src') } }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, appType: 'custom' })
  try {
    const { getSummaryExchangeRates } = await vite.ssrLoadModule('/src/services/exchangeRates.service.ts')
    const quote = await getSummaryExchangeRates(['USD', 'CNY'])
    const report = { source: quote.source, provider: quote.provider, updatedAt: quote.updatedAt, expiresAt: quote.expiresAt, coversUSDandCNY: Number.isFinite(quote.rates.USD) && quote.rates.USD > 0 && quote.rates.CNY === 1, rawRatesPublished: false }
    mkdirSync('test-results/finance', { recursive: true })
    writeFileSync('test-results/finance/live-provider.json', `${JSON.stringify(report, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify(report)}\n`)
    assert.equal(report.source, 'network')
    assert.equal(report.coversUSDandCNY, true)
  }
  finally { await vite.close() }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
