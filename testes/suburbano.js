const {chromium}=require('playwright');const {drive}=require('./condutor.js');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});
for(const [dir,all,h] of [[0,1,'08:10'],[1,1,'18:05']]){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(2500);await p.click('#bSub');await p.waitForTimeout(300);
 await p.click(`#ovSub button[data-d="${dir}"]`);await p.click(`#ovSub button[data-s="${all}"]`);await p.fill('#subT',h);await p.click('#subGo');await p.waitForTimeout(3500);
 const G=await p.evaluate(()=>({JSH:window.__GEO().JSH}));
 const r=await drive(p,{stopAt:dir?260:G.JSH-120,max:20000});
 console.log('cruzamentos com contrários',r.cross||0,'sobreposições na mesma via',r.same||0);console.log('sentido',dir?'SDH→Trindade':'Trindade→SDH','paragens',all?'todas':'nenhuma','fim',r.pos,'passos',r.k,r.txt||'sem incidentes',errs.slice(0,2).join('|'));
 console.log('  v (km/h) por posição:',r.samp.filter((_,i)=>i%6===0).map(q=>q[0]+':'+q[1]).join(' '));await p.close()}
await b.close()})();
