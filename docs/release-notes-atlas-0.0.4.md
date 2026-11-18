# Atlas v0.0.4

- 升级为独立 Komari TcpQuality 附件，保留 IPv4、IPv6、UDP 两地址族和 IPv4 大包的省份分组结果。
- 三行回程面板显示运营商、线路、等级／状态与时间，不强制标注特定商业线路。
- 既有调度和原生鉴权控制每小时采集，无新增常驻服务；缺失 IPv6 如实标记不可用。
- 主题与插件／附件分开交付，保留 TcpQuality 上游 GPL 源码和许可。

已验证兼容 Komari Server 1.6.1。主题 ZIP 只包含原生皮肤；插件／TcpQuality 在[组件页](components.md)单独下载。精确源码、SHA256、安装和回滚说明见 [Release](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-v0.0.4) 与[下载索引](downloads.md)。
