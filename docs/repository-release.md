# 仓库范围与发布记录

日期：2026-11-25。目标为公开产品仓库 [XingyuLi2/ai-course-grade-planner](https://github.com/XingyuLi2/ai-course-grade-planner)。

## 公开范围

仓库根只对应 `course-grade/` 产品目录：网页源码、本机启动脚本、产品设计、计算规范、合成演示材料、Prompt、验证准备和实际自动检查结果。`dist/` 是手写源码，保留在提交中。

个人简历、私人课程原件、原始聊天、求职规划和本地交接不在本仓库内。`.gitignore` 防止凭据、缓存和常见私人材料目录误入；上传前仍按实际文件清单复核，忽略规则不是脱敏检查的替代。

已有公开内容没有真实学校评分标准、真实成绩、API凭据或原始私人材料。合成数据始终标为演示样例。当前没有 LICENSE，不声称已有开源许可。

## 发布状态

- Git：产品目录独立仓库，main保存源码与文档，gh-pages保存发布网页，origin 指向上述公开仓库；根求职目录没有初始化Git。
- GitHub：已完成首次代码推送，首次提交为 `daa9df83a58efe28a14001e90e099a4674aaf393`。通过GitHub API核对main提交一致、树未截断，48个文件完整，含12个dist源码文件；后续文档更新见提交历史。
- 公网Demo：已发布到 [GitHub Pages](https://xingyuli2.github.io/ai-course-grade-planner/)，HTTPS已启用；首页与12个网页资源均通过公开访问核验。README首页使用在线链接，`127.0.0.1`仅保留在本地开发说明中。
- 真实模型后端：不存在；网页提取仍为演示模拟。

GitHub连接器可读取资料，但没有创建仓库能力，因此创建使用本机GitHub CLI、推送使用Git。CLI在沙盒内的联网失败曾使登录检查显示失败；沙盒外实际核对为 `XingyuLi2`，无需重新登录。仅在产品仓库设置GitHub noreply提交邮箱，未更改全局Git身份或凭据。

## 可检查的发布依据

[自动检查记录](verification-portfolio-2026-11-25.md)、[测试结果](../tests/README.md)、[产品能力与限制](../README.md)。发布时另检查Markdown本地链接、HTML本机路径、`dist/`纳入Git、凭据和私人文件名，并比对本地与远端提交。当前展示保留一张横版主图及部分核心浏览器操作文字记录；完整验收、模型和同学验证继续分别记录。

## 2026-11-25 · 公网发布核验

- 发布提交：`59773d7245e9cce559e5d8f3dcfb21d019c30503`，来源为gh-pages分支根目录。仅包含12个原dist网页文件与空`.nojekyll`，网页内容与main的dist逐项一致，无符号链接。
- Pages状态为built，HTTPS强制启用；[部署任务](https://github.com/XingyuLi2/ai-course-grade-planner/actions/runs/45445294674)状态completed、结论success。
- 使用不带登录凭据的HTTP请求读取公开首页，返回200。继续读取全部12个网页资源，均返回200，内容与发布提交逐字节一致；JavaScript、CSS、HTML及SVG的响应类型正确。
- 这次发布没有改计算或保存代码，没有重跑93项检查，也没有新增实际运行截图。公网中的生成、试算、改分与刷新交互尚未完成复测；此前本机走查范围仍见[浏览器记录](verification-browser-2026-11-25.md)。
- Pages只托管静态网页，不包含真实模型后端。当前代码没有成绩或材料上传接口，课程保存在访问者浏览器的localStorage；同一浏览器里使用本工具的人可能看到已保存记录。GitHub会为安全目的记录访客IP，见[官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)。

后续修改dist时需同步gh-pages再核验部署；仅更新main文档不会改变网站。当前不是main推送即自动发布的工作流。
