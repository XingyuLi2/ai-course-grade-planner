import { commitActualScore, validateActualScore } from '../dist/score-edit.mjs';
import { case2 } from './fixtures.mjs';

// Synthetic module checks. A successful check is not browser interaction QA.
const checks = [];
const test = (name, run) => checks.push({ name, run });
const equal = (actual, expected) => {
  if (actual !== expected) throw new Error(`预期 ${String(expected)}，实际 ${String(actual)}`);
};
function rejected(result) {
  equal(result.ok, false);
  equal(typeof result.message, 'string');
  equal(result.message.length > 0, true);
}

test('成绩保护：编辑草稿及校验均不改变原成绩', () => {
  const c = case2(); const original = JSON.stringify(c);
  equal(validateActualScore(c.items[0], '18').ok, true);
  equal(JSON.stringify(c), original);
});
test('成绩保护：首次确认录入后只清空该项预计，保留其他分数和规则', () => {
  const c = case2(); c.items[1].expected = '30'; c.items[2].expected = '65';
  const original = JSON.stringify(c);
  const r = commitActualScore(c, 'B', '32', { previousActual: '' });
  equal(r.ok, true); equal(r.course.items[1].actual, '32'); equal(r.course.items[1].expected, '');
  equal(r.course.items[0].actual, '16'); equal(r.course.items[2].expected, '65');
  equal(JSON.stringify(r.course.hurdles), JSON.stringify(c.hurdles));
  equal(JSON.stringify(r.course.targets), JSON.stringify(c.targets));
  equal(JSON.stringify(c), original);
});
test('成绩保护：已出成绩确认修改，原记录仍保持不变', () => {
  const c = case2(); const r = commitActualScore(c, 'A', '18', { previousActual: '16' });
  equal(r.ok, true); equal(r.course.items[0].actual, '18'); equal(c.items[0].actual, '16');
});
test('成绩保护：零分是已出成绩，不能变成空值', () => {
  const c = case2(); const r = commitActualScore(c, 'A', '0', { previousActual: '16' });
  equal(r.ok, true); equal(r.course.items[0].actual, '0');
});
test('成绩保护：确认清除成绩后变为未知，不恢复旧预计', () => {
  const c = case2(); c.items[0].expected = '15';
  const r = commitActualScore(c, 'A', '   ', { previousActual: '16' });
  equal(r.ok, true); equal(r.course.items[0].actual, ''); equal(r.course.items[0].expected, '');
});
test('成绩保护：超满分、负数及非数字均拒绝，原值保留', () => {
  const c = case2(); const original = JSON.stringify(c);
  for (const value of ['21', '-1', 'NaN', '1e1', '80%', '分数', null]) {
    rejected(commitActualScore(c, 'A', value, { previousActual: '16' }));
    equal(JSON.stringify(c), original);
  }
});
test('成绩保护：未指定给分单位时允许小数，不默认整数', () => {
  const c = case2(); const r = commitActualScore(c, 'A', ' 16.125 ');
  equal(r.ok, true); equal(r.course.items[0].actual, '16.125');
  c.items[0].step = '   '; equal(commitActualScore(c, 'A', '16.125').ok, true);
});
test('成绩保护：给分单位使用准确小数比较', () => {
  const c = case2(); c.items[0].step = '0.5';
  equal(commitActualScore(c, 'A', '16.5').ok, true);
  rejected(commitActualScore(c, 'A', '16.25'));
  rejected(commitActualScore(c, 'A', '16.4999999'));
});
test('成绩保护：无效满分或给分单位阻止新成绩保存，但可以确认清除', () => {
  const c = case2(); c.items[0].max = '';
  rejected(commitActualScore(c, 'A', '16')); equal(commitActualScore(c, 'A', '').ok, true);
  c.items[0].max = '20'; c.items[0].step = '3'; rejected(commitActualScore(c, 'A', '15'));
  c.items[0].step = '0'; rejected(commitActualScore(c, 'A', '15'));
});
test('成绩保护：编辑中原值变动时拒绝覆盖更新的成绩', () => {
  const c = case2(); c.items[0].actual = '17';
  rejected(commitActualScore(c, 'A', '18', { previousActual: '16' }));
  equal(c.items[0].actual, '17');
});
test('成绩保护：找不到项目或项目ID重复时不误写其他项', () => {
  const c = case2(); rejected(commitActualScore(c, 'missing', '18'));
  c.items[1].id = 'A'; rejected(commitActualScore(c, 'A', '18'));
  equal(c.items[0].actual, '16'); equal(c.items[1].actual, '');
});

export function runScoreEditTests() {
  const results = checks.map(({ name, run }) => {
    try { run(); return { name, passed: true }; }
    catch (error) { return { name, passed: false, error: error.stack || String(error) }; }
  });
  return { total: results.length, passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length, results };
}
