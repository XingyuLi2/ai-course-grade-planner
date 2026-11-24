import { calculateCourse, validateCourse, format, fraction } from '../dist/calc.mjs';
import { item, hurdle, course, case1, case2, case4, case6, case7, case9, case10, case11, case12 } from './fixtures.mjs';

// All expected numbers below come from independent hand calculations in
// docs/calculation-spec.md, not snapshots generated from the implementation.
const checks = [];
function test(name, run) { checks.push({ name, run }); }
function equal(actual, expected, message = '') {
  if (actual !== expected) throw new Error(`${message}：预期 ${String(expected)}，实际 ${String(actual)}`);
}
function exact(actual, expected, message = '') {
  equal(fraction(actual), expected, message);
}
function truth(value, message) { if (!value) throw new Error(message); }
function calc(c, mode = 'actual') {
  const result = calculateCourse(c, mode);
  truth(result.ready, `有效算例被阻止：${(result.errors || []).join('；')}`);
  return result;
}
function blocked(c, mode = 'actual') {
  equal(validateCourse(c).ready, false, '无效／未确认规则不得就绪');
  const result = calculateCourse(c, mode);
  equal(result.ready, false, '无效／未确认规则不得计算正式结果');
  truth(!result.targets || result.targets.length === 0, '阻止状态不得暴露正式目标倒推');
}

test('契约例 1：不同满分换算；期末 hurdle 高于总分要求', () => {
  const r = calc(case1());
  exact(r.actualTotal, '39'); exact(r.remainingWeight, '1/2'); exact(r.maximumTotal, '89');
  exact(r.targets[0].neededTotal, '11'); exact(r.targets[0].single.totalRaw, '22');
  exact(r.targets[0].single.hurdleRaw, '50'); exact(r.targets[0].single.requiredRaw, '50');
  exact(r.targets[1].single.requiredRaw, '72');
  equal(r.hurdles[0].status, 'pending'); equal(r.pass.status, 'pending');
});

test('契约例 2：多项未知仅输出加权整体要求', () => {
  const c = case2(); const r = calc(c);
  exact(r.actualTotal, '24'); exact(r.remainingWeight, '7/10'); exact(r.maximumTotal, '94');
  exact(r.targets[1].neededTotal, '51'); exact(r.targets[1].remainingRatePercent, '510/7');
  equal(format(r.targets[1].remainingRatePercent, { ceil: true, places: 4 }), '72.8572');
  equal(r.targets[1].single, null, '多项未知不能伪造唯一的期末倒推');
  c.items[1].actual = '30'; c.items[2].actual = '72';
  exact(calc(c).actualTotal, '75', '手算达成组合为 B30/40 + 期末72/100');
});

test('契约例 3：预计不改变实际；新实际成绩只贡献一次', () => {
  const c = case2(); c.items[1].expected = '30';
  const a = calc(c); const s = calc(c, 'scenario');
  exact(a.actualTotal, '24'); exact(a.fixedTotal, '24'); exact(a.targets[1].remainingRatePercent, '510/7');
  exact(s.actualTotal, '24'); exact(s.expectedTotal, '15'); exact(s.fixedTotal, '39');
  exact(s.remainingWeight, '1/2'); exact(s.maximumTotal, '89'); exact(s.targets[1].single.requiredRaw, '72');
  c.items[1].actual = '32'; // Intentionally retain the old forecast: legacy record path.
  const updated = calc(c, 'scenario');
  exact(updated.actualTotal, '40'); exact(updated.expectedTotal, '0'); exact(updated.fixedTotal, '40');
  exact(updated.targets[1].single.requiredRaw, '70'); truth(updated.warnings.length, '残留预计值须提示失效');
});

test('回归：超过满分的预计只阻止试算，实际贡献仍为 24', () => {
  const c = case2(); c.items[1].expected = '41';
  const a = calc(c);
  exact(a.actualTotal, '24'); exact(a.fixedTotal, '24'); exact(a.remainingWeight, '7/10');
  exact(a.targets[1].remainingRatePercent, '510/7');
  truth(a.warnings.length, '实际视角须说明预计输入未参与');
  blocked(c, 'scenario');
});

test('回归：非数字预计不在实际视角解析，试算仍明确阻止', () => {
  const c = case2(); c.items[1].expected = 'abc';
  exact(calc(c).actualTotal, '24');
  blocked(c, 'scenario');
});

test('回归：实际已有分数，残留无效预计失效且不阻止两个视角', () => {
  for (const oldExpected of ['41', 'abc', '-1']) {
    const c = case2(); c.items[1].actual = '32'; c.items[1].expected = oldExpected;
    truth(validateCourse(c).ready, '旧预计失效不得妨碍规则确认');
    for (const mode of ['actual', 'scenario']) {
      const r = calc(c, mode);
      exact(r.actualTotal, '40'); exact(r.fixedTotal, '40'); exact(r.expectedTotal, '0');
      exact(r.targets[1].single.requiredRaw, '70'); equal(r.usesExpected, false);
      truth(r.warnings.length, '旧预计值失效应有警告');
    }
  }
});

test('回归：预计违反步长不影响实际要求，但阻止当前试算', () => {
  const c = case11(); c.items[1].step = '1'; c.items[1].expected = '39.5';
  const a = calc(c); exact(a.actualTotal, '28'); exact(a.targets[0].single.requiredRaw, '40');
  blocked(c, 'scenario');
  c.items[1].actual = '40';
  const s = calc(c, 'scenario'); exact(s.actualTotal, '76'); equal(s.usesExpected, false);
  truth(s.warnings.length, '已有实际后不符合步长的旧预计也已失效');
});

test('契约例 4：实际成绩已使目标不可达，要求不得截断为满分', () => {
  const r = calc(case4());
  exact(r.actualTotal, '24'); exact(r.maximumTotal, '64'); exact(r.targets[0].neededTotal, '51');
  exact(r.targets[0].remainingRatePercent, '255/2'); exact(r.targets[0].single.requiredRaw, '255/2');
  equal(r.targets[0].totalStatus, 'unreachable'); equal(r.targets[0].single.reachable, false);
});

test('契约例 5：预计零分有效；仅当前假设不可达', () => {
  const c = case2(); c.items[1].expected = '0';
  const a = calc(c); const s = calc(c, 'scenario');
  exact(a.maximumTotal, '94'); equal(a.targets[1].totalStatus, 'reachable');
  exact(s.maximumTotal, '74'); exact(s.targets[1].single.requiredRaw, '102');
  equal(s.targets[1].totalStatus, 'unreachable'); equal(s.usesExpected, true);
  equal(s.assumptions.length, 1); equal(s.unknownItems.length, 1);
});

test('契约例 6：实际总分足够但实际 hurdle 失败；预计不能覆盖', () => {
  const c = case6();
  for (const mode of ['actual', 'scenario']) {
    const r = calc(c, mode);
    exact(r.actualTotal, '67'); exact(r.fixedTotal, '67'); exact(r.remainingWeight, '0');
    equal(r.targets[0].totalStatus, 'met'); equal(r.targets[0].remainingRatePercent, null);
    equal(r.hurdles[0].status, 'actual-failed'); equal(r.pass.status, 'actual-failed');
  }
});

test('契约例 7：填满预计只能按假设达标；假设门槛失败单列', () => {
  const c = case7(); const s = calc(c, 'scenario');
  exact(s.actualTotal, '32'); exact(s.expectedTotal, '30'); exact(s.fixedTotal, '62');
  exact(s.remainingWeight, '0'); equal(s.targets[0].remainingRatePercent, null);
  equal(s.hurdles[0].status, 'expected-met'); equal(s.pass.status, 'scenario-met');
  equal(calc(c).pass.status, 'pending'); equal(s.allActual, false);
  c.items[1].expected = '40'; const low = calc(c, 'scenario');
  exact(low.fixedTotal, '56'); equal(low.targets[0].totalStatus, 'met');
  equal(low.hurdles[0].status, 'expected-failed'); equal(low.pass.status, 'scenario-failed');
});

test('契约例 8：全为实际，恰好等于 hurdle；无剩余权重不做除法', () => {
  const c = case7(); c.items[1].actual = '50'; c.items[1].expected = '';
  const r = calc(c);
  exact(r.actualTotal, '62'); equal(r.hurdles[0].status, 'actual-met'); equal(r.pass.status, 'actual-met');
  equal(r.allActual, true); equal(r.targets[1].totalStatus, 'unreachable');
  equal(r.targets[1].remainingRatePercent, null); equal(r.targets[1].single, null);
});

test('契约例 9：实际零分不同于未知成绩', () => {
  const c = case9(); const zero = calc(c);
  exact(zero.remainingWeight, '3/5'); exact(zero.targets[0].single.requiredRaw, '250/3');
  equal(format(zero.targets[0].single.requiredRaw, { ceil: true }), '83.3334');
  c.items[0].actual = ''; const unknown = calc(c);
  exact(unknown.remainingWeight, '1'); exact(unknown.targets[0].remainingRatePercent, '50');
  equal(unknown.targets[0].single, null);
});

test('契约例 10：零权重未知项仍受 hurdle 约束', () => {
  const c = case10(); const a = calc(c);
  exact(a.actualTotal, '80'); exact(a.remainingWeight, '0'); exact(a.maximumTotal, '80');
  equal(a.targets[0].totalStatus, 'met'); equal(a.targets[0].remainingRatePercent, null);
  equal(a.targets[0].single.totalRaw, null); exact(a.targets[0].single.requiredRaw, '5');
  equal(a.hurdles[0].status, 'pending'); equal(a.pass.status, 'pending');
  c.items[1].expected = '5'; equal(calc(c, 'scenario').pass.status, 'scenario-met');
  c.items[1].actual = '5'; c.items[1].expected = ''; equal(calc(c).pass.status, 'actual-met');
});

test('契约例 11：数学下界与已确认步长；向上取整后回代', () => {
  const c = case11(); const r = calc(c);
  exact(r.actualTotal, '28'); exact(r.targets[0].neededTotal, '47');
  exact(r.targets[0].single.totalRaw, '235/6'); exact(r.targets[0].single.hurdleRaw, '25');
  exact(r.targets[0].single.minimumRaw, '235/6'); exact(r.targets[0].single.requiredRaw, '235/6');
  exact(r.targets[0].single.requiredPercent, '235/3');
  equal(format(r.targets[0].single.requiredRaw, { ceil: true }), '39.1667');
  c.items[1].step = '1'; const stepped = calc(c);
  exact(stepped.targets[0].single.minimumRaw, '235/6'); exact(stepped.targets[0].single.requiredRaw, '40');
  exact(stepped.targets[0].single.requiredPercent, '80'); exact(stepped.targets[0].single.achievedTotal, '76');
  c.items[1].actual = '39'; exact(calc(c).actualTotal, '374/5'); equal(calc(c).targets[0].totalStatus, 'unreachable');
});

test('契约例 12：49.9999 不能因显示精度而达到 50', () => {
  const r = calc(case12()); exact(r.actualTotal, '499999/10000');
  equal(r.targets[0].totalStatus, 'unreachable'); equal(r.pass.status, 'actual-failed');
  exact(r.targets[0].neededTotal, '1/10000');
});

test('精确十进制：0.2 + 0.3 + 0.5 权重合法', () => {
  truth(validateCourse(case1()).ready, '十进制合计为 1 应通过');
});
for (const weight of ['0.9', '1.1', '0.9999', '-1', '20', '']) {
  test(`非法权重 ${JSON.stringify(weight)} 不归一化`, () => blocked(course([item('A', weight, '100')])));
}
for (const max of ['', '0', '-1']) {
  test(`满分 ${JSON.stringify(max)} 必须修正`, () => blocked(course([item('A', '1', max)])));
}
for (const field of ['actual', 'expected']) {
  for (const score of ['-0.1', '100.0001', 'NaN', 'Infinity']) {
    test(`${field} 非法分数 ${score} 阻止使用该输入的计算视角`, () => {
      const c = course([item('A', '1', '100')]); c.items[0][field] = score; blocked(c, field === 'expected' ? 'scenario' : 'actual');
    });
  }
}
for (const score of ['-1', '100.0001', '']) {
  test(`目标 ${JSON.stringify(score)} 必须修正`, () => blocked(course([item('A', '1', '100')], [], [score])));
}

test('未确认规则、未知 hurdle 与冲突都阻止正式结果', () => {
  const pending = case1(); pending.ruleStatus = 'pending'; blocked(pending);
  const unknown = case1(); unknown.hurdleStatus = 'unknown'; blocked(unknown);
  const conflict = case1(); conflict.unresolvedText = '截图 40%，补充材料 50%，未确认'; blocked(conflict);
});
test('严格 > 与未支持规则不可静默改写', () => {
  const strict = case1(); strict.hurdles[0].operator = '>'; blocked(strict);
  const unsupported = case1(); unsupported.ruleStatus = 'unsupported'; unsupported.unsupportedText = '去掉最低一次 quiz'; blocked(unsupported);
  const flag = case1(); flag.unsupportedText = '补考替代原成绩'; blocked(flag);
});
test('hurdle 必须有阈值、单位、合法项目与范围', () => {
  for (const patch of [{ threshold: '' }, { unit: '' }, { itemId: 'missing' }, { threshold: '101' }, { threshold: '-1' }]) {
    const c = case1(); Object.assign(c.hurdles[0], patch); blocked(c);
  }
  const contradictory = case1(); contradictory.hurdleStatus = 'none'; blocked(contradictory);
});
test('明确无 hurdle 可计算；低于通过线的个人目标不能等同通过', () => {
  const c = course([item('A', '1', '100', '40')], [], ['30']); const r = calc(c);
  equal(r.targets[0].totalStatus, 'met'); equal(r.pass.status, 'actual-failed');
  equal(r.hurdles.length, 0);
});
test('总分已够但未知 hurdle 不允许提前宣称通过', () => {
  const c = course([item('A', '0.8', '100', '100'), item('exam', '0.2', '100')], [hurdle()]);
  const r = calc(c); exact(r.targets[0].neededTotal, '0'); exact(r.targets[0].remainingRatePercent, '0');
  exact(r.targets[0].single.totalRaw, '0'); exact(r.targets[0].single.requiredRaw, '50');
  equal(r.pass.status, 'pending');
});
test('多个未知项包含零权重项目时不能冒充唯一期末未知', () => {
  const c = case2(); c.items[1].weight = '0'; c.items[0].weight = '0.5'; c.items[1].max = '10';
  c.hurdles.push(hurdle('B', '5', 'raw', 'h2'));
  const r = calc(c); equal(r.unknownItems.length, 2); equal(r.targets[1].single, null);
  equal(r.hurdles[1].status, 'pending');
});
test('同项多条 AND 门槛取最高原始阈值', () => {
  const c = case11(); c.hurdles.push(hurdle('exam', '42', 'raw', 'h2'));
  const r = calc(c); exact(r.targets[0].single.hurdleRaw, '42'); exact(r.targets[0].single.requiredRaw, '42');
});
test('其他项实际 hurdle 失败不能靠提高唯一未知项弥补', () => {
  const c = case1(); c.hurdles.push(hurdle('A', '80', 'percent', 'h2'));
  const r = calc(c); equal(r.targets[0].totalStatus, 'reachable'); equal(r.pass.status, 'actual-failed');
});
test('其他项预计 hurdle 失败只能判当前假设失败', () => {
  const c = case2(); c.items[1].expected = '10'; c.hurdles.push(hurdle('B', '50', 'percent', 'h2'));
  const s = calc(c, 'scenario'); equal(s.pass.status, 'scenario-failed'); equal(s.hurdles[1].status, 'expected-failed');
  equal(calc(c).pass.status, 'pending');
});
test('步长须为正，满分与实际／预计分须在步长集合内', () => {
  for (const step of ['0', '-1', '3']) { const c = case11(); c.items[1].step = step; blocked(c); }
  for (const field of ['actual', 'expected']) {
    const c = case11(); c.items[1].step = '1'; c.items[1][field] = '39.5'; blocked(c, field === 'expected' ? 'scenario' : 'actual');
  }
});
test('小数步长从零起算；向上到半分并回代', () => {
  const c = case11(); c.items[1].step = '0.5'; const r = calc(c);
  exact(r.targets[0].single.requiredRaw, '79/2'); exact(r.targets[0].single.achievedTotal, '377/5');
});
test('重复项目标识与无目标不允许确认', () => {
  const dup = case1(); dup.items[1].id = dup.items[0].id; blocked(dup);
  const noTarget = case1(); noTarget.targets = []; blocked(noTarget);
});
test('清空预计输入恢复实际计算，计算函数不修改原数据', () => {
  const c = case2(); const before = JSON.stringify(c); calc(c); equal(JSON.stringify(c), before);
  c.items[1].expected = '30'; calc(c, 'scenario'); c.items[1].expected = '';
  const s = calc(c, 'scenario'); exact(s.fixedTotal, '24'); exact(s.remainingWeight, '7/10');
  equal(s.usesExpected, false); equal(s.assumptions.length, 0); exact(s.targets[1].remainingRatePercent, '510/7');
});

test('分步错误：不同步骤同时缺失时不得遗漏或重复错误', () => {
  const c = case2();
  c.name = ''; c.items[0].max = ''; c.passMark = ''; c.hurdleStatus = 'unknown';
  const result = validateCourse(c);
  equal(result.ready, false);
  equal(result.errors.length, 4, '名称、满分、及格线、单项要求状态各产生一条错误');
  equal(result.errorGroups.assessments.length, 2);
  equal(result.errorGroups.targets.length, 1);
  equal(result.errorGroups.conditions.length, 1);
  const grouped = [...result.errorGroups.assessments, ...result.errorGroups.targets, ...result.errorGroups.conditions];
  equal(JSON.stringify(grouped), JSON.stringify(result.errors), '本例各步骤顺序与原错误顺序一致，不能漏掉隐藏步骤');
  equal(new Set(grouped).size, grouped.length, '本例四个独立错误不能重复归组');
  const calculated = calculateCourse(c);
  equal(calculated.ready, false);
  equal(JSON.stringify(calculated.errorGroups), JSON.stringify(result.errorGroups));
  truth(!calculated.targets, '存在任一步错误时不能输出正式目标结果');
});

test('分步错误：待确认与特殊规则归入条件步骤，不能被步骤切换绕过', () => {
  for (const patch of [
    { ruleStatus: 'pending' },
    { ruleStatus: 'unsupported', unsupportedText: '合成规则：去掉最低一次测验' },
    { unresolvedText: '合成冲突：两份说明给出不同要求' },
    { hurdleStatus: 'unknown' },
  ]) {
    const c = case2(); Object.assign(c, patch);
    const result = validateCourse(c);
    equal(result.ready, false);
    equal(result.errorGroups.assessments.length, 0);
    equal(result.errorGroups.targets.length, 0);
    equal(JSON.stringify(result.errorGroups.conditions), JSON.stringify(result.errors), '条件错误完整且保持原顺序');
    equal(calculateCourse(c).ready, false);
  }
  const valid = validateCourse(case2());
  equal(valid.ready, true);
  equal(Object.values(valid.errorGroups).flat().length, 0);
  const malformed = validateCourse(null);
  equal(malformed.ready, false);
  equal(JSON.stringify(malformed.errorGroups.conditions), JSON.stringify(malformed.errors));
});

export function runTests() {
  const results = checks.map(({ name, run }) => {
    try { run(); return { name, passed: true }; }
    catch (error) { return { name, passed: false, error: error.stack || String(error) }; }
  });
  return { total: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results };
}
