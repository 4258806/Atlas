# Atlas 0.0.1

正式版，2026-11-17（北京时间）。Atlas 是本项目的新名字，基于 Glassmorphism Enhanced v1.2.1；原 MIT、上游来源及历史记录保留。

## 本版内容

- 完整保留第 1–3 步：工程与受控 ZIP 发布、逐节点时区／日期／小时／分钟重置、本币节点金额及顶栏单一币种汇总。
- 项目、主题元数据、源码中的自身名称、管理入口、公开页面和页脚统一为 **Atlas**。页脚为 `Theme by Atlas`，链接本仓库。自定义站点名称保留，文档标题附上 Atlas。
- 保持原布局、样式、地球／地图和默认显示属性。没有开发三网排序、显示开关或回程采集新功能。

## 下载、升级与回滚

安装附件为 `komari-theme-Atlas-build-<sha>.zip`，顶层仍是 `komari-theme.json`、`preview.png`、`dist/`。下载同版 SHA256SUMS 和构建／安装验证记录；Source code ZIP 不是安装包。

先备份现有主题 ZIP、托管主题配置与数据，再上传并启用 Atlas。新标识为 `short: Atlas`。首次启用后保持管理员登录，Atlas 使用官方管理员接口将旧 Enhanced 的完整配置复制到缺失／空的新配置中；已有 Atlas 设置不覆盖、旧配置不删除。迁移成功后刷新确认独立重置时间与金额设置。可选 companion 的协议名同样不变，不自动安装或启用。用户自行上传切换，本次不修改生产。

发生问题时重新上传原 ZIP，恢复对应配置备份；不删除节点或历史。原 `personal-v0.0.1` 标签、ZIP 及记录保留为改名前的历史构建；新 `atlas-v0.0.1` 绑定本次改名后的准确源码，两者均为 0.0.1 且各自标明提交和 SHA256。

## 验证与边界

官方 Komari Server 1.6.1 隔离验证目标：实际 ZIP 上传、页面与页脚名称、逐节点时间设置、金额换算、配置持久化、升级及回滚。价格和流量历史为明确合成测试数据；汇率访问原有公共 API，不公开原始报价。正式 CI、准确源码、ZIP SHA256 与实际下载复验结果随本 Release 记录；未运行的检查不能写为通过。

流量周期需要足够的服务端历史，汇率仅为参考报价。保留 [ExchangeRate-API](https://www.exchangerate-api.com/) 与 [Frankfurter](https://frankfurter.dev/) 的来源说明、原 MIT 及全部第三方许可。

[相对更名前 0.0.1 的 diff](https://github.com/MagnetOscar/Atlas/compare/personal-v0.0.1...atlas-v0.0.1)。
