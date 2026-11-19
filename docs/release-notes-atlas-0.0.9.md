# Atlas v0.0.9

- 合入 [PR #26](https://github.com/MagnetOscar/Atlas/pull/26)：三网回程展开详情后保持三条运营商行间距，避免摘要区域收缩跳动。
- 保留 0.0.8 的免费节点“长期／免费”显示，付费节点的到期、剩余价值及金额隐藏行为不变。
- 节点本币／顶栏换算、独立流量重置、三网排序、TCP/UDP、地球与回程采集没有变化。

Komari Server **1.6.1** 后台主题管理仅上传本页的 **komari-theme-Atlas-build-\*.zip**。包内只含 komari-theme.json、preview.png、dist/；GitHub 自动 Source code 不是安装包。SHA256、源码及构建验证链接由发布流程写在下方，不再另附 JSON／校验文件。

插件／TcpQuality 沿用[独立组件下载页](https://github.com/MagnetOscar/Atlas/releases/tag/atlas-components)的既有版本，无需重装或启动额外探测。升级保留已有配置，回滚可重新上传旧版本主题 ZIP。

[相对 0.0.8 的完整差异](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.8...atlas-v0.0.9) · [源码验收记录](https://github.com/MagnetOscar/Atlas/blob/atlas-v0.0.9/docs/verification/review-0.0.9.json)。完整 Linux 检查由 CI 执行；隔离原生验收不等同于生产功能测试。
