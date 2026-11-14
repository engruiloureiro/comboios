// Estações e apeadeiros (posições e cais exportados do simulador), sinais, passagens de nível e casario.
// Volumes simplificados com texturas PBR reais (Poly Haven, CC0); o banco é um modelo glTF CC0 (painted_wooden_bench).
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { Geo, addRender, pbrMaterial, colorMaterial, canvasTexture, rng, add, mul, sub, cross, dot } from './gfx.js';
import { RAIL_X } from './track.js';

function quadN(g, a, b, c, d, N, uv) {
    if (dot(cross(sub(b, a), sub(d, a)), N) < 0) { [b, d] = [d, b]; if (uv) uv = [uv[0], uv[3], uv[2], uv[1]]; }
    g.quad(a, b, c, d, uv, null, N);
}

// caixa orientada pelo referencial da via em p (x lateral, z ao longo), em metros, com UV em metros
function box(g, route, p, x0, x1, y0, y1, l0, l1, baseY) {
    const fr = route.frame(p, false), R = fr.R, F = [fr.F[0], 0, fr.F[2]], U = [0, 1, 0];
    const C = [fr.C[0], baseY ?? fr.C[1], fr.C[2]];
    const P = (x, y, z) => add(add(add(C, mul(R, x)), mul(U, y)), mul(F, z));
    const w = x1 - x0, h = y1 - y0, l = l1 - l0;
    quadN(g, P(x0, y1, l0), P(x1, y1, l0), P(x1, y1, l1), P(x0, y1, l1), U, [[0, 0], [w, 0], [w, l], [0, l]]);
    quadN(g, P(x0, y0, l1), P(x1, y0, l1), P(x1, y1, l1), P(x0, y1, l1), F, [[0, 0], [w, 0], [w, h], [0, h]]);
    quadN(g, P(x0, y0, l0), P(x1, y0, l0), P(x1, y1, l0), P(x0, y1, l0), mul(F, -1), [[0, 0], [w, 0], [w, h], [0, h]]);
    quadN(g, P(x1, y0, l0), P(x1, y0, l1), P(x1, y1, l1), P(x1, y1, l0), R, [[0, 0], [l, 0], [l, h], [0, h]]);
    quadN(g, P(x0, y0, l0), P(x0, y0, l1), P(x0, y1, l1), P(x0, y1, l0), mul(R, -1), [[0, 0], [l, 0], [l, h], [0, h]]);
    return P;
}

// telhado de quatro águas
function hipRoof(g, P, x0, x1, l0, l1, y, rise, ov = 0.4) {
    const xa = x0 - ov, xb = x1 + ov, la = l0 - ov, lb = l1 + ov, ym = y + rise, xm = (x0 + x1) / 2, inset = Math.min((x1 - x0) / 2, (l1 - l0) / 2);
    const r0 = la + inset, r1 = lb - inset;
    const up = [0, 1, 0];
    const tri = (A, B, Cc) => { const N = cross(sub(B, A), sub(Cc, A)); if (N[1] < 0) g.tri(A, Cc, B, [[0, 0], [2, 0], [1, 2]]); else g.tri(A, B, Cc, [[0, 0], [2, 0], [1, 2]]); };
    const q = (A, B, C, D) => quadN(g, A, B, C, D, cross(sub(B, A), sub(D, A))[1] >= 0 ? cross(sub(B, A), sub(D, A)) : mul(cross(sub(B, A), sub(D, A)), -1), [[0, 0], [4, 0], [4, 3], [0, 3]]);
    q(P(xa, y, la), P(xa, y, lb), P(xm, ym, r1), P(xm, ym, r0));
    q(P(xb, y, lb), P(xb, y, la), P(xm, ym, r0), P(xm, ym, r1));
    tri(P(xa, y, la), P(xm, ym, r0), P(xb, y, la));
    tri(P(xb, y, lb), P(xm, ym, r1), P(xa, y, lb));
}

function nameBoard(device, name) {
    // placa de esmalte: letras brancas sobre azul, orla branca (estilo CP)
    return canvasTexture(device, 1024, 160, (x, w, h) => {
        x.fillStyle = '#1d3f8f'; x.fillRect(0, 0, w, h);
        x.strokeStyle = '#f2f2ee'; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24);
        x.fillStyle = '#f2f2ee'; x.textAlign = 'center'; x.textBaseline = 'middle';
        let fs = 92; x.font = `700 ${fs}px "Barlow Condensed", Arial, sans-serif`;
        while (x.measureText(name.toUpperCase()).width > w - 80 && fs > 30) { fs -= 4; x.font = `700 ${fs}px "Barlow Condensed", Arial, sans-serif`; }
        x.fillText(name.toUpperCase(), w / 2, h / 2 + 4);
    });
}

export async function buildStations(app, route, TF, root, sets, Q) {
    const device = app.graphicsDevice;
    const concrete = pbrMaterial(sets.concrete, { tile: 3, tint: [0.92, 0.9, 0.86] });
    const stucco = pbrMaterial(sets.stucco, { tile: 2, tint: [1, 0.98, 0.94] });
    const stuccoPink = pbrMaterial(sets.stucco, { tile: 2, tint: [1, 0.86, 0.76] });
    const stuccoYellow = pbrMaterial(sets.stucco, { tile: 2, tint: [1, 0.93, 0.7] });
    const roof = pbrMaterial(sets.roof, { tile: 3, cull: pc.CULLFACE_NONE });
    const granite = pbrMaterial(sets.concrete, { tile: 1.5, tint: [0.72, 0.7, 0.68], bump: 1.5 });
    const asphalt = pbrMaterial(sets.asphalt, { tile: 4 });
    const dark = colorMaterial([0.08, 0.09, 0.1], { gloss: 0.4 });
    const frameMat = colorMaterial([0.12, 0.2, 0.32], { gloss: 0.5, metal: 0.4 });
    const glassMat = colorMaterial([0.1, 0.13, 0.16], { gloss: 0.9 });
    const doorMat = colorMaterial([0.35, 0.18, 0.1], { gloss: 0.35 });
    const lampMat = colorMaterial([1, 0.92, 0.75], { emissive: [1, 0.85, 0.6, 0] });
    const lamps = [];
    // banco (glTF CC0)
    const bench = await new Promise(res => app.assets.loadFromUrl('assets/models/bench/painted_wooden_bench_1k.gltf', 'container', (e, a) => res(e ? null : a)));

    const G = { plat: new Geo(), edge: new Geo(), wall: new Geo(), wall2: new Geo(), wall3: new Geo(), roof: new Geo(), dark: new Geo(), frame: new Geo(), glass: new Geo(), door: new Geo(), road: new Geo(), gran: new Geo() };
    const r = rng(77);
    const avoid = [];   // zonas sem árvores

    for (const s of route.stations) {
        if (s.pos < route.p0 + 30 || s.pos > route.p1 - 30) continue;
        const ph = s.ph || 0.35, a = s.pa, b = s.pb;
        avoid.push({ a: a - 40, b: b + 40, o0: -40, o1: 40 });
        // cais: laje de betão com bordo de cantaria, seguindo a curva
        for (const pl of s.pl) {
            const e = pl[0], o = pl[1], sd = Math.sign(e), lo = Math.min(e, o), hi = Math.max(e, o);
            let prev = null;
            for (let p = a; p <= b + 1e-6; p += 2) {
                const q = Math.min(p, b), fr = route.frame(q, false);
                const at = (x, y) => [fr.C[0] + fr.R[0] * x, fr.C[1] + y, fr.C[2] + fr.R[2] * x];
                const cur = { top: [at(lo, ph), at(hi, ph)], edgeTop: [at(e, ph + 0.01), at(e + sd * 0.45, ph + 0.01)], side: [at(e, -0.3), at(e, ph)], back: [at(o, -0.3), at(o, ph)], q, U: [0, 1, 0], R: fr.R };
                if (prev) {
                    quadN(G.plat, prev.top[0], prev.top[1], cur.top[1], cur.top[0], [0, 1, 0], [[lo, prev.q], [hi, prev.q], [hi, cur.q], [lo, cur.q]]);
                    quadN(G.gran, prev.edgeTop[0], prev.edgeTop[1], cur.edgeTop[1], cur.edgeTop[0], [0, 1, 0], [[0, prev.q], [0.45, prev.q], [0.45, cur.q], [0, cur.q]]);
                    quadN(G.gran, prev.side[0], prev.side[1], cur.side[1], cur.side[0], mul(fr.R, -sd), [[prev.q, 0], [prev.q, 0.65], [cur.q, 0.65], [cur.q, 0]]);
                    quadN(G.gran, prev.back[0], prev.back[1], cur.back[1], cur.back[0], mul(fr.R, sd), [[prev.q, 0], [prev.q, 0.65], [cur.q, 0.65], [cur.q, 0]]);
                }
                prev = cur; if (q >= b) break;
            }
            // topos do cais
            for (const [p, sg] of [[a, -1], [b, 1]]) { const fr = route.frame(p, false); const at = (x, y) => [fr.C[0] + fr.R[0] * x, fr.C[1] + y, fr.C[2] + fr.R[2] * x]; quadN(G.gran, at(lo, -0.3), at(hi, -0.3), at(hi, ph), at(lo, ph), mul(fr.F, sg), [[0, 0], [hi - lo, 0], [hi - lo, 0.65], [0, 0.65]]); }
            // placas com o nome, candeeiros e bancos ao longo do cais
            const mid = (lo + hi) / 2, outer = o - sd * 0.6;
            const boardTex = nameBoard(device, s.n), bm = new pc.StandardMaterial(); bm.diffuseMap = boardTex; bm.emissiveMap = boardTex; bm.emissive = new pc.Color(0.15, 0.15, 0.15); bm.gloss = 0.6; bm.update();
            for (const dp of [0.22, 0.78]) {
                const p = a + (b - a) * dp, fr = route.frame(p, false), base = [fr.C[0] + fr.R[0] * outer, fr.C[1] + ph, fr.C[2] + fr.R[2] * outer];
                const ent = new pc.Entity('placa ' + s.n);
                ent.addComponent('render', { type: 'plane', material: bm, castShadows: true });
                ent.setPosition(base[0], base[1] + 2.6, base[2]);
                ent.setLocalScale(2.6, 1, 0.4);
                const yaw = Math.atan2(fr.R[0], fr.R[2]) * 180 / Math.PI;
                ent.setEulerAngles(90, yaw + (sd > 0 ? 180 : 0), 0);
                root.addChild(ent);
                const pole = (x) => { const P0 = add(base, mul([fr.F[0], 0, fr.F[2]], x)); const P = (dx, y, dz) => [P0[0] + dx, P0[1] + y, P0[2] + dz]; const w = 0.04; quadN(G.dark, P(-w, 0, -w), P(w, 0, -w), P(w, 2.4, -w), P(-w, 2.4, -w), [0, 0, -1]); quadN(G.dark, P(-w, 0, w), P(w, 0, w), P(w, 2.4, w), P(-w, 2.4, w), [0, 0, 1]); quadN(G.dark, P(-w, 0, -w), P(-w, 0, w), P(-w, 2.4, w), P(-w, 2.4, -w), [-1, 0, 0]); quadN(G.dark, P(w, 0, -w), P(w, 0, w), P(w, 2.4, w), P(w, 2.4, -w), [1, 0, 0]); };
                pole(-1.2); pole(1.2);
            }
            for (let p = a + 12; p < b - 8; p += 24) {
                const fr = route.frame(p, false), P = [fr.C[0] + fr.R[0] * outer, fr.C[1] + ph, fr.C[2] + fr.R[2] * outer];
                // candeeiro de coluna com lanterna
                const Pp = (dx, y, dz) => [P[0] + dx, P[1] + y, P[2] + dz], w = 0.06;
                for (const [n, a1, b1] of [[[0, 0, -1], [-w, -w], [w, -w]], [[0, 0, 1], [-w, w], [w, w]], [[-1, 0, 0], [-w, -w], [-w, w]], [[1, 0, 0], [w, -w], [w, w]]])
                    quadN(G.dark, Pp(a1[0], 0, a1[1]), Pp(b1[0], 0, b1[1]), Pp(b1[0], 4.2, b1[1]), Pp(a1[0], 4.2, a1[1]), n);
                const lamp = new pc.Entity('lanterna'); lamp.addComponent('render', { type: 'sphere', material: lampMat, castShadows: false });
                lamp.setPosition(P[0], P[1] + 4.3, P[2]); lamp.setLocalScale(0.32, 0.4, 0.32); root.addChild(lamp);
                lamps.push({ pos: new pc.Vec3(P[0], P[1] + 4.1, P[2]) });
                if (bench && Math.abs(hi - lo) > 2.6) {
                    const be = bench.resource.instantiateRenderEntity({ castShadows: true });
                    const bp = add(P, mul([fr.F[0], 0, fr.F[2]], 6));
                    be.setPosition(bp[0], bp[1], bp[2]);
                    be.setEulerAngles(0, Math.atan2(fr.R[0], fr.R[2]) * 180 / Math.PI + (sd > 0 ? 180 : 0), 0);
                    root.addChild(be);
                }
            }
        }
        // edifício (estações) ou abrigo (apeadeiros), do lado do primeiro cais
        const pl0 = s.pl[0], sd = Math.sign(pl0[0]), outer = Math.abs(pl0[1]);
        const pb = s.bc ?? s.pos, baseY = route.frame(pb, false).C[1] + ph;
        if (s.ty === 'est') {
            const x0 = sd > 0 ? outer + 0.5 : -outer - 0.5 - 8, x1 = x0 + 8, l0 = -9, l1 = 9, H = 6.4;
            const P = box(G.wall, route, pb, x0, x1, -0.4, H, l0, l1, baseY);
            box(G.gran, route, pb, x0 - 0.06, x1 + 0.06, -0.4, 0.7, l0 - 0.06, l1 + 0.06, baseY);   // soco de granito
            hipRoof(G.roof, P, x0, x1, l0, l1, H, 2.2, 0.5);
            // portas e janelas do lado do cais
            const face = sd > 0 ? x0 - 0.02 : x1 + 0.02, nrm = sd > 0 ? -1 : 1;
            for (let z = l0 + 1.6, k = 0; z < l1 - 1; z += 2.6, k++) {
                const door = k % 2 === 0, y0 = door ? 0.1 : 1.0, y1 = door ? 2.6 : 2.5;
                const A = P(face, y0, z - 0.6), B = P(face, y0, z + 0.6), C = P(face, y1, z + 0.6), D = P(face, y1, z - 0.6);
                const fr = route.frame(pb, false), N = mul(fr.R, nrm);
                const f3 = face + nrm * 0.03, Q3 = (y, z) => P(f3, y, z);
                quadN(door ? G.door : G.glass, Q3(y0, z - 0.6), Q3(y0, z + 0.6), Q3(y1, z + 0.6), Q3(y1, z - 0.6), N);
                const f2 = face + nrm * 0.01, A2 = P(f2, y0 - 0.12, z - 0.75), B2 = P(f2, y0 - 0.12, z + 0.75), C2 = P(f2, y1 + 0.15, z + 0.75), D2 = P(f2, y1 + 0.15, z - 0.75);
                quadN(G.gran, A2, B2, C2, D2, N);
                // janelas do primeiro andar
                const A3 = Q3(3.6, z - 0.55), B3 = Q3(3.6, z + 0.55), C3 = Q3(5.3, z + 0.55), D3 = Q3(5.3, z - 0.55);
                quadN(G.gran, P(f2, 3.45, z - 0.7), P(f2, 3.45, z + 0.7), P(f2, 5.45, z + 0.7), P(f2, 5.45, z - 0.7), N);
                quadN(G.glass, A3, B3, C3, D3, N);
            }
            avoid.push({ a: pb - 30, b: pb + 30, o0: sd > 0 ? 0 : -30, o1: sd > 0 ? 30 : 0 });
        } else {
            const x0 = sd > 0 ? outer - 2.2 : -outer + 0.2, x1 = x0 + 2.0, l0 = -2.5, l1 = 2.5;
            box(G.wall, route, pb, sd > 0 ? x1 - 0.2 : x0, sd > 0 ? x1 : x0 + 0.2, 0, 2.4, l0, l1, baseY);
            const P = box(G.frame, route, pb, x0, x1, 2.4, 2.5, l0 - 0.2, l1 + 0.2, baseY);
            for (const z of [l0, l1]) box(G.frame, route, pb, sd > 0 ? x0 + 0.1 : x1 - 0.2, sd > 0 ? x0 + 0.2 : x1 - 0.1, 0, 2.4, z - 0.05, z + 0.05, baseY);
        }
    }

    // passagens de nível: estrada de asfalto e cancelas brancas e vermelhas
    for (const q of route.pn) {
        const p = q.pos, fr = route.frame(p, false), F = [fr.F[0], 0, fr.F[2]];
        avoid.push({ a: p - 12, b: p + 12, o0: -200, o1: 200 });
        for (let k = -15; k < 15; k++) {
            const x0 = k * 6, x1 = x0 + 6;
            const at = (x, z) => { const P = add(add(fr.C, mul(fr.R, x)), mul(F, z)); P[1] = Math.abs(x) < 3 ? fr.C[1] + 0.33 : TFy(TF, p + z, x) + 0.06; return P; };
            quadN(G.road, at(x0, -3), at(x1, -3), at(x1, 3), at(x0, 3), [0, 1, 0], [[x0, -3], [x1, -3], [x1, 3], [x0, 3]]);
        }
        for (const sg of [-1, 1]) {
            const base = add(add(fr.C, mul(fr.R, sg * 4.2)), mul(F, sg * 3.6));
            const arm = new pc.Entity('cancela');
            arm.addComponent('render', { type: 'box', material: colorMaterial([0.9, 0.9, 0.88], { gloss: 0.5 }) });
            arm.setPosition(base[0], fr.C[1] + 1.0, base[2]); arm.setLocalScale(0.08, 0.08, 6);
            arm.setEulerAngles(0, Math.atan2(F[0], F[2]) * 180 / Math.PI, 0); root.addChild(arm);
        }
    }

    // sinais luminosos (posições exportadas; o encravamento ainda não foi migrado: mostram via livre)
    const sigOn = colorMaterial([0.1, 1, 0.3], { emissive: [0.1, 1, 0.3, 3] }), sigOff = colorMaterial([0.08, 0.08, 0.08], { gloss: 0.6 });
    for (const g of route.sig) {
        const fr = route.frame(g.p, false), x = g.d === 'F' ? -2.9 : 2.9;
        const P = [fr.C[0] + fr.R[0] * x, fr.C[1], fr.C[2] + fr.R[2] * x];
        const m = new pc.Entity('sinal'); m.addComponent('render', { type: 'cylinder', material: dark }); m.setPosition(P[0], P[1] + 2.2, P[2]); m.setLocalScale(0.12, 4.4, 0.12); root.addChild(m);
        const head = new pc.Entity('cabeça'); head.addComponent('render', { type: 'box', material: dark }); head.setPosition(P[0], P[1] + 4.6, P[2]); head.setLocalScale(0.42, 1.1, 0.25);
        head.setEulerAngles(0, Math.atan2(fr.F[0], fr.F[2]) * 180 / Math.PI, 0); root.addChild(head);
        const lens = new pc.Entity('luz'); lens.addComponent('render', { type: 'sphere', material: g.k === 'av' ? colorMaterial([1, 0.8, 0.1], { emissive: [1, 0.75, 0.1, 3] }) : sigOn });
        const dir = g.d === 'F' ? -1 : 1, L = add(P, mul([fr.F[0], 0, fr.F[2]], 0.14 * dir));
        lens.setPosition(L[0], P[1] + 4.85, L[2]); lens.setLocalScale(0.16, 0.16, 0.16); root.addChild(lens);
    }

    // casario do Minho: casas de 1–2 pisos rebocadas, telhado de quatro águas, junto às estações e às estradas
    const houseMats = [G.wall, G.wall2, G.wall3];
    for (let k = 0; k < Q.houses; k++) {
        const p = route.p0 + 60 + r() * (route.p1 - route.p0 - 120), sd = r() < 0.5 ? -1 : 1, o = sd * (22 + r() * 110);
        const nearSt = route.stations.some(s => Math.abs(s.pos - p) < 450);
        if (!nearSt && r() < 0.55) continue;
        if (avoid.some(z => p > z.a && p < z.b && o > z.o0 && o < z.o1)) continue;
        if (route.pn.some(q => Math.abs(q.pos - p) < 14)) continue;
        const w = 7 + r() * 5, d = 7 + r() * 3, fl = r() < 0.6 ? 2 : 1, H = fl * 3 + 0.4;
        const y = TFy(TF, p, o);
        const g = houseMats[k % 3];
        const P = box(g, route, p, o - w / 2, o + w / 2, -1, H, -d / 2, d / 2, y);
        box(G.gran, route, p, o - w / 2 - 0.04, o + w / 2 + 0.04, -1, 0.5, -d / 2 - 0.04, d / 2 + 0.04, y);
        hipRoof(G.roof, P, o - w / 2, o + w / 2, -d / 2, d / 2, H, 1.8 + r() * 0.6, 0.45);
        // janelas e porta na fachada virada para a via
        const face = sd > 0 ? o - w / 2 - 0.02 : o + w / 2 + 0.02, fr = route.frame(p, false), N = mul(fr.R, -sd);
        for (let f = 0; f < fl; f++) for (let z = -d / 2 + 1.3; z < d / 2 - 1; z += 2.1) {
            const y0 = 0.9 + f * 3, door = f === 0 && Math.abs(z) < 1.1;
            quadN(door ? G.door : G.glass, P(face, door ? 0 : y0, z - 0.5), P(face, door ? 0 : y0, z + 0.5), P(face, y0 + 1.4, z + 0.5), P(face, y0 + 1.4, z - 0.5), N);
        }
        avoid.push({ a: p - d, b: p + d, o0: o - w, o1: o + w });
    }

    const add2 = (g, m, cast = true) => addRender(app, root, g.mesh(device), m, { castShadows: cast });
    add2(G.plat, concrete, false); add2(G.gran, granite); add2(G.wall, stucco); add2(G.wall2, stuccoPink); add2(G.wall3, stuccoYellow);
    add2(G.roof, roof); add2(G.dark, dark); add2(G.frame, frameMat); add2(G.glass, glassMat, false); add2(G.door, doorMat); add2(G.road, asphalt, false);
    return { avoid: (p, o) => avoid.some(z => p > z.a && p < z.b && o > z.o0 && o < z.o1) || Math.abs(o) < 9, lamps, lampMat };
}

function TFy(TF, p, o) { return TF.pos(p, o)[1]; }
