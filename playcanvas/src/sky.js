// Céu e luz: céus HDRI do Poly Haven (série «qwantani», CC0) como fundo, iluminação ambiente e reflexos; sol direcional
// com sombras em cascata; neblina conforme a hora. Três períodos: manhã, fim de tarde e noite.
// Os HDRI do Poly Haven vêm com exposições diferentes (mediana do céu: manhã 0,20, pôr do sol 0,60, noite de luar 0,48):
// «sky» acerta-os entre si — a noite fica a ~3 % para parecer noite e não um dia nublado.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';

export const TIMES = {
    dia: { hdr: 'assets/hdri/qwantani_mid_morning_puresky_2k.hdr', sun: [42, 125], sunColor: [1, 0.96, 0.9], sunI: 2.6, sky: 1.25, fog: [0.72, 0.8, 0.88], fogD: 0.00055, exposure: 1.12, night: 0 },
    tarde: { hdr: 'assets/hdri/qwantani_sunset_puresky_1k.hdr', sun: [9, 255], sunColor: [1, 0.66, 0.4], sunI: 2.0, sky: 0.42, fog: [0.62, 0.5, 0.42], fogD: 0.0007, exposure: 1.1, night: 0.25 },
    noite: { hdr: 'assets/hdri/qwantani_night_puresky_1k.hdr', sun: [35, 200], sunColor: [0.55, 0.65, 1], sunI: 0.1, sky: 0.03, fog: [0.012, 0.015, 0.025], fogD: 0.0011, exposure: 1.5, night: 1 }
};

const cache = {};
function loadHdr(app, url) {
    if (cache[url]) return cache[url];
    cache[url] = new Promise((res, rej) => {
        const a = new pc.Asset(url, 'texture', { url }, { mipmaps: false, type: pc.TEXTURETYPE_RGBE });
        a.on('load', () => { const t = a.resource; t.projection = pc.TEXTUREPROJECTION_EQUIRECT; t.addressU = pc.ADDRESS_REPEAT; t.addressV = pc.ADDRESS_CLAMP_TO_EDGE; res(t); });
        a.on('error', rej);
        app.assets.add(a); app.assets.load(a);
    });
    return cache[url];
}

export class Sky {
    constructor(app, Q) {
        this.app = app; this.Q = Q;
        this.sun = new pc.Entity('sol');
        this.sun.addComponent('light', {
            type: 'directional', castShadows: Q.shadows, shadowBias: 0.25, normalOffsetBias: 0.06,
            shadowResolution: Q.shadowRes, numCascades: Q.cascades, cascadeDistribution: 0.6, shadowDistance: Q.shadowDist,
            shadowType: Q.softShadows ? pc.SHADOW_PCF5_32F : pc.SHADOW_PCF3_32F
        });
        app.root.addChild(this.sun);
        this.night = 0;
    }
    async set(name) {
        const T = TIMES[name], app = this.app;
        const src = await loadHdr(app, T.hdr);
        const skybox = pc.EnvLighting.generateSkyboxCubemap(src, this.Q.skySize);
        const lighting = pc.EnvLighting.generateLightingSource(src);
        const atlas = pc.EnvLighting.generateAtlas(lighting);
        lighting.destroy();
        if (this._sb) this._sb.destroy();
        if (this._atlas) this._atlas.destroy();
        this._sb = skybox; this._atlas = atlas;
        app.scene.envAtlas = atlas;
        app.scene.skybox = skybox;
        app.scene.skyboxIntensity = T.sky;
        app.scene.skyboxMip = 0;
        app.scene.exposure = T.exposure;
        this.sun.setEulerAngles(T.sun[0], T.sun[1], 0);
        this.sun.light.color = new pc.Color(...T.sunColor);
        this.sun.light.intensity = T.sunI;
        const fog = app.scene.fog;
        fog.type = pc.FOG_EXP2; fog.color = new pc.Color(...T.fog); fog.density = T.fogD;
        this.night = T.night;
        this.name = name;
    }
    applyQuality(Q) {
        this.Q = Q;
        const l = this.sun.light;
        l.castShadows = Q.shadows; l.shadowResolution = Q.shadowRes; l.numCascades = Q.cascades; l.shadowDistance = Q.shadowDist;
        l.shadowType = Q.softShadows ? pc.SHADOW_PCF5_32F : pc.SHADOW_PCF3_32F;
    }
}
