import { expect, test } from '@playwright/test'
import { atlasMigrationPlan } from '../../src/utils/atlasIdentity'

const LEGACY = JSON.stringify({ trafficCycleConfig: 'kept', unknownFuture: { keep: true } })
const rows = (values: unknown[][], extra = {}) => ({ columns: ['short', 'data'], rows: values, truncated: false, ...extra })

test('an absent Atlas identity can copy the complete old configuration without filtering future keys', () => {
  expect(atlasMigrationPlan(rows([['Enhanced', LEGACY]]))).toEqual({ previous: null, legacy: LEGACY })
})
test('an existing empty Atlas identity uses its exact raw value for conditional migration', () => {
  expect(atlasMigrationPlan(rows([['Atlas', '{ }'], ['Enhanced', LEGACY]]))).toEqual({ previous: '{ }', legacy: LEGACY })
})
test('an existing Atlas setting always wins over a legacy configuration', () => {
  expect(atlasMigrationPlan(rows([['Atlas', '{"alreadySaved":true}'], ['Enhanced', LEGACY]]))).toBeNull()
})
test('fresh installations and empty legacy settings require no migration', () => {
  expect(atlasMigrationPlan(rows([]))).toBeNull()
  expect(atlasMigrationPlan(rows([['Enhanced', '{}']]))).toBeNull()
})
for (const data of [rows([['Atlas', 'null']]), rows([['Enhanced', '[]']]), rows([['Enhanced', '{broken']]), rows([['Other', '{}']]), rows([['Enhanced', '{}'], ['Enhanced', LEGACY]]), rows([], { truncated: true })]) {
  test(`invalid or ambiguous migration input refuses without producing a write plan: ${JSON.stringify(data)}`, () => {
    expect(() => atlasMigrationPlan(data)).toThrow()
  })
}
