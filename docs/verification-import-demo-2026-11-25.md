# 导入流程与成绩保护检查

> 历史记录：下文保留当次实现、命令和检查范围，不代表当前流程或发布状态。当前以 [README](../README.md) 和 [本轮复跑记录](verification-portfolio-2026-11-25.md) 为准；历史三步设置已取消为新课程前置。本文链接的 `latest-*-results.json` 会被后续重跑更新，属于最新结果，不是该次不可变输出快照。

日期：2026-11-25，Australia/Sydney。全部输入为合成数据。本轮按发起人新要求取消手工建课前置；用户明确只做演示版，未接模型。

## 实际完成的检查

通过本机 Node REPL 的 Node VM 加载磁盘模块，实际执行下列导出函数。系统终端没有安装 `node` 命令；本轮没有安装第三方依赖。

| 检查 | 运行函数 | 结果 | 原始结果 |
| --- | --- | --- | --- |
| 精确计算与边界 | `runTests()` | 52/52 | [JSON](../tests/latest-calculation-results.json) |
| 版本化保存与异常 | `runStorageTests()` | 13/13 | [JSON](../tests/latest-storage-results.json) |
| 成绩修改校验与提交 | `runScoreEditTests()` | 11/11 | [JSON](../tests/latest-score-edit-results.json) |
| 实际应用事件处理器 | `runAppFlowTests()` | 14/14 | [JSON](../tests/latest-app-flow-results.json) |
| file／HTTP启动分支 | `runStartupTests()` | 3/3 | [JSON](../tests/latest-startup-results.json) |

合计93项，0失败。浏览器 `/tests/` 入口包含前三组共76项；后两组依赖Node VM，另列。它们均不是完整浏览器交互验收。

应用事件检查用最小DOM和内存存储替身执行真实 `app.mjs` 监听器，覆盖：空记录导入、样例直接生成成绩表、一次确认、预计试算、已出成绩两阶段提交、草稿取消、越界拦截、同一记录重建应用、改名、规则取消与保存、自有材料只预览、替换取消、损坏旧记录不覆盖。

另外检查7个ESM脚本语法通过，导入页三状态生成和用户文本转义通过，合成SVG XML解析通过。样例SVG为代码编写的演示材料，不是实际学校截图。

本机服务HTTP检查：沙盒初次阻止loopback访问，获得授权后以Python `urllib.request.urlopen` 读取 `http://127.0.0.1:8000/` 下的以下文件，均为200、MIME正确，内容与读取时磁盘文件一致：

```text
dist/index.html
dist/app.mjs
dist/import-view.mjs
dist/score-edit.mjs
dist/demo-course.svg
dist/student-ui.css
dist/startup.js
tests/index.html
```

复用了用户已运行的服务，未停止该服务，未访问外部模型或上传材料。

## 实际发现与修复

- 保存失败后进入规则草稿页再“重试保存”，可能提前持久化尚未确认的改名。现在重试保存已接受的课程，正式确认规则后才接受草稿。新增存储失败、恢复、取消、重建应用的回归，并检查正式保存仍可成功。
- 旧手动课程的图片错误区域与导入页使用重复ID，导致错误出现在隐藏区域。给导入页独立ID，避免冲突。

## 未完成的验证

当前没有可用浏览器控制工具；打开预览的请求仅返回 `queued`。不能由HTTP成功或DOM替身推出实际排版、焦点、原生dialog、文件选择、刷新／重开或浏览器存储权限已经验证。

下一步使用 [浏览器清单](browser-checklist.md) 实际复测，尤其检查确认与取消、刷新恢复、手机宽度和键盘操作。M4真实模型输出、同学观察、录屏和完整作品集尚未完成；不宣称准确率、节省时间或上线结果。
