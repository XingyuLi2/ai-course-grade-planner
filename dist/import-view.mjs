import {createSample} from './sample.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

/** Presentation only. A sample is never generated from the student's own material. */
export function renderImportScreen({kind='sample-image',text='',uploads=[],hasCourse=false}={}) {
  const selected = ['sample-image','sample-text','own'].includes(kind) ? kind : 'sample-image';
  const own = selected === 'own';
  const source = escape(createSample().sourceText);
  const options = [
    ['sample-image','体验截图导入'],
    ['sample-text','体验文字导入'],
    ['own','预览自己的材料'],
  ];
  return `<div class="import-screen">
    <div class="heading import-heading"><div><h1>把课程材料变成成绩表</h1><p>放入截图或文字，生成后就能填写预计分数、更新已出成绩。</p></div>${hasCourse?'<button type="button" class="text-button" data-action="dashboard">返回我的成绩</button>':''}</div>
    <div class="import-options" role="group" aria-label="选择演示材料">${options.map(([value,label])=>`<button type="button" class="import-option ${selected===value?'active':''}" data-import-kind="${value}" aria-pressed="${selected===value}">${label}</button>`).join('')}</div>
    <section class="panel import-card" aria-label="课程材料">
      <div class="import-tags">${own?'<span class="badge">仅本地预览</span>':'<span class="badge warn">演示样例</span><span class="badge warn">模拟提取</span>'}</div>
      ${own?ownMaterials(text,uploads):selected==='sample-image'?`<img class="import-sample-image" src="./demo-course.svg" alt="演示课程截图：作业A占30%，满分20，已得16；作业B占20%，满分40；期末占50%，满分100。总评至少50，期末至少50%，演示目标P为50、D为75。"><details class="import-source"><summary>查看这张样例的文字内容</summary><pre class="source-material">${source}</pre></details>`:`<label class="field"><span>演示课程说明</span><textarea class="import-source" rows="10" readonly aria-describedby="sample-explanation">${source}</textarea></label>`}
      ${own?'': '<p id="sample-explanation" class="small-text muted">这里使用预先准备的对应结果演示流程，没有调用真实 AI。生成后可修正名称等信息。</p>'}
    </section>
    <div class="import-footer">${own?'<p class="import-privacy small-text muted">演示版暂不识别你的材料；选择上方演示样例体验生成成绩表。你的文字和图片仅在本机预览。</p>':`<p class="small-text muted">${hasCourse?'已有课程不会直接被覆盖，下一步会请你确认。':'无需先填写课程表，先看看生成后的样子。'}</p><button type="button" class="primary" data-action="generate-sample">生成成绩表</button>`}</div>
  </div>`;
}

function ownMaterials(text,uploads) {
  const previews = Array.isArray(uploads) ? uploads.map(upload=>{
    const name = escape(upload?.name || '课程截图');
    const url = typeof upload?.url === 'string' && upload.url.startsWith('blob:') ? escape(upload.url) : '';
    return `<figure>${url?`<img src="${url}" alt="${name}">`:''}<figcaption>${name}</figcaption></figure>`;
  }).join('') : '';
  return `<label class="field"><span>粘贴课程说明</span><textarea id="import-text" maxlength="50000" rows="5" placeholder="例如：作业占比、各项满分、期末及格要求">${escape(text)}</textarea></label>
    <label class="field"><span>选择课程截图</span><input id="image-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple><small>最多 3 张，每张不超过 8 MB；关闭页面后需要重新选择。</small></label>
    <div id="import-image-message" role="alert"></div><div class="image-list">${previews}</div>`;
}
