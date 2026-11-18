// condutor automático para testes: respeita os limites (olha 250 m à frente), trava para os sinais vermelhos e mede o
// comportamento nas rampas (aceleração com o manípulo no máximo) — mede posições, velocidades e eventos
module.exports.drive=async(p,opt)=>p.evaluate(opt=>{const S=window.__T.S,REV=window.__T.REV,dm=REV?-1:1,L=window.__LIM,out={ev:[],samp:[]};
  S.ref=null;S.fuel=1;S.eng=1;S.engS=0;let k=0;
  for(;k<(opt.max||40000);k++){S.vigOn=false;S.vigT=1e9;S.emerg=false;S.atSt=null;S.departed=true;S.doors=false;
    let lim=1e9;for(let d=0;d<=250;d+=10){const v=L(S.pos+dm*d)/3.6,vm=Math.sqrt(v*v+2*0.5*Math.max(0,d-20));lim=Math.min(lim,vm)}
    const tv=Math.min(lim*0.92,opt.vmax||25);S.v=S.v<tv?Math.min(tv,S.v+0.06):Math.max(tv,S.v-0.09);S.notch=8;
    const q=window.__STEP(1,0.1);if(!q){out.ev.push('parou o passo');break}
    {const o=window.__OPP();if(o.near&&!out._n){out.cross=(out.cross||0)+1};out._n=o.near;out.same=(out.same||0)+o.same}
    if(k%100===0)out.samp.push([Math.round(S.pos),+(S.v*3.6).toFixed(1)]);
    if(opt.stopAt!=null&&(REV?S.pos<opt.stopAt:S.pos>opt.stopAt))break}
  out.pos=Math.round(S.pos);out.k=k;out.txt=(document.body.innerText.match(/Colisão[^.]*|descarril[^.]*|galgou[^.]*|Fim do jogo[^.]*/gi)||[]).join('|');return out},opt);
