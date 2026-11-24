import { createStore, STORAGE_KEY } from '../dist/storage.mjs';
import { createBlank } from '../dist/sample.mjs';
import { case2 } from './fixtures.mjs';

// Uses an in-memory substitute for the browser Storage API. Browser refresh,
// reopen and user-visible error handling still require actual UI checks.
function memoryStorage(initial = null) {
  const values = new Map();
  if (initial !== null) values.set(STORAGE_KEY, initial);
  return {
    denyRead: false, denyWrite: false, denyRemove: false,
    getItem(key) { if (this.denyRead) throw new Error('SecurityError'); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { if (this.denyWrite) throw new Error('QuotaExceededError'); values.set(key, String(value)); },
    removeItem(key) { if (this.denyRemove) throw new Error('SecurityError'); values.delete(key); },
    peek(key = STORAGE_KEY) { return values.has(key) ? values.get(key) : null; },
  };
}

const checks = [];
function test(name, run) { checks.push({ name, run }); }
function equal(actual, expected, message = '') {
  if (actual !== expected) throw new Error(`${message}：预期 ${String(expected)}，实际 ${String(actual)}`);
}
function truth(value, message) { if (!value) throw new Error(message); }
function feedback(result) { truth(typeof result.message === 'string' && result.message.length > 0, '失败必须返回可显示的原因'); }
function envelope(course = case2(), schemaVersion = 1) {
  return JSON.stringify({ schemaVersion, course, savedAt: '2026-11-25T00:00:00.000Z' });
}

test('存储：首次打开为空，真实零分与预计值完整往返', () => {
  const memory = memoryStorage(); const store = createStore(memory);
  equal(store.load().kind, 'empty');
  const c = case2(); c.items[0].actual = '0'; c.items[1].expected = '30'; c.notes = '用户补充说明';
  equal(store.save(c).ok, true);
  const restored = createStore(memory).load(); equal(restored.kind, 'loaded');
  equal(JSON.stringify(restored.course), JSON.stringify(c));
  truth(typeof restored.savedAt === 'string' && !Number.isNaN(Date.parse(restored.savedAt)), '保存时间必须可读');
});
test('存储：未完成草稿的空字段可以保存', () => {
  const memory = memoryStorage(); const store = createStore(memory); store.load();
  const blank = createBlank(); equal(blank.ruleStatus, 'pending');
  equal(store.save(blank).ok, true); equal(createStore(memory).load().kind, 'loaded');
  equal(JSON.stringify(createStore(memory).load().course), JSON.stringify(blank));
});
test('存储：保存快照不随未保存的内存编辑变化', () => {
  const memory = memoryStorage(); const store = createStore(memory); store.load();
  const c = case2(); store.save(c); c.items[0].actual = '1';
  equal(createStore(memory).load().course.items[0].actual, '16');
  equal(store.save(c).ok, true); equal(createStore(memory).load().course.items[0].actual, '1');
});
test('存储：JSON 损坏后保留原字节并禁止覆盖', () => {
  const raw = '{"schemaVersion":1,"course":broken'; const memory = memoryStorage(raw); const store = createStore(memory);
  const result = store.load(); equal(result.kind, 'blocked'); feedback(result);
  const save = store.save(case2()); equal(save.ok, false); equal(save.blocked, true); feedback(save);
  equal(memory.peek(), raw);
});
test('存储：未知版本保留原记录并禁止覆盖', () => {
  const raw = envelope(case2(), 2); const memory = memoryStorage(raw); const store = createStore(memory);
  const result = store.load(); equal(result.kind, 'blocked'); feedback(result);
  equal(store.save(case2()).ok, false); equal(memory.peek(), raw);
});
test('存储：结构损坏保留原记录；不自动补默认字段', () => {
  const c = case2(); delete c.items[0].max;
  const raw = envelope(c); const memory = memoryStorage(raw); const store = createStore(memory);
  const result = store.load(); equal(result.kind, 'blocked'); feedback(result);
  equal(store.save(case2()).ok, false); equal(memory.peek(), raw);
});
test('存储：当前草稿结构无效不得覆盖上次有效记录', () => {
  const memory = memoryStorage(); const store = createStore(memory); store.load(); store.save(case2());
  const raw = memory.peek(); const invalid = case2(); invalid.items[0].actual = 16;
  const result = store.save(invalid); equal(result.ok, false); feedback(result); equal(memory.peek(), raw);
});
test('存储：空间不足返回失败，保留旧记录，恢复权限后可重试', () => {
  const memory = memoryStorage(); const store = createStore(memory); store.load(); store.save(case2());
  const raw = memory.peek(); memory.denyWrite = true;
  const edited = case2(); edited.items[1].actual = '32'; const result = store.save(edited);
  equal(result.ok, false); feedback(result); equal(memory.peek(), raw);
  memory.denyWrite = false; equal(store.save(edited).ok, true);
  equal(createStore(memory).load().course.items[1].actual, '32');
});
test('存储：读取被浏览器拒绝后阻止保存并返回可见原因', () => {
  const raw = envelope(); const memory = memoryStorage(raw); memory.denyRead = true;
  const store = createStore(memory); const result = store.load(); equal(result.kind, 'blocked'); feedback(result);
  const saved = store.save(case2()); equal(saved.ok, false); equal(saved.blocked, true); feedback(saved);
  equal(memory.peek(), raw);
});
test('存储：保存前读取被拒绝，明确失败并保留旧值', () => {
  const raw = envelope(); const memory = memoryStorage(raw); const store = createStore(memory); store.load();
  memory.denyRead = true; const result = store.save(case2()); equal(result.ok, false); feedback(result);
  equal(memory.peek(), raw);
});
test('存储：多标签页冲突不得用旧页面覆盖最新课程', () => {
  const memory = memoryStorage(envelope()); const first = createStore(memory); const second = createStore(memory);
  first.load(); second.load();
  const c1 = case2(); c1.items[1].actual = '32'; equal(first.save(c1).ok, true);
  const raw = memory.peek(); const c2 = case2(); c2.items[1].expected = '30';
  const conflict = second.save(c2); equal(conflict.ok, false); equal(conflict.blocked, true); feedback(conflict);
  equal(memory.peek(), raw); equal(createStore(memory).load().course.items[1].actual, '32');
});
test('存储：用户明确重置可清除损坏记录并重新保存', () => {
  const memory = memoryStorage('corrupted'); const store = createStore(memory); store.load();
  equal(store.reset().ok, true); equal(memory.peek(), null); equal(store.load().kind, 'empty');
  equal(store.save(case2()).ok, true); equal(createStore(memory).load().kind, 'loaded');
});
test('存储：重置被拒绝时返回失败并保留记录', () => {
  const raw = envelope(); const memory = memoryStorage(raw); const store = createStore(memory); store.load();
  memory.denyRemove = true; const result = store.reset(); equal(result.ok, false); feedback(result);
  equal(memory.peek(), raw);
});

export function runStorageTests() {
  const results = checks.map(({ name, run }) => {
    try { run(); return { name, passed: true }; }
    catch (error) { return { name, passed: false, error: error.stack || String(error) }; }
  });
  return { total: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results };
}
