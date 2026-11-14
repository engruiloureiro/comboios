// Protótipo PlayCanvas do simulador: troço Lordelo–Vizela da Linha de Guimarães com a UDD 9600.
// Lógica ferroviária (marcha, paragens, portas, agulhas) separada do motor gráfico; dados do troço exportados do simulador.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { Route } from './route.js';
import { loadPBR } from './gfx.js';
import { buildTrack, trackMaterials } from './track.js';
import { buildTerrain } from './terrain.js';
import { buildVegetation } from './vegetation.js';
import { buildStations } from './stations.js';
import { Sky } from './sky.js';
import { Train, CSP } from './train.js';
import { Physics, NOTCH } from './physics.js';
import { Audio } from './audio.js';
import { Cameras, MODES, MODE_NAME } from './cameras.js';
import { PROFILES, loadProfile, saveProfile, applyFrame } from './quality.js';

const $ = s => document.querySelector(s);
const progress = (f, t) => { $('#ldFill').style.width = Math.round(f * 100) + '%'; $('#ldText').textContent = t; };
let toastT = 0;
function toast(msg, cls = '') { const el = $('#toast'); el.textContent = msg; el.className = 'show ' + cls; clearTimeout(toastT); toastT = setTimeout(() => el.className = cls, 4200); }
const fHM = t => { t = ((t % 86400) + 86400) % 86400; const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };

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

    // dados do troço (exportados do simulador) e dados técnicos da 9600
    progress(0.08, 'A ler o troço Lordelo–Vizela…');
    const [D, CPJ] = await Promise.all([fetch('data/lordelo-vizela.json').then(r => r.json()), fetch('../cp9600/cp9600.json').then(r => r.json())]);
    const route = new Route(D);

    // câmara e pós-processamento
    const camE = new pc.Entity('câmara');
    camE.addComponent('camera', { clearColor: new pc.Color(0.6, 0.7, 0.8), nearClip: 0.05, farClip: 7000, fov: 62 });
    app.root.addChild(camE);
    const cf = new pc.CameraFrame(app, camE.camera);
    applyFrame(cf, Q, device);

    const sky = new Sky(app, Q);
    progress(0.12, 'A carregar o céu…');
    let tod = 'dia'; try { tod = localStorage.getItem('pc-tod') || 'dia'; } catch (e) { }
    await sky.set(tod);

    progress(0.2, 'A carregar texturas (Poly Haven, CC0)…');
    const [grass, concrete, stucco, roof, asphalt, mats] = await Promise.all([
        loadPBR(app, 'leafy_grass', Q), loadPBR(app, 'concrete_floor_01', Q), loadPBR(app, 'white_stucco', Q), loadPBR(app, 'clay_roof_tiles', Q), loadPBR(app, 'asphalt_02', Q),
        trackMaterials(app, Q, loadPBR)
    ]);
    const world = new pc.Entity('mundo'); app.root.addChild(world);
    progress(0.32, 'A modelar o terreno…');
    const TF = await buildTerrain(app, route, world, grass, Q);
    progress(0.5, 'A assentar a via…');
    const chunks = await buildTrack(app, route, world, mats);
    progress(0.66, 'A construir estações e casario…');
    const ST = await buildStations(app, route, TF, world, { concrete, stucco, roof, asphalt }, Q);
    progress(0.76, 'A plantar a vegetação…');
    const trees = buildVegetation(app, route, TF, world, Q, ST.avoid);
    progress(0.84, 'A preparar a UDD 9600…');
    const train = new Train(app, route);
    await train.load(Q);
    const phys = new Physics(CPJ);
    const audio = new Audio();
    const cams = new Cameras(app, camE, route, TF);

    // estado da marcha
    const lord = route.stations.find(s => s.n === 'Lordelo');
    const S = { pFront: lord ? lord.stopF : route.p0 + 200, dir: 1, flip: false, v: 0, night: sky.night, lights: true, off: null, odo: 0,
        clock: { dia: 7 * 3600 + 40 * 60, tarde: 18 * 3600 + 10 * 60, noite: 21 * 3600 + 40 * 60 }[tod], served: new Set(lord ? [lord.n] : []),
        atStop: lord || null, doorsOpenT: 0, loopAt: null, paused: false, warned: 0 };
    const LINES = route.lines();
    // candeeiros dos cais: luz pontual (iluminação em grelha do PlayCanvas, sem sombras) acesa à noite
    const lampLights = ST.lamps.map(L => { const e = new pc.Entity('luz do candeeiro'); e.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.82, 0.55), intensity: 0, range: 16, castShadows: false }); e.setPosition(L.pos.x, L.pos.y - 0.25, L.pos.z); app.root.addChild(e); return e; });

    // ---- operação: paragens, agulhas, portas
    const stopPos = s => (S.dir > 0 ? s.stopF : s.stopR);
    const nextStop = () => route.stations.filter(s => !S.served.has(s.n) && S.dir * (stopPos(s) - S.pFront) > -12).sort((a, b) => S.dir * (stopPos(a) - stopPos(b)))[0] || null;
    const loopFor = s => LINES.find(L => !L.main && s.pos > L.a && s.pos < L.b) || null;
    function offAt(p) { if (!S.loopAt) return 0; const L = S.loopAt; return p > L.a && p < L.b ? L.off(p) : 0; }
    S.off = offAt;
    function platformSide(s) {
        // cais junto à via em que está a automotora (a 1,8 m do eixo dessa via)
        const o = offAt(s.bc ?? s.pos);
        const pl = s.pl.find(r => Math.abs(Math.abs(r[0] - o) - 1.8) < 0.05) || s.pl[0];
        return Math.sign(pl[0] - o);
    }
    function doors() {
        if (Math.abs(S.v) > 0.1) return toast('Pare a automotora antes de abrir as portas.', 'warn');
        if (train.doorsOpen()) { train.openDoors(0, false); audio.one('door_close', 0.7); toast('Portas fechadas.'); return; }
        const s = route.stations.find(s => Math.abs(stopPos(s) - S.pFront) < 10);
        if (!s) return toast('Não está junto ao marco de paragem de um cais.', 'warn');
        const err = (S.pFront - stopPos(s)) * S.dir;
        train.openDoors(platformSide(s), true); audio.one('door_open', 0.7);
        S.served.add(s.n); S.atStop = s; S.doorsOpenT = 0;
        toast(`${s.n}: portas abertas. Paragem a ${Math.abs(err).toFixed(1)} m do marco${Math.abs(err) < 1.5 ? ' — precisa!' : '.'}`, Math.abs(err) < 1.5 ? 'good' : '');
    }
    function switchLoop() {
        const s = route.stations.filter(st => loopFor(st) && S.dir * (st.pos - S.pFront) > 40).sort((a, b) => S.dir * (a.pos - b.pos))[0];
        if (!s) return toast('Não há agulhas à frente neste troço.', 'warn');
        const L = loopFor(s);
        const toe = S.dir > 0 ? L.a : L.b;
        if (S.dir * (toe - S.pFront) < 25) return toast('Já não é possível mudar a agulha: a automotora está perto.', 'warn');
        S.loopAt = S.loopAt === L ? null : L;
        toast(`${s.n}: agulha para a ${S.loopAt ? 'via 2 (desviada, 30 km/h)' : 'via principal'}.`, 'good');
    }
    function reverse() {
        if (Math.abs(S.v) > 0.05) return toast('Só se inverte a marcha com a automotora parada.', 'warn');
        if (train.doorsOpen()) return toast('Feche as portas primeiro.', 'warn');
        S.pFront = S.pFront - S.dir * 2 * CSP; S.dir = -S.dir; S.flip = !S.flip; phys.notch = 6; S.served = new Set(S.atStop ? [S.atStop.n] : []);
        toast('Marcha invertida: o maquinista mudou de cabina.', 'good');
    }
    function ignition() {
        audio.init().then(() => audio.resume());
        if (phys.engine) { phys.stopEngine(); audio.one('shutdown', 0.8); toast('Motor desligado.'); }
        else if (phys.startEngine()) { audio.one('startup', 0.9); toast('A pôr o motor a trabalhar…'); }
    }
    function setNotch(i) {
        i = Math.max(0, Math.min(11, i)); if (i === phys.notch) return;
        if (i < phys.notch && i <= 5) audio.one('airbrake1', 0.35); else if (i > phys.notch && phys.notch <= 5) audio.one('air1', 0.25);
        if (i === 0) audio.one('ebrake', 0.8);
        phys.notch = i; updLever();
    }

    // ---- painel
    const lever = $('#lever');
    NOTCH.forEach((n, i) => { const e = document.createElement('span'); e.textContent = n; e.className = i === 0 ? 'e' : i < 6 ? 'b' : i > 6 ? 't' : ''; e.onclick = () => setNotch(i); lever.appendChild(e); });
    const lspans = [...lever.children];
    function updLever() { lspans.forEach((e, i) => e.classList.toggle('on', i === phys.notch)); $('#notch').textContent = NOTCH[phys.notch]; }
    updLever();
    // mostrador: 0–80 km/h em 270°
    { const g = $('#ticks'), ns = 'http://www.w3.org/2000/svg';
      for (let v = 0; v <= 80; v += 5) { const a = (-135 + v / 80 * 270) * Math.PI / 180, r1 = v % 10 ? 76 : 72, l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', 100 + Math.sin(a) * r1); l.setAttribute('y1', 100 - Math.cos(a) * r1); l.setAttribute('x2', 100 + Math.sin(a) * 82); l.setAttribute('y2', 100 - Math.cos(a) * 82);
        l.setAttribute('class', 'g-tick' + (v % 10 ? '' : ' major')); g.appendChild(l);
        if (v % 20 === 0) { const t = document.createElementNS(ns, 'text'); t.setAttribute('x', 100 + Math.sin(a) * 58); t.setAttribute('y', 100 - Math.cos(a) * 58); t.setAttribute('class', 'g-num'); t.textContent = v; g.appendChild(t); } } }
    const arc = v => { const a0 = -135 * Math.PI / 180, a1 = (-135 + Math.min(80, v) / 80 * 270) * Math.PI / 180, r = 88; const p = a => `${100 + Math.sin(a) * r} ${100 - Math.cos(a) * r}`; return `M ${p(a1)} A ${r} ${r} 0 ${(a1 - a0) > Math.PI ? 1 : 0} 1 ${p((-135 + 270) * Math.PI / 180)}`; };

    // ---- botões e teclas
    const segOn = (sel, attr, val) => document.querySelectorAll(sel + ' button').forEach(b => b.classList.toggle('on', b.dataset[attr] === val));
    function setCam(m) { cams.set(m); segOn('#camSeg', 'cam', m); toast('Vista: ' + MODE_NAME[m]); }
    document.querySelectorAll('#camSeg button').forEach(b => b.onclick = () => setCam(b.dataset.cam));
    document.querySelectorAll('#todSeg button').forEach(b => b.onclick = async () => { tod = b.dataset.t; try { localStorage.setItem('pc-tod', tod); } catch (e) { } segOn('#todSeg', 't', tod); await sky.set(tod); S.night = sky.night; });
    document.querySelectorAll('#qSeg button').forEach(b => b.onclick = () => { saveProfile(b.dataset.q); toast('Qualidade «' + PROFILES[b.dataset.q].name + '»: a recarregar…'); setTimeout(() => location.reload(), 600); });
    segOn('#camSeg', 'cam', 'cab'); segOn('#todSeg', 't', tod); segOn('#qSeg', 'q', qk);
    $('#bHelp').onclick = () => $('#help').showModal();
    $('#bSave').onclick = () => { try { localStorage.setItem('pc-save', JSON.stringify({ v: 1, pFront: S.pFront, dir: S.dir, flip: S.flip, clock: S.clock, served: [...S.served], tod, loop: S.loopAt ? S.loopAt.a : null, engine: phys.engine })); toast('Posição gravada.', 'good'); } catch (e) { toast('Não foi possível gravar.', 'warn'); } };
    $('#bLoad').onclick = () => {
        let o = null; try { o = JSON.parse(localStorage.getItem('pc-save') || 'null'); } catch (e) { }
        if (!o || !Number.isFinite(o.pFront)) return toast('Não há posição gravada.', 'warn');
        Object.assign(S, { pFront: o.pFront, dir: o.dir === -1 ? -1 : 1, flip: !!o.flip, v: 0, clock: o.clock || S.clock, served: new Set(o.served || []) });
        S.loopAt = o.loop == null ? null : LINES.find(L => !L.main && Math.abs(L.a - o.loop) < 1) || null;
        phys.v = 0; phys.notch = 6; if (o.engine) { phys.engine = true; phys.rpm = phys.rpmIdle; } updLever();
        toast('Posição recuperada.', 'good');
    };
    addEventListener('keydown', e => {
        if (e.target.closest && e.target.closest('dialog')) return;
        const k = e.key.toLowerCase(), code = e.code;
        audio.init().then(() => audio.resume());
        if (k === 'arrowup' || code === 'Numpad8' || k === '8') { setNotch(phys.notch + 1); e.preventDefault(); }
        else if (k === 'arrowdown' || code === 'Numpad2' || k === '2' && code !== 'Digit2') { setNotch(phys.notch - 1); e.preventDefault(); }
        else if (k === 'i') ignition();
        else if (k === 'e') doors();
        else if (k === ' ') { audio.horn(true); e.preventDefault(); }
        else if (k === 'r') reverse();
        else if (k === 'z') switchLoop();
        else if (k === 'c') setCam(MODES[(MODES.indexOf(cams.mode) + 1) % MODES.length]);
        else if (code === 'Digit1') setCam('cab'); else if (code === 'Digit2') setCam('ext'); else if (code === 'Digit3') setCam('cine');
        else if (k === 'p') { S.paused = !S.paused; toast(S.paused ? 'Pausa' : 'A continuar'); }
        else if (k === '?') $('#help').showModal();
    });
    addEventListener('keyup', e => { if (e.key === ' ') audio.horn(false); });
    canvas.addEventListener('pointerdown', () => audio.init().then(() => audio.resume()), { once: true });

    // ---- ciclo
    let fpsT = 0, fpsN = 0, lodT = 0, hudT = 0;
    const camPos = new pc.Vec3();
    app.on('update', dtR => {
        const dt = Math.min(0.1, dtR);
        // FPS medido pelo relógio (o dt do PlayCanvas vem limitado a 0,1 s)
        const now = performance.now(); fpsN++;
        if (!fpsT) fpsT = now;
        if (now - fpsT > 500) { $('#fps').textContent = `${Math.round(fpsN * 1000 / (now - fpsT))} FPS · ${Q.name} · ${device.deviceType === 'webgpu' ? 'WebGPU' : 'WebGL2'}`; fpsT = now; fpsN = 0; }
        if (!S.paused) {
            S.clock += dt;
            // marcha: dois subpassos
            const mid = S.pFront - S.dir * CSP;
            const grade = route.grade(mid), curv = route.curvature(S.pFront);
            for (let k = 0; k < 2; k++) phys.step(dt / 2, { grade, curv, dir: S.dir });
            S.v = phys.v;
            S.pFront += S.dir * S.v * dt; S.odo += Math.abs(S.v) * dt;
            // fim do troço exportado: para-choques virtuais
            const lo = route.p0 + 2 * CSP + 30, hi = route.p1 - 30;
            if (S.pFront > hi || S.pFront < lo) { S.pFront = Math.max(lo, Math.min(hi, S.pFront)); if (phys.v > 0.1) toast('Fim do troço exportado. Inverta a marcha (R).', 'warn'); phys.v = 0; S.v = 0; }
            // passou a agulha e saiu da via 2: volta à principal
            if (S.loopAt && S.dir * (S.pFront - (S.dir > 0 ? S.loopAt.b : S.loopAt.a)) > 2 * CSP + 5) S.loopAt = null;
            // portas: a automotora não arranca com portas abertas
            if (train.doorsOpen() && phys.traction > 0) { phys.notch = 6; updLever(); toast('Feche as portas antes de arrancar.', 'warn'); }
            // partida: deixa de estar parada no cais
            if (S.atStop && Math.abs(S.pFront - stopPos(S.atStop)) > 30) S.atStop = null;
        }
        train.update(dt, S);
        const cv = cams.update(dt, train, S);
        audio.update(dt, { v: S.v, rpm: phys.rpm, engine: phys.engine, curv: route.curvature(S.pFront), pAlong: S.odo, inside: cv.inside, camDist: cv.dist, compressor: phys.bc > 10 });
        // nível de detalhe: travessas e árvores longe da câmara desligadas
        lodT += dt;
        if (lodT > 0.4) {
            lodT = 0; camPos.copy(camE.getPosition());
            for (const c of chunks) if (c.sleepers) c.sleepers.enabled = c.center.distance(camPos) < Q.sleeperDist + 200;
            for (const g of trees) g.ent.enabled = g.center.distance(camPos) < Q.treeDist + 200;
            const night = sky.night > 0.2;
            ST.lampMat.emissiveIntensity = night ? 4 : 0; ST.lampMat.update();
            for (const l of lampLights) l.light.intensity = night && l.getPosition().distance(camPos) < 700 ? 2.2 : 0;
        }
        // painel
        hudT += dt;
        if (hudT > 0.08) {
            hudT = 0;
            const kmh = Math.abs(S.v) * 3.6;
            $('#spd').textContent = Math.round(kmh);
            $('#needle').setAttribute('transform', `rotate(${-135 + Math.min(85, kmh) / 80 * 270} 100 100)`);
            const lim = S.loopAt && S.pFront > S.loopAt.a - 60 && S.pFront < S.loopAt.b + 60 ? 30 : route.limit(S.pFront);
            $('#lim').textContent = lim;
            $('#limArc').setAttribute('d', arc(lim));
            $('.limit').classList.toggle('over', kmh > lim + 2);
            const ns = nextStop();
            $('#nxt').textContent = ns ? ns.n : '—';
            $('#nxtD').textContent = ns ? `${Math.max(0, Math.round(S.dir * (stopPos(ns) - S.pFront)))} m · cais ${platformSide(ns) < 0 ? 'à esquerda' : 'à direita'}` : 'Fim do troço';
            $('#bc').textContent = Math.round(phys.bc);
            $('#rpm').textContent = phys.engine ? Math.round(phys.rpm) : phys.engineT > 0 ? 'arranque' : 'desligado';
            $('#doors').textContent = train.doorsMoving() ? 'A mover' : train.doorsOpen() ? 'Abertas' : 'Fechadas';
            $('#clock').textContent = fHM(S.clock);
            $('#topLine').textContent = `Linha de Guimarães · UDD 9611 · ${S.dir > 0 ? 'para Vizela' : 'para Lordelo'}${S.loopAt ? ' · via 2' : ''}`;
        }
    });

    progress(1, 'Pronto.');
    setTimeout(() => $('#loading').classList.add('done'), 250);
    toast('Lordelo, 1985. Ligue o motor (I) e solte o travão (↑). Próxima paragem: Cuca.');
    window.__sim = { S, phys, train, route, cams, sky, setNotch, doors, ignition, reverse, switchLoop, setCam, Q, audio };
}

main().catch(e => { console.error(e); progress(0, 'Erro: ' + e.message); });
