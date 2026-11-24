// The three sections remain in the form, but only one is visible at a time.
// Hiding a section never removes its values or skips whole-course validation.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escape;
const input = (attrs,value,placeholder='') => `<input type="text" inputmode="decimal" maxlength="80" autocomplete="off" ${attrs} value="${e(value)}" placeholder="${e(placeholder)}">`;
const field = (label,control,hint='') => `<label class="field"><span>${label}</span>${control}${hint?`<small>${hint}</small>`:''}</label>`;
const titles = ['考核与占比','及格线和目标','额外及格要求'];
export const ruleGroupKeys = ['assessments','targets','conditions'];

export function renderRuleScreen(course, options, helpers) {
  const {step=0,materialsOpen=false,expandExtras=false,errorGroups={},acknowledged=false,confirmationError=''}=options;
  const {weightPercent,ruleBadge,sourceLabel}=helpers;
  const errors=errorGroups[ruleGroupKeys[step]]||[];
  const totalErrors=ruleGroupKeys.reduce((n,key)=>n+(errorGroups[key]?.length||0),0);
  const sample=course.sourceMode==='sample';
  return `<div class="heading rules-heading"><div><h1>修正识别结果</h1><p>只修改有误的地方，保存后会保留已有成绩。</p></div></div>
    <div class="rules-status"><span class="badge ${sample?'warn':''}">${e(sourceLabel())}</span><span id="rule-badge">${ruleBadge()}</span><span class="muted small-text">修改先留在草稿中，点击下方保存才会生效。</span></div>
    <details class="materials-disclosure" id="materials-disclosure" ${materialsOpen?'open':''}>
      <summary>${sample?'查看样例课程说明':'添加 / 查看课程材料'}<span class="summary-hint">${sample?'模拟提取，仅对应此样例':'文字、截图与补充说明'}</span></summary>
      <div class="materials-content">
      ${sample?`<p class="muted small-text">以下为合成材料。表单内容是预设的模拟提取结果，不是 AI 识别。</p><pre class="source-material">${e(course.sourceText)}</pre>`:`<p class="muted small-text">添加材料方便边看边填；图片不会自动变成课程规则。</p><div class="form-grid">${field('粘贴课程说明',`<textarea data-course="sourceText" rows="4" maxlength="50000" placeholder="粘贴作业占比、考试要求等原文">${e(course.sourceText)}</textarea>`)}<div>${field('选择课程截图','<input id="images" type="file" accept="image/png,image/jpeg,image/webp" multiple>','最多3张，每张不超过8 MB；只在这次打开页面时保留。')}<div id="image-message" role="alert"></div><div id="image-previews" class="image-list"></div></div></div>`}
      ${field('补充说明（可选）',`<textarea data-course="notes" rows="2" maxlength="50000" placeholder="例如：老师后来补充了期末及格要求">${e(course.notes)}</textarea>`)}
      </div>
    </details>
    <div class="rule-steps" aria-label="选择要修正的部分">${titles.map((title,index)=>`<button type="button" data-rule-step="${index}" class="${step===index?'active':''}" aria-pressed="${step===index}"><span>${title}</span>${errorGroups[ruleGroupKeys[index]]?.length?'<span class="step-issue">待修改</span>':''}</button>`).join('')}</div>
    <div class="panel rule-form compact-form">
      <div class="step-heading"><h2 id="rule-step-title" tabindex="-1">${titles[step]}</h2></div>
      <div id="rule-validation" role="alert" tabindex="-1">${errors.length?`<div class="alert error"><strong>这一步还有 ${errors.length} 处需要修改</strong><ul>${errors.map(error=>`<li>${e(error)}</li>`).join('')}</ul>${totalErrors>errors.length?'<p>其他步骤也有待修改内容，可点击上方步骤查看。</p>':''}</div>`:''}${confirmationError?`<div class="alert error">${e(confirmationError)}</div>`:''}</div>
      <section data-rule-panel="0" ${step!==0?'hidden':''} aria-label="考核与占比">
        ${field('课程名称',`<input data-course="name" maxlength="150" value="${e(course.name)}" placeholder="例如：数据分析基础">`)}
        <p class="section-help"><strong>占总评比例</strong>就是这项考核在整门课成绩中占多少，各项应合计 100%。</p>
        <div class="rule-items compact-items">${course.items.map(item=>itemEditor(item,weightPercent,expandExtras)).join('')}</div>
        <div class="item-list-footer"><button class="text-button" data-action="add-item">＋ 添加作业或考试</button><span id="weight-summary" class="muted small-text"></span></div>
      </section>
      <section data-rule-panel="1" ${step!==1?'hidden':''} aria-label="及格线和目标">
        <p class="section-help"><strong>总评</strong>是整门课最终的成绩，这里按 100 分计算。</p>
        ${field('这门课总评多少分算及格？',input('data-course="passMark"',course.passMark,'按课程说明填写'),'请以课程说明为准，不同课程的及格线可能不同。')}
        <div class="target-editor-heading"><h3>你想拿到多少分？</h3><p>可以设一个目标，也可以同时比较“及格”和更高分数。</p></div>
        ${course.targets.map(target=>`<div class="row-fields target-editor-row">${field('目标名称',`<input data-target="${e(target.id)}" data-field="label" maxlength="60" value="${e(target.label)}" placeholder="例如：及格、冲刺75">`)}${field('想达到的总评',input(`data-target="${e(target.id)}" data-field="score"`,target.score,'例如 75'))}<button class="text-button small" data-action="remove-target" data-id="${e(target.id)}" aria-label="删除目标 ${e(target.label)}">删除</button></div>`).join('')}
        <button class="text-button" data-action="add-target">＋ 再加一个目标</button>
      </section>
      <section data-rule-panel="2" ${step!==2?'hidden':''} aria-label="额外及格要求">
        <p class="section-help">有些课除了总评及格，还要求期末或某项作业<strong>单独达到最低分</strong>。</p>
        ${field('课程有这样的要求吗？',`<select data-course="hurdleStatus"><option value="unknown" ${course.hurdleStatus==='unknown'?'selected':''}>还不确定，先留着核对</option><option value="none" ${course.hurdleStatus==='none'?'selected':''}>没有，总评及格就可以</option><option value="confirmed" ${course.hurdleStatus==='confirmed'?'selected':''}>有，需要满足下面的要求</option></select>`,'以课程大纲或老师说明为准；没找到相关说明时，先选“还不确定”。')}
        <div class="plain-example"><strong>举个例子</strong><p>课程规定“期末至少 50 / 100”。那么期末只有 49 分时，即使总评达到 60 分，也不能及格。</p></div>
        ${course.hurdleStatus==='confirmed'?`<p class="small-text muted condition-origin">${sample?'演示样例预设了期末至少50%的要求，来自上方样例说明。':'根据材料逐条填写；列出的每条要求都需要达到。'}</p>`:''}
        ${course.hurdles.map(h=>hurdleEditor(h,course.items,expandExtras)).join('')}
        ${course.hurdleStatus==='confirmed'?'<button class="text-button" data-action="add-hurdle">＋ 添加一条最低分要求</button>':''}
        ${course.hurdleStatus==='none'&&course.hurdles.length?'<div class="alert">之前填过最低分要求，请核对后逐条删除，或改回“有”。</div>':''}
        <details class="optional-details special-rules" ${(expandExtras||course.unresolvedText.trim()||course.unsupportedText.trim())?'open':''}>
          <summary>材料有不清楚的地方，或其他特殊规则？${course.unresolvedText.trim()||course.unsupportedText.trim()?'<span class="detail-state">有内容待处理</span>':''}</summary>
          <p class="small-text muted">例如：两份说明不一致、去掉最低一次成绩、补考替换成绩，或只需满足几条要求中的一条。请保留原文，先核实再计算。</p>
          ${field('需要核实的问题',`<textarea data-course="unresolvedText" maxlength="50000" rows="2" placeholder="例如：课程大纲写期末40分，老师说50分">${e(course.unresolvedText)}</textarea>`,'弄清楚后修改对应规则，再清空这里的问题。')}
          ${field('工具暂时算不了的规则',`<textarea data-course="unsupportedText" maxlength="50000" rows="2" placeholder="例如：去掉分数最低的一次quiz">${e(course.unsupportedText)}</textarea>`,'填写后会先暂停计算，避免漏掉规则而算错。')}
        </details>
      </section>
    </div>
    <div class="rule-footer"><span class="muted small-text">请按课程材料核对，确认及格要求没有遗漏。</span><div class="actions"><button data-action="dashboard">取消修改</button><button class="primary" data-action="confirm-rules">保存并返回成绩表</button></div></div>`;
}

function itemEditor(item,weightPercent,expandExtras){
  return `<div class="rule-item compact-item"><div class="assessment-fields">${field('作业 / 考试名称',`<input data-item="${e(item.id)}" data-field="name" maxlength="150" value="${e(item.name)}" placeholder="例如：期末考试">`)}${field('占总评比例（%）',input(`data-item="${e(item.id)}" data-field="weight"`,weightPercent(item.weight).replace('未填',''),'例如 30'))}${field('这项满分多少？',input(`data-item="${e(item.id)}" data-field="max"`,item.max,'例如 100'))}<button class="text-button small" data-action="remove-item" data-id="${e(item.id)}" aria-label="删除考核 ${e(item.name)}">删除</button></div><details class="optional-details" ${expandExtras?'open':''}><summary>可选：给分方式与来源备注${item.step.trim()?`<span class="detail-state">每 ${e(item.step)} 分计分</span>`:item.source.trim()?'<span class="detail-state">已记来源</span>':''}</summary><div class="form-grid">${field('分数按多大的单位给？',input(`data-item="${e(item.id)}" data-field="step"`,item.step,'不知道就留空'),'只能给整数分填1；允许半分填0.5。课程没规定时留空，不会默认按整数分算。')}${field('来源备注（可选）',`<input data-item="${e(item.id)}" data-field="source" maxlength="3000" value="${e(item.source)}" placeholder="例如：课程大纲第3页">`,'方便以后找回这条课程规定。')}</div></details></div>`;
}
function hurdleEditor(h,items,expandExtras){
  return `<div class="hurdle-editor compact-condition"><div class="condition-fields">${field('哪项考核？',`<select data-hurdle="${e(h.id)}" data-field="itemId"><option value="">选择作业或考试</option>${items.map(i=>`<option value="${e(i.id)}" ${i.id===h.itemId?'selected':''}>${e(i.name||'未命名考核')}</option>`).join('')}</select>`)}${field('需要达到',`<select data-hurdle="${e(h.id)}" data-field="operator"><option value=">=" ${h.operator==='>='?'selected':''}>至少（刚好达到也算）</option><option value=">" ${h.operator==='>'?'selected':''}>必须超过（暂不支持）</option></select>`)}${field('多少？',input(`data-hurdle="${e(h.id)}" data-field="threshold"`,h.threshold,'例如 50'))}${field('按哪种方式写？',`<select data-hurdle="${e(h.id)}" data-field="unit"><option value="percent" ${h.unit==='percent'?'selected':''}>满分的百分比（%）</option><option value="raw" ${h.unit==='raw'?'selected':''}>分数（例如40分）</option></select>`)}</div><p class="unit-help">百分比：满分80的考试，50%就是40分；分数：直接填课程要求的分数。</p><div class="condition-bottom"><details class="optional-details" ${expandExtras?'open':''}><summary>查看 / 记录这条要求的出处</summary>${field('课程材料中的原话',`<input data-hurdle="${e(h.id)}" data-field="source" maxlength="3000" value="${e(h.source)}" placeholder="抄下课程大纲或老师说明中的原句">`)}</details><button class="text-button small" data-action="remove-hurdle" data-id="${e(h.id)}">删除这条要求</button></div></div>`;
}
