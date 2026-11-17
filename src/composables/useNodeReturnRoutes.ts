import type { MaybeRefOrGetter } from 'vue'
import type { ProtocolPaths } from '@/utils/routeProbeSnapshot'
import { computed, onScopeDispose, toValue, watch } from 'vue'
import { probeConnection, probeSnapshot, publicProbeSnapshot, subscribePublicRouteProbe, subscribeRouteProbe } from '@/services/routeProbe.service'
import { useAppStore } from '@/stores/app'
import { resolveReturnRoutes } from '@/utils/returnRoutes'
import { protocolRouteDisplay, withProbeResults } from '@/utils/routeProbeSnapshot'

export function useNodeReturnRoutes(uuid: MaybeRefOrGetter<string>) {
  const app = useAppStore()
  let release: (() => void) | undefined
  let releasePublic: (() => void) | undefined
  const connected = computed(() => app.returnRouteCompanionEnabled && app.returnRouteAutoEnabled && app.returnRoutesVisible && app.privateFeaturesAllowed)
  const publicConnected = computed(() => app.returnRouteHomeTileEnabled && app.returnRouteCompanionEnabled && app.returnRouteAutoEnabled && app.returnRoutesVisible && !app.privateFeaturesAllowed)
  const activeSnapshot = computed(() => connected.value ? probeSnapshot.value : publicProbeSnapshot.value)
  watch(publicConnected, (enabled) => {
    releasePublic?.()
    releasePublic = enabled ? subscribePublicRouteProbe() : undefined
  }, { immediate: true })
  watch(connected, (enabled) => {
    release?.()
    release = enabled ? subscribeRouteProbe() : undefined
  }, { immediate: true })
  onScopeDispose(() => {
    release?.()
    releasePublic?.()
  })
  const document = computed(() => {
    const id = toValue(uuid)
    const base = publicConnected.value
      ? { version: 1 as const, nodes: { [id]: { manual: app.returnRouteConfig.document.nodes[id]?.manual ?? {}, auto: {} } } }
      : app.returnRouteConfig.document
    return connected.value || publicConnected.value ? withProbeResults(base, id, activeSnapshot.value) : base
  })
  const rawEvidence = computed(() => app.privateFeaturesAllowed ? document.value.nodes[toValue(uuid)]?.auto : undefined)
  const protocolEvidence = computed(() => {
    const node = activeSnapshot.value.nodes[toValue(uuid)]
    if (!(connected.value || publicConnected.value) || !node?.enabled || !node.protocols)
      return undefined
    const paths: ProtocolPaths = {}
    for (const carrier of ['telecom', 'unicom', 'mobile'] as const) {
      const incoming = node.auto[carrier]
      const saved = connected.value ? app.returnRouteConfig.document.nodes[toValue(uuid)]?.auto[carrier] : undefined
      if (incoming && (!saved || Date.parse(incoming.collectedAt) >= Date.parse(saved.collectedAt)))
        paths[carrier] = node.protocols[carrier]
    }
    return paths
  })
  // Legacy inline auto data is not authorization to publish measurements.
  // Live automatic evidence comes only from the administrator-only snapshot.
  const entries = computed(() => resolveReturnRoutes(document.value, toValue(uuid), app.returnRouteAutoEnabled && (connected.value || publicConnected.value), app.returnRouteTtlHours, app.returnRouteNow).map((entry) => {
    const paths = protocolEvidence.value?.[entry.carrier]
    return paths ? protocolRouteDisplay(toValue(uuid), entry, paths, app.returnRouteTtlHours, app.returnRouteNow) : entry
  }))
  const companionStatus = computed(() => !app.returnRouteCompanionEnabled ? '' : !app.privateFeaturesAllowed ? '自动结果仅管理员可见' : !app.returnRouteAutoEnabled ? '自动结果消费已关闭' : `${probeConnection.value} · ${probeSnapshot.value.nodes[toValue(uuid)]?.state ?? '等待助手'}`)
  return { entries, rawEvidence, protocolEvidence, companionStatus, visible: computed(() => app.returnRoutesVisible), configError: computed(() => app.returnRouteConfig.error) }
}
