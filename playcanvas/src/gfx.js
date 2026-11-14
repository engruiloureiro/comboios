// Utilitários gráficos: malhas a partir de arrays, texturas (CC0, Poly Haven) e materiais PBR
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';

export function makeMesh(device, { positions, normals, uvs, colors, indices }) {
    const mesh = new pc.Mesh(device);
    mesh.setPositions(positions);
    mesh.setNormals(normals || pc.calculateNormals(positions, indices));
    if (uvs) mesh.setUvs(0, uvs);
    if (colors) mesh.setColors32(colors);
    mesh.setIndices(indices);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    return mesh;
}

// acumulador de geometria: quadriláteros e triângulos com normais planas ou suaves
export class Geo {
    constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
    get count() { return this.p.length / 3; }
    v(P, N, UV, C) {
        this.p.push(P[0], P[1], P[2]); this.n.push(N[0], N[1], N[2]); this.uv.push(UV[0], UV[1]);
        if (C) this.c.push(C[0], C[1], C[2], C[3] ?? 255);
        return this.count - 1;
    }
    // quadrilátero a,b,c,d (sentido anti-horário visto de fora); normal plana calculada se N não for dado
    quad(a, b, c, d, uv, C, N) {
        N = N || norm(cross(sub(b, a), sub(d, a)));
        const k = this.count; uv = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
        this.v(a, N, uv[0], C); this.v(b, N, uv[1], C); this.v(c, N, uv[2], C); this.v(d, N, uv[3], C);
        this.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
    tri(a, b, c, uv, C) {
        const N = norm(cross(sub(b, a), sub(c, a))), k = this.count; uv = uv || [[0, 0], [1, 0], [0.5, 1]];
        this.v(a, N, uv[0], C); this.v(b, N, uv[1], C); this.v(c, N, uv[2], C);
        this.i.push(k, k + 1, k + 2);
    }
    mesh(device) {
        if (!this.i.length) return null;
        return makeMesh(device, {
            positions: new Float32Array(this.p), normals: new Float32Array(this.n), uvs: new Float32Array(this.uv),
            colors: this.c.length ? new Uint8ClampedArray(this.c) : undefined,
            indices: this.count > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i)
        });
    }
}

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// gerador pseudo-aleatório determinístico (o cenário é sempre o mesmo)
export function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export function loadTexture(app, url, { srgb = true, repeat = true, aniso = 8 } = {}) {
    return new Promise((res, rej) => {
        const asset = new pc.Asset(url, 'texture', { url }, { srgb });
        asset.on('load', () => {
            const t = asset.resource;
            if (repeat) { t.addressU = pc.ADDRESS_REPEAT; t.addressV = pc.ADDRESS_REPEAT; }
            t.anisotropy = aniso;
            res(t);
        });
        asset.on('error', rej);
        app.assets.add(asset);
        app.assets.load(asset);
    });
}

// conjunto PBR do Poly Haven: cor (sRGB), normais (OpenGL) e rugosidade
export async function loadPBR(app, base, quality) {
    const dir = 'assets/textures/';
    const [d, n, r] = await Promise.all([
        loadTexture(app, `${dir}${base}_diff_1k.jpg`, { srgb: true, aniso: quality.aniso }),
        loadTexture(app, `${dir}${base}_nor_1k.jpg`, { srgb: false, aniso: quality.aniso }),
        loadTexture(app, `${dir}${base}_rough_512.jpg`, { srgb: false, aniso: quality.aniso })
    ]);
    return { d, n, r };
}

// material PBR: tiling em metros (as UV das malhas estão em metros)
export function pbrMaterial(set, { tile = 1, tint = null, bump = 1, vertexColor = false, metal = 0, cull = pc.CULLFACE_BACK } = {}) {
    const m = new pc.StandardMaterial();
    m.useMetalness = true;
    m.metalness = metal;
    m.diffuseMap = set.d;
    m.normalMap = set.n;
    m.bumpiness = bump;
    m.glossMap = set.r;
    m.glossMapChannel = 'r';
    m.glossInvert = true;      // rugosidade → brilho
    m.gloss = 1;
    const s = 1 / tile;
    for (const k of ['diffuseMapTiling', 'normalMapTiling', 'glossMapTiling']) m[k] = new pc.Vec2(s, s);
    if (tint) m.diffuse = new pc.Color(tint[0], tint[1], tint[2]);
    if (vertexColor) m.diffuseVertexColor = true;
    m.cull = cull;
    m.update();
    return m;
}

export function colorMaterial(rgb, { gloss = 0.3, metal = 0, emissive = null, cull = pc.CULLFACE_BACK, vertexColor = false } = {}) {
    const m = new pc.StandardMaterial();
    m.useMetalness = true; m.metalness = metal; m.gloss = gloss;
    m.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
    if (emissive) { m.emissive = new pc.Color(emissive[0], emissive[1], emissive[2]); m.emissiveIntensity = emissive[3] ?? 1; }
    if (vertexColor) m.diffuseVertexColor = true;
    m.cull = cull;
    m.update();
    return m;
}

export function addRender(app, parent, mesh, material, { castShadows = true, receiveShadows = true, name = 'mesh' } = {}) {
    if (!mesh) return null;
    const e = new pc.Entity(name);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows, receiveShadows });
    parent.addChild(e);
    return e;
}

// textura desenhada num canvas (placas com nomes, folhagem)
// bleed: os píxeis transparentes ficam com a cor média dos opacos (o canvas guarda-os a preto, e as mipmaps escureciam as bordas
// das folhas vistas de lado); os dados vão diretamente para a textura, sem passar outra vez pelo canvas (que é pré-multiplicado)
export function canvasTexture(device, w, h, draw, { srgb = true, mip = true, bleed = false } = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: bleed });
    draw(x, w, h);
    const t = new pc.Texture(device, { width: w, height: h, format: srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8, mipmaps: mip, anisotropy: 4 });
    if (!bleed) { t.setSource(c); return t; }
    const d = x.getImageData(0, 0, w, h).data, sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; n++; }
    const avg = sum.map(v => n ? Math.round(v / n) : 0);
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 8) { d[i] = avg[0]; d[i + 1] = avg[1]; d[i + 2] = avg[2]; }
    const px = t.lock(); px.set(d); t.unlock();
    return t;
}
