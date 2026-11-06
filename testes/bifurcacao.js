const {chromium}=require('playwright');const {drive}=require('./condutor.js');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});
for(const [line,dir,stop] of [['guimaraes',0,12600],['povoa',0,8200],['guimaraes',1,260],['povoa',1,260]]){const ctx=await b.newContext();const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.evaluate(l=>localStorage.setItem('gf-line',l),line);await p.reload();await p.waitForTimeout(2500);
 // partida: personalizado entre Trindade e (Maia | Custóias), ou o inverso
 await p.evaluate(([line,dir])=>{const n=line==='povoa'?'Custóias':'Maia';const s=[...document.querySelectorAll('#cFrom option')];document.querySelector('#bCustom').click();
   const f=document.querySelector('#cFrom'),t=document.querySelector('#cTo');const idx=x=>[...f.options].find(o=>o.textContent.includes(x)).value;
   f.value=dir?idx(n):idx('Porto-Trindade');t.value=dir?idx('Porto-Trindade'):idx(n);f.dispatchEvent(new Event('change'));t.dispatchEvent(new Event('change'));document.querySelector('#cGo').click()},[line,dir]);
 await p.waitForTimeout(3500);
 const r=await drive(p,{stopAt:stop,max:30000});
 const xs=await p.evaluate(()=>window.__T.S&&window.__T.S.pos);
 console.log(line,dir?'regresso → Trindade':'Trindade → '+(line==='povoa'?'Custóias':'Maia'),'fim',r.pos,'passos',r.k,r.txt||'sem incidentes',errs.slice(0,2).join('|'));await ctx.close()}
await b.close()})();
