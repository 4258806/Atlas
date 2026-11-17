import { expect, test } from '@playwright/test'
import { carrierOrder, pingLineSegments, validCarrierOrder } from '../../src/utils/displayPreferences'
import { validateThemePatch } from '../../src/utils/themeSettings'

test('carrier permutations are explicit, unique and complete; bad legacy input falls back', () => {
  for (const a of ['unicom', 'telecom', 'mobile']) {
    for (const b of ['unicom', 'telecom', 'mobile'].filter(k => k !== a)) {
      const c = ['unicom', 'telecom', 'mobile'].find(k => k !== a && k !== b)!
      const input = [a, b, c].join(',')
      expect(carrierOrder(input)).toEqual([a, b, c])
      expect(validCarrierOrder(input)).toBe(true)
      expect(() => validateThemePatch({ carrierOrder: input })).not.toThrow()
    }
  }
  for (const invalid of [undefined, '', 'mobile,mobile,unicom', 'mobile,unicom', 'mobile,unicom,unknown', {}, 'mobile, unicom,telecom']) {
    expect(validCarrierOrder(invalid)).toBe(false)
    expect(() => validateThemePatch({ carrierOrder: invalid })).toThrow()
  }
  expect(carrierOrder(undefined)).toEqual(['unicom', 'telecom', 'mobile'])
})

test('line preserves null/invalid gaps, true zero, single samples and constant histories', () => {
  expect(pingLineSegments([])).toEqual([])
  expect(pingLineSegments([null, Number.NaN, -1])).toEqual([])
  expect(pingLineSegments([1, 2, null, 3, 4])).toHaveLength(2)
  expect(pingLineSegments([0])).toEqual(['50.00,6.00'])
  expect(pingLineSegments([5, 5])).toEqual(['1.00,6.00 99.00,6.00'])
  expect(pingLineSegments([0, 100])).toEqual(['1.00,11.00 99.00,1.00'])
})

test('new preferences accept only declared display values and boolean switches', () => {
  expect(() => validateThemePatch({ pingDisplayStyle: '波浪线', showTcpConnections: false, showUdpConnections: true })).not.toThrow()
  for (const patch of [{ pingDisplayStyle: 'invented' }, { showTcpConnections: 'false' }, { showUdpConnections: 0 }])
    expect(() => validateThemePatch(patch)).toThrow()
})
