/**
 * Pure, deterministic course-grade calculations.
 * Decimal inputs become exact BigInt fractions. Display rounding never feeds
 * back into comparisons, attainable scores, or weighted contributions.
 */

const abs = n => n < 0n ? -n : n;
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a || 1n;
}

export class Rational {
  constructor(n, d = 1n) {
    n = BigInt(n); d = BigInt(d);
    if (!d) throw new RangeError('分母不能为零');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
    Object.freeze(this);
  }
  add(v) { const r = rational(v); return new Rational(this.n * r.d + r.n * this.d, this.d * r.d); }
  sub(v) { const r = rational(v); return new Rational(this.n * r.d - r.n * this.d, this.d * r.d); }
  mul(v) { const r = rational(v); return new Rational(this.n * r.n, this.d * r.d); }
  div(v) { const r = rational(v); return new Rational(this.n * r.d, this.d * r.n); }
  cmp(v) { const r = rational(v); const delta = this.n * r.d - r.n * this.d; return delta < 0n ? -1 : delta > 0n ? 1 : 0; }
  eq(v) { return this.cmp(v) === 0; }
  isInteger() { return this.d === 1n; }
  ceil() { return new Rational(this.n / this.d + (this.n > 0n && this.n % this.d ? 1n : 0n)); }
  toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  toJSON() { return { numerator: String(this.n), denominator: String(this.d) }; }
}

/** Parse a plain decimal, never a percentage, exponent or localized separator. */
export function rational(value) {
  if (value instanceof Rational) return value;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') throw new TypeError('请输入普通十进制数');
  const text = String(value).trim();
  if (text.length > 80 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw new TypeError('请输入普通十进制数（不含百分号或科学计数法）');
  const negative = text.startsWith('-');
  const [whole, tail = ''] = text.replace(/^[+-]/, '').split('.');
  return new Rational(BigInt((whole || '0') + tail) * (negative ? -1n : 1n), 10n ** BigInt(tail.length));
}

const ZERO = rational('0');
const ONE = rational('1');
const HUNDRED = rational('100');
const maximum = (a, b) => a.cmp(b) >= 0 ? a : b;
const sum = values => values.reduce((a, b) => a.add(b), ZERO);
const blank = value => value === '' || value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
const named = value => typeof value === 'string' && value.trim().length > 0;
export const fraction = value => rational(value).toString();

/**
 * Exact if representable at this precision; otherwise prefix ≈ when truncating.
 * ceil:true is the contract's safe upward display for minimum requirements.
 */
export function format(value, { ceil = false, places = 4 } = {}) {
  if (value === null || value === undefined) return '—';
  if (!Number.isInteger(places) || places < 0 || places > 30) throw new RangeError('显示小数位应在 0–30 之间');
  const r = rational(value);
  const scale = 10n ** BigInt(places);
  const scaled = r.n * scale;
  const remainder = scaled % r.d;
  let digits = scaled / r.d;
  if (ceil && remainder > 0n) digits += 1n;
  const negative = digits < 0n;
  const unsigned = String(abs(digits)).padStart(places + 1, '0');
  let result = places ? `${unsigned.slice(0, -places)}.${unsigned.slice(-places)}`.replace(/\.?0+$/, '') : unsigned;
  if (negative) result = `-${result}`;
  return `${!ceil && remainder !== 0n ? '≈' : ''}${result}`;
}

/** Validate draft inputs without mutating them or filling missing values.
 * Actual-only calculations exclude every expected input, including malformed
 * or out-of-range drafts. An entered actual score always supersedes its old
 * expected value; invalid actual scores still block both views.
 */
export function validateCourse(course, { includeExpected = true } = {}) {
  const errors = [];
  const warnings = [];
  // UI navigation metadata only: each original validation error stays in the
  // same order and is also attributed to its rule-editing step.
  const errorGroups = { assessments: [], targets: [], conditions: [] };
  const groupSince = (group, start) => errorGroups[group].push(...errors.slice(start));
  if (!course || typeof course !== 'object' || Array.isArray(course)) {
    errors.push('课程记录暂时无法读取，请保留原记录后重试。');
    groupSince('conditions', 0);
    return { ready: false, errors, warnings, errorGroups };
  }
  if (!named(course.name)) errors.push('请填写课程名称。');
  groupSince('assessments', 0);
  let groupStart = errors.length;
  if (course.ruleStatus !== 'confirmed') {
    errors.push(course.ruleStatus === 'unsupported' ? '这门课有暂不支持的计分规则，现在还不能计算。' : '请先核对并确认课程规则，再查看结果。');
  }
  if (named(course.unresolvedText)) errors.push('课程规则还有没弄清楚的地方。请核实后清空“需要核实的问题”，再计算。');
  if (named(course.unsupportedText)) errors.push('这门课有暂不支持的规则，请保留原文；忽略这些规则可能算错。');
  groupSince('conditions', groupStart);

  function number(value, label, { optional = false, min = ZERO, max, positive = false } = {}) {
    if (blank(value)) {
      if (!optional) errors.push(`${label}尚未填写。`);
      return null;
    }
    let n;
    try { n = rational(value); }
    catch { errors.push(`${label}请填写数字，可以有小数，不要加入百分号。`); return null; }
    if (positive ? n.cmp(ZERO) <= 0 : n.cmp(min) < 0) {
      errors.push(positive ? `${label}必须大于 0。` : `${label}不能小于 ${format(min)}。`);
      return null;
    }
    if (max && n.cmp(max) > 0) {
      errors.push(`${label}不能超过 ${label.endsWith('的占总评比例') ? `${format(max.mul(HUNDRED))}%` : format(max)}。`);
      return null;
    }
    return n;
  }

  groupStart = errors.length;
  const items = Array.isArray(course.items) ? course.items : [];
  if (!items.length) errors.push('请至少添加一项作业或考试。');
  const itemIds = new Set();
  const parsedItems = new Map();
  const weights = [];
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`考核项目 ${index + 1} 格式不正确。`); return; }
    const label = named(item.name) ? item.name : `考核项目 ${index + 1}`;
    if (!named(item.id) || itemIds.has(item.id)) errors.push(`${label}的记录重复或不完整，请重新添加这一项。`);
    itemIds.add(item.id);
    if (!named(item.name)) errors.push(`${label}缺少名称。`);
    const weight = number(item.weight, `${label}的占总评比例`, { max: ONE });
    const max = number(item.max, `${label}的满分`, { positive: true });
    const step = number(item.step, `${label}的最小给分单位`, { optional: true, positive: true });
    const actual = number(item.actual, `${label}的实际成绩`, { optional: true, max });
    const hasActual = !blank(item.actual);
    const hasExpected = !blank(item.expected);
    const useExpected = includeExpected && !hasActual;
    const expected = useExpected ? number(item.expected, `${label}的预计成绩`, { optional: true, max }) : null;
    if (weight) weights.push(weight);
    if (step && max && !max.div(step).isInteger()) errors.push(`${label}设置为每 ${format(step)} 分给分，但满分 ${format(max)} 不符合这个单位，请核对。`);
    if (step && actual && !actual.div(step).isInteger()) errors.push(`${label}设置为每 ${format(step)} 分给分，实际成绩 ${format(actual)} 不符合，请核对。`);
    if (step && expected && !expected.div(step).isInteger()) errors.push(`${label}设置为每 ${format(step)} 分给分，预计成绩 ${format(expected)} 不符合，请核对。`);
    if (hasActual && hasExpected) warnings.push(`${label}已出分，按实际成绩计算，原来的预计成绩不再使用。`);
    else if (!includeExpected && hasExpected) warnings.push(`${label}的预计成绩没有计入当前结果，只在试算时使用。`);
    parsedItems.set(item.id, { max, step });
  });
  if (weights.length === items.length && items.length && !sum(weights).eq(ONE)) errors.push(`所有作业和考试的占比加起来应为 100%，目前是 ${format(sum(weights).mul(HUNDRED), { places: 12 })}%。请对照课程说明修改，工具不会替你调整占比。`);
  groupSince('assessments', groupStart);

  groupStart = errors.length;
  number(course.passMark, '课程及格线', { max: HUNDRED });
  const targets = Array.isArray(course.targets) ? course.targets : [];
  if (!targets.length) errors.push('请至少填写一个目标，以及你想达到的总评分数。');
  const targetIds = new Set();
  targets.forEach((target, index) => {
    if (!target || typeof target !== 'object' || Array.isArray(target)) { errors.push(`目标 ${index + 1} 格式不正确。`); return; }
    if (!named(target.id) || targetIds.has(target.id)) errors.push(`目标 ${index + 1} 的记录重复或不完整，请重新添加。`);
    targetIds.add(target.id);
    if (!named(target.label)) errors.push(`目标 ${index + 1} 缺少名称。`);
    number(target.score, `目标 ${target.label || index + 1} 的分数`, { max: HUNDRED });
  });
  groupSince('targets', groupStart);

  groupStart = errors.length;
  const hurdles = Array.isArray(course.hurdles) ? course.hurdles : [];
  if (!Array.isArray(course.hurdles)) errors.push('单项最低分要求的记录无法读取，请重新核对。');
  if (course.hurdleStatus === 'unknown' || !['none', 'confirmed'].includes(course.hurdleStatus)) errors.push('请查一下课程说明：是否有某项作业或考试必须单独达到的分数？暂时没找到时，请选“还不确定”。');
  if (course.hurdleStatus === 'none' && hurdles.length) errors.push('你选择了“没有单项最低分要求”，但下方还留有要求。请对照课程说明核对。');
  if (course.hurdleStatus === 'confirmed' && !hurdles.length) errors.push('请填清是哪项作业或考试，以及至少需要多少分；若课程明确没有这类要求，请选择“没有”。');
  const hurdleIds = new Set();
  hurdles.forEach((hurdle, index) => {
    const label = `单项最低分要求 ${index + 1}`;
    if (!hurdle || typeof hurdle !== 'object' || Array.isArray(hurdle)) { errors.push(`${label}格式不正确。`); return; }
    if (!named(hurdle.id) || hurdleIds.has(hurdle.id)) errors.push(`${label}的记录重复或不完整，请重新添加。`);
    hurdleIds.add(hurdle.id);
    if (!itemIds.has(hurdle.itemId)) errors.push(`${label}还没选对应的作业或考试。`);
    if (hurdle.operator !== '>=') errors.push(`${label}目前只支持“达到或超过”。“必须高于”或复杂的组合要求暂不支持，不能自行改写。`);
    if (!['raw', 'percent'].includes(hurdle.unit)) errors.push(`${label}请说明填的是该项分数，还是该项满分的百分比。`);
    number(hurdle.threshold, `${label}的最低分数`, { max: hurdle.unit === 'percent' ? HUNDRED : parsedItems.get(hurdle.itemId)?.max });
  });
  groupSince('conditions', groupStart);
  return { ready: errors.length === 0, errors, warnings, errorGroups };
}

const contribution = (item, score) => HUNDRED.mul(item.weight).mul(score).div(item.max);

/** Both views use the same exact formulas, with different fixed-score sets. */
export function calculateCourse(course, mode = 'actual') {
  if (!['actual', 'scenario'].includes(mode)) throw new TypeError('mode 必须是 actual 或 scenario');
  const validation = validateCourse(course, { includeExpected: mode === 'scenario' });
  if (!validation.ready) return { ...validation, mode };

  const items = course.items.map(item => {
    const actual = blank(item.actual) ? null : rational(item.actual);
    const expected = mode === 'actual' || blank(item.expected) || actual !== null ? null : rational(item.expected);
    const normalized = {
      id: item.id, name: item.name, weight: rational(item.weight), max: rational(item.max),
      step: blank(item.step) ? null : rational(item.step), actual, expected,
      source: actual !== null ? 'actual' : mode === 'scenario' && expected !== null ? 'expected' : 'unknown',
      fixed: actual !== null ? actual : mode === 'scenario' ? expected : null,
    };
    normalized.actualContribution = actual === null ? ZERO : contribution(normalized, actual);
    normalized.contribution = normalized.fixed === null ? ZERO : contribution(normalized, normalized.fixed);
    return normalized;
  });
  const itemById = new Map(items.map(item => [item.id, item]));
  const actualTotal = sum(items.map(item => item.actualContribution));
  const assumptions = items.filter(item => item.source === 'expected').map(item => ({
    id: item.id, name: item.name, score: item.expected, max: item.max, contribution: item.contribution,
  }));
  const expectedTotal = sum(assumptions.map(item => item.contribution));
  const fixedTotal = actualTotal.add(expectedTotal);
  const unknownItems = items.filter(item => item.source === 'unknown');
  const remainingWeight = sum(unknownItems.map(item => item.weight));
  const remainingPossible = remainingWeight.mul(HUNDRED);
  const maximumTotal = fixedTotal.add(remainingPossible);
  const hurdles = course.hurdles.map(hurdle => {
    const item = itemById.get(hurdle.itemId);
    const threshold = rational(hurdle.threshold);
    const thresholdRaw = hurdle.unit === 'percent' ? item.max.mul(threshold).div(HUNDRED) : threshold;
    const status = item.fixed === null ? 'pending' : `${item.source}-${item.fixed.cmp(thresholdRaw) >= 0 ? 'met' : 'failed'}`;
    return { id: hurdle.id, itemId: item.id, itemName: item.name, max: item.max, thresholdRaw, score: item.fixed, status };
  });

  function targetResult(target) {
    const threshold = rational(target.score);
    const gap = threshold.sub(fixedTotal);
    const neededTotal = maximum(ZERO, gap);
    const totalStatus = gap.cmp(ZERO) <= 0 ? 'met' : maximumTotal.cmp(threshold) < 0 ? 'unreachable' : 'reachable';
    const remainingRatePercent = remainingWeight.eq(ZERO) ? null : neededTotal.div(remainingWeight);
    let single = null;
    if (unknownItems.length === 1) {
      const item = unknownItems[0];
      const itemHurdles = hurdles.filter(hurdle => hurdle.itemId === item.id);
      const hurdleRaw = itemHurdles.reduce((highest, hurdle) => maximum(highest, hurdle.thresholdRaw), ZERO);
      const totalRaw = item.weight.eq(ZERO) ? null : neededTotal.mul(item.max).div(HUNDRED.mul(item.weight));
      const minimumRaw = maximum(totalRaw ?? ZERO, hurdleRaw);
      const requiredRaw = item.step ? minimumRaw.div(item.step).ceil().mul(item.step) : minimumRaw;
      const achievedTotal = fixedTotal.add(contribution(item, requiredRaw));
      // This is only the single item's mathematical feasibility. Other hurdle
      // failures remain explicit in hurdles/pass and cannot be compensated.
      const reachable = requiredRaw.cmp(item.max) <= 0 && achievedTotal.cmp(threshold) >= 0 && requiredRaw.cmp(hurdleRaw) >= 0;
      single = {
        itemId: item.id, name: item.name, max: item.max, totalRaw, hurdleRaw,
        hasHurdle: itemHurdles.length > 0, minimumRaw, requiredRaw,
        requiredPercent: requiredRaw.mul(HUNDRED).div(item.max),
        step: item.step, reachable, achievedTotal,
      };
    }
    return { id: target.id, label: target.label, threshold, gap, neededTotal, remainingRatePercent, totalStatus, single };
  }

  const targets = course.targets.map(targetResult);
  const passTarget = targetResult({ id: 'pass', label: '通过总分', score: course.passMark });
  const actualFailure = hurdles.some(hurdle => hurdle.status === 'actual-failed');
  const expectedFailure = hurdles.some(hurdle => hurdle.status === 'expected-failed');
  const allHurdlesActual = hurdles.every(hurdle => hurdle.status === 'actual-met');
  const allHurdlesMet = hurdles.every(hurdle => ['actual-met', 'expected-met'].includes(hurdle.status));
  let passStatus = 'pending';
  let passMessage = hurdles.length ? '还要等后续成绩。总评需达到及格线，单项最低分要求也要达到。' : '还要等后续成绩，总评需要达到你设置的及格线。';
  if (actualFailure) {
    passStatus = 'actual-failed';
    passMessage = '按你确认的课程规则，目前未满足及格条件：有一项已出成绩低于最低要求，其他项目的高分不能弥补。';
  } else if (actualTotal.cmp(passTarget.threshold) >= 0 && allHurdlesActual) {
    passStatus = 'actual-met';
    passMessage = '按你确认的课程规则，目前已满足及格条件；最终成绩以学校公布为准。';
  } else if (expectedFailure) {
    passStatus = 'scenario-failed';
    passMessage = '有一项预计成绩低于该项最低要求，其他项目考得更高也不能弥补。这只是按预计成绩试算。';
  } else if (maximumTotal.cmp(passTarget.threshold) < 0) {
    if (mode === 'scenario' && assumptions.length) {
      passStatus = 'scenario-failed';
      passMessage = '按你填的预计成绩，剩余项目即使满分，总评也达不到及格线。实际成绩还未确定，可以调整预计成绩再试。';
    } else if (items.every(item => item.actual !== null)) {
      passStatus = 'actual-failed';
      passMessage = '全部成绩已出，总评低于你确认的及格线，目前未满足及格条件。';
    } else {
      passStatus = 'unreachable';
      passMessage = '根据已出成绩，剩余作业和考试即使满分，总评也达不到及格线。';
    }
  } else if (mode === 'scenario' && assumptions.length && unknownItems.length === 0 && passTarget.totalStatus === 'met' && allHurdlesMet) {
    passStatus = 'scenario-met';
    passMessage = hurdles.length ? '如果实际得分与你的预计相同，总评和各项最低分都能达到及格要求。目前还只是试算。' : '如果实际得分与你的预计相同，总评能达到及格线。目前还只是试算。';
  } else if (mode === 'scenario' && assumptions.length) {
    passMessage = '这是按预计成绩试算，仍有未填的成绩。请查看剩余需要多少分，以及每项最低分要求。';
  }

  return {
    ...validation, mode, items, actualTotal, expectedTotal, fixedTotal,
    remainingWeight, remainingWeightPercent: remainingWeight.mul(HUNDRED), remainingPossible, maximumTotal,
    unknownItems, assumptions, usesExpected: assumptions.length > 0, allActual: items.every(item => item.actual !== null),
    targets, hurdles,
    pass: { status: passStatus, message: passMessage, threshold: passTarget.threshold, totalStatus: passTarget.totalStatus },
  };
}
