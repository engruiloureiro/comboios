const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage();
await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(2500);await p.click('#bStart4');await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const S=window.__T.S,G=window.__GEO(),out=[];
 for(const [nm,k0,notch] of [['rampa 20‰ (subida, PK 4,40)',4.40,11],['patamar (PK 3,84)',3.84,11],['pendente 14‰ (descida, PK 1,96)',1.96,11],['rampa 17‰ no túnel (PK 0,25)',0.25,11],['travagem em pendente 14‰ (PK 2,0) a 50 km/h',2.0,0],['travagem em rampa 20‰ (PK 4,45) a 50 km/h',4.45,0]]){
  S.pos=S.prevPos=400+k0*1000;S.v=notch?0:50/3.6;S.eng=1;S.engS=0;S.fuel=1;S.ref=null;S.atSt=null;S.departed=true;S.doors=false;S.emerg=false;S.notch=notch;S.bcp=notch?0:S.bcp;
  let t=0,d0=S.pos;const T=notch?40:120;for(;t<T;t+=0.1){S.vigOn=false;S.vigT=1e9;S.emerg=false;S.notch=notch;window.__STEP(1,0.1);if(!notch&&S.v<0.05)break}
  out.push(nm+': '+(notch?'v ao fim de 40 s = '+(S.v*3.6).toFixed(1)+' km/h, '+Math.round(S.pos-d0)+' m':'parou em '+t.toFixed(1)+' s, '+Math.round(S.pos-d0)+' m'))}
 return out});
console.log(r.join('\n'));await b.close()})();
