/** Synthetic data only. These are not a real university's rules or scores. */
export function createBlank() {
  return {
    name: '', sourceMode: 'manual', sourceText: '', notes: '',
    ruleStatus: 'pending', unresolvedText: '', unsupportedText: '',
    hurdleStatus: 'unknown',
    items: [{ id: 'assessment-1', name: '', weight: '', max: '', actual: '', expected: '', step: '', source: '' }],
    hurdles: [], passMark: '', targets: [{ id: 'target-1', label: '', score: '' }],
  };
}

export function createSample() {
  return {
    name: '数据分析基础 · 演示样例', sourceMode: 'sample',
    sourceText: '演示样例｜以下是为产品演示人工构造的课程，不代表任何学校的真实评分规则。\n\n课程总评满分 100 分。\n作业 A：占总评 30%，原始满分 20 分。\n作业 B：占总评 20%，原始满分 40 分。\n期末考试：占总评 50%，原始满分 100 分。\n通过课程须同时满足：总评 >= 50；期末考试得分率 >= 50%。无其他通过门槛。\n本例目标 P = 50，D = 75，仅为自定义演示标签。\n原始计分步长未给出，不默认整数分。\n用于演示的已出成绩：作业 A = 16/20；作业 B 与期末尚未出分。',
    notes: '模拟提取：候选字段预先写好，仅与这份合成材料配套。请逐项核对后确认。',
    ruleStatus: 'pending', unresolvedText: '', unsupportedText: '', hurdleStatus: 'confirmed',
    items: [
      { id: 'assignment-a', name: '作业 A', weight: '0.3', max: '20', actual: '16', expected: '', step: '', source: '演示样例：作业 A，占 30%，满分 20；演示成绩 16。' },
      { id: 'assignment-b', name: '作业 B', weight: '0.2', max: '40', actual: '', expected: '', step: '', source: '演示样例：作业 B，占 20%，满分 40，尚未出分。' },
      { id: 'final-exam', name: '期末考试', weight: '0.5', max: '100', actual: '', expected: '', step: '', source: '演示样例：期末考试，占 50%，满分 100；得分率 >= 50%。' },
    ],
    hurdles: [{ id: 'final-hurdle', itemId: 'final-exam', operator: '>=', threshold: '50', unit: 'percent', source: '演示样例：期末考试得分率 >= 50%；所有通过条件同时满足。' }],
    passMark: '50', targets: [{ id: 'pass-target', label: 'P', score: '50' }, { id: 'distinction-target', label: 'D', score: '75' }],
  };
}
