import { rational } from './calc.mjs';

// A draft is only a string in the edit dialog. These functions never mutate
// the saved course; the UI calls commit only after the student confirms.
export function validateActualScore(item, value) {
  if (!item || typeof item !== 'object' || typeof value !== 'string') {
    return { ok: false, message: '成绩记录暂时无法读取，请关闭后重试。' };
  }
  const text = value.trim();
  // Clearing a score returns it to unknown, even if its rule needs correcting.
  if (!text) return { ok: true, value: '' };
  let score;
  try { score = rational(text); }
  catch { return { ok: false, message: '请输入分数，可以有小数；不要填写百分号或文字。' }; }
  if (score.cmp('0') < 0) return { ok: false, message: '成绩不能小于 0。' };
  let max;
  try { max = rational(item.max); }
  catch { return { ok: false, message: '请先核对这项作业或考试的满分，再保存成绩。' }; }
  if (max.cmp('0') <= 0) return { ok: false, message: '这项作业或考试的满分必须大于 0，请先核对。' };
  if (score.cmp(max) > 0) return { ok: false, message: `成绩不能超过满分 ${item.max}。` };
  if (item.step !== null && item.step !== undefined && String(item.step).trim() !== '') {
    let step;
    try { step = rational(item.step); }
    catch { return { ok: false, message: '这项成绩的给分单位还没设置清楚，请先核对。' }; }
    if (step.cmp('0') <= 0 || !max.div(step).isInteger()) {
      return { ok: false, message: '给分单位与满分不一致，请先核对课程说明。' };
    }
    if (!score.div(step).isInteger()) {
      return { ok: false, message: `这项成绩按每 ${item.step} 分给分，请核对后再保存。` };
    }
  }
  return { ok: true, value: text };
}

/** previousActual is the value displayed when the student opened the dialog.
 * Passing it prevents a stale draft from replacing a more recent edit.
 * Browser-tab conflicts are additionally checked by the existing store.
 */
export function commitActualScore(course, itemId, value, { previousActual } = {}) {
  if (!course || !Array.isArray(course.items)) {
    return { ok: false, message: '课程记录暂时无法读取，请重新打开页面。' };
  }
  const matches = course.items.filter(item => item && item.id === itemId);
  if (matches.length !== 1) {
    return { ok: false, message: '找不到唯一对应的作业或考试，请关闭后重试。' };
  }
  const item = matches[0];
  if (previousActual !== undefined && item.actual !== previousActual) {
    return { ok: false, message: '这项成绩已经发生变化，请关闭窗口，核对最新成绩后再修改。' };
  }
  const validation = validateActualScore(item, value);
  if (!validation.ok) return validation;
  const next = structuredClone(course);
  const updated = next.items.find(entry => entry.id === itemId);
  updated.actual = validation.value;
  updated.expected = '';
  return { ok: true, course: next };
}
