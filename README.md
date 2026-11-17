# Atlas

Atlas 是面向 Komari 的监控主题，由 MagnetOscar 基于 [Glassmorphism Enhanced v1.2.1](https://github.com/casiuna/Glassmorphism-Enhanced) 维护。保留原有毛玻璃布局、地图及地球；来源、原作者及第三方许可证见 [FORK.md](FORK.md)、[LICENSE](LICENSE) 和 [THIRD_PARTY.md](THIRD_PARTY.md)。

![Atlas 预览（合成演示数据）](docs/preview.png)

## 0.0.1

- 工程流程：受保护 PR、质量与浏览器检查、原生安装 ZIP、源码及 SHA256 记录。
- 独立重置时间：逐节点时区、每月日期、小时和分钟，支持夏令时、月底及旧配置迁移。
- 金额与汇率：每台节点金额保持输入币种；首页顶栏使用已有 API 将金额统一换算为所选单一币种。

本次只将项目名称统一为 **Atlas**：页面、管理入口、页脚 `Theme by Atlas`、包元数据与构建产物同步使用新名字。三网排序、显示开关和回程采集扩展不在本次范围。

## 安装与升级

从 [Atlas Releases](https://github.com/MagnetOscar/Atlas/releases) 下载 `komari-theme-Atlas-build-<sha>.zip`，核对同版 SHA256，在 Komari 后台主题管理上传并启用。不要使用 Source code ZIP。实际验证目标为官方 Komari Server 1.6.1。

上传前保留现有主题 ZIP、主题配置及数据备份。新主题标识为 `short: Atlas`。首次启用后保持管理员登录；Atlas 通过官方受管理员保护的数据库接口，将旧 Enhanced 配置复制到尚未配置的 Atlas 身份。已有 Atlas 设置不会被覆盖，旧 Enhanced 配置也不删除。迁移核对包含节点独立重置时间、币种设置和未知配置字段。现有 Plugin/Helper 的接口标识也不改名、不自动安装或启用。

Atlas 首版仍为 **0.0.1**；`atlas-v0.0.1` 绑定品牌统一后的准确源码。先前 `personal-v0.0.1` 和其 ZIP 保留为改名前的历史记录，不覆盖已发布的文件。

## 验证和边界

验收记录位于 [docs/verification](docs/verification)。安装包需通过真实隔离 Komari 的上传、配置保存、升级和回滚测试；合成历史／价格与生产验收明确区分。流量周期要求服务端有足够历史；汇率是参考报价。

本项目保留 MIT 与上游版权。上游历史说明见 [原 README 归档](docs/upstream-readme-v1.2.1.md)。开发和发布规则见 [AGENTS.md](AGENTS.md)、[docs/releasing.md](docs/releasing.md)。
