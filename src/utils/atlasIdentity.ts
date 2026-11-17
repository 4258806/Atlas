export interface ThemeConfigurationRows { columns: string[], rows: unknown[][], truncated?: boolean }
export interface AtlasMigrationPlan { previous: string | null, legacy: string }

export function atlasMigrationPlan(result: ThemeConfigurationRows): AtlasMigrationPlan | null {
  if (result.truncated || result.columns.join(',') !== 'short,data' || result.rows.length > 2)
    throw new Error('Atlas 配置迁移读取不完整；未写入')
  const records = new Map<string, { raw: string, values: Record<string, unknown> }>()
  for (const row of result.rows) {
    const [short, raw] = row
    if (row.length !== 2 || (short !== 'Atlas' && short !== 'Enhanced') || typeof raw !== 'string' || records.has(short))
      throw new Error('Atlas 配置迁移格式无效；未写入')
    const values = JSON.parse(raw)
    if (!values || typeof values !== 'object' || Array.isArray(values))
      throw new Error('Atlas 配置迁移内容无效；未写入')
    records.set(short, { raw, values })
  }
  const target = records.get('Atlas')
  const legacy = records.get('Enhanced')
  if ((target && Object.keys(target.values).length) || !legacy || !Object.keys(legacy.values).length)
    return null
  return { previous: target?.raw ?? null, legacy: legacy.raw }
}
