# 参考仓库阅读与内容映射

查阅日期：2026-11-25。参考 [MysteryHost AI Lite](https://github.com/yuuu956/mysteryhost-ai-lite/tree/main) 的作品集组织方式；本项目保留课程成绩场景、现有代码和实际证据，不引入参考项目的技术栈或功能。

## 实际查阅范围

通过 GitHub 连接器读取 main 的递归目录、README、产品需求、Prompt 设计及主持人 Prompt 模板、状态设计、评测文档；读取结构化输出、状态管理、评测与风险控制三篇学习笔记。目录结果未截断。

- 目录树 SHA：`81f08ad5d7d17af863f29e85fbf212419ccc0d8f`（树标识，不是提交 SHA）。
- README blob SHA：`6bc537ad1b6c01514495ebb5a98e4f14e1a82d7d`。
- 已核实 `assets/screenshots/homepage.png` 存在，并被 README 嵌入。截图 blob SHA：`4a2c627e27c08f15858c67121b9bd14fef1386f5`。本次网页工具未能显示图片，未对图片视觉内容作判断，也未下载或复制参考截图。

读取时参考 README 前半保留早期本地 mock 介绍，后半 V0.4 说明已有后端与 API；PRD 和部分设计文档仍写早期阶段。这些是来源文件的不同版本描述，不据此推断每个能力已经通过独立验证。本项目借鉴其导航体系，同时在自己的文档中明确区分当前能力、计划和历史检查。

## 如何对应到课程成绩工具

| 参考内容与来源 | 本项目采用的组织方式 | 本项目入口与边界 |
| --- | --- | --- |
| [README](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/README.md) 与 [截图目录](https://github.com/yuuu956/mysteryhost-ai-lite/tree/main/assets/screenshots) | 先让读者理解场景和体验方式，再进入设计证据 | [产品 README](../README.md)；只使用本项目实际界面截图，合成课程标识保留 |
| [产品需求](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/product-requirements.md) | 场景、用户任务、范围、流程、验收分别说明 | [产品需求](product-requirements.md)；需求来自发起人经历与反馈，没有虚构访谈 |
| [Prompt 设计](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/prompt-design.md) 与 [模板](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/src/prompts/host-prompt.md) | 将角色、输入、限制与输出格式落实为可复用模板 | [规则提取 Prompt](../prompts/extract-rules.md)；用于独立实验，网页模拟流程不调用它 |
| [状态设计](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/state-design.md) | 说明信息在何时能显示、修改和提交 | [状态与数据保护](state-design.md)；聚焦实际/预计、规则确认、草稿、保存，不称模型记忆 |
| [评测指标](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/evaluation-metrics.md) | 将质量拆成可检查的问题和失败情形 | [自动检查](../tests/README.md)、[浏览器清单](browser-checklist.md)、[模型实验](../evaluation/README.md) 各自报告，不能相互充数 |
| [结构化输出笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/04-structured-output.md)、[状态笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/05-memory-and-state-management.md)、[评测笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/07-ai-evaluation-and-risk-control.md) | 用项目中的具体决定解释概念，再设置面试自检题 | [项目取舍笔记](../learning-notes/decisions.md)；由 Codex 协助整理，不声明发起人已经系统掌握全部知识 |

参考仓库的 Agent 工作流目录用于游戏主持场景；课程工具当前没有模型选择工具或自动执行任务的流程，因此不为目录齐全增加 Agent 文档或功能。这里的流程直接在产品需求和状态设计中说明。

## 不移用的成果

参考项目的截图、剧本内容、代码、技术栈、Release、API 接入、部署和效果均不属于本项目证据。本次只引用来源链接，不复制正文、图片或代码。课程项目的代码上传、静态 Demo 部署、真实模型实验和网页模型接入分别记录；链接存在也不能替代实际运行与质量检查。
