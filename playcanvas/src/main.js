// Linha de Guimarães em PlayCanvas: o jogo completo entre a Trindade e Guimarães, com o horário de 1985.
// As regras são as do simulador, que corre escondido (bridge.js): marcha, horário, outros comboios e cruzamentos, sinais, chefe de
// estação, pontuação e som. Aqui comanda-se o ciclo, enviam-se os comandos e desenha-se tudo: cenário do jogo com luz física
// (world.js), automotoras (train.js), céu (sky.js), câmaras e painel.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { Route } from './route.js';
import { openGame } from './bridge.js';
import { World } from './world.js';
import { Sky } from './sky.js';
import { Trains, CSP } from './train.js';
import { Cameras, MODES, MODE_NAME } from './cameras.js';
import { PROFILES, loadProfile, saveProfile, applyFrame } from './quality.js';

const $ = s => document.querySelector(s);
const progress = (f, t) => { $('#ldFill').style.width = Math.round(f * 100) + '%'; $('#ldText').textContent = t; };
let toastT = 0;
function toast(msg, cls = '') { const el = $('#toast'); el.textContent = msg; el.className = 'show ' + cls; clearTimeout(toastT); toastT = setTimeout(() => el.className = cls, 5200); }
const p2 = v => String(v).padStart(2, '0');
const fHM = t => { t = ((Math.round(t) % 86400) + 86400) % 86400; return p2(Math.floor(t / 3600)) + ':' + p2(Math.floor(t / 60) % 60); };
const fHMS = t => { t = ((Math.floor(t) % 86400) + 86400) % 86400; return p2(Math.floor(t / 3600)) + ':' + p2(Math.floor(t / 60) % 60) + ':' + p2(t % 60); };
const NOTCH = ['EM', 'F5', 'F4', 'F3', 'F2', 'F1', '0', '1', '2', '3', '4', '5'];

async function createDevice(canvas) {
    const want = new URLSearchParams(location.search).get('gpu');
    const types = want === 'webgl2' ? [pc.DEVICETYPE_WEBGL2] : (want === 'webgpu' || navigator.gpu) ? [pc.DEVICETYPE_WEBGPU, pc.DEVICETYPE_WEBGL2] : [pc.DEVICETYPE_WEBGL2];
    try { return await pc.createGraphicsDevice(canvas, { deviceTypes: types, antialias: false, powerPreference: 'high-performance' }); }
    catch (e) { console.warn('WebGPU indisponível, a usar WebGL2', e); return pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2], antialias: false }); }
}

async function main() {
    const qk = loadProfile(), Q = PROFILES[qk];
    const canvas = $('#app');
    progress(0.03, 'A preparar o motor gráfico…');
    const device = await createDevice(canvas);
    device.maxPixelRatio = Q.pixelRatio;
    const opts = new pc.AppOptions();
    opts.graphicsDevice = device;
    opts.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem];
    opts.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler];
    const app = new pc.AppBase(canvas);
    app.init(opts);
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    addEventListener('resize', () => app.resizeCanvas());
    app.start();
    window.__pc = { app, device: device.deviceType };

    // o simulador (escondido) é o motor do jogo e dá o eixo e o cenário
    progress(0.06, 'A abrir o simulador (regras, horário e cenário)…');
    const game = await openGame('guimaraes');
    progress(0.22, 'A ler a linha…');
    const route = new Route(game.section(0, game.len));

    // câmara e pós-processamento
    const camE = new pc.Entity('câmara');
    camE.addComponent('camera', { clearColor: new pc.Color(0.6, 0.7, 0.8), nearClip: 0.05, farClip: 7000, fov: 62 });
    app.root.addChild(camE);
    const cf = new pc.CameraFrame(app, camE.camera);
    applyFrame(cf, Q, device);

    // céu conforme a hora do jogo (escuridão do simulador: 0 de dia, 1 de noite)
    const sky = new Sky(app, Q);
    const todOf = (dark, cur) => { const h = 0.04; if (cur === 'noite') return dark < 0.6 - h ? (dark < 0.3 ? 'dia' : 'tarde') : 'noite'; if (cur === 'tarde') return dark > 0.6 + h ? 'noite' : dark < 0.3 - h ? 'dia' : 'tarde'; return dark > 0.6 ? 'noite' : dark > 0.3 + h ? 'tarde' : 'dia'; };
    let st = game.state();
    let tod = todOf(st.dark, 'dia'), skyBusy = false;
    progress(0.3, 'A carregar o céu…');
    await sky.set(tod);

    progress(0.38, 'A carregar as texturas do cenário…');
    const world = new World(app, game, route, Q);
    await world.loadTextures();
    world.setNight(sky.night);
    try { world.addStatic(game.landmarks()); } catch (e) { console.warn('Sem o casario distante', e); }
    await world.preload(st.pos, st.dir, f => progress(0.45 + 0.4 * f, 'A construir o cenário do simulador…'));
    progress(0.88, 'A preparar as automotoras…');
    const trains = new Trains(app, route, Q);
    await trains.load();
    const me = trains.unit(true);
    const others = new Map(), spare = [];      // comboio do simulador → composição desenhada
    const TF = { pos: (p, o) => { const P = route.point(p, o, 0); return [P[0], game.terr(p, o) - route.oy, P[2]]; } };
    const cams = new Cameras(app, camE, route, TF);
    cams.tunnels = route.D.tunnels || [];

    // candeeiros: um conjunto de luzes pontuais que acompanha a câmara (as mais próximas), acesas à noite
    const LAMPS = game.lamps(0, game.len).map(([p, x, k]) => { const P = route.point(p, x, k ? 4.6 : 5.6); return new pc.Vec3(P[0], P[1], P[2]); });
    const lampLights = Array.from({ length: 14 }, () => { const e = new pc.Entity('luz do candeeiro'); e.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.82, 0.55), intensity: 0, range: 18, castShadows: false }); app.root.addChild(e); return e; });

    // ---- painel
    const lever = $('#lever');
    NOTCH.forEach((n, i) => { const e = document.createElement('span'); e.textContent = n; e.className = i === 0 ? 'e' : i < 6 ? 'b' : i > 6 ? 't' : ''; e.onclick = () => game.cmd.notch(i); lever.appendChild(e); });
    const lspans = [...lever.children];
    const VMAX = 100;   // escala do velocímetro
    { const g = $('#ticks'), ns = 'http://www.w3.org/2000/svg';
      for (let v = 0; v <= VMAX; v += 5) { const a = (-135 + v / VMAX * 270) * Math.PI / 180, r1 = v % 10 ? 76 : 72, l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', 100 + Math.sin(a) * r1); l.setAttribute('y1', 100 - Math.cos(a) * r1); l.setAttribute('x2', 100 + Math.sin(a) * 82); l.setAttribute('y2', 100 - Math.cos(a) * 82);
        l.setAttribute('class', 'g-tick' + (v % 10 ? '' : ' major')); g.appendChild(l);
        if (v % 20 === 0) { const t = document.createElementNS(ns, 'text'); t.setAttribute('x', 100 + Math.sin(a) * 58); t.setAttribute('y', 100 - Math.cos(a) * 58); t.setAttribute('class', 'g-num'); t.textContent = v; g.appendChild(t); } } }
    // barra compacta: velocímetro pequeno (cópia do grande) e escolha guardada entre sessões
    const mG = $('.gauge svg').cloneNode(true); mG.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); $('#mGauge').prepend(mG);
    const mNeedle = mG.querySelector('.g-needle'), mArc = mG.querySelector('.g-lim');
    const setCompact = on => { document.body.classList.toggle('compact', on); try { localStorage.setItem('pc-dash', on ? 'mini' : 'full'); } catch (e) { } };
    { let v = null; try { v = localStorage.getItem('pc-dash'); } catch (e) { } setCompact(v !== 'full'); }
    $('#bMore').onclick = () => setCompact(false); $('#bLess').onclick = () => setCompact(true);
    const arc = v => { const a1 = (-135 + Math.min(VMAX, v) / VMAX * 270) * Math.PI / 180, a2 = 135 * Math.PI / 180, r = 88; const P = a => `${100 + Math.sin(a) * r} ${100 - Math.cos(a) * r}`; return `M ${P(a1)} A ${r} ${r} 0 ${(a2 - a1) > Math.PI ? 1 : 0} 1 ${P(a2)}`; };
    const dist = d => d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : (d < 300 ? Math.round(d) : Math.round(d / 10) * 10) + ' m';
    const setTxt = (id, v) => { const e = $(id); if (e.textContent !== v) e.textContent = v; };
    function hud() {
        const h = game.hud(), kmh = Math.abs(h.kmh);
        setTxt('#spd', String(Math.round(kmh)));
        $('#needle').setAttribute('transform', `rotate(${-135 + Math.min(VMAX + 4, kmh) / VMAX * 270} 100 100)`);
        $('#limArc').setAttribute('d', arc(h.lim));
        // velocidade máxima: losango branco; a seguinte, mais pequena, com a distância (destaque quando é mais baixa)
        setTxt('#lim', String(h.lim));
        $('#limBox').classList.toggle('over', kmh > h.lim + 2);
        setTxt('#nl', h.nl ? String(h.nl.v) : '–');
        setTxt('#nlD', h.nl ? 'a ' + dist(Math.max(0, h.nl.d)) : 'sem mudança');
        $('#nlRow').className = 'signrow' + (h.nl && h.nl.v < h.lim ? (h.nl.d < 400 && kmh > h.nl.v + 2 ? ' stop' : ' warn') : '');
        // sinal adiante
        const sg = h.sig, blink = sg && sg.st === 'YF' && (performance.now() / 620 | 0) % 2;
        $('#sigLamp').className = 'lamp' + (sg ? ' ' + (blink ? '' : sg.st === 'YF' ? 'Y' : sg.st) : '');
        setTxt('#sigN', sg ? sg.nm + ({ G: ' · via livre', Y: ' · precaução', YF: ' · precaução', R: ' · paragem' }[sg.st] || '') : 'Sinal');
        setTxt('#sigD', sg ? 'a ' + dist(sg.d) + (sg.vista ? ' · à vista' : '') : 'nenhum a menos de 1,5 km');
        $('#sigRow').className = 'signrow' + (sg ? (sg.st === 'R' ? ' stop' : sg.st === 'G' ? '' : ' warn') : '');
        // passagem de nível
        setTxt('#pnD', h.pn ? 'a ' + dist(h.pn.d) + (h.pn.honk ? ' · buzinar!' : '') : 'nenhuma a menos de 1,5 km');
        $('#pnRow').className = 'signrow' + (h.pn && h.pn.honk ? ' stop' : '');
        // paragem, horas e pontuação (textos do próprio simulador)
        setTxt('#nxt', h.next || '—'); setTxt('#nxtD', h.dist || '—'); setTxt('#arr', h.arr || '—');
        setTxt('#clock', fHMS(h.clock)); setTxt('#trip', h.trip || '--'); setTxt('#delay', h.delay || 'Pontual'); setTxt('#score', String(h.score));
        setTxt('#fuel', Math.round(Math.max(0, Math.min(1, h.fuel || 0)) * 100) + ' %');
        const bad = h.emerg || h.vigOn;
        setTxt('#msg', h.vigOn ? `Homem-morto: carregue no 9 (${Math.ceil(h.vigLeft)} s)` : h.msg || '');
        $('#msg').className = 'msg' + (bad ? ' bad' : '');
        $('#dash').classList.toggle('alarm', !!h.vigOn);
        lspans.forEach((e, i) => e.classList.toggle('on', i === h.notch));
        // barra compacta
        setTxt('#mSpd', String(Math.round(kmh)));
        mNeedle.setAttribute('transform', `rotate(${-135 + Math.min(VMAX + 4, kmh) / VMAX * 270} 100 100)`); mArc.setAttribute('d', arc(h.lim));
        setTxt('#mNotch', NOTCH[h.notch] ?? '–');
        setTxt('#mLim', String(h.lim)); $('#mLimBox').classList.toggle('over', kmh > h.lim + 2);
        $('#mLamp').className = $('#sigLamp').className; $('#mSigRow').className = $('#sigRow').className;
        setTxt('#mSigN', $('#sigN').textContent); setTxt('#mSigD', $('#sigD').textContent);
        setTxt('#mNxt', h.next || '—'); setTxt('#mNxtD', h.dist || '—'); setTxt('#mClock', fHMS(h.clock)); setTxt('#mArr', h.arr || '—');
        setTxt('#mMsg', $('#msg').textContent); $('#mMsg').className = $('#msg').className;
        $('#mini').classList.toggle('alarm', !!h.vigOn);
        // botões
        const bi = $('#bIgn'); setTxt('#bIgn', h.engS > 0 ? 'A arrancar…' : h.eng >= 1 ? 'Motor ligado' : 'Ignição'); bi.classList.toggle('go', h.eng >= 1);
        setTxt('#bDoor', h.doors ? 'Fechar portas' : 'Abrir portas'); $('#bDoor').classList.toggle('go', !!h.doors);
        $('#bVig').classList.toggle('warn', !!h.vigOn);
        setTxt('#bRev', h.back ? 'Marcha: atrás' : 'Marcha: frente');
        setTxt('#bWarp', 'Tempo ×' + (h.warp || 1));
        setTxt('#brand', h.ttn ? `Comboio ${h.ttn} → ${h.dest}` : 'Linha de Guimarães');
        setTxt('#topLine', `De ${h.from || '—'} · PK ${(st.pos / 1000).toFixed(1).replace('.', ',')}`);
    }

    // ---- horário
    const TT = game.timetable();
    let comp = 2;   // 2 = automotora simples; 4 = unidade dupla (duas automotoras, a segunda acopla no arranque)
    document.querySelectorAll('#compSeg button').forEach(b => b.onclick = () => {
        comp = +b.dataset.c;
        document.querySelectorAll('#compSeg button').forEach(q => q.classList.toggle('on', q === b));
    });
    function menu(show) {
        $('#menu').hidden = !show; $('#dash').hidden = show; $('#endOv').hidden = true; $('#pauseOv').hidden = true;
        if (!show) return;
        setTxt('#brand', 'Linha de Guimarães'); setTxt('#topLine', 'Horário de 1985');
        // jogo guardado neste navegador: botão para continuar, com o percurso e a hora do jogo
        { const o = game.readSave(), ok = o && (!o.line || o.line === 'guimaraes') && game.saveOK(o);
          $('#mLoad').hidden = !ok;
          if (ok) { const stn = game.stations, c = o.clock ?? (o.s && o.s.clock) ?? 0;
            setTxt('#mLoadInfo', `${(stn[o.start] || {}).n || '—'} → ${(stn[o.end] || {}).n || '—'} · ${fHMS(c).slice(0, 5)} (hora do jogo)` + (o.t ? ' · guardado ' + new Date(o.t).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')); } }
        const body = $('#ttBody'); body.innerHTML = '';
        const secs = [['Porto-Trindade → Guimarães', x => x.de === 'Porto-Trindade' && x.tipo !== 'T'], ['Guimarães → Porto-Trindade', x => x.para === 'Porto-Trindade' && x.tipo !== 'T'],
            ['Outros serviços', x => x.de !== 'Porto-Trindade' && x.para !== 'Porto-Trindade' && x.tipo !== 'T'], ['Tranvias Trindade ↔ Senhora da Hora', x => x.tipo === 'T']];
        const key = x => { const [h, m] = x.dep.split(':').map(Number), v = h * 60 + m; return v < 240 ? v + 1440 : v; };
        for (const [title, f] of secs) {
            const rows = TT.filter(f).sort((a, b) => key(a) - key(b)); if (!rows.length) continue;
            const h3 = document.createElement('h3'); h3.textContent = title; body.appendChild(h3);
            const tb = document.createElement('table'); tb.className = 'tt';
            tb.innerHTML = '<tr><th>Comboio</th><th>Partida</th><th>De</th><th>Para</th><th>Chegada</th><th>Paragens</th><th></th></tr>';
            for (const x of rows) {
                const tr = document.createElement('tr'); tr.className = 'r';
                const tag = x.tipo === 'R' ? '<span class="tag">rápido</span>' : x.tipo === 'S' ? '<span class="tag">semidireto</span>' : '';
                tr.innerHTML = `<td class="n">${x.n}${tag}</td><td class="h">${x.dep}</td><td>${x.de}</td><td>${x.para}</td><td>${fHM(x.stops[x.stops.length - 1][1])}</td><td>${x.stops.length - 1}</td><td><button aria-label="Conduzir o comboio ${x.n}">Conduzir</button></td>`;
                tr.onclick = () => pick(x); tb.appendChild(tr);
            }
            body.appendChild(tb);
        }
    }
    function pick(x) {
        if (busy) return;
        const lo = game.lineOpts(x.n);
        if (lo.length < 2) return begin(x, 0);
        $('#lnTitle').innerHTML = `Linha de partida<small>Comboio ${x.n} · ${x.de}, ${x.dep}</small>`;
        const box = $('#lnBtns'); box.innerHTML = '';
        const add = (txt, f) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = f; box.appendChild(b); };
        for (const k of lo) add('Linha ' + k, () => { $('#lineDlg').hidden = true; begin(x, k); });
        add('Ao acaso', () => { $('#lineDlg').hidden = true; begin(x, 0); });
        add('Voltar', () => { $('#lineDlg').hidden = true; });
        $('#lineDlg').hidden = false;
    }
    let busy = false, playing = false, last = performance.now();
    async function begin(x, ln) {
        busy = true; menu(false); $('#dash').hidden = true;
        game.audio();
        game.start(x.n, ln, comp);
        await prepare(`${x.de} — ${x.para}`, `Comboio ${x.n}: a construir o cenário de ${x.de}…`);
    }
    // cenário do ponto onde o comboio está e céu da hora do jogo; depois o jogo corre
    async function prepare(title, txt) {
        st = game.state();
        $('#loading').classList.remove('done'); $('#ldTitle').textContent = title;
        progress(0.1, txt);
        const t2 = todOf(st.dark, tod); if (t2 !== tod) { tod = t2; await sky.set(tod); world.setNight(sky.night); }
        await world.preload(st.pos, st.dir, f => progress(0.1 + 0.9 * f, txt));
        $('#loading').classList.add('done');
        setCam('cab', true); $('#dash').hidden = false;
        playing = true; busy = false; last = performance.now();
    }

    // ---- gravação: guardar (navegador + ficheiro .json), retomar o guardado, abrir um .json
    async function resume(o) {
        if (busy || !o) return;
        if (o.line && o.line !== 'guimaraes' || !game.saveOK(o)) { toast('Este jogo guardado não é da Linha de Guimarães ou já não é compatível com esta versão.', 'bad'); return; }
        if (playing && !st.over && !confirm('Deixar o comboio atual e retomar o jogo guardado?')) return;
        busy = true; playing = false; menu(false); $('#dash').hidden = true; $('#lineDlg').hidden = true;
        game.audio();
        if (!game.apply(o)) { busy = false; menu(true); toast('Não foi possível retomar este jogo.', 'bad'); return; }
        await prepare('Jogo guardado', 'A retomar o jogo guardado…');
    }
    $('#bSave').onclick = () => {
        if (!playing || busy) { toast('Não há viagem em curso para guardar.', ''); return; }
        const o = game.saveObj(); if (!o) { toast('Não há viagem em curso para guardar.', ''); return; }
        game.store();
        const stn = game.stations, a = (stn[o.start] || {}).n || 'inicio', b = (stn[o.end] || {}).n || 'fim';
        const fn = ('comboio-' + a + '-' + b + '-' + fHMS(o.clock ?? (o.s && o.s.clock) ?? 0).slice(0, 5).replace(':', 'h') + '.json').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9.\-]+/g, '-');
        const u = URL.createObjectURL(new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' })), l = document.createElement('a');
        l.href = u; l.download = fn; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    };
    $('#bLoad').onclick = () => { const o = game.readSave(); if (!o) { toast('Não há nenhum jogo guardado neste navegador.', ''); return; } resume(o); };
    $('#bLoadF').onclick = $('#mLoadF').onclick = () => $('#fLoad').click();
    $('#mLoad').onclick = () => $('#bLoad').onclick();
    $('#fLoad').onchange = e => {
        const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
        const r = new FileReader();
        r.onload = () => { let o = null; try { o = JSON.parse(r.result); } catch (err) { } if (!o || !o.s || o.start === undefined) { toast('Este ficheiro não é um jogo guardado.', 'bad'); return; } resume(o); };
        r.readAsText(f);
    };
    $('#bAgain').onclick = () => { playing = false; menu(true); };
    $('#bMenu').onclick = () => { if (busy) return; if (playing && !st.over && !confirm('Deixar este comboio e voltar ao horário?')) return; playing = false; game.cmd.pause(false); menu(true); };

    // ---- câmaras, botões e teclas
    const segOn = (sel, attr, val) => document.querySelectorAll(sel + ' button').forEach(b => b.classList.toggle('on', b.dataset[attr] === val));
    function setCam(m, quiet) { cams.set(m); segOn('#camSeg', 'cam', m); game.setCam(m === 'cab' ? 'cab' : m === 'ext' ? 'chase' : 'side'); if (!quiet) toast('Vista: ' + MODE_NAME[m]); }
    document.querySelectorAll('#camSeg button').forEach(b => b.onclick = () => { if (playing) setCam(b.dataset.cam); });
    document.querySelectorAll('#qSeg button').forEach(b => b.onclick = () => { if (playing && !confirm('Mudar a qualidade recarrega a página e interrompe este comboio. Continuar?')) return; saveProfile(b.dataset.q); location.reload(); });
    segOn('#camSeg', 'cam', 'cab'); segOn('#qSeg', 'q', qk);
    $('#bHelp').onclick = () => $('#help').showModal();
    $('#bPause').onclick = () => { if (playing) game.cmd.pause(); };
    $('#bResume').onclick = () => game.cmd.pause(false);
    $('#bIgn').onclick = () => { game.audio(); game.cmd.ign(); };
    $('#bDoor').onclick = () => game.cmd.door();
    $('#bVig').onclick = () => game.cmd.vig();
    $('#bRev').onclick = () => game.cmd.rev();
    $('#bSw').onclick = () => game.cmd.sw();
    $('#bWarp').onclick = () => game.cmd.warp();
    { const b = $('#bHorn'); b.onpointerdown = e => { e.preventDefault(); game.audio(); game.key('keydown', '7', 'Digit7'); }; b.onpointerup = b.onpointerleave = () => game.key('keyup', '7', 'Digit7'); }
    game.onToast = (t, kind) => toast(t, kind === 'bad' ? 'warn' : kind === 'good' ? 'good' : '');
    // teclas: as do simulador (8/2 manípulo, 9 homem-morto, 7/3/1/4 buzinas, E, R, Z, T, P, I) vão para o jogo; C muda de câmara
    const LOCAL = new Set(['c', 'f', '?', 'v', 'h', 'g', 'escape', 'tab']);
    addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest && e.target.closest('dialog')) return;
        const k = e.key.toLowerCase();
        if (k === '?') return $('#help').showModal();
        if (k === 'f') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { }); } catch (x) { } return; }
        if (!playing || busy) return;
        game.audio();
        if (k === 'c') { if (!e.repeat) setCam(MODES[(MODES.indexOf(cams.mode) + 1) % MODES.length]); return; }
        if (LOCAL.has(k)) return;
        // a repetição automática só interessa ao manípulo (8/2 e setas); nas outras teclas contaria como vários toques
        if (e.repeat && !/^(arrowup|arrowdown)$/.test(k) && !/^(Digit|Numpad)[28]$/.test(e.code)) { e.preventDefault(); return; }
        game.key('keydown', e.key, e.code);
        if (k === ' ' || k.startsWith('arrow') || /^(Digit|Numpad)\d$/.test(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { if (playing) game.key('keyup', e.key, e.code); });
    addEventListener('blur', () => { if (playing) for (const c of ['Digit7', 'Digit3', 'Digit1']) game.key('keyup', c.slice(-1), c); });
    canvas.addEventListener('pointerdown', () => game.audio());

    // ---- ciclo
    let fpsT = 0, fpsN = 0, lodT = 0, hudT = 0, idle = 0, dynN = 0;
    const camPos = new pc.Vec3();
    function frame(dtForced) {
        const now = performance.now(), dt = dtForced ?? Math.min(0.1, (now - last) / 1000); last = now;
        fpsN++; if (!fpsT) fpsT = now;
        if (now - fpsT > 500) { $('#fps').textContent = `${Math.round(fpsN * 1000 / (now - fpsT))} FPS · ${Q.name} · ${device.deviceType === 'webgpu' ? 'WebGPU' : 'WebGL2'}`; fpsT = now; fpsN = 0; }
        if (busy) return;
        // o simulador avança (marcha, horário, outros comboios, sinais, som) e diz onde está tudo
        if (playing) game.tick(dt);
        st = game.state();
        const night = sky.night, off = p => game.tx(p);
        me.update({ front: st.pos, dir: st.dir, nc: st.nc, off, od: st.od, head: 1, tail: 1, night });
        const seen = new Set();
        for (const t of st.trains) {
            let u = others.get(t.ref);
            if (!u) { u = spare.pop() || trains.unit(false); others.set(t.ref, u); }
            const o = t.o;
            u.update({ front: t.front, dir: t.dir, nc: t.nc, off: t.xo || (() => o), od: null, head: t.head, tail: t.tail, night });
            seen.add(t.ref);
        }
        for (const [ref, u] of others) if (!seen.has(ref)) { u.hide(); others.delete(ref); spare.push(u); }
        world.update(st.pos - st.dir * CSP, st.dir);
        // câmara: no horário, a exterior roda devagar à volta da automotora
        if (!playing) { idle += dt; if (cams.mode !== 'ext') cams.set('ext'); cams.oyaw = 2.2 + idle * 0.05; cams.odist = 46; cams.opitch = 0.24; }
        cams.update(dt, me, { pFront: st.pos, dir: st.dir, v: st.v, off });
        // sinais, cancelas, agulhas, passageiros e chefe de estação: geometria do simulador, refeita em cada imagem
        camPos.copy(camE.getPosition());
        const ex = camPos.x + route.ox, ez = camPos.z + route.oz;
        // com muita gente nos cais (Trindade: ~190 mil vértices) refaz-se de 2 em 2 ou de 3 em 3 imagens, para não pesar
        { const every = window.__dynSkip || (world.dynVerts > 120000 ? 3 : world.dynVerts > 50000 ? 2 : 1);   // __dynSkip: só nos testes
          if (dynN++ % every === 0) world.dynUpdate(game.dyn(ex, ez), ex, ez); }
        // céu pela hora do jogo; candeeiros mais próximos acesos à noite
        lodT += dt;
        if (lodT > 0.5) {
            lodT = 0;
            const t2 = todOf(st.dark, tod);
            if (t2 !== tod && !skyBusy) { tod = t2; skyBusy = true; sky.set(tod).then(() => { world.setNight(sky.night); skyBusy = false; }); }
            if (sky.night > 0.2) {
                const near = []; for (const P of LAMPS) { const d = P.distance(camPos); if (d < 500) near.push([d, P]); }
                near.sort((a, b) => a[0] - b[0]);
                lampLights.forEach((l, k) => { if (near[k]) { l.setPosition(near[k][1]); l.light.intensity = 2.4; } else l.light.intensity = 0; });
            } else for (const l of lampLights) l.light.intensity = 0;
        }
        // painel, pausa e fim de serviço
        hudT += dt;
        if (hudT > 0.1 && playing) {
            hudT = 0; hud();
            $('#pauseOv').hidden = !st.paused;
            if (st.over && $('#endOv').hidden) {
                const E = game.end();
                if (E) { $('#endTitle').innerHTML = E.title; $('#endStars').textContent = E.stars; $('#endTbl').innerHTML = E.rows; $('#endOv').hidden = false; }
            }
        }
    }
    app.on('update', () => { if (!window.__manual) frame(); });

    progress(1, 'Pronto.');
    setTimeout(() => $('#loading').classList.add('done'), 250);
    menu(true);
    window.__sim = { game, route, world, trains, me, others, cams, sky, Q, setCam, pick, begin, TT, step: frame, hud, get st() { return st; }, get playing() { return playing; }, get busy() { return busy; } };
}

main().catch(e => { console.error(e); progress(0, 'Erro: ' + e.message); });
