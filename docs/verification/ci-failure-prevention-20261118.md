# GitHub 失败邮件根因与最小预防修正

核对最近两页 Actions 历史，共找到八次失败，均为开发中 PR 的真实检查失败。不是邮件系统误报，也不是一个持续存在的 GitHub 服务故障。共同流程问题是：尚未完成同范围预检就推送正式 PR，随后每次修复再次触发检查。零散测试通过不代表完整 CI 通过。

| 运行                                                                         | 首个实际阻断原因                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [43912786889](https://github.com/MagnetOscar/Atlas/actions/runs/43912786889) | Linux 测试依赖未提供的 `TMPDIR`。                                        |
| [43913214335](https://github.com/MagnetOscar/Atlas/actions/runs/43913214335) | 归档测试读取尚未生成的 `artifacts.json`。                                |
| [43942231466](https://github.com/MagnetOscar/Atlas/actions/runs/43942231466) | 首页 tiled 桌面截图与基线不符。                                          |
| [43950765057](https://github.com/MagnetOscar/Atlas/actions/runs/43950765057) | 同一个 tiled 桌面截图断言再次失败。                                      |
| [44082368906](https://github.com/MagnetOscar/Atlas/actions/runs/44082368906) | 页面新增状态区后，`getByRole('status')` 匹配两个元素，触发严格模式错误。 |
| [44115197812](https://github.com/MagnetOscar/Atlas/actions/runs/44115197812) | 协议预算改动与负例断言不一致，预期抛错却未抛错。                         |
| [44120487888](https://github.com/MagnetOscar/Atlas/actions/runs/44120487888) | 回程显示测试期待的自动结果区域不存在，两项浏览器断言失败。               |
| [44152680753](https://github.com/MagnetOscar/Atlas/actions/runs/44152680753) | 上游原始 README 与通用 Markdown 格式化规则冲突。                         |

日志中的本地后端 `ECONNREFUSED` 和大包体积警告不是上述运行的最终失败断言，不能将所有日志红字当作同一个根因。之前这些具体问题均已修复；本次不再改功能代码、测试阈值、生产部署或已发布安装包。

## 最小改动

仅在两条现有 PR 工作流各增加事件类型列表及一个作业条件。草稿 PR 创建／推送时跳过作业；转 Ready 后通过 `ready_for_review` 运行原有完整检查。正式 PR 后续推送、重新打开和主分支 push 继续检查。保留原作业名称、测试命令、权限、超时、并发、产物及两项必需检查。

工作流行为对应 [GitHub pull_request 事件文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)。默认事件不包括 `ready_for_review`，所以必须显式加入，避免草稿转正式后漏跑。草稿不能合并；不能把 skipped 当成正式验收通过。

开发约定同时增加到发布规范；跨项目通用的同类规则写入本机 Codex 全局 `AGENTS.md`。重点是最终文件内容的完整适用预检、环境差异说明、同步测试契约，以及保留真实失败通知。不能保证未来没有任何新缺陷，但可以避免反复把尚未验收的开发中间态当成正式 CI 提交。

验证：YAML 结构解析；与旧文件比较确认只改触发条件；验证草稿、Ready、主分支事件条件；真实草稿跳过及 Ready 触发结果在本次 PR 的 Checks 中保留。正式 CI 和原有分支保护保持有效。
