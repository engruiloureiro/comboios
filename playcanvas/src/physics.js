// Marcha da UDD 9600: modelo determinístico simplificado com os dados do pacote CP_9600_RW (cp9600.json).
// Manípulo combinado como no simulador: EM, F5…F1 (travão), 0, 1…5 (tração).
// Forças: tração (curva de esforço, potência no carril 525 kW, rotação do motor a subir 100 rpm/s), travão pneumático
// (pressão do cilindro a subir 10 psi/s, a aliviar 5 psi/s; emergência 55 psi/s até 90 psi), resistência ao rolamento,
// resistência do ar, resistência em curva e declive. Massa do reboque estimada (não está nos dados do pacote).

export const NOTCH = ['EM', 'F5', 'F4', 'F3', 'F2', 'F1', '0', '1', '2', '3', '4', '5'];
const G = 9.81;

function interp(tab, x) {
    if (x <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [a, va] = tab[i - 1], [b, vb] = tab[i]; return va + (vb - va) * (x - a) / (b - a); }
    return tab[tab.length - 1][1];
}

export class Physics {
    constructor(cp) {
        this.cp = cp;
        const V = cp.veiculo, M = cp.motor;
        this.massMotora = V.massa_t * 1000;
        this.massReboque = 30000;               // estimativa (não documentada no pacote)
        this.m = this.massMotora + this.massReboque;
        this.mEff = this.m * 1.08;              // massas rotativas
        this.Fmax = M.forca_max_kN * 1000;
        this.P = M.potencia_carril_kW * 1000;
        this.vmax = M.vel_max_kmh / 3.6;
        this.curve = M.esforco_vs_velocidade;   // relativo (500 = esforço máximo)
        this.rpmIdle = M.rpm_ralenti; this.rpmMax = M.rpm_max; this.rpmRate = M.rpm_variacao_max_s;
        this.reset();
    }
    reset() {
        this.v = 0; this.notch = 6; this.rpm = this.rpmIdle; this.engine = false; this.engineT = 0;
        this.bc = 0;                            // pressão no cilindro de travão (psi)
        this.force = 0; this.acc = 0; this.reverser = 1;
    }
    get traction() { return this.notch > 6 ? (this.notch - 6) / 5 : 0; }
    get brakeLevel() { return this.notch < 6 ? (this.notch === 0 ? 1.3 : (6 - this.notch) / 5) : 0; }
    get emergency() { return this.notch === 0; }

    // dt em segundos; grade = declive (m/m, positivo a subir no sentido +p); curv = curvatura (1/m); dir = sentido de marcha
    step(dt, { grade, curv, dir }) {
        const T = this.cp.travao;
        // motor: rotação alvo pela posição do manípulo (ralenti a 200 rpm, 1310 rpm no ponto 5)
        if (this.engineT > 0) { this.engineT -= dt; if (this.engineT <= 0) this.engine = true; }
        const rpmT = this.engine ? this.rpmIdle + this.traction * (1310 - this.rpmIdle) : 0;
        const rate = this.rpmRate * 2.5;
        this.rpm += Math.sign(rpmT - this.rpm) * Math.min(Math.abs(rpmT - this.rpm), rate * dt);
        const pw = this.engine ? Math.max(0, (this.rpm - this.rpmIdle) / (1310 - this.rpmIdle)) : 0;
        // tração: curva de esforço, limitada pela potência e pela aderência (motora: 4 eixos motores?) e à velocidade máxima
        const kmh = this.v * 3.6;
        let Ft = this.Fmax * interp(this.curve, kmh) / 500 * pw;
        if (this.v > 0.5) Ft = Math.min(Ft, this.P * pw / this.v);
        Ft = Math.min(Ft, 0.25 * this.massMotora * G);
        if (this.v > this.vmax) Ft = 0;
        // travão: pressão do cilindro
        const target = this.emergency ? T.pressao_cilindro_max_psi : this.brakeLevel * T.pressao_cilindro_forca_max_psi;
        const r = this.emergency ? T.emergencia_taxa : target > this.bc ? T.taxa_aplicacao_psi_s : T.taxa_alivio_psi_s;
        this.bc += Math.sign(target - this.bc) * Math.min(Math.abs(target - this.bc), r * dt);
        // 70 psi → 1,0 m/s² de desaceleração; 90 psi (emergência) → 1,3 m/s²
        const Fb = this.bc / T.pressao_cilindro_forca_max_psi * 1.0 * this.m;
        // resistências
        const Fr = this.m * G * (this.cp.veiculo.atrito_rolamento + 0.0008) + 0.5 * 1.225 * this.cp.veiculo.coef_arrasto * 0.6 * this.v * this.v;
        const Fc = this.m * G * Math.min(0.02, 0.4 * Math.abs(curv));   // ≈ 400/R N/kN em via métrica
        const Fg = this.m * G * grade * dir;                             // a subir no sentido da marcha trava
        // as resistências opõem-se ao movimento; parada, só arranca se a força vencer o atrito
        const Fres = Fr + Fc;
        let Fnet;
        if (Math.abs(this.v) > 0.01) Fnet = Ft - Fg - Math.sign(this.v) * Fres;
        else { const F0 = Ft - Fg; Fnet = Math.abs(F0) <= Fres ? 0 : F0 - Math.sign(F0) * Fres; }
        let a = Fnet / this.mEff;
        // travão e resistências não invertem o sentido
        const dec = (Fb) / this.mEff;
        let v = this.v + a * dt;
        if (v > 0) v = Math.max(0, v - dec * dt);
        else if (v < 0) v = Math.min(0, v + dec * dt);
        // a composição parada fica parada se o travão aguenta o declive
        if (Math.abs(this.v) < 0.05 && Ft < Math.abs(Fg) + Fr && Fb > Math.abs(Fg)) v = 0;
        this.acc = (v - this.v) / dt;
        this.v = v;
        this.force = Ft;
        return v;
    }
    startEngine() { if (!this.engine && this.engineT <= 0) { this.engineT = 4.5; return true; } return false; }
    stopEngine() { this.engine = false; this.engineT = 0; }
}
