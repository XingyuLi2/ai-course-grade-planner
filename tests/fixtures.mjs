// Synthetic inputs transcribed from docs/calculation-spec.md; no real school data.
// Expected answers are in calculation.test.mjs, independently specified by hand.
export function item(id, weight, max, actual = '', expected = '', step = '') {
  return { id, name: id === 'exam' ? '期末' : id, weight, max, actual, expected, step, source: '合成测试设置' };
}

export function hurdle(itemId = 'exam', threshold = '50', unit = 'percent', id = 'h1') {
  return { id, itemId, threshold, unit, operator: '>=', source: '合成测试：最低分门槛' };
}

export function course(items, hurdles = [], targets = ['50', '75']) {
  return {
    name: '合成计算测试课程', sourceMode: 'manual', sourceText: '仅为确定性计算检查的合成数据', notes: '',
    ruleStatus: 'confirmed', unresolvedText: '', unsupportedText: '',
    hurdleStatus: hurdles.length ? 'confirmed' : 'none',
    items, hurdles, passMark: '50',
    targets: targets.map((score, index) => ({ id: `t${index}`, label: `目标 ${score}`, score })),
  };
}

export function case1() {
  return course([item('A', '0.2', '60', '45'), item('B', '0.3', '100', '80'), item('exam', '0.5', '100')], [hurdle()]);
}

export function case2() {
  return course([item('A', '0.3', '20', '16'), item('B', '0.2', '40'), item('exam', '0.5', '100')], [hurdle()]);
}

export function case4() {
  return course([item('A', '0.6', '100', '40'), item('exam', '0.4', '100')], [], ['75']);
}

export function case6() {
  return course([item('A', '0.4', '100', '100'), item('exam', '0.6', '100', '45', '60')], [hurdle()]);
}

export function case7() {
  return course([item('A', '0.4', '100', '80'), item('exam', '0.6', '100', '', '50')], [hurdle()]);
}

export function case9() {
  return course([item('A', '0.4', '100', '0'), item('exam', '0.6', '100')], [], ['50']);
}

export function case10() {
  return course([item('A', '1', '100', '80'), item('oral', '0', '10')], [hurdle('oral', '5', 'raw')], ['75']);
}

export function case11() {
  return course([item('A', '0.4', '100', '70'), item('exam', '0.6', '50')], [hurdle()], ['75']);
}

export function case12() {
  return course([item('exam', '1', '100', '49.9999')], [], ['50']);
}
