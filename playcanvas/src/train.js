// UDD CP 9600 com o modelo original do pacote CP_9600_RW (BSD-3), o mesmo do simulador: motora e reboque (a mesma malha;
// cada veículo com a cabina para fora). Bogies orientados pela via no seu ponto, rodados a girar, caixa apoiada nos dois pivôs
// e inclinada pela escala, portas de fole com as animações originais (.IA), faróis, farolins e luz interior.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { add, sub, mul, cross, norm, dot } from './gfx.js';
import { RAIL_TOP } from './track.js';

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

export class Train {
    constructor(app, route) { this.app = app; this.route = route; this.cars = []; this.dist = 0; this.doorF = [[0, 0], [0, 0]]; this.doorT = [[0, 0], [0, 0]]; }

    async load(Q) {
        const app = this.app;
        const [asset, AN] = await Promise.all([
            new Promise((res, rej) => app.assets.loadFromUrl('../cp9600/cp9600_motora.glb', 'container', (e, a) => e ? rej(e) : res(a))),
            fetch('../cp9600/portas.json').then(r => r.json())
        ]);
        this.AN = AN;
        for (let k = 0; k < 2; k++) {
            const root = asset.resource.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
            root.name = k === 0 ? 'motora' : 'reboque';
            app.root.addChild(root);
            const car = { root, nodes: {}, glow: [], k };
            root.forEach(e => { if (e !== root) car.nodes[e.name] = e; });
            // posições de repouso dos bogies, rodados e portas (para as transformações próprias)
            car.rest = {};
            for (const [n, e] of Object.entries(car.nodes)) car.rest[n] = e.getLocalPosition().clone();
            this._materials(car, Q);
            // faróis (do cp9600.json: dois em baixo e um em cima, ao lado da cabina) e luz interior
            car.spots = [];
            for (const [x, y, z] of [[0.957, 1.467, 9.328], [-0.951, 1.467, 9.328]]) {
                const s = new pc.Entity('farol');
                s.addComponent('light', { type: 'spot', color: new pc.Color(1, 0.94, 0.82), intensity: 0, range: 140, innerConeAngle: 9, outerConeAngle: 24, castShadows: false });
                s.setLocalPosition(x, y, -z); s.setLocalEulerAngles(90, 0, 0); root.addChild(s); car.spots.push(s);
            }
            car.cabin = [];
            for (const z of [-4, 3]) {
                const l = new pc.Entity('luz interior'); l.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.86, 0.62), intensity: 0, range: 7, castShadows: false });
                l.setLocalPosition(0, 2.4, z); root.addChild(l); car.cabin.push(l);
            }
            this.cars.push(car);
        }
    }

    _materials(car, Q) {
        car.root.findComponents('render').forEach(rc => rc.meshInstances.forEach(mi => {
            const m = mi.material; if (!m || m._tuned === car.k + 1) return;
            const n = m.name || '';
            if (/Glow/.test(n)) {
                // farolins e faróis: material próprio de cada veículo (acendem conforme o sentido)
                const c = m.clone(); c.name = n; c.emissive = /Red/.test(n) ? new pc.Color(1, 0.08, 0.04) : new pc.Color(1, 0.95, 0.85); c.emissiveIntensity = 0; c.update();
                mi.material = c; car.glow.push({ mat: c, red: /Red/.test(n) }); return;
            }
            if (m._tuned) return;
            m._tuned = 1;
            if (/Glass/.test(n)) { m.blendType = pc.BLEND_NORMAL; m.opacity = 0.28; m.depthWrite = false; m.useMetalness = true; m.metalness = 0; m.gloss = 0.95; m.specularityFactor = 1; m.cull = pc.CULLFACE_NONE; }
            else if (/Shinny_Metal/.test(n)) { m.useMetalness = true; m.metalness = 1; m.gloss = 0.72; }
            else if (/Rubber/.test(n)) { m.useMetalness = true; m.metalness = 0; m.gloss = 0.15; }
            else if (/main|extras|^Red$|^White$/.test(n)) { m.useMetalness = true; m.metalness = 0; m.gloss = 0.55; if (Q.clearCoat) { m.clearCoat = 0.25; m.clearCoatGloss = 0.82; } }
            else if (/bo$|Bogey|engate|underside/.test(n)) { m.useMetalness = true; m.metalness = 0.35; m.gloss = 0.3; }
            else if (/interior|bancos/.test(n)) { m.useMetalness = true; m.metalness = 0; m.gloss = 0.35; }
            m.update();
        }));
    }

    // posição: pFront = engate da frente da composição (cabina da motora), dir = +1 a caminho de Vizela
    update(dt, s) {
        const route = this.route;
        this._last = s;
        this.dist += s.v * s.dir * dt;      // caminho percorrido no sentido +p (com sinal)
        const ang = this.dist / WR;
        // via em que circula: s.off(p) = desvio lateral da via 2 nas estações de cruzamento (0 na principal)
        const fr = p => {
            const f = route.frame(p), o = s.off ? s.off(p) : 0;
            if (o) { const f0 = route.frame(p, false); f.C = [f.C[0] + f0.R[0] * o, f.C[1], f.C[2] + f0.R[2] * o]; }
            return f;
        };
        for (const car of this.cars) {
            // depois de inverter a marcha (s.flip) o reboque vai à frente: cada veículo mantém a cabina para fora
            const k = car.k, pos = s.flip ? 1 - k : k, sgn = pos === 0 ? s.dir : -s.dir, pc_ = s.pFront - s.dir * (pos * CSP + CSP / 2);
            car.lead = pos === 0; car.pc = pc_;
            const pa = pc_ + sgn * FB, pb = pc_ - sgn * RB;
            const fa = fr(pa), fb = fr(pb);
            const A = add(fa.C, mul(fa.U, RAIL_TOP)), B = add(fb.C, mul(fb.U, RAIL_TOP));
            const F = norm(sub(A, B)), Ua = norm(add(fa.U, fb.U)), R = norm(cross(F, Ua)), U = cross(R, F);
            const O = sub(A, mul(F, FB));
            setWorld(car.root, O, R, U, F);
            car.F = F; car.O = O; car.R = R; car.U = U;
            // bogies e rodados
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
                    const c = Math.cos(ang * sgn), sn = Math.sin(ang * sgn);
                    // rotação em torno do eixo do rodado (x local)
                    const U2 = add(mul(Ub, c), mul(Fb, sn)), F2 = sub(mul(Fb, c), mul(Ub, sn));
                    setWorld(wh, Pw, Rb, U2, F2);
                }
            }
            // portas: lado direito (D) e esquerdo (E) do veículo
            for (const [side, ids] of [[1, ['D02', 'D03']], [0, ['E02', 'E03']]]) {
                const tgt = this.doorT[k][side];
                let f = this.doorF[k][side];
                f += Math.sign(tgt - f) * Math.min(Math.abs(tgt - f), dt / 1.07);
                if (f !== this.doorF[k][side] || !car._doorInit) {
                    this.doorF[k][side] = f;
                    for (const id of ids) {
                        const W = doorMats(this.AN, id, f);
                        for (const nm in W) {
                            const e = car.nodes[nm]; if (!e) continue;
                            const m = mirror(W[nm]); tmpM.set(m);
                            const pos = tmpM.getTranslation(); tmpQ.setFromMat4(tmpM);
                            e.setLocalPosition(pos); e.setLocalRotation(tmpQ);
                        }
                    }
                }
            }
            car._doorInit = true;
            // luzes: faróis na frente da composição, farolins atrás
            const on = s.lights !== false;
            for (const g of car.glow) { g.mat.emissiveIntensity = !on ? 0 : g.red ? (car.lead ? 0 : 2.2) : (car.lead ? 3.5 : 0); g.mat.update(); }
            for (const sp of car.spots) sp.light.intensity = car.lead && on ? (s.night > 0.2 ? 6 : 0) : 0;
            for (const l of car.cabin) l.light.intensity = s.night > 0.2 ? 0.8 : 0;
        }
    }

    // portas do lado do cais: platformSide = lado do cais na via (−1 esquerda, +1 direita de quem segue para +p)
    openDoors(platformSide, open) {
        for (const car of this.cars) {
            if (!car.R) continue;
            const fr = this.route.frame(car.pc, false);
            const side = dot(car.R, fr.R) * platformSide > 0 ? 1 : 0;   // 1 = portas D (direita do veículo), 0 = E
            this.doorT[car.k][side] = open ? 1 : 0;
            if (!open) this.doorT[car.k][1 - side] = 0;
        }
    }
    doorsMoving() { return this.doorF.some((f, k) => f.some((v, i) => Math.abs(v - this.doorT[k][i]) > 1e-3)); }
    doorsOpen() { return this.doorF.some(f => f.some(v => v > 0.02)); }
}
