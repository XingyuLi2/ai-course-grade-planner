# 计算模块与数据约定

[`dist/calc.mjs`](../dist/calc.mjs) 不访问 DOM、网络或浏览器存储，也不修改传入对象。界面保存原始十进制字符串，计算时才转成 `Rational` 精确分数。公式、边界和12个人工基准见 [计算契约](calculation-spec.md)。

当前流程是材料生成成绩表后核对与按需修正；本文的数据字段和错误分组不要求用户先手工建课。

## 输入

```js
{
  name: '课程名',
  sourceMode: 'sample', // sample 为演示样例；manual 为兼容旧记录/测试字段，不代表当前有手工建课入口
  sourceText: '原文', notes: '补充说明',
  ruleStatus: 'pending', // pending / confirmed / unsupported
  unresolvedText: '', unsupportedText: '',
  hurdleStatus: 'confirmed', // unknown / none / confirmed
  items: [{
    id: 'assessment-1', name: '作业', weight: '0.2', max: '60',
    actual: '45', expected: '', step: '', source: '对应来源',
  }],
  hurdles: [{
    id: 'hurdle-1', itemId: 'assessment-1', operator: '>=',
    threshold: '50', unit: 'percent', source: '对应来源',
  }],
  passMark: '50',
  targets: [{ id: 'target-1', label: '自定目标', score: '75' }],
}
```

这里只展示字段形状，单项权重 0.2 的示例对象不是一份完整可计算课程。权重内部存比例，例如 `0.2` 表示 20%；UI 的百分比输入应准确除以 100。除显式转换所需字段外，不用 `Number()` 处理计算输入。空串表示未知，`'0'` 表示零分。满分、通过线和目标都不猜默认值。

材料存在未解决问题或未支持规则时，`unresolvedText` / `unsupportedText` 保留原文或说明，即使 `ruleStatus` 错误地写成 confirmed，也会阻止正式计算。改变规则后，界面负责将确认状态改回 pending。

## 接口

- `validateCourse(course)` 返回 `{ ready, errors, warnings, errorGroups }`，默认检查未出分项目的预计成绩；已有实际成绩的项目不再校验其失效预计值。可传 `{ includeExpected: false }` 只检查实际视角用到的输入。
- `calculateCourse(course, 'actual')` 只取实际成绩，不解析、校验或使用预计值。预计草稿无效时，实际视角仍可计算，并说明预计值未参与。
- `calculateCourse(course, 'scenario')` 先取实际成绩，再使用未出分项的预计成绩。
- 规则不完整或当前视角参与计算的输入不合法时，只返回 `ready: false`、错误、提示和模式，不返回正式结果。未出分项目的无效预计值会阻止模拟视角与默认确认校验，但不会影响实际视角。
- 两个模式都使用同一套确定性公式；实际与预计并存时只取实际，并提供预计已失效提示。即使旧预计值格式错误、超出满分或不符合步长，也不再参与校验；实际值自身无效仍阻止结果。
- `createBlank()` / `createSample()` 在 `dist/sample.mjs`，都返回独立的新对象，初始规则状态为 pending。`createBlank()` 保留为空记录工具，不是新的用户建课前置步骤。

### 生成后规则修正的错误定位

`errorGroups` 是新增的界面定位信息，不参与计算判断。`validateCourse` 和 `calculateCourse` 的返回值都会携带它，格式为：

```js
{
  assessments: [], // 课程名称、考核项目、成绩与权重合计
  targets: [],     // 课程及格线与个人目标
  conditions: [],  // 尚未确认、待核实/不支持的规则、单项最低分要求
}
```

三个数组包含原 `errors` 中的同一批错误，每条恰好归入一组；各组保留错误在原数组中的相对顺序。由于课程确认状态和单项要求分布在校验流程的不同位置，直接按组拼接不保证等于 `errors` 的全局顺序。空组仍返回空数组；整个课程对象格式无效时归入 `conditions`。

生成后修正页面可用这些分组跳转到有问题的分类，不必解析中文提示。三个分类可按需切换，不构成强制手工建课流程。最终保存与确认仍须对完整课程运行校验，不能只检查当前显示的分类。原 `errors` 的内容顺序、`warnings`、`ready` 及计算规则未因分组而改变；只读取原字段的旧调用者可以忽略这个新增字段。

## 结果

所有数值结果是 `Rational`，数组里的项目名与标识保持输入值。

| 字段 | 单位与含义 |
| --- | --- |
| actualTotal | 仅实际成绩贡献的课程总评分 |
| expectedTotal | 本次模拟使用的预计贡献；实际模式为 0 |
| fixedTotal | 本次固定贡献 = 实际 + 模拟所用预计 |
| remainingWeight | 未知项权重，比例 0–1 |
| remainingWeightPercent | 未知项权重，百分数 0–100 |
| remainingPossible | 未知项还能贡献的总评分 |
| maximumTotal | 本视角下理论最高总评分 |
| unknownItems | 未使用实际或预计固定下来的项目，包含零权重项 |
| assumptions | 本次实际使用的预计成绩，包含预计零分 |
| usesExpected / allActual | 是否使用假设 / 是否全部为实际成绩 |
| targets | 每个目标各自的要求，不与通过线混用 |
| hurdles | 每项 hurdle 的原始阈值及实际、预计或待定状态 |
| pass | 按通过线与全部 hurdle 综合得到的状态与中文说明 |

`targets` 中，`gap` 为有符号差额，`neededTotal` 为至少 0 的待贡献总评分，`remainingRatePercent` 为剩余项目的加权得分百分比（W = 0 时为 null），`totalStatus` 为 `met` / `reachable` / `unreachable`，只判断总分。

仅有一个未知项目时，`single` 才有值，包括：`totalRaw`（总分要求，零权重时 null）、`hurdleRaw`（该项最高原始门槛）、`minimumRaw`（二者数学下界）、`requiredRaw`（有步长则向上到可得原始成绩）、`requiredPercent`、`step`、`achievedTotal` 与 `reachable`。`single.reachable` 只说明该项在当前总分要求与自身门槛下是否可行；其他项目失败的 hurdle 仍以 `hurdles` 和 `pass` 为准，不能说“考到这个分就必然通过”。

`hurdles[].status` 为 `actual-met`、`actual-failed`、`expected-met`、`expected-failed` 或 `pending`。`pass.status` 为 `actual-met`、`actual-failed`、`scenario-met`、`scenario-failed`、`pending` 或 `unreachable`；已有实际 hurdle 失败优先于其他结果。仍有未知项、且实际成绩尚未独立满足通过条件时，保留条件性说明。

## 精度与显示

`Rational` 用 BigInt 分子与分母表示准确值，提供 `add/sub/mul/div/cmp/eq`。`fraction(value)` 输出精确分数，如 `235/6`。不能将计算结果当作浏览器存储对象；应持久化原始课程输入。

`format(value)` 默认截断到四位小数；未精确表示时加 `≈`，避免四舍五入把临界低分显示为达线。`format(value, { ceil: true })` 用于具体最低分数要求，向上保留四位小数。

多项未知时，主界面优先显示还差的总评分与剩余最多可贡献分数，再以 `format(value, { ceil: true, places: 0 })` 将整体所需百分比向上取整。例如还差51分、剩余最多贡献70分时，准确比例为 `510/7%`，主界面显示约73%，并注明向上取整。百分比不截断到100%，仍由准确值判断不可达；不能把73%再用于倒推，也不能把它解释为每项都必须达到73%。

以上都是显示精度，不是课程计分精度。计分步长只按用户明确设置的原始成绩单位应用，最低可得分再代回公式复核。

接收普通十进制数，不接收百分号、千分位或科学计数法。为控制输入长度，单个数最多 80 个字符；这不是学校评分规则。满分、权重、目标、门槛、步长及成绩冲突都不静默修正。
