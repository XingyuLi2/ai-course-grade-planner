# 作品集整理：自动检查复核记录

日期：2026-11-25，Australia/Sydney。执行时间为 `2026-11-24T16:14:38.535Z`（UTC，悉尼当地已是11月25日）。本记录只覆盖公开验证材料整理与自动套件复跑，不代替浏览器验收、模型实验或同学观察。

## 本次改动

- 新增 [公开计算契约](calculation-spec.md)，保留支持边界、公式和12个人工算例；去除私人工作区状态链接与具体课程指代。
- 新增 [验证说明](validation.md)，将计算、存储／编辑、应用事件、浏览器、模型和使用观察分层；不把93项自动检查写成模型准确率。
- 修正 [计算字段说明](calculation-types.md)：错误分组服务于生成后的规则修正，`manual` 为旧数据／测试字段；多项未知百分比向上取整数、具体最低分向上保留四位小数，内部准确值不变。
- 新增 [统一运行入口](../tests/run-all.mjs)，复用已有套件，不新增为文案凑数的测试；更新 [测试README](../tests/README.md) 为产品仓库根目录可执行命令。
- 刷新五份 `latest-*-results.json`，增加时间、环境、命令和方法元数据。本次未改产品逻辑或人工期望答案。

## 环境与实际命令

运行环境：macOS arm64，Node.js `v24.22.3`。本次终端可直接运行 `node`，与早期记录中的环境可用性不同；不据此改写早期检查历史。未安装第三方依赖，未调用网络或模型。

在产品仓库根目录运行：

```bash
node --version
node --experimental-vm-modules tests/run-all.mjs --write
node --check tests/run-all.mjs
```

运行入口复用原有 `runTests()`、`runStorageTests()`、`runScoreEditTests()`、`runAppFlowTests()`、`runStartupTests()`。全套运行退出码0，新增入口语法检查退出码0。Node输出VM模块实验性提示；没有测试失败。

| 组别 | 实际结果 | 方法 | 原始结果 |
| --- | --- | --- | --- |
| 计算 | 52/52 | 独立手算答案及边界 | [JSON](../tests/latest-calculation-results.json) |
| 存储 | 13/13 | 内存存储替身 | [JSON](../tests/latest-storage-results.json) |
| 成绩编辑 | 11/11 | 校验、冲突与提交逻辑 | [JSON](../tests/latest-score-edit-results.json) |
| 应用事件 | 14/14 | Node VM＋DOM／存储替身执行实际app监听器 | [JSON](../tests/latest-app-flow-results.json) |
| 启动 | 3/3 | Node VM＋DOM／模块加载替身 | [JSON](../tests/latest-startup-results.json) |
| 合计 | **93/93，0失败** | 自动检查条目数 | — |

结果JSON中的 `total`、`passed`、`failed` 与逐项结果用Python再次核对一致。模型案例文件也经JSON解析检查：5例均为 `source_type: synthetic`、`run_status: not_run`；没有模型原始回复。

另用一次性Python脚本检查本次五份Markdown的37个本地链接目标，0缺失；确认12个人工算例保留。过程中的相对工作目录错误已修正，未改变产品逻辑；文档落盘齐全后重新检查通过。全仓库发布前链接、忽略规则和提交清单由发布整理另行核验。

## 本结果的使用范围

能够据此写：“在合成数据和独立人工基准上，现有93项自动检查通过，覆盖计算、存储、改分、部分应用事件和启动分支。”

不能据此写：“模型准确率100%”“93个真实用户验证”“全浏览器兼容”“节省时间X%”或“已上线”。存储替身不验证真实浏览器持久化；事件替身不验证原生弹窗、焦点、排版、图片选择和刷新恢复。实际浏览器操作按 [清单](browser-checklist.md) 另记。

M4真实模型实验、同学观察、网页API接入没有因本次自动套件重跑而完成。代码上传和公网Demo部署状态应分别以实际远端与访问结果为准。

## 上传前复核

首次整理后修正了HTML启动路径与旧文档指向，再次执行相同全套命令：`2026-11-24T16:29:58.152Z`（UTC），93/93通过，0失败；上述latest JSON现对应这次复跑。扫描公开候选文件，无本机绝对路径、私人身份或凭据命中。48个产品文件中含12个dist源码文件；20份Markdown的128个本地链接均存在且不越出产品根，HTML资源和模块相对导入无缺失；忽略规则保留源码并排除凭据／私人材料目录。

真实浏览器方面，内置浏览器请求超时，本机Chrome控制返回未授予Computer Use权限，没有取得截图或交互通过记录。已有本机服务HTTP返回200只证明资源可达，不能代替浏览器验收。
