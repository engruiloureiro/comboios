// Cenário: a geometria de cada bloco de 200 m vem do simulador (ver bridge.js) — terreno, via, cais, rio, túneis, pontes, muros,
// edifícios, árvores e campos, tal como o jogo os gera — e é desenhada aqui com materiais físicos, sombras e céu HDRI.
// Os blocos são carregados à frente do comboio e libertados atrás (no máximo um por imagem).
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';

// camadas de textura do simulador: 0 branco, 1 erva, 2 balastro+travessas, 3 brita, 4 fachada, 5 telha, 6 betão, 7 tijolo, 8 asfalto,
// 9 água, 10 folhagem, 11 chapa, 12 inox/carril, 13 granito, 14 pavimento, 15 azulejo, 16 vidro, 17–19 azulejos e fachadas,
// 20 granito minhoto, 21 milho, 22 balastro, 23 túnel, 24 para-choques, 25 caminho; −1 = atlas (letreiros, tabuletas)
const GLOSS = { 0: 0.25, 1: 0.08, 2: 0.2, 3: 0.15, 4: 0.2, 5: 0.3, 6: 0.25, 7: 0.2, 8: 0.35, 9: 0.96, 10: 0.12, 11: 0.5, 12: 0.78, 13: 0.3, 14: 0.3, 15: 0.7, 16: 0.9, 17: 0.7, 19: 0.7, 20: 0.25, 21: 0.1, 22: 0.18, 23: 0.15, 25: 0.1 };
const METAL = { 11: 0.6, 12: 1 };
// não fazem sombra: chão (erva, milho, brita, balastro, caminho, asfalto, pavimento) e água
const NOCAST = { 1: 1, 2: 1, 3: 1, 8: 1, 9: 1, 14: 1, 21: 1, 22: 1, 25: 1 };

export class World {
    constructor(app, game, route, Q) {
        this.app = app; this.game = game; this.route = route; this.Q = Q;
        this.root = new pc.Entity('cenário'); app.root.addChild(this.root);
        this.chunks = new Map();          // c → { ent, meshes } | null (bloco vazio)
        this.mats = new Map();
        this.night = 0;
        this.len = game.ch * game.seg;    // comprimento de um bloco (m)
        this.c0 = Math.floor(route.p0 / this.len); this.c1 = Math.floor((route.p1 - 1) / this.len);
        this.verts = 0; this.dynVerts = 0;
    }

    async loadTextures() {
        const dev = this.app.graphicsDevice, T = this.game.textures(), n = T.size;
        this.tex = []; this.mask = [];
        const mk = (data, srgb = true) => {
            const t = new pc.Texture(dev, { width: n, height: n, format: srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8, mipmaps: true, anisotropy: this.Q.aniso, addressU: pc.ADDRESS_REPEAT, addressV: pc.ADDRESS_REPEAT });
            t.lock().set(data); t.unlock(); return t;
        };
        this._mk = mk; this._raw = T.layers; this._n = n;
        T.layers.forEach((d, k) => { this.tex[k] = mk(d); });
        // camadas 22–25: fotografias do pacote (o jogo carrega-as por cima das procedimentais)
        if (T.pack) await Promise.all(Object.entries(T.pack).map(([k, url]) => new Promise(res => {
            const im = new Image();
            im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, n, n); this.tex[+k] = mk(x.getImageData(0, 0, n, n).data); res(); };
            im.onerror = () => res(); im.src = url;
        })));
        [[22, 2], [23, 6], [24, 13], [25, 3]].forEach(([k, q]) => { if (!this.tex[k]) this.tex[k] = this.tex[q]; });
        this.atlasSrc = T.atlas; this.atlasN = -1;
        this.atlas = new pc.Texture(dev, { format: pc.PIXELFORMAT_SRGBA8, mipmaps: true, anisotropy: this.Q.aniso, addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE });
        this._atlas();
    }
    // o canvas do atlas pertence ao documento do simulador: copia-se para um canvas deste documento antes de o enviar para a GPU
    _atlas() {
        const k = this.game.atlasKeys(); if (k === this.atlasN) return;
        this.atlasN = k;
        const src = this.atlasSrc, max = this.app.graphicsDevice.maxTextureSize || 4096, sc = Math.min(1, max / src.height);
        if (!this._ac) { this._ac = document.createElement('canvas'); this._ac.width = Math.round(src.width * sc); this._ac.height = Math.round(src.height * sc); }
        const x = this._ac.getContext('2d'); x.clearRect(0, 0, this._ac.width, this._ac.height); x.drawImage(src, 0, 0, this._ac.width, this._ac.height);
        this.atlas.setSource(this._ac);
    }

    // máscara das janelas acesas à noite: 1 − alfa da camada (como no sombreador do jogo)
    _mask(l) {
        if (this.mask[l]) return this.mask[l];
        const src = this._raw[l] || this._raw[0], d = new Uint8ClampedArray(src.length);
        for (let i = 0; i < src.length; i += 4) { const v = 255 - src[i + 3]; d[i] = v; d[i + 1] = v * 0.78; d[i + 2] = v * 0.45; d[i + 3] = 255; }
        return (this.mask[l] = this._mk(d));
    }

    material(l, ec) {
        const key = l * 4 + ec;
        let m = this.mats.get(key);
        if (m) return m;
        m = new pc.StandardMaterial();
        m.name = 'camada ' + l + (ec ? ' e' + ec : '');
        m.diffuseMap = l < 0 ? this.atlas : this.tex[l] || this.tex[0];
        m.diffuseVertexColor = true; m.vertexColorGamma = true;
        m.useMetalness = true; m.metalness = METAL[l] || 0; m.gloss = GLOSS[l] ?? 0.25;
        m.cull = pc.CULLFACE_NONE; m.twoSidedLighting = true;
        if (l === 9) { m.diffuse = new pc.Color(0.55, 0.62, 0.6); m.specularityFactor = 1; }
        if (ec === 1) { m.emissiveMap = m.diffuseMap; m.emissive = new pc.Color(1, 1, 1); m.emissiveVertexColor = true; m.emissiveIntensity = 0.9; }
        if (ec === 2) { m.emissiveMap = this._mask(l); m.emissive = new pc.Color(1, 1, 1); m.emissiveIntensity = 0; m._night = true; }
        m.update();
        this.mats.set(key, m);
        return m;
    }

    setNight(n) {
        this.night = n;
        for (const m of this.mats.values()) if (m._night) { m.emissiveIntensity = n > 0.2 ? 2.4 * n : 0; m.update(); }
    }

    // converte a geometria de um bloco do simulador (14 números por vértice) numa entidade com uma malha por camada
    _entity(g, name, shadows) {
        const d = g.d, nv = d.length / 14, dev = this.app.graphicsDevice, cnt = new Map();
        for (let v = 0; v < nv; v += 3) { const o = v * 14, e = d[o + 12], k = Math.round(d[o + 11]) * 4 + (e > 0 ? 1 : e < 0 ? 2 : 0); cnt.set(k, (cnt.get(k) || 0) + 3); }
        const G = new Map();
        for (const [k, n] of cnt) G.set(k, { n, i: 0, p: new Float32Array(n * 3), nr: new Float32Array(n * 3), uv: new Float32Array(n * 2), col: new Uint8ClampedArray(n * 4) });
        for (let v = 0; v < nv; v += 3) {
            const o0 = v * 14, e = d[o0 + 12], g2 = G.get(Math.round(d[o0 + 11]) * 4 + (e > 0 ? 1 : e < 0 ? 2 : 0));
            // a repetição da textura não depende da parte inteira: tira-se para os uv ficarem pequenos (precisão)
            const du = Math.floor(Math.min(d[o0 + 9], d[o0 + 23], d[o0 + 37])), dv = Math.floor(Math.min(d[o0 + 10], d[o0 + 24], d[o0 + 38]));
            const rep = d[o0 + 11] >= 0;
            for (let t = 0; t < 3; t++) {
                const o = o0 + t * 14, i = g2.i++, ao = Math.pow(Math.max(0, Math.min(1, d[o + 13])), 0.4545);
                g2.p[i * 3] = d[o]; g2.p[i * 3 + 1] = d[o + 1]; g2.p[i * 3 + 2] = d[o + 2];
                g2.nr[i * 3] = d[o + 3]; g2.nr[i * 3 + 1] = d[o + 4]; g2.nr[i * 3 + 2] = d[o + 5];
                g2.col[i * 4] = d[o + 6] * ao * 255; g2.col[i * 4 + 1] = d[o + 7] * ao * 255; g2.col[i * 4 + 2] = d[o + 8] * ao * 255; g2.col[i * 4 + 3] = 255;
                g2.uv[i * 2] = rep ? d[o + 9] - du : d[o + 9]; g2.uv[i * 2 + 1] = rep ? d[o + 10] - dv : d[o + 10];
            }
        }
        const ent = new pc.Entity(name), meshes = [], casters = [];
        ent.setPosition(g.ox - this.route.ox, -this.route.oy, g.oz - this.route.oz);
        for (const [k, g2] of G) {
            const l = Math.floor(k / 4), ec = k - l * 4;
            const mesh = new pc.Mesh(dev);
            mesh.setPositions(g2.p); mesh.setNormals(g2.nr); mesh.setUvs(0, g2.uv); mesh.setColors32(g2.col);
            mesh.update(pc.PRIMITIVE_TRIANGLES);
            const mi = new pc.MeshInstance(mesh, this.material(l, ec));
            const e = new pc.Entity('c' + l);
            const cast = shadows && !NOCAST[l] && (l !== 10 || this.Q.treeShadows);
            e.addComponent('render', { meshInstances: [mi], castShadows: cast, receiveShadows: true });
            ent.addChild(e); meshes.push(mesh); if (cast) casters.push(e);
        }
        return { ent, meshes, casters, nv };
    }

    // um bloco: separa os triângulos por camada e por tipo de luz própria e cria uma malha para cada grupo
    build(c) {
        if (this.chunks.has(c)) return false;
        const g = this.game.chunk(c);
        if (!g || !g.d || !g.d.length) { this.chunks.set(c, null); return true; }
        const E = this._entity(g, 'bloco ' + c, true), ent = E.ent, meshes = E.meshes, casters = E.casters, nv = E.nv;
        this.root.addChild(ent);
        this.chunks.set(c, { ent, meshes, nv, casters, cast: true });
        this.verts += nv;
        this._atlas();
        return true;
    }

    // geometria dinâmica do simulador (sinais e braços, cancelas, agulhas, passageiros, chefe de estação): refeita em cada imagem
    // d = vértices relativos ao ponto (ex, ez) do mundo do jogo, com y absoluto
    dynUpdate(d, ex, ez) {
        if (!this.dyn) { this.dyn = { ent: new pc.Entity('dinâmico'), G: new Map() }; this.root.addChild(this.dyn.ent); }
        const D = this.dyn, dev = this.app.graphicsDevice;
        D.ent.setPosition(ex - this.route.ox, -this.route.oy, ez - this.route.oz);
        for (const g of D.G.values()) g.n = 0;
        const nv = d ? d.length / 14 : 0;
        this.dynVerts = nv;
        for (let v = 0; v < nv; v += 3) {
            const o = v * 14, e = d[o + 12], k = Math.round(d[o + 11]) * 4 + (e > 0 ? 1 : e < 0 ? 2 : 0);
            let g = D.G.get(k);
            if (!g) { g = { n: 0, cap: 0, p: null, nr: null, uv: null, col: null, mesh: null, ent: null, l: Math.floor(k / 4), ec: k - Math.floor(k / 4) * 4 }; D.G.set(k, g); }
            g.n += 3;
        }
        for (const g of D.G.values()) {
            if (g.n > g.cap) { g.cap = Math.ceil(g.n * 1.3 / 3) * 3; g.p = new Float32Array(g.cap * 3); g.nr = new Float32Array(g.cap * 3); g.uv = new Float32Array(g.cap * 2); g.col = new Uint8ClampedArray(g.cap * 4); }
            g.i = 0;
        }
        for (let v = 0; v < nv; v += 3) {
            const o0 = v * 14, e = d[o0 + 12], g = D.G.get(Math.round(d[o0 + 11]) * 4 + (e > 0 ? 1 : e < 0 ? 2 : 0));
            const rep = d[o0 + 11] >= 0;
            const du = rep ? Math.floor(Math.min(d[o0 + 9], d[o0 + 23], d[o0 + 37])) : 0, dv = rep ? Math.floor(Math.min(d[o0 + 10], d[o0 + 24], d[o0 + 38])) : 0;
            for (let t = 0; t < 3; t++) {
                const o = o0 + t * 14, i = g.i++, a = d[o + 13], ao = a >= 1 ? 1 : Math.pow(Math.max(0, a), 0.4545);
                g.p[i * 3] = d[o]; g.p[i * 3 + 1] = d[o + 1]; g.p[i * 3 + 2] = d[o + 2];
                g.nr[i * 3] = d[o + 3]; g.nr[i * 3 + 1] = d[o + 4]; g.nr[i * 3 + 2] = d[o + 5];
                g.col[i * 4] = d[o + 6] * ao * 255; g.col[i * 4 + 1] = d[o + 7] * ao * 255; g.col[i * 4 + 2] = d[o + 8] * ao * 255; g.col[i * 4 + 3] = 255;
                g.uv[i * 2] = d[o + 9] - du; g.uv[i * 2 + 1] = d[o + 10] - dv;
            }
        }
        for (const g of D.G.values()) {
            if (!g.n) { if (g.ent) g.ent.enabled = false; continue; }
            if (!g.mesh) {
                g.mesh = new pc.Mesh(dev);
                g.ent = new pc.Entity('d' + g.l);
                g.mesh.setPositions(g.p, 3, g.n); g.mesh.setNormals(g.nr, 3, g.n); g.mesh.setUvs(0, g.uv, 2, g.n); g.mesh.setColors32(g.col, g.n);
                g.mesh.update(pc.PRIMITIVE_TRIANGLES);
                g.ent.addComponent('render', { meshInstances: [new pc.MeshInstance(g.mesh, this.material(g.l, g.ec))], castShadows: true, receiveShadows: true });
                D.ent.addChild(g.ent);
            } else {
                g.mesh.setPositions(g.p, 3, g.n); g.mesh.setNormals(g.nr, 3, g.n); g.mesh.setUvs(0, g.uv, 2, g.n); g.mesh.setColors32(g.col, g.n);
                g.mesh.update(pc.PRIMITIVE_TRIANGLES);
            }
            g.ent.enabled = true;
        }
        this._atlas();
    }

    // casario distante das cidades (Porto e Guimarães): malhas fixas do simulador
    addStatic(list) {
        for (const L of list) {
            const e = this._entity({ d: L.d, ox: L.ox, oz: L.oz }, 'cidade ao longe', false);
            if (e) this.root.addChild(e.ent);
        }
    }

    drop(c) {
        const k = this.chunks.get(c);
        if (k) { k.ent.destroy(); for (const m of k.meshes) m.destroy(); this.verts -= k.nv; }
        this.chunks.delete(c);
    }

    // blocos desejados à volta de p (dir = sentido de marcha); devolve os que faltam, do mais próximo para o mais distante
    wanted(p, dir) {
        const c = Math.floor(p / this.len), a = this.Q.chunksAhead, b = this.Q.chunksBehind;
        const lo = Math.max(this.c0, c - (dir > 0 ? b : a)), hi = Math.min(this.c1, c + (dir > 0 ? a : b));
        const miss = [];
        for (let k = lo; k <= hi; k++) if (!this.chunks.has(k)) miss.push(k);
        miss.sort((x, y) => Math.abs(x - c) - Math.abs(y - c));
        return { lo, hi, miss };
    }
    update(p, dir) {
        const W = this.wanted(p, dir);
        if (W.miss.length) this.build(W.miss[0]);
        for (const k of [...this.chunks.keys()]) if (k < W.lo - 1 || k > W.hi + 1) this.drop(k);
        // sombras só dos blocos ao alcance da sombra do sol (os outros não chegam a aparecer no mapa de sombras)
        const c = Math.floor(p / this.len), n = Math.ceil(this.Q.shadowDist / this.len);
        for (const [k, ch] of this.chunks) { if (!ch) continue; const on = Math.abs(k - c) <= n; if (on !== ch.cast) { ch.cast = on; for (const e of ch.casters) e.render.castShadows = on; } }
    }
    async preload(p, dir, progress) {
        const W = this.wanted(p, dir), n = W.miss.length;
        for (let i = 0; i < n; i++) { this.build(W.miss[i]); if (progress) progress((i + 1) / n); await new Promise(r => setTimeout(r, 0)); }
    }
}
