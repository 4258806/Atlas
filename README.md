# Atlas

**让多台服务器的状态、流量和费用，一眼看清。**

Atlas 是基于 Komari 的毛玻璃监控主题，在原有节点监控、三网延迟和地球可视化之上，完善多币种费用、独立流量周期与回程线路展示。

[下载主题](https://github.com/MagnetOscar/Atlas/releases/latest) · [使用文档](docs/README.md) · [更新记录](CHANGELOG.md) · [可选回程组件](docs/components.md)

![Atlas 主题预览（演示数据）](docs/preview.png)

## 与上游有什么不同

| 需求                 | Atlas 的改进                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| 多币种账单           | 节点金额保持输入币种；顶栏统一换算为选定币种，支持在线汇率、缓存和备用来源。                   |
| 不同供应商的流量周期 | 在上游独立重置日基础上，逐节点设置时区、每月日期和时分，处理夏令时与短月份。                   |
| 三网展示偏好         | 拖动保存运营商顺序；延迟／丢包可选方块或波浪线，TCP／UDP 数量可独立显示。                      |
| 回程线路信息         | 可选接入 TcpQuality，分别展示 IPv4、IPv6、UDP 和 IPv4 大包结果，明确标记未测、混合与过期状态。 |
| 首页信息密度         | 响应式卡片整合网络概览、连接数和三网回程，保留毛玻璃、地球及地图展示。                         |

基础资源监控、三网延迟、毛玻璃和地球展示来自上游，以上列出 Atlas 重点完善的部分。主题只展示数据，自动回程采集需要另装可选组件。

## 三步开始

1. 从 [最新 Release](https://github.com/MagnetOscar/Atlas/releases/latest) 下载 **komari-theme-Atlas-build-\*.zip**。
2. 在 Komari 后台 → 主题管理上传 ZIP，启用 **Atlas**。
3. 刷新主页；管理员可在 **Atlas 管理**中设置流量周期、三网顺序和显示选项。

已验证兼容 **Komari Server 1.6.1**。普通主题安装无需 Bun、Node.js 或 Python；GitHub 自动生成的 Source code 不是主题安装包。各版 SHA256 见 Release 说明与[下载索引](docs/downloads.md)。

升级时保留原 ZIP 与主题配置。旧 Enhanced 配置仅在 Atlas 配置缺失／为空且管理员已登录时迁移；已有 Atlas 配置不会被覆盖。[流量周期](docs/traffic-cycles.md) · [费用与汇率](docs/finance.md)

## 可选回程采集

主题可以独立使用。自动回程需要 Komari 插件和节点本机附件；它们**不包含在主题 ZIP 中**，不能上传到主题管理。查看[组件下载与安装](docs/components.md)。

回程标签是工具的观测分类，不同协议和省份可能不同，不代表运营商认证。精确流量周期取决于服务端保留的历史数据。

## 开发与反馈

[开发指南](docs/development.md) · [发布约定](docs/releasing.md) · [问题与改进](https://github.com/MagnetOscar/Atlas/pulls)

## 来源与许可

由 MagnetOscar 基于 [Glassmorphism Enhanced v1.2.1](https://github.com/casiuna/Glassmorphism-Enhanced) 维护，保留原作者与第三方署名。主题沿用 [MIT License](LICENSE)；可选 TcpQuality 上游源码为 GPL-3.0-only。详见[项目来源](FORK.md)和[第三方声明](THIRD_PARTY.md)。
