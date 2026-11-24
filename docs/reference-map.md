# 参考来源与文档组织

查阅日期：2026-11-25。参考项目：[MysteryHost AI Lite](https://github.com/yuuu956/mysteryhost-ai-lite/tree/main)。采用其“产品展示 → 需求与设计 → Prompt → 状态 → 评测 → 学习笔记”的组织思路，内容围绕课程成绩规划 Demo 的评分规则提取、目标试算与分数持续更新编写；当前提取仍为配套材料的模拟提取。

## 内容对应

| 参考内容 | 本项目对应 | 组织重点 |
| --- | --- | --- |
| [README](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/README.md) 与 [截图目录](https://github.com/yuuu956/mysteryhost-ai-lite/tree/main/assets/screenshots) | [项目首页](../README.md) | 入口、截图、项目动机、功能、体验流程、技术与文档导航 |
| [产品需求](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/product-requirements.md) | [产品需求文档](product-requirements.md) | 定位、目标用户、痛点、目标、范围、流程、功能、验收与版本安排 |
| [Prompt 设计](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/prompt-design.md) 与 [Prompt 模板](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/src/prompts/host-prompt.md) | [Prompt 设计](prompt-design.md) 与 [规则提取模板](../prompts/extract-rules.md) | 提取任务、材料范围、字段、约束、输出与处理流程 |
| [状态设计](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/state-design.md) | [状态设计](state-design.md) | 当前状态、派生结果、交互变化、数据保护与持续保存 |
| [评测指标](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/evaluation-metrics.md) | [验证说明](validation.md)、[自动检查](../tests/README.md)、[模型实验](../evaluation/README.md) | 将质量要求转成可检查的任务、预期和错误分类 |
| [结构化输出笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/04-structured-output.md)、[状态笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/05-memory-and-state-management.md)、[评测笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/07-ai-evaluation-and-risk-control.md) | [项目学习笔记](../learning-notes/decisions.md) | 概念、项目应用、具体例子与复盘问题 |

课程工具的流程直接体现在需求和状态文档中；当前不引入 Agent、知识库或额外功能。参考项目的代码、截图、文案、技术栈与成果不作为本项目内容或证据。

## 来源版本

本次阅读范围包括 main 目录、README、产品需求、Prompt 设计与模板、状态、评测和上表三篇学习笔记。参考 README 同时保留早期模拟版介绍与后续 API 版本说明，部分设计文档仍对应早期阶段；本项目各页按当前演示版状态编写。

| 来源对象 | SHA |
| --- | --- |
| main 目录树 | `81f08ad5d7d17af863f29e85fbf212419ccc0d8f` |
| README 文件 | `6bc537ad1b6c01514495ebb5a98e4f14e1a82d7d` |
| 产品需求文件 | `3e55316098f5b92f58dd368139a89cbce05ed5bf` |
| 状态设计文件 | `8ce6d6dab1c4a2c8140e42dcd8008d049acfd06c` |
| README 引用的 `assets/screenshots/homepage.png` | `4a2c627e27c08f15858c67121b9bd14fef1386f5` |

目录树 SHA 与文件 blob SHA 用于定位读取对象，不是提交 SHA。参考截图记录其路径与嵌入方式；产品展示使用本项目运行截图。
