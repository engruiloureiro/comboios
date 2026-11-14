// Via: carris (perfil de carril extrudido), travessas de madeira e balastro, por troços de 400 m (recorte e nível de detalhe)
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { Geo, addRender, pbrMaterial, colorMaterial, add, mul, dot, cross, sub } from './gfx.js';

// meia bitola ao centro do boleto: via métrica (1000 mm entre faces internas + 2 × 30 mm)
export const RAIL_X = 0.53;
// cota do topo do carril acima da cota da via (a automotora assenta aqui, como no simulador)
export const RAIL_TOP = 0.36;
// perfil do carril (x lateral, y altura), sentido anti-horário; a aresta 6–7 é o topo do boleto
const PROFILE = [[-0.055, 0.22], [0.055, 0.22], [0.055, 0.234], [0.009, 0.25], [0.009, 0.322], [0.03, 0.334], [0.03, 0.36],
    [-0.03, 0.36], [-0.03, 0.334], [-0.009, 0.322], [-0.009, 0.25], [-0.055, 0.234]];
const CHUNK = 400;

// quadrilátero com a face virada para N
function quadN(g, a, b, c, d, N, uv) {
    if (dot(cross(sub(b, a), sub(d, a)), N) < 0) { [b, d] = [d, b]; if (uv) uv = [uv[0], uv[3], uv[2], uv[1]]; }
    g.quad(a, b, c, d, uv, null, N);
}

export async function buildTrack(app, route, root, mats) {
    const device = app.graphicsDevice;
    const lines = route.lines();
    const chunks = [];
    const at = (fr, x, y) => add(add(fr.C, mul(fr.R, x)), mul(fr.U, y));
    for (let a = route.p0; a < route.p1; a += CHUNK) {
        const b = Math.min(route.p1, a + CHUNK);
        const ent = new pc.Entity('via ' + a);
        root.addChild(ent);
        const head = new Geo(), body = new Geo(), sleep = new Geo(), bal = new Geo();
        // --- carris
        const ds = 2;
        for (const L of lines) {
            const la = Math.max(a, L.a), lb = Math.min(b, L.b);
            if (lb <= la) continue;
            for (const side of [-1, 1]) {
                let prev = null;
                for (let p = la; p <= lb + 1e-6; p += ds) {
                    const q = Math.min(p, lb), fr = route.frame(q), o = L.off(q) + side * RAIL_X;
                    const ring = PROFILE.map(([x, y]) => at(fr, o + x, y));
                    if (prev) {
                        for (let k = 0; k < PROFILE.length; k++) {
                            const k2 = (k + 1) % PROFILE.length;
                            if (k === 0 && false) continue;
                            const [x0, y0] = PROFILE[k], [x1, y1] = PROFILE[k2];
                            if (y0 === 0.22 && y1 === 0.22) continue;   // face de baixo do patim (não se vê)
                            const nx = y1 - y0, ny = -(x1 - x0), nl = Math.hypot(nx, ny);
                            const N = add(mul(fr.R, nx / nl), mul(fr.U, ny / nl));
                            const uv = [[0, prev.q / 1.5], [0.06, prev.q / 1.5], [0.06, q / 1.5], [0, q / 1.5]];
                            quadN(k === 6 ? head : body, prev.ring[k], prev.ring[k2], ring[k2], ring[k], N, uv);
                        }
                    }
                    prev = { ring, q };
                    if (q >= lb) break;
                }
            }
        }
        // --- travessas de madeira (0,66 m): nas zonas de agulha as vias próximas partilham travessas compridas
        for (let s = Math.ceil(a / 0.66) * 0.66; s < b; s += 0.66) {
            const fr = route.frame(s);
            const offs = lines.filter(L => s >= L.a && s <= L.b).map(L => L.off(s)).sort((u, v) => u - v);
            const runs = [];
            for (const o of offs) { const r = runs[runs.length - 1]; if (r && o - r[1] < 3.2) r[1] = o; else runs.push([o, o]); }
            const jitter = Math.sin(s * 12.9898) * 0.02;
            for (const [lo, hi] of runs) {
                const x0 = lo - 1.0, x1 = hi + 1.0, y0 = 0.10, y1 = 0.22, w = 0.12;
                const P = (x, y, z) => add(at(fr, x, y), mul(fr.F, z + jitter));
                const uvT = [[x0 / 2, 0], [x1 / 2, 0], [x1 / 2, 0.12], [x0 / 2, 0.12]];
                quadN(sleep, P(x0, y1, -w), P(x1, y1, -w), P(x1, y1, w), P(x0, y1, w), fr.U, uvT);
                quadN(sleep, P(x0, y0, w), P(x1, y0, w), P(x1, y1, w), P(x0, y1, w), fr.F, uvT);
                quadN(sleep, P(x0, y0, -w), P(x1, y0, -w), P(x1, y1, -w), P(x0, y1, -w), mul(fr.F, -1), uvT);
                quadN(sleep, P(x1, y0, -w), P(x1, y0, w), P(x1, y1, w), P(x1, y1, -w), fr.R, [[0, 0], [0.1, 0], [0.1, 0.05], [0, 0.05]]);
                quadN(sleep, P(x0, y0, -w), P(x0, y0, w), P(x0, y1, w), P(x0, y1, -w), mul(fr.R, -1), [[0, 0], [0.1, 0], [0.1, 0.05], [0, 0.05]]);
            }
        }
        // --- balastro: largura conforme as vias existentes em cada ponto
        let pv = null;
        for (let p = a; p <= b + 1e-6; p += 2) {
            const q = Math.min(p, b), fr = route.frame(q);
            const offs = lines.filter(L => q >= L.a && q <= L.b).map(L => L.off(q));
            const lo = Math.min(...offs) - 1.45, hi = Math.max(...offs) + 1.45;
            const cur = { pts: [at(fr, lo - 1.0, -0.35), at(fr, lo, 0.17), at(fr, hi, 0.17), at(fr, hi + 1.0, -0.35)], xs: [lo - 1.0, lo, hi, hi + 1.0], q, U: fr.U };
            if (pv) {
                for (let k = 0; k < 3; k++) {
                    const uv = [[pv.xs[k] / 1.2, pv.q / 1.2], [pv.xs[k + 1] / 1.2, pv.q / 1.2], [cur.xs[k + 1] / 1.2, cur.q / 1.2], [cur.xs[k] / 1.2, cur.q / 1.2]];
                    quadN(bal, pv.pts[k], pv.pts[k + 1], cur.pts[k + 1], cur.pts[k], cur.U, uv);
                }
            }
            pv = cur;
            if (q >= b) break;
        }
        addRender(app, ent, bal.mesh(device), mats.ballast, { castShadows: false, name: 'balastro' });
        const sl = addRender(app, ent, sleep.mesh(device), mats.sleeper, { castShadows: true, name: 'travessas' });
        addRender(app, ent, body.mesh(device), mats.railBody, { castShadows: true, name: 'carris' });
        addRender(app, ent, head.mesh(device), mats.railHead, { castShadows: false, name: 'boleto' });
        const mid = route.point((a + b) / 2, 0, 0);
        chunks.push({ ent, sleepers: sl, center: new pc.Vec3(mid[0], mid[1], mid[2]) });
        // devolve o controlo ao navegador entre troços (a página não congela durante a construção)
        await new Promise(r => setTimeout(r, 0));
    }
    return chunks;
}

export async function trackMaterials(app, Q, loadPBR) {
    const [rocks, wood, rust] = await Promise.all([loadPBR(app, 'gray_rocks', Q), loadPBR(app, 'old_wood_floor', Q), loadPBR(app, 'rust_coarse_01', Q)]);
    const ballast = pbrMaterial(rocks, { tile: 1, tint: [0.82, 0.8, 0.77], bump: 1.2 });
    const sleeper = pbrMaterial(wood, { tile: 1, tint: [0.55, 0.45, 0.38], bump: 0.8 });
    const railBody = pbrMaterial(rust, { tile: 1, tint: [0.62, 0.5, 0.42], metal: 0.3 });
    // topo do boleto: aço polido pelas rodas
    const railHead = colorMaterial([0.78, 0.78, 0.8], { gloss: 0.82, metal: 1 });
    return { ballast, sleeper, railBody, railHead };
}
