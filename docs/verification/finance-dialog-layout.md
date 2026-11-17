# Finance dialog layout adjustment — 2026-11-17

The user explicitly requests a narrow exception to the inherited UI rule for the value/cost dialog: close the summary border with rounded corners and reduce the whitespace separating the tabs, free-node filter and table. This does not authorize changes to other views or to globe/map rendering.

The inherited baseline contains both the open `border-y` summary and the tabs root with no explicit column direction. Atlas retains that presentation in 0.0.1. The shared tabs root's conditional direction does not take effect here, leaving the toolbar and content side by side. Set `flex-col` on this dialog's tabs root only; retain the shared component and all its other consumers. Use one closed rounded summary border, keep the toolbar above a full-width content panel, and retain the existing currency selector beside the table heading.

Calculation audit: node rows use native remaining/monthly costs. The header converts through CNY into the selected single currency; `fin_currency` persists the selection. The third number is the selected node's separate metered estimate in its configured pricing currency, not a fixed monthly bill. No calculation or rate-source logic changes in this patch.

The inherited contract digest remains recorded. A separate finance-dialog presentation digest records this explicit exception; all other presentation and protected-file checks remain unchanged. Browser validation covers desktop/mobile, light/dark, closed borders, panel/toolbar alignment, all tabs and native-node/single-summary-currency persistence.

The follow-up review also requests visible original tab icons and correctly centered labels/selection. The three original Tabler glyphs are bundled locally from the existing icon data; other icon loading stays unchanged. Explicit full-height, equal-width grid buttons center both the icon/text group and selected background. Mobile tabs occupy their own row so the free-node filter cannot overlap them.

Validation: non-fixing lint, type-check and production build pass. All 100 finance/UI contract checks and 12 Chromium browser cases pass, including 390/1440px, light/dark, all three visible SVG icons, icon/text centering, no filter overlap, tab switching, native currencies and summary-currency persistence. GitHub required checks follow on the development PR. No release or production installation in this task; generated development ZIPs are not a deliverable.
