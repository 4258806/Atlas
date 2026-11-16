# Personal Fork 来源与基线

## 仓库身份

- 当前仓库：[MagnetOscar/Glassmorphism-Enhanced](https://github.com/MagnetOscar/Glassmorphism-Enhanced)。
- 创建方式：GitHub 原生公开 Fork，直接父仓库为 [casiuna/Glassmorphism-Enhanced](https://github.com/casiuna/Glassmorphism-Enhanced)。
- 用途：针对个人服务器监控需求进行二次开发；不代表上游官方版本，也不暗示原作者认可或担保本 Fork。
- 初始化日期：2026 年 11 月 16 日。

## 固定的原始版本

| 项目 | 固定值 |
| --- | --- |
| 上游发行版 | [v1.2.1](https://github.com/casiuna/Glassmorphism-Enhanced/releases/tag/v1.2.1) |
| 上游提交 | `0332d5f7c73f7994ba21c01e4b739d04835120b1` |
| 上游附注标签对象 | `fa9d12529bccbd3cd004f6522f54dd9ff2d970ec` |
| 原始基线分支 | `baseline/v1.2.1`，指向上述原始提交 |
| 默认开发分支 | `personal/main`，从上述原始提交开始 |
| 原始主题名称及标识 | `Glassmorphism Enhanced` / `Enhanced` |
| 当前主题清单版本 | `1.2.1`，未修改的上游版本号 |

Fork 网络中继承的其他分支、标签或发行历史属于上游历史，不自动成为本项目的开发基线。本项目自己的功能修改、兼容性验证和发行版本将在相应提交及变更记录中另行说明。

## 来源与署名

本项目直接基于 casiuna 维护的 Glassmorphism Enhanced。该项目又基于 [sanrokamlan-prog/komari-theme-Glassmorphism](https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism)，原始 MIT 版权声明为：

`Copyright (c) 2025 Tony Liu (tonyliuzj, tony-liu.com)`

保留原作者 Tony Liu、上游维护者 sanrokamlan、Enhanced 维护者 casiuna 的来源信息，以及 Git 历史中的贡献者记录。上游记录的 Three-Network、Emerald、Transit 等来源及相应声明继续保留于 [THIRD_PARTY.md](THIRD_PARTY.md)、`public/licenses/` 和伴生组件的许可文件中。

## 许可证

本 Fork 沿用 [MIT License](LICENSE)，没有替换、删除原始版权或许可条款。根目录 LICENSE 与上述基线逐字节一致，SHA256 为：

`4703f29bf392157fc005b92c18ae015c270beec13ef33a4a603d28a1b4e166d8`

本 Fork 新增文档：`Copyright (c) 2026 MagnetOscar`，按同一 MIT License 提供。该声明仅适用于本 Fork 自己的新增贡献，不改变其他作者已有贡献的归属。第三方内容继续遵循各自适用的许可；后续新增引用应补充出处、提交版本和完整许可声明。

## 本次初始化的修改范围

- README：区分个人 Fork、上游功能与当前开发状态，标明固定版本和来源。
- FORK.md：记录准确基线、来源链、版权归属和许可。
- THIRD_PARTY.md：补充直接上游 Enhanced 的来源记录，保留其原有声明。
- AICACHE.md：记录当前 Fork 的初始化与交接状态，保留上游历史日志。

`src/`、`companion/`、`public/`、主题清单、依赖及锁文件保持基线内容。此前在独立生产部署中制作的时区构建资源补丁没有混入这个原始源码基线；后续若迁移，须作为独立、可审查的功能提交。

当前没有本 Fork 自有的发行包。继承的上游测试结果和运行截图不作为本 Fork 新增功能已完成的证明；本次仅验证文档差异、基线提交与许可证完整性，未安装依赖或运行构建测试。
