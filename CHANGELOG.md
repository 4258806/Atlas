# Atlas 更新记录

日期为北京时间。仅记录已发布的 Atlas 软件版本；未合并 PR 不算发布内容。上游历史见[归档](docs/archive/upstream-changelog.md)。

## 0.0.6 — 2026-11-19

- 合入 PR #22：修复真实地球长距离连线被球面遮挡，保留国旗淡出期间的连线避让。
- 降低点阵地球连线高度，修复顶部裁切。

[Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.6) · [完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.5...atlas-v0.0.6)

## 0.0.5 — 2026-11-18

- 合入 PR #20：响应式卡片、宽容器与单行头部标签。
- 首页网络概览／回程双栏，统一线路和等级胶囊；地球／地图连线避让国旗。
- PR #21 仅补版本、说明和验收材料，没有额外 UI 修改。

[Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.5) · [完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.4...atlas-v0.0.5)

## 0.0.4 — 2026-11-18

- 升级为独立 Komari TcpQuality 附件，保留 IPv4、IPv6、UDP 两地址族和 IPv4 大包的省份分组结果。
- 三行回程面板显示运营商、线路、等级／状态与时间，不强制标注特定商业线路。
- 既有调度和原生鉴权控制每小时采集，无新增常驻服务；缺失 IPv6 如实标记不可用。
- 主题与插件／附件分开交付，保留 TcpQuality 上游 GPL 源码和许可。

[Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.4) · [完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.3...atlas-v0.0.4)

## 0.0.3 — 2026-11-18

- 首页新增 TCP／UDP 连接块，旁侧双格显示三网回程。
- 接入独立插件与节点 Helper，按原生节点身份采集和保存结果。
- 支持运营商排序、展开详情、未测／过期状态及显式开启的公开摘要。

[Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.3) · [完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.2...atlas-v0.0.3)

## 0.0.2 — 2026-11-17

- 修复费用弹窗边框、留白、按钮居中与原图标。
- 三网排序持久化，支持拖动、触屏按钮和键盘操作。
- 增加方块／波浪线切换与 TCP、UDP 数量独立开关。

[Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.2) · [完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.1...atlas-v0.0.2)

## 0.0.1 — 2026-11-17

- 统一 Atlas 品牌、主题身份与旧配置条件迁移，保留原版权。
- 完善逐节点时区、日期和时分的独立流量周期，处理夏令时、短月份与旧配置。
- 节点金额保持原币种，顶栏按在线汇率汇总为选定币种。
- 建立受保护 PR、CI、原生 ZIP 与独立标签发布流程。

[Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.1) · [完整差异](https://github.com/MagnetOscar/Atlas/compare/baseline/v1.2.1...atlas-v0.0.1)

各版保留未变更的设置和数据语义；组件兼容性、安装限制和 SHA256 见对应 Release 与[下载索引](docs/downloads.md)。
