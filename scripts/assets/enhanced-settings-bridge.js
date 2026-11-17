// Owned Atlas extension; does not edit or copy the official React bundle.
// Only the active Atlas managed-settings page is routed to our five-category
// editor. All other official admin, login and terminal routes remain untouched.
;((SETTINGS_ROUTE) => {
  // Brand every owned admin/login/terminal document while retaining the site title.
  const brandTitle = () => {
    if (!document.title.includes('Atlas'))
      document.title = `${document.title || 'Komari 管理'} · Atlas`
  }
  brandTitle()
  new MutationObserver(brandTitle).observe(document.head, { childList: true, subtree: true, characterData: true })
  let checking = false
  async function openAtlasSettings() {
    if (checking || !SETTINGS_ROUTE.test(window.location.pathname))
      return
    const requested = new URL(window.location.href).searchParams.get('theme')
    if (requested && requested !== 'Enhanced')
      return
    checking = true
    try {
      const response = await window.fetch('/api/public', { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok)
        return
      const payload = await response.json()
      if (payload.status === 'success' && payload.data?.theme === 'Enhanced')
        window.location.replace('/?atlas_settings=nodes')
    }
    catch {
      // Keep the native admin page if discovery fails. Never inject settings,
      // credentials or a guessed authentication result into either application.
    }
    finally {
      checking = false
    }
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method]
    window.history[method] = function (...args) {
      const result = original.apply(this, args)
      void openAtlasSettings()
      return result
    }
  }
  window.addEventListener('popstate', () => void openAtlasSettings())
  void openAtlasSettings()
})(/^\/admin\/theme_managed\/?$/)
