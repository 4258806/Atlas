import { requirePermission } from '@/services/auth.service'
import { requestManager } from '@/services/request.service'
import { getSharedApi } from '@/utils/api'
import { atlasMigrationPlan } from '@/utils/atlasIdentity'
import { getSharedRpc } from '@/utils/rpc'

// Only an authenticated administrator may copy the old theme's configuration.
// The native conditional statement cannot overwrite an Atlas configuration
// created or changed by another administrator, and never modifies the old row.
export async function migrateAtlasConfiguration() {
  if (!(await requirePermission('advancedTools', { force: true })).granted)
    return null
  return requestManager.run('atlas:configuration:migration', async (signal) => {
    const rpc = getSharedRpc()
    if ((await rpc.getPublicSettings()).theme !== 'Atlas')
      return null
    const plan = atlasMigrationPlan(await rpc.getAtlasThemeConfigurationRows(signal))
    if (!plan)
      return null
    try {
      await rpc.copyLegacyAtlasConfiguration(plan.previous, plan.legacy, signal)
    }
    catch {
      // A timed-out request may already have committed; read back before
      // deciding success. Do not retry or compensate over a concurrent writer.
    }
    const after = await rpc.getAtlasThemeConfigurationRows(signal)
    const target = after.rows.find(row => row[0] === 'Atlas')
    if (!target || typeof target[1] !== 'string')
      throw new Error('Atlas 配置迁移未确认；旧配置仍保留')
    if (target[1] !== plan.legacy && atlasMigrationPlan(after))
      throw new Error('Atlas 配置迁移未确认；未覆盖并发设置')
    return getSharedApi().getPublicSettings()
  }, { retryAttempts: 0, timeout: 30000 })
}
