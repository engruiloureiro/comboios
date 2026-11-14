// Terreno: relevo exportado do simulador (cota do terreno relativa à via, de 10 em 10 m ao longo e em 49 desvios laterais
// até ±1 km). Faixa junto à via (até ±125 m) que acompanha o eixo, com rumo suavizado para não dobrar no interior das curvas;
// ao longe, grelha regular do mundo com o mesmo relevo e montes de fundo. Cor: erva (Poly Haven, CC0) tingida por parcelas.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { addRender, pbrMaterial, makeMesh } from './gfx.js';
import { clamp } from './route.js';

function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
    const i = Math.floor(x), j = Math.floor(z), f = x - i, g = z - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
    return (hash2(i, j) * (1 - u) + hash2(i + 1, j) * u) * (1 - v) + (hash2(i, j + 1) * (1 - u) + hash2(i + 1, j + 1) * u) * v;
}
export function fbm(x, z) { let a = 0, s = 0.5, f = 1; for (let k = 0; k < 4; k++) { a += s * vnoise(x * f, z * f); f *= 2; s *= 0.5; } return a; }

export class TerrainField {
    constructor(route) {
        const D = route.D;
        this.r = route; this.offs = D.terrOffs; this.step = D.terrStep; this.rows = D.terr; this.p0 = D.p0;
        // rumo suavizado (±100 m) para o eixo lateral do terreno
        const n = route.n, w = 20; this.HS = new Float64Array(n);
        for (let i = 0; i < n; i++) { let a = 0, m = 0; for (let d = -w; d <= w; d++) { a += route.H[clamp(i + d, 0, n - 1)]; m++; } this.HS[i] = a / m; }
    }
    // cota do terreno (relativa à via) no ponto p, desvio o
    th(p, o) {
        const R = this.rows, f = clamp((p - this.p0) / this.step, 0, R.length - 1.0001), i = Math.floor(f), t = f - i;
        const O = this.offs; o = clamp(o, O[0], O[O.length - 1]);
        let k = 0; while (k < O.length - 2 && o > O[k + 1]) k++;
        const u = (o - O[k]) / (O[k + 1] - O[k]);
        const a = R[i][k] * (1 - u) + R[i][k + 1] * u, b = R[i + 1][k] * (1 - u) + R[i + 1][k + 1] * u;
        return a * (1 - t) + b * t;
    }
    // ponto do terreno com o eixo lateral suavizado
    pos(p, o) {
        const r = this.r, f = r.fi(p), i = Math.floor(f), t = f - i;
        const h = this.HS[i] + (this.HS[Math.min(i + 1, r.n - 1)] - this.HS[i]) * t;
        const C = r.frame(p, false).C;
        // junto à via o eixo lateral é o da via (as bermas acompanham o balastro); afasta-se para o suavizado
        const hr = r._lin(r.H, f), wgt = clamp((Math.abs(o) - 6) / 30, 0, 1), hh = hr + (h - hr) * wgt;
        const R = [Math.cos(hh), 0, Math.sin(hh)];
        return [C[0] + R[0] * o, C[1] + this.th(p, o), C[2] + R[2] * o];
    }
}

// cor da parcela (campos do Minho: prado, pastagem, restolho, lavrado, pousio) e escurecimento junto à via
function tint(x, z, o) {
    const n = fbm(x * 0.02, z * 0.02);
    const px = Math.floor((x + n * 40) / 55), pz = Math.floor((z - n * 40) / 45), h = hash2(px * 7 + 3, pz * 13 + 5);
    // a textura (leafy_grass) é pardacenta: cada parcela leva a sua cor por cima — prado, pastagem, milho cortado, lavrado, pousio
    const PARC = [[0.60, 0.92, 0.50], [0.55, 0.86, 0.44], [0.70, 0.95, 0.48], [0.95, 0.88, 0.62], [0.85, 0.70, 0.55], [0.64, 0.90, 0.52], [0.52, 0.80, 0.42]];
    let c = PARC[Math.floor(h * PARC.length) % PARC.length];
    const far = clamp((Math.abs(o) - 8) / 10, 0, 1), base = [0.66, 0.86, 0.52];
    c = c.map((v, i) => base[i] + (v - base[i]) * far);
    const near = 1 - clamp((Math.abs(o) - 3) / 4, 0, 1);   // berma de terra batida junto ao balastro
    const v = 0.86 + n * 0.28;
    return [clamp(c[0] * v * (1 - near * 0.1) + near * 0.16, 0, 1.4), clamp(c[1] * v * (1 - near * 0.3), 0, 1.4), clamp(c[2] * v * (1 - near * 0.15), 0, 1.4)];
}

export async function buildTerrain(app, route, root, grassSet, Q) {
    const device = app.graphicsDevice, TF = new TerrainField(route);
    const mat = pbrMaterial(grassSet, { tile: 4, vertexColor: true, bump: 0.7 });
    const near = TF.offs.filter(o => Math.abs(o) <= 125).concat([-140, 140]).sort((a, b) => a - b);
    const CH = 400;
    for (let a = route.p0; a < route.p1; a += CH) {
        const b = Math.min(route.p1, a + CH);
        const rows = [];
        for (let p = a; p <= b + 1e-6; p += 10) {
            const q = Math.min(p, b);
            rows.push(near.map(o => {
                const P = TF.pos(q, Math.abs(o) > 125 ? Math.sign(o) * 125 : o);
                if (Math.abs(o) > 125) P[1] -= 4;     // saia na borda (sem frestas para a grelha de fundo)
                const c = tint(P[0], P[2], o);
                return { P, uv: [P[0] / 4, P[2] / 4], C: [c[0] * 180, c[1] * 180, c[2] * 180, 255] };
            }));
            if (q >= b) break;
        }
        const mesh = gridMesh(device, rows);
        addRender(app, root, mesh, mat, { castShadows: false, name: 'terreno ' + a });
        await new Promise(r => setTimeout(r, 0));
    }
    // grelha de fundo: regular no mundo, com a cota pelo ponto da via mais próximo
    {
        const xs = [], zs = [];
        for (let i = 0; i < route.n; i += 4) { xs.push(route.X[i]); zs.push(route.Z[i]); }
        const pad = 1600, x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, z0 = Math.min(...zs) - pad, z1 = Math.max(...zs) + pad;
        const cell = Q.farCell, nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z1 - z0) / cell);
        const grid = [];
        for (let j = 0; j <= nz; j++) {
            const row = [];
            for (let i = 0; i <= nx; i++) {
                const x = x0 + i * cell, z = z0 + j * cell;
                // ponto da via mais próximo (procura grosseira e depois fina)
                let best = 1e18, bi = 0;
                for (let k = 0; k < route.n; k += 8) { const dx = route.X[k] - x, dz = route.Z[k] - z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = k; } }
                for (let k = Math.max(0, bi - 8); k < Math.min(route.n, bi + 9); k++) { const dx = route.X[k] - x, dz = route.Z[k] - z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = k; } }
                const h = route.H[bi], o = (x - route.X[bi]) * Math.cos(h) + (z - route.Z[bi]) * Math.sin(h), dist = Math.sqrt(best);
                const p = route.p0 + bi * route.seg;
                let y = route.Y[bi] + TF.th(p, o);
                if (dist > 1000) y += (fbm(x * 0.0012 + 3, z * 0.0012) - 0.45) * 160 * clamp((dist - 1000) / 600, 0, 1);
                if (dist < 135) y -= 3 * clamp((135 - dist) / 20, 0, 1);   // escondida debaixo da faixa junto à via
                const c = tint(x, z, 200);
                row.push({ P: [x, y, z], uv: [x / 4, z / 4], C: [c[0] * 170, c[1] * 175, c[2] * 165, 255] });
            }
            grid.push(row);
            if (j % 20 === 0) await new Promise(r => setTimeout(r, 0));
        }
        addRender(app, root, gridMesh(device, grid), mat, { castShadows: false, name: 'terreno de fundo' });
    }
    return TF;
}

// grelha com vértices partilhados (normais suaves), com as faces viradas para cima
export function gridMesh(device, rows) {
    const nr = rows.length, nc = rows[0].length, P = new Float32Array(nr * nc * 3), UV = new Float32Array(nr * nc * 2), C = new Uint8ClampedArray(nr * nc * 4);
    let k = 0;
    for (const row of rows) for (const V of row) { P.set(V.P, k * 3); UV.set(V.uv, k * 2); C.set(V.C, k * 4); k++; }
    // sentido dos triângulos: pela normal do primeiro quadrilátero
    const A = rows[0][0].P, B = rows[0][1].P, D = rows[1][0].P;
    const ab = [B[0] - A[0], B[2] - A[2]], ad = [D[0] - A[0], D[2] - A[2]], up = ab[1] * ad[0] - ab[0] * ad[1] >= 0;
    const I = new (nr * nc > 65535 ? Uint32Array : Uint16Array)((nr - 1) * (nc - 1) * 6);
    let q = 0;
    for (let r = 0; r < nr - 1; r++) for (let c = 0; c < nc - 1; c++) {
        const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1;
        if (up) { I[q++] = a; I[q++] = b; I[q++] = e; I[q++] = a; I[q++] = e; I[q++] = d; }
        else { I[q++] = a; I[q++] = e; I[q++] = b; I[q++] = a; I[q++] = d; I[q++] = e; }
    }
    return makeMesh(device, { positions: P, uvs: UV, colors: C, indices: I });
}
