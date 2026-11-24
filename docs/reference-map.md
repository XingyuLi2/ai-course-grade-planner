# 参考来源与文档组织

查阅日期：2026-11-25。参考项目：[MysteryHost AI Lite](https://github.com/yuuu956/mysteryhost-ai-lite/tree/main)。本轮重新读取 README、产品需求、Prompt 设计、状态设计、评测与学习笔记，借鉴它如何把一个可体验的 Demo 和设计说明组织在一起。

本项目围绕“课程成绩规划 Demo”自己的场景、实现与证据改写。当前提取仍为配套材料的模拟提取。

## 内容对应

| 实际参考内容 | 本项目对应 | 本轮采用的具体写法 |
| --- | --- | --- |
| [README](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/README.md) | [项目首页](../README.md) | 在线入口与一张截图前置；用操作与结果表帮助读者体验，再提供设计和证据入口 |
| [产品需求](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/product-requirements.md) | [产品需求](product-requirements.md) | 从用户场景到任务、范围和验收；把“更新成绩”写成可检查的行为，减少重复定位介绍 |
| [Prompt 设计](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/prompt-design.md) | [Prompt 设计](prompt-design.md) | 先讲提取职责和例子，再讲输入、约束和结构；固定模板独立保存，不把设计稿写成已接入接口 |
| [状态设计](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/state-design.md) | [状态设计](state-design.md) | 先解释哪些信息需要保留，再用动作前后变化讲状态；应用到实际／预计、草稿／已保存的区别 |
| [评测指标](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/docs/evaluation-metrics.md) | [验证说明](validation.md) | 从任务和风险推导检查方法，用明确预期和证据说明结果；模型、浏览器与同学观察分别记录 |
| [结构化输出笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/04-structured-output.md)、[状态笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/05-memory-and-state-management.md)、[评测笔记](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/learning-notes/07-ai-evaluation-and-risk-control.md) | [项目学习笔记](../learning-notes/decisions.md) | 保留概念与产品例子的联系，改为本项目做过的选择、付出的代价和仍需验证的问题 |

课程工具的流程直接体现在需求和状态文档中；当前不引入 Agent、知识库或额外功能。参考项目的代码、截图、文案、技术栈与成果不作为本项目内容或证据。

## 来源版本

参考 README 同时保留早期模拟版介绍与后续 API 版本说明，部分设计文档仍对应早期阶段。本项目首页因此统一按当前演示版叙述，将后续模型实验与接入单列。此前还查阅过其 [Prompt 模板](https://github.com/yuuu956/mysteryhost-ai-lite/blob/main/src/prompts/host-prompt.md) 与截图目录；本轮没有复制其截图或新增概念目录。

| 来源对象 | SHA |
| --- | --- |
| main 目录树 | `81f08ad5d7d17af863f29e85fbf212419ccc0d8f` |
| README 文件 | `6bc537ad1b6c01514495ebb5a98e4f14e1a82d7d` |
| 产品需求文件 | `3e55316098f5b92f58dd368139a89cbce05ed5bf` |
| 状态设计文件 | `8ce6d6dab1c4a2c8140e42dcd8008d049acfd06c` |
| README 引用的 `assets/screenshots/homepage.png` | `4a2c627e27c08f15858c67121b9bd14fef1386f5` |

目录树 SHA 与文件 blob SHA 用于定位读取对象，不是提交 SHA。参考截图记录其路径与嵌入方式；产品展示使用本项目运行截图。
