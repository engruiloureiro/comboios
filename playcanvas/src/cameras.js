// Câmaras: cabina (posição do maquinista do pacote, Camera Cabine.xml: x −0,8, y 2,5, z 8,0), exterior em órbita
// (rato/toque para rodar, roda para aproximar) e cinematográfica (câmaras fixas junto à via, à frente do comboio).
import * as pc from '../lib/playcanvas-2.23.3.min.mjs';
import { add, sub, mul, norm, cross } from './gfx.js';

export const MODES = ['cab', 'ext', 'cine'];
export const MODE_NAME = { cab: 'Cabina', ext: 'Exterior', cine: 'Cinematográfica' };

export class Cameras {
    constructor(app, cam, route, TF) {
        this.app = app; this.cam = cam; this.route = route; this.TF = TF;
        this.mode = 'cab';
        this.yaw = 0; this.pitch = 0;               // olhar na cabina
        this.oyaw = 2.3; this.opitch = 0.22; this.odist = 32;   // órbita
        this.cine = null; this.seed = 1;
        this.smooth = null;
        const el = app.graphicsDevice.canvas;
        let drag = null;
        el.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; el.setPointerCapture(e.pointerId); });
        el.addEventListener('pointermove', e => {
            if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; drag = [e.clientX, e.clientY];
            if (this.mode === 'cab') { this.yaw = Math.max(-1.6, Math.min(1.6, this.yaw - dx * 0.004)); this.pitch = Math.max(-0.7, Math.min(0.5, this.pitch - dy * 0.004)); }
            else if (this.mode === 'ext') { this.oyaw -= dx * 0.006; this.opitch = Math.max(0.03, Math.min(1.35, this.opitch + dy * 0.004)); }
        });
        el.addEventListener('pointerup', () => { drag = null; });
        el.addEventListener('wheel', e => { if (this.mode === 'ext') { this.odist = Math.max(9, Math.min(160, this.odist * Math.exp(e.deltaY * 0.001))); e.preventDefault(); } }, { passive: false });
        el.addEventListener('dblclick', () => { this.yaw = 0; this.pitch = 0; });
    }
    set(mode) { this.mode = mode; this.cine = null; this.smooth = null; }

    update(dt, train, s) {
        const cam = this.cam;
        // veículo da frente (com a cabina virada para o sentido de marcha)
        const lead = train.cars.find(c => c.lead) || train.cars[0];
        if (this.mode === 'cab') {
            const R = lead.R, U = lead.U, F = lead.F, O = lead.O;
            const eye = add(add(add(O, mul(F, 8.0)), mul(R, -0.8)), mul(U, 2.5 + Math.sin(performance.now() / 140) * 0.004 * Math.min(1, s.v / 15)));
            // olhar: à frente, rodado pelo rato (guinada à volta de U, inclinação à volta de R)
            // como no simulador: 85 % em frente e 15 % para a via 38 m adiante (a 2 m do carril)
            const pa = s.pFront + s.dir * 38, ahead = this.route.point(pa, s.off ? s.off(pa) : 0, 2.0);
            const F0 = norm(add(mul(F, 0.85), mul(norm(sub(ahead, eye)), 0.15))), R0 = norm(cross(F0, U));
            const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
            const fwd = norm(add(add(mul(F0, cy * cp), mul(R0, -sy * cp)), mul(U, sp)));
            cam.setPosition(eye[0], eye[1], eye[2]);
            this._look(eye, fwd, U);
            cam.camera.fov = 66; cam.camera.nearClip = 0.05;
            return { inside: true, dist: 0 };
        }
        const mid = s.pFront - s.dir * 18.9, C = this.route.frame(mid, false), om = s.off ? s.off(mid) : 0;
        const target = add(add(C.C, mul(C.R, om)), [0, 2.2, 0]);
        if (this.mode === 'ext') {
            const h = Math.atan2(C.F[0], -C.F[2]) * (s.dir > 0 ? 1 : 1) + (s.dir < 0 ? Math.PI : 0) + this.oyaw;
            const d = this.odist, eye = [target[0] + Math.sin(h) * d * Math.cos(this.opitch), target[1] + d * Math.sin(this.opitch), target[2] - Math.cos(h) * d * Math.cos(this.opitch)];
            const p = this._terrainClamp(eye, mid);
            if (!this.smooth) this.smooth = p.slice(); else for (let k = 0; k < 3; k++) this.smooth[k] += (p[k] - this.smooth[k]) * Math.min(1, dt * 6);
            cam.setPosition(...this.smooth); cam.lookAt(target[0], target[1], target[2]);
            cam.camera.fov = 50; cam.camera.nearClip = 0.3;
            return { inside: false, dist: d };
        }
        // cinematográfica: câmara fixa à frente do comboio, ao lado da via; muda quando o comboio passa
        if (!this.cine || s.dir * (s.pFront - this.cine.p) > 70) {
            const r = () => { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; };
            const p = Math.max(this.route.p0 + 20, Math.min(this.route.p1 - 20, s.pFront + s.dir * (140 + r() * 140)));
            const o = (r() < 0.5 ? -1 : 1) * (6 + r() * 9), P = this.TF.pos(p, o);
            this.cine = { p, pos: [P[0], P[1] + 1.4 + r() * 3.5, P[2]] };
        }
        const pos = this.cine.pos, dist = Math.hypot(pos[0] - target[0], pos[2] - target[2]);
        if (!this.smooth) this.smooth = target.slice(); else for (let k = 0; k < 3; k++) this.smooth[k] += (target[k] - this.smooth[k]) * Math.min(1, dt * 3);
        cam.setPosition(...pos); cam.lookAt(...this.smooth);
        // objetiva: teleobjetiva ao longe, grande angular perto
        cam.camera.fov = Math.max(18, Math.min(60, Math.atan2(26, dist) * 2 * 180 / Math.PI));
        cam.camera.nearClip = 0.3;
        return { inside: false, dist };
    }
    _look(eye, fwd, up) {
        const t = add(eye, fwd);
        this.cam.lookAt(new pc.Vec3(t[0], t[1], t[2]), new pc.Vec3(up[0], up[1], up[2]));
    }
    _terrainClamp(eye, p) {
        // não deixa a câmara entrar no terreno
        try { const o = 0; const y = this.TF ? this.route.frame(p, false).C[1] : 0; if (eye[1] < y + 1.2) eye[1] = y + 1.2; } catch (e) { }
        return eye;
    }
}
