import {calculateCourse, validateCourse, format, fraction, rational} from './calc.mjs';
import {renderRuleScreen, ruleGroupKeys} from './rules-view.mjs';
import {createSample} from './sample.mjs';
import {createStore} from './storage.mjs';
import {renderImportScreen} from './import-view.mjs';
import {validateActualScore, commitActualScore} from './score-edit.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const fmt = n => esc(format(n));
const need = n => esc(format(n,{ceil:true}));
const badge = (text,kind='') => `<span class="badge ${kind}">${esc(text)}</span>`;
const numeric = (attrs,value,placeholder='') => `<input type="text" inputmode="decimal" maxlength="80" autocomplete="off" ${attrs} value="${esc(value)}" placeholder="${esc(placeholder)}">`;
const field = (label,control,hint='') => `<label class="field"><span>${label}</span>${control}${hint?`<small>${hint}</small>`:''}</label>`;
const issueList = errors => `<ul>${errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`;
let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}}; }
const store = createStore(storage);
const initial = store.load();
let course = initial.kind === 'loaded' ? initial.course : null;
let activeView = course ? 'dashboard' : 'import';
let mode = course?.items.some(i=>i.actual.trim()===''&&i.expected.trim()!=='') ? 'scenario' : 'actual';
let ruleStep=0;
let materialsOpen=false;
let expandExtras=false;
let ruleErrors={};
let ruleAcknowledged=false;
let confirmationError='';
let selectedTargetId=course?.targets.at(-1)?.id||null;
let replacement = null;
let uploads = [];
let importKind = 'sample-image';
let importText = '';
let ruleBackup = null;
let scoreEdit = null;
let renameId = null;
let storageProblem = initial.kind === 'blocked' ? initial.message : '';

function sourceLabel() { return course?.sourceMode === 'sample' ? '演示样例 · 模拟提取' : '已保存的课程'; }
function ruleBadge() { return badge(course.ruleStatus === 'confirmed' ? '规则已确认' : course.ruleStatus === 'unsupported' ? '规则暂不支持' : '规则待确认',course.ruleStatus==='confirmed'?'good':'warn'); }
function setSaveStatus(text) { $('#save-status').textContent=text; }
function showNotice(text,kind='success') { $('#notice').innerHTML=text?`<div class="alert ${kind}">${esc(text)}</div>`:''; }
function storageAlert() {
  $('#storage-alert').innerHTML = storageProblem ? `<div class="alert error"><strong>当前修改可能尚未保存</strong><p>${esc(storageProblem)}</p><div class="actions"><button data-action="retry-save">重试保存</button><button data-action="reload">重新载入已保存记录</button><button data-action="reset-storage">清除本工具的记录</button></div></div>` : '';
}
function persist() {
  if (!course) return;
  // A retry must never persist unconfirmed rule edits. Save the last accepted
  // course until confirmRules explicitly accepts the draft and clears backup.
  const result=store.save(ruleBackup||course);
  if(result.ok){storageProblem='';setSaveStatus(ruleBackup?'已保存原记录 · 修正内容仍是草稿':`已保存到此浏览器 · ${new Date(result.savedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);}
  else{storageProblem=result.message;setSaveStatus('未保存 · 请查看存储提示');}
  storageAlert();
}
function showView(view,focus=false) {
  if(view==='rules'&&!course)view='import';
  if(view==='dashboard'&&!course)view='import';
  if(activeView==='rules'&&view!=='rules'&&ruleBackup){course=ruleBackup;ruleBackup=null;}
  if(view==='rules'&&activeView!=='rules'){
    ruleBackup=structuredClone(course);course=structuredClone(course);ruleErrors={};ruleStep=0;
  }
  activeView=view;
  for(const name of ['dashboard','rules','import']){
    $(`#${name}`).hidden=view!==name;
    $(`#nav-${name}`).classList.toggle('active',view===name);
    $(`#nav-${name}`).setAttribute('aria-current',view===name?'page':'false');
  }
  $('#nav-rules').disabled=!course;
  if(view==='dashboard') renderDashboard(); else if(view==='rules') renderRules(); else renderImport();
  $('#course-label').textContent=course?.name||'还没有课程';
  if(ruleBackup)setSaveStatus('正在修正 · 点击保存后生效');
  else if(!storageProblem)setSaveStatus(course?'课程已保存在此浏览器':'尚无保存记录');
  if(focus){$('#main').focus();window.scrollTo({top:0});}
}
function renderAll() {
  $('#course-label').textContent=course?.name || '尚未建立课程';
  storageAlert(); showView(activeView);
}
function askReplace(factory) {
  if(!course){replace(factory);return;}
  replacement=factory;
  $('#replace-title').textContent='替换当前课程？';
  $('#replace-dialog').showModal();
}
function replace(factory) {
  uploads.forEach(u=>URL.revokeObjectURL(u.url)); uploads=[];
  course=factory(); ruleBackup=null; mode='actual'; ruleStep=0; ruleErrors={}; ruleAcknowledged=false; materialsOpen=false; expandExtras=false; confirmationError=''; selectedTargetId=course.targets.at(-1)?.id; activeView='dashboard';persist();showNotice('成绩表已生成：这是配套演示样例的模拟提取结果。');renderAll();window.scrollTo({top:0});
}
function renderImport(){
  $('#import').innerHTML=renderImportScreen({kind:importKind,text:importText,uploads,hasCourse:!!course});
}
function renderDashboard() {
  if(!course)return;
  const pending=course.ruleStatus!=='confirmed';
  const summary=`总评 ${esc(course.passMark||'待确认')} 分及格${course.hurdles.length?'；'+course.hurdles.map(h=>`${esc(course.items.find(i=>i.id===h.itemId)?.name||'待确认考核')} ${esc(h.operator)} ${esc(h.threshold)}${h.unit==='percent'?'%':'分'}`).join('；'):course.hurdleStatus==='none'?'，没有其他及格要求':'；其他及格要求待确认'}`;
  $('#dashboard').innerHTML=`<div class="heading"><div><h1>${esc(course.name||'未命名课程')}</h1><p>${badge(sourceLabel())} ${ruleBadge()}</p></div><div class="actions"><button class="text-button" data-action="rules">修正识别结果</button></div></div>
    ${pending?`<section class="review-strip"><div><strong>成绩表已就绪，核对一下就能试算</strong><p>核对下表的项目、占比和满分，以及：${summary}。</p></div><button class="primary" data-action="quick-confirm">以上信息无误，开始试算</button></section>`:''}
    <div class="workspace-grid grade-workspace"><div><section class="panel"><div class="panel-head"><div><h2>我的成绩表</h2><p>预计成绩随时试；已出成绩修改后需确认。</p></div><button class="text-button small" data-action="clear-expected">清空预计</button></div><div class="table-wrap"><table class="score-table"><thead><tr><th scope="col">作业 / 考试</th><th scope="col">已出成绩</th><th scope="col" class="expected-column">我预计能考</th></tr></thead><tbody>${course.items.map(i=>`<tr><td class="assessment-name">${esc(i.name||'未命名考核')}<button class="text-button rename-button" data-action="rename-item" data-id="${esc(i.id)}" aria-label="修改${esc(i.name)}的名称">改名</button><small>占 ${weightPercent(i.weight)}% · 满分 ${esc(i.max||'未填')}</small></td><td class="score-cell"><div class="actual-score">${i.actual.trim()!==''?`<strong>${esc(i.actual)}</strong><small>已锁定</small>`:'<span class="muted">未出分</span>'}</div><button class="text-button small" data-action="edit-score" data-id="${esc(i.id)}" aria-label="${i.actual.trim()!==''?'修改':'录入'}${esc(i.name)}已出成绩">${i.actual.trim()!==''?'修改':'录入成绩'}</button></td><td class="score-cell">${i.actual.trim()!==''?'<span class="muted small-text">按已出成绩算</span>':numeric(`class="score-input" data-score="expected" data-id="${esc(i.id)}" aria-label="${esc(i.name)}预计成绩"`,i.expected,'填预计分数')}</td></tr>`).join('')}</tbody></table></div><div class="table-note">预计分数只用于试算。录入已出成绩后，对应的预计分数会清空。</div></section>
    <details class="panel course-reference"><summary>查看课程材料与及格要求</summary><p>${summary}</p><pre class="source-material">${esc(course.sourceText||'没有保存原始材料。')}</pre><button class="text-button" data-action="rules">有识别错误？修正一下</button></details><div id="metrics"></div></div><div class="results-column"><section class="panel" id="target-results"></section><section class="panel" id="hurdle-results"></section></div></div>`;
  renderResults();
}
function weightPercent(value){
  const t=String(value).trim();
  if(!t)return '未填';
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t))return esc(t);
  const [whole,tail='']=t.replace(/^[+-]/,'').split('.');
  const digits=(whole||'0')+tail.padEnd(2,'0');
  const end=(whole||'0').length+2;
  const integer=digits.slice(0,end).replace(/^0+(?=\d)/,'');
  const rest=digits.slice(end).replace(/0+$/,'');
  return `${t.startsWith('-')?'-':''}${integer}${rest?'.'+rest:''}`;
}
function targetCard(t,r) {
  const hypothetical=mode==='scenario'&&r.usesExpected;
  const kind=t.totalStatus==='unreachable'?'bad':t.totalStatus==='met'?'good':'';
  const status=t.totalStatus==='met'?(hypothetical?'按预计成绩，总分已够':'已拿到目标所需的总分'):t.totalStatus==='unreachable'?(hypothetical?'按当前预计成绩，达不到':'剩下全拿满分也达不到'):'总分还有机会达到';
  let content='';
  if(t.single){
    const item=t.single;
    if(item.totalRaw===null&&!item.hasHurdle){
      content=`<div class="requirement">${fmt(r.fixedTotal)}<small> / 100 ${hypothetical?'试算总评':'当前总评得分'}</small></div><p>${esc(item.name)}不计入总评，也没有单独的最低分要求。${t.totalStatus==='met'?'总分已达到目标。':`离目标还差 ${need(t.neededTotal)} 分，剩下的项目无法补上。`}</p>`;
    }else{
      content=`<p class="requirement-label">${esc(item.name)}${item.totalRaw===null?'单独需要达到':'至少要考'}</p><div class="requirement">${need(item.requiredRaw)}<small> / ${fmt(item.max)} 分</small></div><p>相当于这项满分的 ${need(item.requiredPercent)}%。${item.step?`按课程每 ${fmt(item.step)} 分计分的规定取值。`:''}</p><details class="calculation-detail"><summary>这个分数怎么算的？</summary><p>为了达到总评目标：${item.totalRaw===null?'这项不计入总评':`需要 ${need(item.totalRaw)} / ${fmt(item.max)} 分`}。<br>课程对这项的最低分要求：${item.hasHurdle?`${need(item.hurdleRaw)} / ${fmt(item.max)} 分`:'没有'}。<br>两条都要满足，因此取更高的要求。</p><p>精确计算结果为 ${esc(fraction(item.minimumRaw))} 分。${item.step?'已按课程给分单位向上取到可获得的分数。':'页面向上显示到4位小数；课程是否允许这样的分数，需要按实际给分规则确认。'}</p></details>`;
    }
  }else if(r.remainingWeight.cmp('0')>0){
    content=`<p class="requirement-label">离目标还差</p><div class="requirement" data-total-gap>${need(t.neededTotal)}<small> 分总评</small></div><p>剩余作业和考试最多能贡献 <strong data-remaining-points>${fmt(r.remainingPossible)} 分</strong>，需要拿到其中约 <strong data-required-rate>${esc(format(t.remainingRatePercent,{ceil:true,places:0}))}%</strong>。</p><p>总评是各项按占比折算后的课程分数，满分100分；百分比向上取整显示。</p><details class="calculation-detail"><summary>想知道期末具体要考多少？</summary><p>还剩 ${r.unknownItems.length} 项成绩未确定。先给其他未出分项填一个预计成绩，就可以倒推最后一项。</p><p>各项不一定要拿到相同的百分比，也不能直接把各项卷面分相加。</p></details>`;
  }else{
    content=`<div class="requirement">${fmt(r.fixedTotal)}<small> / 100 ${hypothetical?'试算总评':'当前总评得分'}</small></div><p>${t.totalStatus==='met'?'总分已达到目标。':`离目标还差 ${need(t.neededTotal)} 分，已没有未计入的成绩能补上。`} 仍需检查下方的额外及格要求。</p>`;
  }
  return `<article class="target-result"><div class="target-top"><h3>${esc(t.label)} · 总评 ${fmt(t.threshold)} 分</h3>${badge(status,kind)}</div>${content}</article>`;
}
function renderResults() {
  if(!course||!$('#target-results'))return;
  const actual=calculateCourse(course,'actual');
  const result=mode==='actual'?actual:calculateCourse(course,'scenario');
  $('#metrics').innerHTML=actual.ready?metricsHTML(actual):'';
  if(course.ruleStatus!=='confirmed'&&validateCourse({...course,ruleStatus:'confirmed'},{includeExpected:false}).ready){
    $('#target-results').innerHTML='<h2>目标分数，直接算给你看</h2><p class="pending-help">核对页面上方的课程信息，点击“开始试算”。给其他未出分项目填预计分数，就能倒推最后一项至少要考多少。</p>';
    $('#hurdle-results').innerHTML='<h2>及格要求也会一起检查</h2><p class="pending-help">总评够分之外，某些课程还要求期末单独及格。工具会按你确认的规则一起判断。</p>';return;
  }
  const switcher=`<div class="panel-head"><div><h2>离目标还差多少？</h2></div></div><div class="switcher" role="group" aria-label="选择怎么算"><button data-mode="actual" class="${mode==='actual'?'selected':''}" aria-pressed="${mode==='actual'}">只看已出成绩</button><button data-mode="scenario" class="${mode==='scenario'?'selected':''}" aria-pressed="${mode==='scenario'}">加上预计成绩试试</button></div>`;
  if(!result.ready){
    $('#target-results').innerHTML=switcher+`<div class="empty-result"><h2>${actual.ready?'请改一下预计成绩':'还有内容需要核对'}</h2><p>${actual.ready?'预计成绩暂时不能用于试算，已出成绩的结果不受影响。':'请核对课程信息；已出成绩填错时，点击分数下的“修改”。'}</p>${issueList(result.errors)}${actual.ready?'<button data-mode="actual">只看已出成绩</button>':'<button data-action="rules">修正识别结果</button>'}</div>`;
    $('#hurdle-results').innerHTML=actual.ready?hurdlesHTML(actual,'下面暂时只检查已出成绩。'):'<h2>能否及格？</h2><p class="muted small-text">课程规则确认后，再一起检查总评和额外及格要求。</p>';return;
  }
  const target=result.targets.find(t=>t.id===selectedTargetId)||result.targets[0];
  selectedTargetId=target.id;
  const chooser=result.targets.length>1?field('我想达到',`<select id="target-choice">${result.targets.map(t=>`<option value="${esc(t.id)}" ${t.id===target.id?'selected':''}>${esc(t.label)} · 总评 ${fmt(t.threshold)} 分</option>`).join('')}</select>`):'';
  let assumptions='';
  if(mode==='scenario'){
    const hypothesis=course.items.filter(i=>i.actual.trim()===''&&i.expected.trim()!=='');
    assumptions=`<div class="result-note ${hypothesis.length?'warning':''}">${hypothesis.length?`假设 ${hypothesis.map(i=>`${esc(i.name)}考 ${esc(i.expected)}/${esc(i.max)}`).join('，')}。这些还不是已出成绩。`:'在成绩表中填入预计成绩，就能看看结果会怎样变化。'}</div>`;
  }
  $('#target-results').innerHTML=switcher+chooser+assumptions+targetCard(target,result);
  $('#hurdle-results').innerHTML=hurdlesHTML(result);
}
function metricsHTML(actual){return `<section class="metrics compact-metrics" aria-label="已出成绩概览"><div class="metric featured"><span class="label">已拿到的总评得分</span><div class="big-number">${fmt(actual.actualTotal)}<small>/ 100</small></div><p>总评满分100；这里只计已出成绩</p></div><div class="metric"><span class="label">还没出分的部分</span><div class="big-number">${fmt(actual.remainingWeightPercent)}<small>%</small></div><p>占整门课成绩的比例</p></div><div class="metric"><span class="label">目前最高能拿到</span><div class="big-number">${fmt(actual.maximumTotal)}<small>/ 100</small></div><p>假设未出分项目全部拿满分</p></div></section>`;}
function hurdlesHTML(result,note=''){
  const labels={'actual-met':['已达到','good'],'actual-failed':['没达到','bad'],'expected-met':['预计能达到','warn'],'expected-failed':['预计达不到','bad'],'pending':['还没出分','warn']};
  return `<div class="panel-head"><div><h2>能否及格？</h2><p>总评至少 ${fmt(result.pass.threshold)} 分${result.hurdles.length?'，还要满足下面的要求。':'；你已确认没有其他及格要求。'}</p></div></div>${note?`<p class="small-text muted">${esc(note)}</p>`:''}<div class="pass-box ${result.pass.status==='actual-met'?'good':['actual-failed','scenario-failed','unreachable'].includes(result.pass.status)?'bad':''}">${esc(result.pass.message)}</div>${result.hurdles.map(h=>`<div class="hurdle-row"><div><h3>${esc(h.itemName)}至少 ${need(h.thresholdRaw)} / ${fmt(h.max)} 分</h3>${h.score!==null?`<p>当前${h.status.startsWith('expected')?'预计':'实际'}：${fmt(h.score)} 分</p>`:''}</div>${badge(...labels[h.status])}</div>`).join('')}${result.warnings.length?`<details class="calculation-detail"><summary>查看 ${result.warnings.length} 条成绩说明</summary>${issueList(result.warnings)}</details>`:''}`;
}

function renderRules() {
  if(!course)return;
  $('#rules').innerHTML=renderRuleScreen(course,{step:ruleStep,materialsOpen,expandExtras,errorGroups:ruleErrors,acknowledged:ruleAcknowledged,confirmationError},{weightPercent,ruleBadge,sourceLabel});
  renderPreviews();updateWeightSummary();
}
function updateWeightSummary(){
  if(!$('#weight-summary'))return;
  try{
    const total=course.items.reduce((sum,i)=>sum.add(rational(i.weight)),rational('0')).mul('100');
    $('#weight-summary').textContent=`目前合计 ${format(total,{places:12})}%${total.eq('100')?' · 已填完整':' · 需要合计100%'}`;
  }catch{$('#weight-summary').textContent='填好每项占比后，合计应为100%。';}
}
function dirtyRules(){
  course.ruleStatus=course.unsupportedText.trim()?'unsupported':'pending';
  ruleAcknowledged=false;confirmationError='';ruleErrors={};
  if($('#rule-badge'))$('#rule-badge').innerHTML=ruleBadge();
  if($('#confirm-checked'))$('#confirm-checked').checked=false;
  if($('#rule-validation'))$('#rule-validation').innerHTML='';
  document.querySelectorAll('.step-issue').forEach(el=>el.remove());
  $('#course-label').textContent=course.name||'未命名课程';
  updateWeightSummary();setSaveStatus('正在修正 · 点击保存后生效');
}
function changeRuleStep(next,validateCurrent=false){
  if(validateCurrent){
    const validation=validateCourse({...course,ruleStatus:'confirmed'});
    const key=ruleGroupKeys[ruleStep];
    if(validation.errorGroups[key].length){
      ruleErrors={[key]:validation.errorGroups[key]};expandExtras=true;renderRules();
      $('#rule-validation').focus();$('#rule-validation').scrollIntoView({block:'center'});return;
    }
  }
  ruleStep=Math.max(0,Math.min(2,next));confirmationError='';expandExtras=Boolean(ruleErrors[ruleGroupKeys[ruleStep]]?.length);renderRules();
  $('#rule-step-title').focus();$('.rule-steps').scrollIntoView({block:'start'});
}
// Move a decimal point exactly, preserving the user's decimal meaning.
function percentToWeight(text){const t=text.trim();if(!t)return '';if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t))return t;const neg=t.startsWith('-');const [w,f='']=t.replace(/^[+-]/,'').split('.');const padded=(w||'0').padStart(3,'0');return `${neg?'-':''}${padded.slice(0,-2)}.${padded.slice(-2)}${f}`;}
function renderPreviews(){if(!$('#image-previews'))return;$('#image-previews').innerHTML=uploads.map((u,i)=>`<figure><a href="${u.url}" target="_blank" rel="noopener"><img src="${u.url}" alt="课程材料图片 ${i+1}：${esc(u.name)}"></a><figcaption>图片 ${i+1} · ${esc(u.name)} · 仅当次预览</figcaption></figure>`).join('');}
function confirmRules(){
  // Always validate every step, including collapsed optional fields.
  const validation=validateCourse({...course,ruleStatus:'confirmed'},{includeExpected:false});
  if(!validation.ready){
    ruleErrors=validation.errorGroups;expandExtras=true;confirmationError='';
    ruleStep=ruleGroupKeys.findIndex(key=>ruleErrors[key].length);
    if(ruleStep<0)ruleStep=2;
    renderRules();$('#rule-validation').focus();$('#rule-validation').scrollIntoView({block:'center'});return;
  }
  course.ruleStatus='confirmed';ruleBackup=null;persist();showNotice('课程信息已确认，已出成绩仍保留。');showView('dashboard',true);
}

function openScoreEditor(itemId){
  const item=course.items.find(i=>i.id===itemId);if(!item)return;
  scoreEdit={itemId,previousActual:item.actual,value:item.actual,reviewed:false};
  $('#score-title').textContent=item.actual.trim()!==''?`修改「${item.name}」的已出成绩`:`录入「${item.name}」的已出成绩`;
  $('#score-original').textContent=`原记录：${item.actual.trim()===''?'未出分':`${item.actual} / ${item.max} 分`}。这里只填写老师已经公布的分数。`;
  $('#score-value').value=item.actual;
  $('#score-value').setAttribute('aria-label',`${item.name}新的已出成绩`);
  $('#score-max').textContent=`满分 ${item.max}；没出分就留空，得了零分请填 0。`;
  $('#score-error').textContent='';$('#score-review').hidden=true;$('#score-entry').hidden=false;
  $('#score-next').hidden=false;$('#score-confirm').hidden=true;
  $('#score-dialog').showModal();$('#score-value').focus();
}
function reviewScoreEdit(){
  if(!scoreEdit)return;
  const item=course.items.find(i=>i.id===scoreEdit.itemId);
  const validation=validateActualScore(item,$('#score-value').value);
  if(!validation.ok){$('#score-error').textContent=validation.message;$('#score-value').focus();return;}
  scoreEdit.value=validation.value;scoreEdit.reviewed=true;
  $('#score-error').textContent='';$('#score-entry').hidden=true;
  $('#score-review').hidden=false;
  $('#score-review').innerHTML=`<p class="score-change"><span>${esc(scoreEdit.previousActual.trim()===''?'未出分':scoreEdit.previousActual)}</span><span aria-hidden="true"> → </span><strong>${esc(scoreEdit.value===''?'恢复为未出分':scoreEdit.value)}</strong></p><p>确认后才会更新已出成绩${item.expected.trim()!==''?'，并清空这项的预计分数':''}。其他考核的分数会保留。</p><button class="text-button" data-action="score-back">返回修改</button>`;
  $('#score-next').hidden=true;$('#score-confirm').hidden=false;$('#score-confirm').focus();
}
function saveScoreEdit(){
  if(!scoreEdit?.reviewed)return;
  const result=commitActualScore(course,scoreEdit.itemId,scoreEdit.value,{previousActual:scoreEdit.previousActual});
  if(!result.ok){$('#score-error').textContent=result.message;return;}
  course=result.course;persist();$('#score-dialog').close();scoreEdit=null;renderDashboard();
  showNotice(storageProblem?'成绩已更新在当前页面，但尚未保存；请处理上方提示。':'已出成绩已更新并锁定，下次打开会保留。',storageProblem?'error':'success');
}

document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='import-text'){importText=el.value;return;}
  if(el.id==='confirm-checked'){ruleAcknowledged=el.checked;confirmationError='';if($('#rule-validation'))$('#rule-validation').innerHTML='';return;}
  if(el.dataset.score==='expected'){
    const i=course.items.find(i=>i.id===el.dataset.id);if(!i)return;
    if(i.actual.trim()!=='')return;
    i.expected=el.value;mode='scenario';
    persist();renderResults();return;
  }
  if(el.matches('select'))return; // handled by change, which also refreshes dependent fields
  if(el.dataset.course){course[el.dataset.course]=el.value;dirtyRules();}
  for(const [key,collection] of [['item','items'],['target','targets'],['hurdle','hurdles']]){
    if(el.dataset[key]){const obj=course[collection].find(x=>x.id===el.dataset[key]);obj[el.dataset.field]=el.dataset.field==='weight'?percentToWeight(el.value):el.value;dirtyRules();}
  }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='image-upload'){
    const files=[...el.files];
    if(files.length>3||files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)){
      showNotice('请选择最多 3 张 PNG、JPEG 或 WebP 图片，单张不超过 8 MB。','error');el.value='';return;
    }
    if(!files.length)return;
    uploads.forEach(u=>URL.revokeObjectURL(u.url));uploads=files.map(f=>({name:f.name,url:URL.createObjectURL(f)}));renderImport();showNotice('图片已在本机预览，未上传，也未进行识别。');return;
  }
  if(el.id==='images'){
    const files=[...el.files];const invalid=files.length>3||files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024);
    if(invalid){$('#image-message').innerHTML='<div class="alert error">请选择最多 3 张 PNG、JPEG 或 WebP 图片，单张不超过 8 MB。</div>';el.value='';return;}
    if(!files.length)return;
    uploads.forEach(u=>URL.revokeObjectURL(u.url));uploads=files.map(f=>({name:f.name,url:URL.createObjectURL(f)}));dirtyRules();$('#image-message').innerHTML='<div class="result-note">图片已预览，未进行识别。规则已恢复待确认，请对照新图片手动核对；关闭后需重新选择图片。</div>';renderPreviews();return;
  }
  if(!el.matches('select'))return;
  if(el.id==='target-choice'){selectedTargetId=el.value;renderResults();$('#target-choice').focus();return;}
  if(el.dataset.course){course[el.dataset.course]=el.value;dirtyRules();renderRules();}
  if(el.dataset.hurdle){course.hurdles.find(h=>h.id===el.dataset.hurdle)[el.dataset.field]=el.value;dirtyRules();}
});
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.importKind){importKind=b.dataset.importKind;renderImport();showNotice('');return;}
  if(b.dataset.mode){mode=b.dataset.mode;renderResults();document.querySelector(`[data-mode="${mode}"]`)?.focus();return;}
  if(b.dataset.ruleStep!==undefined)return changeRuleStep(Number(b.dataset.ruleStep));
  const action=b.dataset.action;if(!action)return;
  if(action==='generate-sample'){
    if(activeView!=='import'||!['sample-image','sample-text'].includes(importKind))return;
    return askReplace(createSample);
  }
  if(action==='import')return showView('import',true);
  if(action==='rules')return showView('rules',true);
  if(action==='dashboard')return showView('dashboard',true);
  if(action==='next-step')return changeRuleStep(ruleStep+1,true);
  if(action==='previous-step')return changeRuleStep(ruleStep-1);
  if(action==='retry-save')return persist();
  if(action==='reload'){if(window.confirm('重新载入会放弃本页尚未保存的修改。继续吗？'))location.reload();return;}
  if(action==='reset-storage'){if(window.confirm('将清除本工具在此浏览器中的课程记录（包括无法读取的旧记录），无法撤销。确定继续？')){const r=store.reset();if(r.ok){storageProblem='';course=null;ruleBackup=null;setSaveStatus('尚无保存记录');showNotice('本工具的本地课程记录已清除。');activeView='import';renderAll();}else{storageProblem=r.message;storageAlert();}}return;}
  if(!course)return;
  if(action==='edit-score')return openScoreEditor(b.dataset.id);
  if(action==='score-next')return reviewScoreEdit();
  if(action==='score-confirm')return saveScoreEdit();
  if(action==='score-back'){
    if(!scoreEdit)return;
    scoreEdit.reviewed=false;$('#score-review').hidden=true;$('#score-entry').hidden=false;$('#score-next').hidden=false;$('#score-confirm').hidden=true;$('#score-value').focus();return;
  }
  if(action==='score-cancel'){$('#score-dialog').close();scoreEdit=null;return;}
  if(action==='rename-item'){
    const item=course.items.find(i=>i.id===b.dataset.id);if(!item)return;
    renameId=item.id;$('#rename-value').value=item.name;$('#rename-error').textContent='';$('#rename-dialog').showModal();$('#rename-value').focus();return;
  }
  if(action==='rename-save'){
    const value=$('#rename-value').value.trim();
    if(!value){$('#rename-error').textContent='请输入作业或考试名称。';return;}
    const item=course.items.find(i=>i.id===renameId);if(!item)return;
    item.name=value;persist();$('#rename-dialog').close();renameId=null;renderDashboard();return;
  }
  if(action==='rename-cancel'){$('#rename-dialog').close();renameId=null;return;}
  if(action==='quick-confirm'){
    const validation=validateCourse({...course,ruleStatus:'confirmed'},{includeExpected:false});
    if(!validation.ready){showView('rules',true);ruleErrors=validation.errorGroups;ruleStep=Math.max(0,ruleGroupKeys.findIndex(key=>ruleErrors[key].length));expandExtras=true;renderRules();return;}
    course.ruleStatus='confirmed';persist();showNotice('');renderDashboard();return;
  }
  if(action==='confirm-rules')return confirmRules();
  if(action==='clear-expected'){course.items.forEach(i=>i.expected='');persist();renderDashboard();showNotice('预计成绩已清空；实际成绩保持原值。');return;}
  if(action==='add-item'){if(course.items.length>=100)return showNotice('最多支持 100 个考核项目。','error');course.items.push({id:uid(),name:'',weight:'',max:'',actual:'',expected:'',step:'',source:''});}
  if(action==='remove-item'){
    const item=course.items.find(i=>i.id===b.dataset.id);
    if((item.actual!==''||item.expected!==''||course.hurdles.some(h=>h.itemId===item.id))&&!window.confirm('删除这项作业或考试及其成绩？相关的最低分要求会保留，需要重新选择对应考核。'))return;
    course.items=course.items.filter(i=>i.id!==b.dataset.id);
  }
  if(action==='add-target'){if(course.targets.length>=30)return;course.targets.push({id:uid(),label:'',score:''});}
  if(action==='remove-target')course.targets=course.targets.filter(t=>t.id!==b.dataset.id);
  if(action==='add-hurdle'){if(course.hurdles.length>=100)return;course.hurdles.push({id:uid(),itemId:'',operator:'>=',threshold:'',unit:'percent',source:''});}
  if(action==='remove-hurdle')course.hurdles=course.hurdles.filter(h=>h.id!==b.dataset.id);
  dirtyRules();renderRules();
});
document.addEventListener('toggle',event=>{if(event.target.id==='materials-disclosure'&&event.target.isConnected)materialsOpen=event.target.open;},true);
$('#nav-dashboard').addEventListener('click',()=>showView('dashboard',true));
$('#nav-rules').addEventListener('click',()=>showView('rules',true));
$('#nav-import').addEventListener('click',()=>showView('import',true));
$('#score-dialog').addEventListener('cancel',()=>{scoreEdit=null;});
$('#rename-dialog').addEventListener('cancel',()=>{renameId=null;});
$('#cancel-replace').addEventListener('click',()=>{$('#replace-dialog').close();replacement=null;});
$('#confirm-replace').addEventListener('click',()=>{$('#replace-dialog').close();if(replacement)replace(replacement);replacement=null;});
window.addEventListener('beforeunload',event=>{if((storageProblem&&course)||ruleBackup||scoreEdit){event.preventDefault();event.returnValue='';}});
setSaveStatus(initial.kind==='loaded'?'已恢复此浏览器的课程记录':initial.kind==='blocked'?'读取失败 · 原记录已保留':'尚无保存记录');
renderAll();
