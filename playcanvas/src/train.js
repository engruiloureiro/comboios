// UDD CP 9600 com o modelo original do pacote CP_9600_RW (BSD-3), o mesmo do simulador: motora e reboque (a mesma malha;
// os veículos alternam o sentido, cada UDD com as cabinas para fora). Bogies orientados pela via no seu ponto, rodados a girar,
// caixa apoiada nos dois pivôs e inclinada pela escala, portas de fole com as animações originais (.IA), faróis e farolins.
// A posição, a via, as portas e as luzes de cada composição vêm do estado do simulador (a do jogador e as outras).
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { add, sub, mul, cross, norm } from './gfx.js';
import { RAIL_TOP } from './route.js';

export const CSP = 18.906;          // distância entre engates
const FB = 6.059, RB = 6.519;       // pivô do bogie da frente (lado da cabina) e de trás, ao centro do modelo
const WR = 0.399;                   // raio da roda

// --- animação das portas (igual ao simulador: quaterniões em convenção Direct3D, espaço do modelo com z espelhado)
function qm(p, q) {
    let [x, y, z, w] = q; x = -x; y = -y; z = -z;
    return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
        2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, p[0], p[1], p[2], 1];
}
function m4c(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function doorMats(AN, id, f) {
    const D = AN[id], n = D.frames, fi = Math.min(1, Math.max(0, f)) * (n - 1), i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), t = fi - i0;
    let W = null; const out = {};
    for (let k = 1; k <= 3; k++) {
        const nm = '1_1000_porta' + id + 'part0' + k, tr = D.parts[nm], p0 = tr.pos[i0], p1 = tr.pos[i1], q0 = tr.rot[i0], q1 = tr.rot[i1];
        const d = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3], s = d < 0 ? -1 : 1;
        const q = [0, 1, 2, 3].map(j => q0[j] * (1 - t) + s * q1[j] * t), ql = Math.hypot(...q);
        const L = qm([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t], q.map(v => v / ql));
        W = W ? m4c(W, L) : L; out[nm] = W;
    }
    return out;
}
// S·W·S (S = diag(1,1,−1,1)): do espaço do simulador (z espelhado) para o do glTF
function mirror(W) { const S = [1, 1, -1, 1], o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = W[c * 4 + r] * S[r] * S[c]; return o; }

const tmpM = new pc.Mat4(), tmpQ = new pc.Quat();
function setWorld(ent, P, R, U, F) {
    // eixos locais: x = R, y = U, z = −F (a cabina do modelo glTF está em −z)
    const d = tmpM.data;
    d[0] = R[0]; d[1] = R[1]; d[2] = R[2]; d[3] = 0;
    d[4] = U[0]; d[5] = U[1]; d[6] = U[2]; d[7] = 0;
    d[8] = -F[0]; d[9] = -F[1]; d[10] = -F[2]; d[11] = 0;
    d[12] = P[0]; d[13] = P[1]; d[14] = P[2]; d[15] = 1;
    tmpQ.setFromMat4(tmpM);
    ent.setPosition(P[0], P[1], P[2]);
    ent.setRotation(tmpQ);
}

export class Trains {
    constructor(app, route, Q) { this.app = app; this.route = route; this.Q = Q; this.units = []; this.tuned = new Set(); }

    async load() {
        const app = this.app;
        const [asset, AN] = await Promise.all([
            new Promise((res, rej) => app.assets.loadFromUrl('../cp9600/cp9600_motora.glb', 'container', (e, a) => e ? rej(e) : res(a))),
            fetch('../cp9600/portas.json').then(r => r.json())
        ]);
        this.asset = asset; this.AN = AN;
    }

    // um veículo: nós do modelo, posições de repouso, farolins próprios e (só na composição do jogador) faróis e luz interior
    _car(player) {
        const root = this.asset.resource.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
        this.app.root.addChild(root);
        const car = { root, nodes: {}, glow: [], rest: {}, doorF: [-1, -1], spots: [], cabin: [] };
        root.forEach(e => { if (e !== root) car.nodes[e.name] = e; });
        for (const [n, e] of Object.entries(car.nodes)) car.rest[n] = e.getLocalPosition().clone();
        root.findComponents('render').forEach(rc => rc.meshInstances.forEach(mi => {
            const m = mi.material; if (!m) return;
            const n = m.name || '';
            if (/Glow/.test(n)) {
                const c = m.clone(); c.name = n; c.emissive = /Red/.test(n) ? new pc.Color(1, 0.08, 0.04) : new pc.Color(1, 0.95, 0.85); c.emissiveIntensity = 0; c.update();
                mi.material = c; car.glow.push({ mat: c, red: /Red/.test(n), v: 0 }); return;
            }
            if (this.tuned.has(m)) return;
            this.tuned.add(m);
            if (/Glass/.test(n)) { m.blendType = pc.BLEND_NORMAL; m.opacity = 0.28; m.depthWrite = false; m.useMetalness = true; m.metalness = 0; m.gloss = 0.95; m.specularityFactor = 1; m.cull = pc.CULLFACE_NONE; }
            else if (/Shinny_Metal/.test(n)) { m.useMetalness = true; m.metalness = 1; m.gloss = 0.72; }
            else if (/Rubber/.test(n)) { m.useMetalness = true; m.metalness = 0; m.gloss = 0.15; }
            else if (/main|extras|^Red$|^White$/.test(n)) { m.useMetalness = true; m.metalness = 0; m.gloss = 0.55; if (this.Q.clearCoat) { m.clearCoat = 0.25; m.clearCoatGloss = 0.82; } }
            else if (/bo$|Bogey|engate|underside/.test(n)) { m.useMetalness = true; m.metalness = 0.35; m.gloss = 0.3; }
            else if (/interior|bancos/.test(n)) { m.useMetalness = true; m.metalness = 0; m.gloss = 0.35; }
            m.update();
        }));
        if (player) {
            for (const [x, y, z] of [[0.957, 1.467, 9.328], [-0.951, 1.467, 9.328]]) {
                const s = new pc.Entity('farol');
                s.addComponent('light', { type: 'spot', color: new pc.Color(1, 0.94, 0.82), intensity: 0, range: 140, innerConeAngle: 9, outerConeAngle: 24, castShadows: false });
                s.setLocalPosition(x, y, -z); s.setLocalEulerAngles(90, 0, 0); root.addChild(s); car.spots.push(s);
            }
            for (const z of [-4, 3]) {
                const l = new pc.Entity('luz interior'); l.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.86, 0.62), intensity: 0, range: 7, castShadows: false });
                l.setLocalPosition(0, 2.4, z); root.addChild(l); car.cabin.push(l);
            }
        }
        return car;
    }

    // uma composição (a do jogador ou outra); os veículos são criados quando fazem falta
    unit(player = false) { const u = new Unit(this, player); this.units.push(u); return u; }
}

export class Unit {
    constructor(T, player) { this.T = T; this.player = player; this.cars = []; this.on = false; }
    hide() { if (this.on) { this.on = false; for (const c of this.cars) c.root.enabled = false; } }

    // s: { front, dir, nc, off(p), od: [0..1, 0..1], head, tail, night }
    //   front = engate da frente (m ao longo da linha), dir = ±1, off(p) = desvio lateral da via em que circula,
    //   od = abertura das portas dos dois lados (como S.dOpen do simulador), head/tail = faróis à frente e farolins atrás
    update(s) {
        const T = this.T, route = T.route;
        while (this.cars.length < s.nc) this.cars.push(T._car(this.player));
        this.on = true;
        const fr = p => {
            const f = route.frame(p), o = s.off ? s.off(p) || 0 : 0;
            if (o) { const f0 = route.frame(p, false); f.C = [f.C[0] + f0.R[0] * o, f.C[1], f.C[2] + f0.R[2] * o]; }
            return f;
        };
        this.cars.forEach((car, k) => {
            if (k >= s.nc) { car.root.enabled = false; return; }
            car.root.enabled = true;
            // como no simulador: os veículos alternam o sentido (k par com a cabina para a frente)
            const rev = k % 2 ? -1 : 1, sgn = s.dir * rev, pc_ = s.front - s.dir * (k * CSP + CSP / 2);
            car.lead = k === 0; car.pc = pc_;
            const pa = pc_ + sgn * FB, pb = pc_ - sgn * RB;
            const fa = fr(pa), fb = fr(pb);
            const A = add(fa.C, mul(fa.U, RAIL_TOP)), B = add(fb.C, mul(fb.U, RAIL_TOP));
            const F = norm(sub(A, B)), Ua = norm(add(fa.U, fb.U)), R = norm(cross(F, Ua)), U = cross(R, F);
            const O = sub(A, mul(F, FB));
            setWorld(car.root, O, R, U, F);
            car.F = F; car.O = O; car.R = R; car.U = U;
            const ang = pc_ / WR * sgn;      // os rodados giram com o caminho percorrido
            for (const [bn, pp] of [['1_1000_bo01', pa], ['1_1000_bo02', pb]]) {
                const bg = car.nodes[bn]; if (!bg) continue;
                const rest = car.rest[bn], fp = fr(pp);
                const P1 = fr(pp + sgn * 0.6).C, P0 = fr(pp - sgn * 0.6).C;
                const Fb = norm(sub(P1, P0)), Rb = norm(cross(Fb, fp.U)), Ub = cross(Rb, Fb);
                const Pb = add(add(fp.C, mul(fp.U, RAIL_TOP)), mul(Ub, rest.y));
                setWorld(bg, Pb, Rb, Ub, Fb);
                for (const w of ['wh01', 'wh02']) {
                    const wn = bn + w, wh = car.nodes[wn]; if (!wh) continue;
                    const wr = car.rest[wn], dy = wr.y - rest.y, dz = wr.z - rest.z;
                    const Pw = add(add(Pb, mul(Ub, dy)), mul(Fb, -dz));
                    const c = Math.cos(ang), sn = Math.sin(ang);
                    const U2 = add(mul(Ub, c), mul(Fb, sn)), F2 = sub(mul(Fb, c), mul(Ub, sn));
                    setWorld(wh, Pw, Rb, U2, F2);
                }
            }
            // portas: od[0] é o lado esquerdo (E) e od[1] o direito (D) dos veículos virados para a frente; nos outros troca
            const od = s.od ? (rev > 0 ? s.od : [s.od[1], s.od[0]]) : [0, 0];
            for (const [side, ids] of [[0, ['E02', 'E03']], [1, ['D02', 'D03']]]) {
                const f = od[side] || 0;
                if (Math.abs(f - car.doorF[side]) < 1e-4) continue;
                car.doorF[side] = f;
                for (const id of ids) {
                    const W = doorMats(T.AN, id, f);
                    for (const nm in W) {
                        const e = car.nodes[nm]; if (!e) continue;
                        tmpM.set(mirror(W[nm]));
                        tmpQ.setFromMat4(tmpM);
                        e.setLocalPosition(tmpM.getTranslation()); e.setLocalRotation(tmpQ);
                    }
                }
            }
            // luzes: faróis brancos no primeiro veículo, farolins vermelhos no último
            const white = k === 0 ? (s.head ? 3.5 : 0) : 0, red = k === s.nc - 1 ? (s.tail ? 2.2 : 0) : 0;
            for (const g of car.glow) { const v = g.red ? red : white; if (v !== g.v) { g.v = v; g.mat.emissiveIntensity = v; g.mat.update(); } }
            for (const sp of car.spots) sp.light.intensity = k === 0 && s.head && s.night > 0.2 ? 6 : 0;
            for (const l of car.cabin) l.light.intensity = s.night > 0.2 ? 0.8 : 0;
        });
    }
}
