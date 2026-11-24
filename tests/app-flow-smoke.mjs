// Node-only integration checks of the actual app event handlers. This small
// DOM/storage substitute does not test browser layout, focus or real dialogs.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const KEY = 'course-grade:v1';
const assert = (value, message) => { if (!value) throw new Error(message); };
const equal = (actual, expected, message = '') => {
  if (actual !== expected) throw new Error(`${message}：预期 ${String(expected)}，实际 ${String(actual)}`);
};
const decode = value => String(value).replace(/&(?:amp|lt|gt|quot|#39);/g, v => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
}[v]));
const camel = name => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

class Element {
  constructor(tagName, owner) {
    this.tagName = tagName.toLowerCase(); this.owner = owner; this.children = [];
    this.parentElement = null; this.attributes = {}; this.dataset = {}; this.listeners = new Map();
    this.files = []; this._text = ''; this.hidden = false; this.disabled = false;
    this.checked = false; this.open = false; this.selected = false;
    this.classList = { toggle: (name, force) => {
      const classes = new Set((this.attributes.class || '').split(/\s+/).filter(Boolean));
      const add = force ?? !classes.has(name); if (add) classes.add(name); else classes.delete(name);
      this.attributes.class = [...classes].join(' '); return add;
    } };
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value);
    if (name === 'value') this._value = decode(value);
    if (['hidden','disabled','checked','open','selected'].includes(name)) this[name] = true;
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  get id() { return this.attributes.id || ''; }
  get value() {
    if (this._value !== undefined) return this._value;
    if (this.tagName === 'textarea') return this.textContent;
    if (this.tagName === 'select') {
      const choices = this.querySelectorAll('option');
      return (choices.find(n => n.selected) || choices[0])?.value || '';
    }
    return '';
  }
  set value(value) { this._value = String(value); }
  get textContent() { return this.tagName === '#text' ? this._text : this.children.map(n => n.textContent).join(''); }
  set textContent(text) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    if (text !== '') { const node = new Element('#text', this.owner); node._text = String(text); this.append(node); }
  }
  get innerHTML() { return this._html || ''; }
  set innerHTML(html) {
    this._html = String(html);
    for (const child of this.children) child.parentElement = null;
    this.children = []; parseHTML(String(html), this);
  }
  append(node) { node.parentElement = this; this.children.push(node); }
  matches(selector) {
    const id = selector.match(/^#([\w-]+)$/); if (id) return this.id === id[1];
    const className = selector.match(/^\.([\w-]+)$/);
    if (className) return (this.attributes.class || '').split(/\s+/).includes(className[1]);
    const attr = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (attr) return Object.hasOwn(this.attributes, attr[1]) && (attr[2] === undefined || this.attributes[attr[1]] === attr[2]);
    return this.tagName === selector.toLowerCase();
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  querySelectorAll(selector) {
    const found = [];
    const walk = node => { for (const child of node.children) { if (child.matches(selector)) found.push(child); walk(child); } };
    walk(this); return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || []; callbacks.push(callback); this.listeners.set(type, callbacks);
  }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
  get isConnected() { let node = this; while (node.parentElement) node = node.parentElement; return node === this.owner; }
  focus() { this.owner.activeElement = this; }
  scrollIntoView() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function parseHTML(html, root) {
  const stack = [root]; let cursor = 0;
  const appendText = text => {
    if (!text) return;
    const node = new Element('#text', root.owner); node._text = decode(text); stack.at(-1).append(node);
  };
  for (const match of html.matchAll(/<\/?[a-zA-Z](?:"[^"]*"|'[^']*'|[^'">])*>/g)) {
    appendText(html.slice(cursor, match.index)); cursor = match.index + match[0].length;
    const token = match[0]; const tag = token.match(/^<\/?([\w-]+)/)[1].toLowerCase();
    if (token.startsWith('</')) {
      const found = stack.findLastIndex(node => node.tagName === tag);
      if (found > 0) stack.length = found;
      continue;
    }
    const node = new Element(tag, root.owner);
    const attrs = token.slice(token.indexOf(tag) + tag.length, token.endsWith('/>') ? -2 : -1);
    for (const attr of attrs.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      node.setAttribute(attr[1], decode(attr[2] ?? attr[3] ?? attr[4] ?? ''));
    }
    stack.at(-1).append(node);
    if (!voidTags.has(tag) && !token.endsWith('/>')) stack.push(node);
  }
  appendText(html.slice(cursor));
}

export async function createAppHarness(initialRaw = null, sharedValues = null) {
  const values = sharedValues || new Map(); if (initialRaw !== null) values.set(KEY, initialRaw);
  const storage = {
    denyWrite: false,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (this.denyWrite) throw new Error('QuotaExceededError: synthetic storage failure');
      values.set(key, String(value));
    },
    removeItem: key => values.delete(key),
  };
  const document = new Element('#document'); document.owner = document;
  document.getElementById = id => document.querySelector(`#${id}`);
  document.innerHTML = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const windowListeners = new Map(); let serial = 0;
  const window = {localStorage: storage, scrollTo() {}, confirm() { return true; },
    addEventListener(type, callback) { windowListeners.set(type, callback); }};
  const location = {protocol:'http:', reload() {}};
  const appURL = new URL('../dist/app.mjs', import.meta.url).href;
  const context = vm.createContext({document, window, location, structuredClone,
    crypto:{randomUUID: () => `test-id-${++serial}`}, console,
    URL:{createObjectURL: () => `blob:synthetic-${++serial}`, revokeObjectURL() {}},
    setTimeout, clearTimeout});
  const modules = new Map();
  async function load(url) {
    if (modules.has(url)) return modules.get(url);
    const module = new vm.SourceTextModule(await readFile(new URL(url), 'utf8'), {context, identifier:url});
    modules.set(url, module); await module.link((spec, reference) => load(new URL(spec, reference.identifier).href));
    return module;
  }
  const module = await load(appURL); await module.evaluate();
  const find = selector => {
    const node = document.querySelector(selector); assert(node, `找不到 ${selector}`); return node;
  };
  async function fire(node, type) {
    const event = {target:node, defaultPrevented:false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }};
    for (let parent = node; parent; parent = parent.parentElement) {
      for (const callback of parent.listeners.get(type) || []) await callback(event);
      if (event.stopped) break;
    }
  }
  function button(action, id = null) {
    const nodes = document.querySelectorAll('[data-action]');
    const node = nodes.find(n => n.dataset.action === action && (id === null || n.dataset.id === id));
    assert(node, `找不到操作 ${action}${id ? `（${id}）` : ''}`); return node;
  }
  return {document, find, button, values, storage, fire,
    click: async node => {
      if (typeof node === 'string') node = find(node);
      assert(node.isConnected, '不能点击已移除的元素'); assert(!node.disabled, '不能点击禁用按钮');
      for (let parent = node; parent; parent = parent.parentElement) {
        assert(!parent.hidden, '不能点击隐藏区域的按钮');
        assert(parent.tagName !== 'dialog' || parent.open, '不能点击尚未打开的对话框');
      }
      await fire(node, 'click');
    },
    input: async (node, value) => { if (typeof node === 'string') node = find(node); node.value = value; await fire(node, 'input'); },
    saved: () => { const raw = values.get(KEY); return raw ? JSON.parse(raw).course : null; },
  };
}

const scoreInput = (app, id) => {
  const node = app.document.querySelectorAll('[data-score="expected"]').find(n => n.dataset.id === id);
  assert(node, `找不到 ${id} 的预计成绩输入框`); return node;
};
const itemOf = (app, id) => app.saved().items.find(item => item.id === id);
async function sampleApp() {
  const app = await createAppHarness();
  await app.click(app.button('generate-sample')); await app.click(app.button('quick-confirm')); return app;
}

export async function runAppFlowTests() {
  const checks = [];
  const test = (name, run) => checks.push({name, run});
  test('应用事件：无记录时进入材料导入，不要求手动建课', async () => {
    const app = await createAppHarness();
    equal(app.find('#import').hidden, false); equal(app.find('#dashboard').hidden, true);
    equal(app.find('#rules').hidden, true); equal(app.saved(), null);
    assert(app.find('#import').textContent.includes('模拟提取'), '模拟说明必须可见');
    equal(app.document.querySelector('[data-action="blank"]'), null);
  });
  test('应用事件：生成样例后直接进入成绩表，一次确认即可试算', async () => {
    const app = await createAppHarness(); await app.click(app.button('generate-sample'));
    equal(app.find('#dashboard').hidden, false); equal(app.find('#rules').hidden, true);
    equal(app.saved().ruleStatus, 'pending'); scoreInput(app, 'assignment-b');
    equal(app.find('#target-results').querySelector('.target-result'), null, '确认前不能显示正式倒推结果');
    equal(app.find('#metrics').textContent, '', '未确认课程不应显示正式成绩概览');
    await app.click(app.button('quick-confirm'));
    equal(app.saved().ruleStatus, 'confirmed'); equal(app.find('#rules').hidden, true);
    equal(app.find('[data-required-rate]').textContent, '73%', '样例D的整体要求应向上显示整数百分比');
    assert(app.find('[data-total-gap]').textContent.startsWith('51'), '样例D还差51分总评');
    equal(app.find('[data-remaining-points]').textContent, '70 分', '样例剩余最多贡献70分总评');
  });
  test('应用事件：预计成绩立即试算并保存，不增加实际贡献', async () => {
    const app = await sampleApp(); await app.input(scoreInput(app, 'assignment-b'), '30');
    equal(itemOf(app, 'assignment-b').expected, '30'); equal(itemOf(app, 'assignment-b').actual, '');
    const result = app.find('#target-results').textContent;
    assert(result.includes('72') && result.includes('假设'), 'B预计30时应按假设显示期末72');
    assert(app.find('#metrics').textContent.includes('24'), '实际贡献应仍为24');
    await app.click(app.button('clear-expected'));
    equal(itemOf(app, 'assignment-b').expected, ''); equal(itemOf(app, 'assignment-a').actual, '16');
  });
  test('应用事件：修改已出成绩的草稿取消，原记录和显示均保留', async () => {
    const app = await sampleApp(); const original = app.values.get(KEY);
    await app.click(app.button('edit-score', 'assignment-a')); await app.input('#score-value', '18');
    equal(app.values.get(KEY), original); await app.click(app.button('score-cancel'));
    equal(app.values.get(KEY), original); equal(app.find('#score-dialog').open, false);
    equal(itemOf(app, 'assignment-a').actual, '16');
    equal(app.document.querySelector('[data-score="actual"]'), null);
    await app.click(app.button('edit-score', 'assignment-a')); equal(app.find('#score-value').value, '16');
    await app.input('#score-value', '18'); await app.click(app.button('score-next'));
    await app.click(app.button('score-cancel')); equal(app.values.get(KEY), original);
  });
  test('应用事件：录入成绩必须经过核对和确认，确认后清本项预计', async () => {
    const app = await sampleApp(); await app.input(scoreInput(app, 'assignment-b'), '30');
    const original = app.values.get(KEY);
    await app.click(app.button('edit-score', 'assignment-b')); await app.input('#score-value', '32');
    // Directly invoke a hidden action only to verify its handler cannot bypass
    // review. This is an event-boundary check, not a possible browser click.
    await app.fire(app.button('score-confirm'), 'click'); equal(app.values.get(KEY), original);
    await app.click(app.button('score-next')); equal(app.values.get(KEY), original);
    assert(app.find('#score-review').textContent.includes('32'), '核对页须展示待保存的新分数');
    await app.click(app.button('score-confirm'));
    equal(itemOf(app, 'assignment-b').actual, '32'); equal(itemOf(app, 'assignment-b').expected, '');
    equal(itemOf(app, 'assignment-a').actual, '16');
    assert(app.find('#target-results').textContent.includes('70'), 'B实际32后期末应需70');
    equal(app.find('#score-dialog').open, false);
  });
  test('应用事件：不合法成绩留在编辑页，不进入确认或覆盖原分数', async () => {
    const app = await sampleApp(); const original = app.values.get(KEY);
    await app.click(app.button('edit-score', 'assignment-a')); await app.input('#score-value', '21');
    await app.click(app.button('score-next'));
    equal(app.find('#score-confirm').hidden, true); equal(app.find('#score-entry').hidden, false);
    assert(app.find('#score-error').textContent.includes('满分'), '应解释超满分错误');
    equal(app.values.get(KEY), original);
  });
  test('应用事件：重新创建应用读取同一保存记录，已出成绩继续锁定', async () => {
    const app = await sampleApp(); await app.click(app.button('edit-score', 'assignment-b'));
    await app.input('#score-value', '32'); await app.click(app.button('score-next')); await app.click(app.button('score-confirm'));
    const original = app.values.get(KEY); const restored = await createAppHarness(null, app.values);
    equal(restored.values.get(KEY), original); equal(itemOf(restored, 'assignment-b').actual, '32');
    equal(restored.find('#dashboard').hidden, false);
    equal(restored.document.querySelectorAll('[data-score="expected"]').some(n => n.dataset.id === 'assignment-b'), false);
    await restored.click(restored.button('edit-score', 'assignment-b')); equal(restored.find('#score-value').value, '32');
  });
  test('应用事件：修改项目名保留成绩、关联要求与确认状态', async () => {
    const app = await sampleApp(); const original = app.saved();
    await app.click(app.button('rename-item', 'assignment-a')); await app.input('#rename-value', '第一次作业');
    await app.click(app.button('rename-save'));
    equal(itemOf(app, 'assignment-a').name, '第一次作业'); equal(itemOf(app, 'assignment-a').actual, '16');
    equal(itemOf(app, 'assignment-a').id, original.items[0].id);
    equal(JSON.stringify(app.saved().hurdles), JSON.stringify(original.hurdles));
    equal(app.saved().ruleStatus, 'confirmed');
  });
  test('应用事件：修正规则期间不自动保存，取消返回恢复原记录', async () => {
    const app = await sampleApp(); const original = app.values.get(KEY); const originalName = app.saved().name;
    await app.click('#nav-rules'); await app.input('[data-course="name"]', '尚未确认的改名');
    equal(app.values.get(KEY), original);
    await app.click('#nav-dashboard'); equal(app.values.get(KEY), original);
    assert(app.find('#dashboard').textContent.includes(originalName), '取消后页面应恢复原课程名');
    assert(!app.find('#dashboard').textContent.includes('尚未确认的改名'), '草稿不应残留在成绩页');
    equal(app.saved().ruleStatus, 'confirmed'); equal(itemOf(app, 'assignment-a').actual, '16');
  });
  test('应用事件：存储失败后在规则草稿中重试，只保存已接受的记录', async () => {
    const app = await sampleApp(); const originalName = app.saved().name;
    app.storage.denyWrite = true;
    await app.input(scoreInput(app, 'assignment-b'), '30');
    equal(itemOf(app, 'assignment-b').expected, '', '写入失败不应改变持久记录');
    assert(app.find('#storage-alert').textContent.includes('保存失败'), '应显示存储失败');
    await app.click('#nav-rules'); await app.input('[data-course="name"]', '不能被重试保存的规则草稿');
    app.storage.denyWrite = false;
    await app.click(app.button('retry-save'));
    equal(app.saved().name, originalName, '重试不能接受未确认的规则草稿');
    equal(app.saved().ruleStatus, 'confirmed'); equal(itemOf(app, 'assignment-b').expected, '30');
    equal(itemOf(app, 'assignment-a').actual, '16');
    await app.click('#nav-dashboard');
    const restored = await createAppHarness(null, app.values);
    equal(restored.saved().name, originalName); equal(restored.saved().ruleStatus, 'confirmed');
    equal(itemOf(restored, 'assignment-b').expected, '30'); equal(itemOf(restored, 'assignment-a').actual, '16');
    assert(!restored.find('#dashboard').textContent.includes('不能被重试保存的规则草稿'), '重建应用后不能恢复已取消的草稿');
  });
  test('应用事件：确认规则修正后保存新值，重建应用仍保留已出成绩', async () => {
    const app = await sampleApp(); const originalName = app.saved().name;
    await app.click('#nav-rules'); await app.input('[data-course="name"]', '已核对的课程名称');
    equal(app.saved().name, originalName, '确认之前仍应保留旧值');
    await app.click(app.button('confirm-rules'));
    equal(app.saved().name, '已核对的课程名称'); equal(app.saved().ruleStatus, 'confirmed');
    equal(itemOf(app, 'assignment-a').actual, '16'); equal(app.find('#dashboard').hidden, false);
    const restored = await createAppHarness(null, app.values);
    equal(restored.saved().name, '已核对的课程名称'); equal(restored.saved().ruleStatus, 'confirmed');
    equal(itemOf(restored, 'assignment-a').actual, '16');
    assert(restored.find('#dashboard').textContent.includes('已核对的课程名称'), '应显示实际确认保存的新名称');
  });
  test('应用事件：自己的文本和图片只预览，不生成无关样例或改已有课程', async () => {
    const app = await sampleApp(); const original = app.values.get(KEY);
    await app.click('#nav-import'); await app.click('[data-import-kind="own"]');
    await app.input('#import-text', '合成测试：这不是配套样例。');
    const picker = app.find('#image-upload'); picker.files = [{name:'synthetic-own.png',type:'image/png',size:100}];
    await app.fire(picker, 'change');
    assert(app.find('#import').textContent.includes('synthetic-own.png'), '应显示本地图片名称');
    equal(app.find('#import-text').value, '合成测试：这不是配套样例。');
    equal(app.find('#import').querySelector('[data-action="generate-sample"]'), null);
    equal(app.values.get(KEY), original); equal(app.find('#dashboard').hidden, true);
  });
  test('应用事件：已有课程再次生成样例须确认，取消不覆盖成绩', async () => {
    const app = await sampleApp(); const original = app.values.get(KEY);
    await app.click('#nav-import'); await app.click(app.button('generate-sample'));
    equal(app.find('#replace-dialog').open, true); equal(app.values.get(KEY), original);
    await app.click('#cancel-replace'); equal(app.values.get(KEY), original);
  });
  test('应用事件：无法读取的旧记录原样保留，显示存储问题', async () => {
    const raw = '{synthetic damaged record'; const app = await createAppHarness(raw);
    equal(app.values.get(KEY), raw);
    assert(app.find('#storage-alert').textContent.includes('原记录'), '应说明保留旧记录');
    await app.click(app.button('generate-sample')); equal(app.values.get(KEY), raw);
    assert(app.find('#storage-alert').textContent.includes('暂停'), '不能无提示覆盖损坏记录');
  });
  const results = [];
  for (const {name, run} of checks) {
    try { await run(); results.push({name, passed:true}); }
    catch (error) { results.push({name, passed:false, error:error.stack || String(error)}); }
  }
  return {total:results.length, passed:results.filter(r => r.passed).length,
    failed:results.filter(r => !r.passed).length, results};
}
