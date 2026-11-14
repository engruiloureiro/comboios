// Eixo da via a partir dos dados exportados do simulador (index.html): posição, rumo, cota, limites e vias em cada 5 m.
// Coordenadas: x para leste, z = −norte (como no simulador), y para cima; origem no primeiro ponto do troço.
// A escala (inclinação da via nas curvas) segue a mesma regra do simulador: c = 14 m × 1/R, até 90 mm, plana nas estações,
// nas passagens de nível e onde há mais de uma via.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class Route {
    constructor(D) {
        this.D = D;
        this.seg = D.seg;
        this.p0 = D.p0;
        this.p1 = D.p1;
        const ax = D.ax, n = ax.length;
        this.n = n;
        this.ox = ax[0][0];
        this.oz = ax[0][1];
        this.oy = Math.min(...ax.map(a => a[2])) - 2;
        this.X = new Float64Array(n); this.Z = new Float64Array(n); this.Y = new Float64Array(n); this.H = new Float64Array(n);
        this.LIM = new Uint8Array(n); this.LNS = [];
        for (let i = 0; i < n; i++) {
            const a = ax[i];
            this.X[i] = a[0] - this.ox; this.Z[i] = a[1] - this.oz; this.Y[i] = a[2] - this.oy; this.H[i] = a[3];
            this.LIM[i] = a[4]; this.LNS.push(a[5]);
        }
        this.stations = D.stations;
        this.pn = D.pn || [];
        this.sig = D.sig || [];
        this._cant();
    }

    // distância à estação mais próxima (para anular as curvas em S e a escala junto aos cais, como no simulador)
    stF(p) {
        let d = 1e9;
        for (const s of this.stations) d = Math.min(d, p < s.pa ? s.pa - p : p > s.pb ? p - s.pb : 0);
        return clamp((d - 80) / 200, 0, 1);
    }

    _cant() {
        const n = this.n, raw = new Float32Array(n), seg = this.seg;
        this.K = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const a = this.H[clamp(i - 1, 0, n - 1)], b = this.H[clamp(i + 1, 0, n - 1)];
            this.K[i] = (b - a) / (2 * seg);
        }
        for (let i = 0; i < n; i++) {
            const p = this.p0 + i * seg;
            let k = 0, m = 0;
            for (let d = -2; d <= 2; d++) { k += this.K[clamp(i + d, 0, n - 1)]; m++; }
            k /= m;
            let ok = true;
            for (let d = -4; d <= 4 && ok; d++) if (this.LNS[clamp(i + d, 0, n - 1)].length > 1) ok = false;
            if (ok && this.pn.some(q => Math.abs(q.pos - p) < 30)) ok = false;
            if (!ok) continue;
            const c = Math.min(0.09, 14 * Math.abs(k)) * this.stF(p);
            raw[i] = -Math.sign(k) * c / 1.06;
        }
        this.CT = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            let a = 0, m = 0;
            for (let d = -5; d <= 5; d++) { a += raw[clamp(i + d, 0, n - 1)]; m++; }
            this.CT[i] = a / m;
        }
    }

    fi(p) { return clamp((p - this.p0) / this.seg, 0, this.n - 1.000001); }

    // Catmull-Rom nos pontos de 5 m: curvas sem facetas
    _cr(A, f) {
        const n = this.n, i = Math.floor(f), t = f - i;
        const p0 = A[clamp(i - 1, 0, n - 1)], p1 = A[i], p2 = A[clamp(i + 1, 0, n - 1)], p3 = A[clamp(i + 2, 0, n - 1)];
        const t2 = t * t, t3 = t2 * t;
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }

    _lin(A, f) { const i = Math.floor(f), t = f - i; return A[i] + (A[Math.min(i + 1, this.n - 1)] - A[i]) * t; }

    limit(p) { return this.LIM[Math.round(this.fi(p))]; }
    cant(p) { return this._lin(this.CT, this.fi(p)); }
    grade(p) { const d = 2; return (this.height(p + d) - this.height(p - d)) / (2 * d); }
    height(p) { return this._cr(this.Y, this.fi(p)); }
    curvature(p) { return this._lin(this.K, this.fi(p)); }

    // referencial da via em p: C (eixo, ao nível da cota), F (frente), R (direita), U (cima, já com a escala se withCant)
    frame(p, withCant = true) {
        const f = this.fi(p);
        const x = this._cr(this.X, f), z = this._cr(this.Z, f), y = this._cr(this.Y, f);
        const h = this._lin(this.H, f);
        const g = this.grade(p);
        let F = [Math.sin(h), g, -Math.cos(h)];
        const l = Math.hypot(F[0], F[1], F[2]); F = [F[0] / l, F[1] / l, F[2] / l];
        let R = [Math.cos(h), 0, Math.sin(h)];
        let U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
        if (withCant) {
            const th = Math.atan(this.cant(p)), c = Math.cos(th), s = Math.sin(th);
            const R2 = [R[0] * c + U[0] * s, R[1] * c + U[1] * s, R[2] * c + U[2] * s];
            U = [U[0] * c - R[0] * s, U[1] * c - R[1] * s, U[2] * c - R[2] * s];
            R = R2;
        }
        return { C: [x, y, z], F, R, U };
    }

    // ponto a o metros para a direita e up metros para cima do eixo (sem escala: para o terreno e os objetos)
    point(p, o, up = 0, withCant = false) {
        const fr = this.frame(p, withCant);
        return [fr.C[0] + fr.R[0] * o + fr.U[0] * up, fr.C[1] + fr.R[1] * o + fr.U[1] * up, fr.C[2] + fr.R[2] * o + fr.U[2] * up];
    }

    // vias em cada ponto: a principal (0) e, nas estações de cruzamento, a segunda via com o seu desvio lateral
    lines() {
        const out = [{ main: true, a: this.p0, b: this.p1, off: () => 0 }];
        let cur = null;
        const close = () => {
            if (!cur) return;
            const S = cur.s, a = cur.a, b = cur.b, seg = this.seg;
            out.push({ main: false, a, b, off: p => { const f = clamp((p - a) / seg, 0, S.length - 1), i = Math.floor(f), t = f - i; const v0 = S[i], v1 = S[Math.min(i + 1, S.length - 1)]; return v0 + (v1 - v0) * t; } });
            cur = null;
        };
        for (let i = 0; i < this.n; i++) {
            const L = this.LNS[i], p = this.p0 + i * this.seg;
            const o = L.filter(v => Math.abs(v) > 0.01);
            if (o.length) {
                const v = o.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
                if (!cur) cur = { a: p - this.seg, s: [0], b: p };
                cur.s.push(v); cur.b = p;
            } else if (cur) { cur.s.push(0); cur.b = p; close(); }
        }
        close();
        return out;
    }
}

export { clamp, sstep };
