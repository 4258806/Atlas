# Atlas v0.0.7

- 合入 [PR #23](https://github.com/MagnetOscar/Atlas/pull/23)：写实地球恢复原始基线的长线段接续脉冲，参数为 0.48／1.4／2600ms；常驻实线模式不变。
- 保留 0.0.6 的跨洋连线高度、国旗淡出避让及点阵地球顶部裁切修复。
- 节点本币／顶栏换算、独立流量重置、三网排序、TCP/UDP 和回程采集没有变化。

Komari Server **1.6.1** 后台主题管理仅上传本页的 **komari-theme-Atlas-build-\*.zip**。包内只含 komari-theme.json、preview.png、dist/；GitHub 自动 Source code 不是安装包。SHA256、源码及构建验证链接由发布流程写在下方，不再另附 JSON／校验文件。

插件／TcpQuality 沿用[独立组件下载页](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-components)的既有版本，无需重装或启动额外探测。升级保留旧 ZIP 和配置，回滚时重新上传旧包；本次不自动部署服务器。

[相对 0.0.6 的完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.6...atlas-v0.0.7) · [源码验收记录](https://github.com/MagnetOscar/Atlas/blob/atlas-v0.0.7/docs/verification/review-0.0.7.json)。自动化检查不代表覆盖所有实体 GPU／浏览器。
