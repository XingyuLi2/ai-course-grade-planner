// Node-only checks of the real startup script. The DOM/import are substitutes;
// these tests verify launch/error routing, not browser layout or app rendering.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

export async function runStartupTests() {
  const script = await readFile(new URL('../dist/startup.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const results=[];
  const cases=[
    {name:'直接打开HTML时显示网址引导，不加载应用模块',protocol:'file:',outcome:'file'},
    {name:'HTTP应用启动成功后隐藏加载提示',protocol:'http:',outcome:'loaded'},
    {name:'应用模块失败时显示错误信息，不留下空白',protocol:'http:',outcome:'failed'},
  ];
  for (const test of cases) {
    try {
      const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],{textContent:'',hidden:false,disabled:false}]));
      let imports=0;
      const context=vm.createContext({document:{getElementById:id=>nodes.get(id)},location:{protocol:test.protocol}});
      const runnable=new vm.Script(script,{filename:'startup.js',importModuleDynamically:async()=>{
        imports++;
        if(test.outcome==='failed')throw new Error('Synthetic module load failure');
        const module=new vm.SyntheticModule([],function(){},{context});
        await module.link(()=>{});await module.evaluate();return module;
      }});
      await runnable.runInContext(context);
      const assert=(condition,message)=>{if(!condition)throw new Error(message);};
      if(test.outcome==='file'){
        assert(imports===0,'file URL must not import app');
        assert(!nodes.get('startup-panel').hidden,'file guidance must stay visible');
        assert(nodes.get('startup-title').textContent.length>0,'guidance title missing');
        assert(nodes.get('nav-dashboard').disabled&&nodes.get('nav-rules').disabled,'inactive navigation not disabled');
      } else if(test.outcome==='loaded'){
        assert(imports===1&&nodes.get('startup-panel').hidden,'successful startup should hide guidance');
        assert(!nodes.get('nav-dashboard').disabled,'navigation should remain usable');
      } else {
        assert(imports===1&&!nodes.get('startup-panel').hidden,'failed startup should retain guidance');
        assert(!nodes.get('startup-error').hidden,'error detail not exposed');
        assert(nodes.get('startup-error-detail').textContent==='Synthetic module load failure','original failure detail lost');
      }
      results.push({name:test.name,passed:true});
    }catch(error){results.push({name:test.name,passed:false,error:String(error)});}
  }
  return {total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
}
