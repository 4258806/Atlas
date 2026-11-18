# UI 变更与契约门禁标准操作流程（SOP）

本 SOP 用于杜绝在已授权的 UI 调整中，因遗漏 `tests/unit/fork-ui.spec.ts` 契约更新而导致 CI `Code Quality` 失败。

## 适用范围

凡修改以下任意内容并提交 PR 时，必须完整执行本流程：

- `src/` 下任意 `.vue` 文件（模板、样式或视觉属性）
- `src/styles/`、`komari-theme.json`、`src/stores/app.ts` 中的受保护展示字段
- 地图／地球组件（`src/components/NodeEarth*.vue`、`src/utils/earthArcs.ts`、`src/composables/useNodeGeoClusters.ts`）

## 常见失败根因

1. `tests/unit/fork-ui.spec.ts` 会对 `tests/fixtures/fork-ui-contract.json` 中登记的所有组件计算模板／样式 AST 哈希（`presentation()`），并对 `protectedFiles` 计算内容哈希（`protectedContent()`）。
2. 仅修改业务组件源码、未同步登记新版本授权契约 JSON 或未检查模板注释锚点（如 `<!-- TCP/UDP connection counts -->` 次数断言），会直接在 CI `Unit and component tests` 阶段报错阻断合入。

## 标准执行步骤

1. **锁定最小改动范围**：严格按用户授权修改目标组件，禁止顺带改动未授权的页面布局、样式或受保护资源。
2. **检查模板契约锚点**：确认 `tests/unit/fork-ui.spec.ts` 中的字符串／正则断言（如唯一注释标记）在新模板中不被重复或破坏。
3. **保留历史契约，新增版本化白名单**：
   - 不覆盖 `fork-ui-contract.json`、`display-ui-*.json`、`home-route-ui-*.json` 等历史契约文件。
   - 在 `tests/fixtures/` 新增独立契约文件（如 `home-ui-<version>.json`），仅写入本次改动文件对应的 `components` 哈希与 `protectedFiles` 哈希，并写明 `authorization` 授权依据。
4. **最小化更新 `tests/unit/fork-ui.spec.ts`**：让新契约仅覆盖本次授权变更的文件集合，保持其余未修改组件与静态资源继续受原始基线严格校验。
5. **推送 PR 前本地必检清单**：
   - 运行代码规范检查（`lint:check`，要求 0 warning）
   - 运行 `tests/unit/fork-ui.spec.ts`（全部契约用例通过）
   - 运行受影响的视觉回归用例及生产构建（`build`）
   - 若影响 `tests/visual/visual.spec.ts` 的基准截图，需基于 Linux CI 预期结果同步更新对应快照，禁止私自放宽容差或跳过测试
