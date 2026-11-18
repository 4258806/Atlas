# Atlas 开发指南

Atlas 是 Vue 3 + TypeScript + Vite 构建的 Komari 静态主题，消费 Server/Agent 数据；可选回程组件位于 companion/。

## 环境与命令

依赖以 bun.lock 和 package.json 为准。CI 使用 Bun **1.3.14**、Node.js **24**、Linux。

    bun install --frozen-lockfile
    bun run dev
    bun run lint:check
    bun run type-check
    bun run test:unit
    bun run test:visual
    bun run build

lint:check 不改文件，lint 会自动修复。现有测试采用 Playwright，没有 bun test／Vitest 命令。Linux Helper 和原生 Komari 集成按实际范围运行；Windows 无法执行的 Linux fixture 不能记作通过。

## 目录与架构

| 目录          | 用途                                   |
| ------------- | -------------------------------------- |
| src/          | Vue 页面、组件、状态、服务和纯函数     |
| public/       | 静态资源、兼容管理页与许可证           |
| companion/    | 可选插件、节点附件与固定版本第三方源码 |
| distribution/ | 既有高级安装／打包工具，普通主题不需要 |
| scripts/      | 构建、发布与校验                       |
| tests/        | 单元、浏览器、Linux 与原生集成验证     |
| docs/         | 使用、开发、历史资料与发布证据         |

调用链保持 Component -> Composable -> Service -> RequestManager / CacheService -> API / RPC。组件负责展示，composable 连接 Vue 生命周期，service 处理业务与请求，utils/ 放纯函数。

- app store 统一归一化设置和权限，不在组件重复解析原始 theme_settings。
- node store 保持 Vue 响应式对象，实时指标无需刷新。
- 公共首页／详情保持公开；导出、私有数据和管理动作分别授权。
- 沿用共享请求去重、缓存维度和并发控制，不增加第二套业务请求链。
- 页面保持单根节点，避免破坏 Transition／KeepAlive。
- public/images/ 的旗帜、系统图标和运行时路径不可随意改名。

更多：[架构](Architecture.md)、[认证](Auth.md)、[缓存](Cache.md)、[数据流](DataFlow.md)、[源码规则](../src/AGENTS.md)。

## 品牌、提交与验证

当前产品名为 Atlas。版权和来源集中在 [FORK.md](../FORK.md)、[LICENSE](../LICENSE)、[THIRD_PARTY.md](../THIRD_PARTY.md)。旧 Enhanced 配置、插件协议、依赖包和 vendored 源码保留原标识。

先 Draft、预检、再 Ready，保留强制检查。UI 修改遵守[版本化契约](ui-contract-sop.md)，不覆盖历史基线。纯文档只查范围、链接、格式，不增加软件版本，不运行生产探针。功能改动执行完整受影响套件，区分 fixture、原生隔离与生产验收。

## 打包

版本只来自 komari-theme.json.version。构建生成 dist/ 和 komari-theme-Atlas-build-<short-sha>.zip，顶层仅 komari-theme.json、preview.png、dist/；预览来源为 docs/preview.png。

主题 Release 只上传主题 ZIP，SHA256 写进说明，组件在[独立页面](components.md)下载。[发布约定](releasing.md)
