// Sons originais da UDD 9600 (pacote CP_9600_RW, BSD-3): µ-law 8 bits a 22 kHz em cp9600/cp9600_sons.bin.
// Motor: sete gravações em ciclo com ganho em triângulo à volta do seu regime; rodagem; chiar em curva; juntas dos carris
// (barras de 18 m) eixo a eixo; buzina; portas; travões. Dentro da cabina os sons exteriores ficam abafados.

const ENGINE_PEAKS = [200, 385, 570, 755, 940, 1125, 1310];
// eixos atrás do engate da frente (m): dois bogies por veículo, dois eixos por bogie
const AXLES = [1.8, 4.0, 11.1, 13.3, 19.7, 21.9, 29.0, 31.2];

export class Audio {
    constructor() { this.ok = false; this.started = false; this.nextJoint = null; }

    async init() {
        if (this.ac) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ac = new AC();
        const buf = await (await fetch('../cp9600/cp9600_sons.bin')).arrayBuffer();
        const u = new Uint8Array(buf), dv = new DataView(buf), jl = dv.getUint32(0, true);
        const H = JSON.parse(new TextDecoder().decode(u.subarray(4, 4 + jl))), base = 4 + jl;
        const T = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const v = ~i & 255, sg = v & 0x80, e = (v >> 4) & 7, m = v & 15; const x = (((m << 3) + 132) << e) - 132; T[i] = (sg ? -x : x) / 32768; }
        const B = {};
        for (const [n, sr, o, l] of H) { const b = this.ac.createBuffer(1, l, sr), d = b.getChannelData(0); for (let i = 0; i < l; i++) d[i] = T[u[base + o + i]]; B[n] = b; }
        this.B = B;
        const ac = this.ac;
        this.master = ac.createGain(); this.master.gain.value = 0.9; this.master.connect(ac.destination);
        // caixa: abafa o exterior dentro da cabina
        this.ext = ac.createBiquadFilter(); this.ext.type = 'lowpass'; this.ext.frequency.value = 18000; this.ext.connect(this.master);
        const loop = (b, dest) => { const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const g = ac.createGain(); g.gain.value = 0; s.connect(g); g.connect(dest); s.start(0, Math.random() * b.duration * 0.8); return g; };
        this.eng = [1, 2, 3, 4, 5, 6, 7].map(k => loop(B['idle' + k], this.ext));
        this.rumble1 = loop(B.rumble1, this.ext); this.rumble2 = loop(B.rumble2, this.ext); this.flange = loop(B.flange, this.ext);
        this.comp = loop(B.compressor, this.ext);
        this.hornG = null;
        this.ok = true;
    }
    resume() { if (this.ac && this.ac.state !== 'running') this.ac.resume(); }

    one(name, gain = 1, when = 0, rate = 1, dest) {
        if (!this.ok || !this.B[name]) return;
        const s = this.ac.createBufferSource(); s.buffer = this.B[name]; s.playbackRate.value = rate;
        const g = this.ac.createGain(); g.gain.value = gain; s.connect(g); g.connect(dest || this.ext);
        s.start(this.ac.currentTime + when);
    }
    horn(on) {
        if (!this.ok) return;
        if (on && !this.hornG) {
            const s = this.ac.createBufferSource(); s.buffer = this.B.horn_hi; s.loop = true;
            const g = this.ac.createGain(); g.gain.value = 0.9; s.connect(g); g.connect(this.ext); s.start(); this.hornG = { s, g };
        } else if (!on && this.hornG) {
            const { s, g } = this.hornG, t = this.ac.currentTime; g.gain.setTargetAtTime(0, t, 0.06); s.stop(t + 0.4); this.hornG = null;
        }
    }

    // estado: v (m/s), rpm, curvatura, posição da frente (para as juntas), dentro da cabina, distância da câmara
    update(dt, st) {
        if (!this.ok) return;
        const t = this.ac.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, t, 0.08);
        const rpm = st.engine ? st.rpm : 0, near = st.inside ? 1 : Math.max(0.15, Math.min(1, 25 / (st.camDist + 5)));
        this.ext.frequency.setTargetAtTime(st.inside ? 1700 + st.v * 90 : 16000, t, 0.2);
        ENGINE_PEAKS.forEach((pk, i) => set(this.eng[i], rpm ? Math.max(0, 1 - Math.abs(rpm - pk) / 185) * 0.55 * near : 0));
        const v = Math.abs(st.v);
        set(this.rumble1, (v > 1.4 && v < 12 ? Math.min(1, (v - 1.4) / 4) : v >= 12 ? Math.max(0, 1 - (v - 12) / 2) : 0) * 0.5 * near);
        set(this.rumble2, (v > 11.5 ? Math.min(1, (v - 11.5) / 4) : 0) * 0.55 * near);
        set(this.flange, Math.min(1, v / 14) * Math.min(1, Math.abs(st.curv) / 0.005) * 0.35 * near);
        set(this.comp, st.engine && st.compressor ? 0.25 * near : 0);
        // juntas: a cada 18 m (barras), cada eixo passa por ela; o som chega com o atraso de cada eixo
        if (v > 0.5) {
            const pos = st.pAlong;
            if (this.nextJoint === null) this.nextJoint = Math.ceil(pos / 18) * 18;
            while (pos >= this.nextJoint) {
                AXLES.forEach((d, i) => this.one('tim' + (1 + (i + (Math.random() * 3 | 0)) % 4), 3.0 * Math.min(1.7, 0.4 + v / 11) * (i % 2 ? 0.85 : 1) * Math.exp(-d / 30) * near * 0.35, d / v, 0.94 + Math.random() * 0.12));
                this.nextJoint += 18;
            }
        } else this.nextJoint = null;
    }
}
