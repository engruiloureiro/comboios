// Vegetação: árvores procedimentais (não há árvores CC0 leves o bastante para instanciar aos milhares: as do Poly Haven têm
// 0,3–17 milhões de polígonos). Tronco cónico e copa de planos cruzados com folhagem desenhada em canvas (alpha test),
// três espécies do Minho (folhosas tipo carvalho, pinheiro-bravo, eucalipto). Instanciação por troços de 400 m.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { Geo, canvasTexture, rng, norm } from './gfx.js';
import { fbm } from './terrain.js';
import { clamp } from './route.js';

function foliageTexture(device, kind) {
    return canvasTexture(device, 512, 512, (x, w, h) => {
        x.clearRect(0, 0, w, h);
        const r = rng(kind === 'oak' ? 11 : kind === 'pine' ? 23 : 37);
        const cx = w / 2, cy = h / 2;
        const N = kind === 'pine' ? 2600 : 1900;
        for (let k = 0; k < N; k++) {
            // folhas mais densas ao centro, borda irregular
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (kind === 'pine' ? 0.46 : 0.48) * w * (0.75 + 0.25 * Math.sin(a * 5 + r()));
            const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * (kind === 'euc' ? 1.15 : 0.95);
            const sh = 0.55 + 0.45 * (1 - d / (0.5 * w)) * (py < cy ? 1.1 : 0.85);
            const base = kind === 'oak' ? [70, 104, 44] : kind === 'pine' ? [44, 72, 40] : [92, 112, 82];
            const v = 0.75 + r() * 0.5;
            x.fillStyle = `rgba(${base[0] * v * sh | 0},${base[1] * v * sh | 0},${base[2] * v * sh | 0},1)`;
            x.save(); x.translate(px, py); x.rotate(r() * Math.PI);
            x.beginPath();
            if (kind === 'pine') x.ellipse(0, 0, 9 + r() * 6, 1.6, 0, 0, 7);
            else if (kind === 'euc') x.ellipse(0, 0, 10 + r() * 6, 2.6, 0, 0, 7);
            else x.ellipse(0, 0, 6 + r() * 4, 4 + r() * 2, 0, 0, 7);
            x.fill(); x.restore();
        }
    }, { bleed: true });
}

function barkTexture(device) {
    return canvasTexture(device, 128, 256, (x, w, h) => {
        x.fillStyle = '#5a4a3c'; x.fillRect(0, 0, w, h);
        const r = rng(5);
        for (let k = 0; k < 400; k++) { const v = 60 + r() * 50; x.fillStyle = `rgb(${v + 18},${v + 8},${v})`; x.fillRect(r() * w, r() * h, 2 + r() * 3, 8 + r() * 30); }
    });
}

// malha de uma árvore: tronco (8 lados) + copa de planos cruzados (vertical e inclinados), com 1 m de altura de referência
function treeGeo(kind) {
    const trunk = new Geo(), crown = new Geo();
    const H = 1, th = kind === 'pine' ? 0.7 : kind === 'euc' ? 0.6 : 0.45, r0 = kind === 'oak' ? 0.035 : 0.025;
    for (let k = 0; k < 8; k++) {
        const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2;
        const P = (a, y, r) => [Math.cos(a) * r, y, Math.sin(a) * r];
        trunk.quad(P(a0, 0, r0), P(a0, th * H, r0 * 0.55), P(a1, th * H, r0 * 0.55), P(a1, 0, r0),
            [[k / 8, 0], [k / 8, 2], [(k + 1) / 8, 2], [(k + 1) / 8, 0]]);
    }
    const cy = kind === 'pine' ? 0.78 : kind === 'euc' ? 0.7 : 0.6, rad = kind === 'pine' ? 0.22 : kind === 'euc' ? 0.2 : 0.34, hh = kind === 'euc' ? 0.36 : kind === 'pine' ? 0.22 : 0.3;
    const cards = kind === 'oak' ? 5 : 4;
    for (let k = 0; k < cards; k++) {
        const a = k / cards * Math.PI, c = Math.cos(a) * rad, s = Math.sin(a) * rad;
        const A = [-c, cy - hh, -s], B = [c, cy - hh, s], C = [c, cy + hh, s], D = [-c, cy + hh, -s];
        crown.quad(A, B, C, D, [[0, 1], [1, 1], [1, 0], [0, 0]]);
    }
    // planos quase horizontais (copa vista de cima e de baixo)
    for (const [y, tilt] of [[cy, 0.0], [cy + hh * 0.4, 0.25]]) {
        const r = rad * 0.95;
        crown.quad([-r, y - tilt * r, -r], [r, y + tilt * r, -r], [r, y + tilt * r, r], [-r, y - tilt * r, r], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    }
    // normais esféricas a partir do centro da copa, puxadas para cima: as duas faces de cada plano ficam com a mesma luz
    // (sem isto, a face de baixo dos planos horizontais ficava preta e via-se de lado como riscos escuros)
    for (let i = 0; i < crown.p.length; i += 3) {
        const N = norm([crown.p[i] / rad, (crown.p[i + 1] - cy) / hh * 0.6 + 0.55, crown.p[i + 2] / rad]);
        crown.n[i] = N[0]; crown.n[i + 1] = N[1]; crown.n[i + 2] = N[2];
    }
    return { trunk, crown };
}

export function buildVegetation(app, route, TF, root, Q, avoid) {
    const device = app.graphicsDevice;
    const bark = new pc.StandardMaterial();
    bark.diffuseMap = barkTexture(device); bark.gloss = 0.15; bark.useMetalness = true; bark.metalness = 0; bark.update();
    const kinds = ['oak', 'pine', 'euc'], mats = {}, geos = {};
    for (const k of kinds) {
        const m = new pc.StandardMaterial(); const t = foliageTexture(device, k);
        m.diffuseMap = t; m.opacityMap = t; m.opacityMapChannel = 'a'; m.alphaTest = 0.45; m.cull = pc.CULLFACE_NONE; m.twoSidedLighting = false;
        m.useMetalness = true; m.metalness = 0; m.gloss = 0.2; m.alphaToCoverage = Q.a2c; m.update(); mats[k] = m;
        const g = treeGeo(k); geos[k] = { trunk: g.trunk.mesh(device), crown: g.crown.mesh(device) };
    }
    const r = rng(1985), groups = [];
    const CH = 400;
    for (let a = route.p0; a < route.p1; a += CH) {
        const inst = { oak: [], pine: [], euc: [] };
        const n = Math.round(CH * Q.treeDensity);
        for (let k = 0; k < n; k++) {
            const p = a + r() * CH, side = r() < 0.5 ? -1 : 1, o = side * (11 + Math.pow(r(), 1.6) * 260);
            const P = TF.pos(p, o);
            // bosques: só onde o ruído o permite (manchas), mais densos nas encostas afastadas
            const dens = fbm(P[0] * 0.006 + 2, P[2] * 0.006);
            if (dens < 0.46 - Math.min(0.12, Math.abs(o) / 2000)) continue;
            if (avoid(p, o)) continue;
            const kind = dens > 0.62 ? (r() < 0.6 ? 'euc' : 'pine') : (r() < 0.75 ? 'oak' : 'pine');
            const hgt = kind === 'euc' ? 18 + r() * 12 : kind === 'pine' ? 12 + r() * 8 : 7 + r() * 6;
            const m = new pc.Mat4().setTRS(new pc.Vec3(P[0], P[1] - 0.2, P[2]), new pc.Quat().setFromEulerAngles(0, r() * 360, (r() - 0.5) * 6), new pc.Vec3(hgt * (0.85 + r() * 0.3), hgt, hgt * (0.85 + r() * 0.3)));
            inst[kind].push(m);
        }
        const ent = new pc.Entity('árvores ' + a); root.addChild(ent);
        for (const k of kinds) {
            if (!inst[k].length) continue;
            const data = new Float32Array(inst[k].length * 16);
            inst[k].forEach((m, i) => data.set(m.data, i * 16));
            for (const [mesh, mat, cast] of [[geos[k].trunk, bark, false], [geos[k].crown, mats[k], Q.treeShadows]]) {
                const vb = new pc.VertexBuffer(device, pc.VertexFormat.getDefaultInstancingFormat(device), inst[k].length, { data });
                const mi = new pc.MeshInstance(mesh, mat);
                mi.setInstancing(vb);
                const e = new pc.Entity(k); e.addComponent('render', { meshInstances: [mi], castShadows: cast, receiveShadows: true });
                // caixa envolvente do grupo (recorte correto das instâncias)
                const P0 = route.point(a + CH / 2, 0, 0);
                mi.setCustomAabb(new pc.BoundingBox(new pc.Vec3(P0[0], P0[1] + 10, P0[2]), new pc.Vec3(CH, 60, CH)));
                ent.addChild(e);
            }
        }
        const mid = route.point(a + CH / 2, 0, 0);
        groups.push({ ent, center: new pc.Vec3(mid[0], mid[1], mid[2]) });
    }
    return groups;
}
