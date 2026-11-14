// Perfis gráficos. Baixo: computadores da escola (gráficos integrados); Médio: equilíbrio; Alto: placas dedicadas.
// O que pede reconstrução (densidade de árvores, casas, resolução do céu) só muda ao recarregar a página.
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';

export const PROFILES = {
    baixo: {
        name: 'Baixo', pixelRatio: 1, scale: 0.8, samples: 1, shadows: true, shadowRes: 1024, cascades: 1, shadowDist: 90, softShadows: false,
        ssao: false, bloom: 0, taa: false, sharp: 0.25, treeDensity: 0.55, treeShadows: false, houses: 50, sleeperDist: 350, treeDist: 900,
        farCell: 80, skySize: 512, aniso: 2, a2c: false, clearCoat: false, fogMul: 1.3, vignette: 0.15
    },
    medio: {
        name: 'Médio', pixelRatio: 1, scale: 1, samples: 2, shadows: true, shadowRes: 2048, cascades: 2, shadowDist: 160, softShadows: true,
        ssao: false, bloom: 0.004, taa: false, sharp: 0.15, treeDensity: 0.95, treeShadows: false, houses: 90, sleeperDist: 600, treeDist: 1500,
        farCell: 60, skySize: 1024, aniso: 4, a2c: true, clearCoat: true, fogMul: 1, vignette: 0.2
    },
    alto: {
        name: 'Alto', pixelRatio: Math.min(2, window.devicePixelRatio || 1), scale: 1, samples: 4, shadows: true, shadowRes: 4096, cascades: 4, shadowDist: 320, softShadows: true,
        ssao: true, bloom: 0.006, taa: false, sharp: 0.1, treeDensity: 1.4, treeShadows: true, houses: 140, sleeperDist: 900, treeDist: 2600,
        farCell: 40, skySize: 1024, aniso: 8, a2c: true, clearCoat: true, fogMul: 0.85, vignette: 0.22
    }
};

export function loadProfile() {
    let k = 'medio';
    try { k = localStorage.getItem('pc-qual') || ''; } catch (e) { }
    if (!PROFILES[k]) k = autoProfile();
    return k;
}
// primeira visita: baixo em ecrãs pequenos ou GPU integrada fraca, médio nos outros
function autoProfile() {
    const small = Math.min(screen.width, screen.height) < 700, cores = navigator.hardwareConcurrency || 4;
    return small || cores <= 4 ? 'baixo' : 'medio';
}
export function saveProfile(k) { try { localStorage.setItem('pc-qual', k); } catch (e) { } }

// pós-processamento (CameraFrame do PlayCanvas): tom ACES, MSAA, SSAO, bloom subtil, vinheta e nitidez
export function applyFrame(cf, Q, device) {
    cf.rendering.toneMapping = pc.TONEMAP_ACES2;
    cf.rendering.samples = Q.samples;
    cf.rendering.renderTargetScale = Q.scale;
    cf.rendering.sharpness = Q.sharp;
    cf.ssao.type = Q.ssao ? pc.SSAOTYPE_LIGHTING : pc.SSAOTYPE_NONE;
    if (Q.ssao) { cf.ssao.intensity = 0.45; cf.ssao.radius = 1.2; cf.ssao.samples = 12; cf.ssao.blurEnabled = true; cf.ssao.minAngle = 15; }
    cf.bloom.intensity = Q.bloom;
    cf.bloom.blurLevel = 6;
    cf.vignette.intensity = Q.vignette; cf.vignette.inner = 0.55; cf.vignette.outer = 1.2; cf.vignette.curvature = 0.6;
    cf.grading.enabled = true; cf.grading.saturation = 1.05; cf.grading.contrast = 1.04; cf.grading.brightness = 1.0;
    cf.taa.enabled = Q.taa;
    cf.update();
    device.maxPixelRatio = Q.pixelRatio;
}
