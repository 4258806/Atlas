# Atlas v0.0.6

合入 Antigravity [PR #22](https://github.com/MagnetOscar/Atlas/pull/22) 的地球修复：真实地球提高连线高度，避免长距离连线沉入球面；国旗淡出期间继续避让连线；点阵地球降低连线高度，避免顶部裁切。

保留 0.0.5 的卡片布局、全部配置与默认值、节点本币／顶栏汇率、独立重置、三网排序、TCP/UDP 和回程采集逻辑。插件及 TcpQuality 沿用 0.0.4 的独立安装材料，无需重装或启动额外探测。

Komari 1.6.1 主题管理仅上传 `komari-theme-Atlas-build-*.zip`。原生主题 ZIP 只含 `komari-theme.json`、`preview.png` 和 `dist/`。保留旧 ZIP 与设置，通过主题管理重新上传即可回滚。

源码与相对 0.0.5 的差异见 [版本对比](https://github.com/MagnetOscar/Atlas/compare/atlas-v0.0.5...atlas-v0.0.6)；准确源码、SHA256 和验证结果见本 Release 附件。自动化检查不代表覆盖所有实体 GPU／浏览器。本次不自动部署生产环境。
