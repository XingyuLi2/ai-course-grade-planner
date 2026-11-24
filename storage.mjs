// Draft shape validation is intentionally separate from calculation validation:
// an incomplete course may be saved, but malformed/unknown records are preserved.
export const STORAGE_KEY = 'course-grade:v1';
const str = (v, max = 50000) => typeof v === 'string' && v.length <= max;
const strings = (o, keys) => o && keys.every(k => str(o[k]));
export function isCourseShape(c) {
  return !!(strings(c, ['name','sourceText','notes','unresolvedText','unsupportedText','passMark']) &&
    ['sample','manual'].includes(c.sourceMode) && ['pending','confirmed','unsupported'].includes(c.ruleStatus) &&
    ['unknown','none','confirmed'].includes(c.hurdleStatus) &&
    Array.isArray(c.items) && c.items.length <= 100 && c.items.every(i => strings(i, ['id','name','weight','max','actual','expected','step','source'])) &&
    Array.isArray(c.targets) && c.targets.length <= 30 && c.targets.every(t => strings(t, ['id','label','score'])) &&
    Array.isArray(c.hurdles) && c.hurdles.length <= 100 && c.hurdles.every(h => strings(h, ['id','itemId','operator','threshold','unit','source'])));
}
export function createStore(storage) {
  let observedRaw = null;
  let blocked = false;
  function load() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      observedRaw = raw;
      if (raw === null) return {kind:'empty'};
      const record = JSON.parse(raw);
      if (!record || record.schemaVersion !== 1 || !isCourseShape(record.course) || !str(record.savedAt,100)) {
        blocked = true;
        return {kind:'blocked',message:'已保存记录的版本或格式无法读取。原记录已保留，自动保存已暂停。'};
      }
      return {kind:'loaded',course:record.course,savedAt:record.savedAt};
    } catch {
      blocked = true;
      return {kind:'blocked',message:'无法读取本地记录。可能是浏览器限制或数据损坏；自动保存已暂停，原记录不会被覆盖。'};
    }
  }
  function save(course) {
    if (blocked) return {ok:false,blocked:true,message:'自动保存已暂停，当前修改仅在此页面。请先处理上方的存储提示。'};
    if (!isCourseShape(course)) return {ok:false,message:'当前草稿格式无效，未覆盖已保存记录。'};
    try {
      if (storage.getItem(STORAGE_KEY) !== observedRaw) {
        blocked = true;
        return {ok:false,blocked:true,message:'另一个标签页已更新课程。为避免覆盖，已暂停保存。请重新载入最新记录；当前页面修改尚未保存。'};
      }
      const savedAt = new Date().toISOString();
      const raw = JSON.stringify({schemaVersion:1,course,savedAt});
      storage.setItem(STORAGE_KEY,raw);
      observedRaw = raw;
      return {ok:true,savedAt};
    } catch {
      return {ok:false,message:'保存失败：浏览器存储不可用或空间不足。当前修改仍在页面中，请勿关闭；允许本站存储后重试。'};
    }
  }
  function reset() {
    try { storage.removeItem(STORAGE_KEY); observedRaw=null; blocked=false; return {ok:true}; }
    catch { return {ok:false,message:'无法清除本地记录，请检查浏览器存储设置。'}; }
  }
  return {load,save,reset};
}
