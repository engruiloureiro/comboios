// Ponte para o simulador atual (../simulador.html): é carregado num iframe escondido, em modo «embed», e passa a ser o motor do jogo.
// O simulador faz as regras — marcha, horário, outros comboios, cruzamentos, sinais, chefe de estação, pontuação e som — e fornece
// o eixo da via e a geometria do cenário; o PlayCanvas comanda o ciclo (tick), envia os comandos e desenha tudo.
// Do lado do jogo, tudo isto está em window.__PCB.

export async function openGame(line = 'guimaraes') {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:absolute;width:640px;height:360px;left:-9999px;top:0;visibility:hidden;border:0';
    f.src = '../simulador.html?linha=' + line + '&embed=1';
    document.body.appendChild(f);
    await new Promise((res, rej) => { f.onload = res; f.onerror = () => rej(new Error('Não foi possível carregar o simulador (../simulador.html).')); });
    const w = f.contentWindow;
    for (let k = 0; k < 200 && !w.__PCB; k++) await new Promise(r => setTimeout(r, 50));
    if (!w.__PCB || !w.__PCB.tick) throw new Error('O simulador carregado não tem a ponte do protótipo (versão antiga do simulador.html?).');
    return new Game(w, f);
}

export class Game {
    constructor(w, frame) {
        this.w = w; this.frame = frame; this.B = w.__PCB;
        this.seg = this.B.seg; this.total = this.B.total; this.ch = this.B.ch;
        this.len = this.total * this.seg;
        this.stations = JSON.parse(JSON.stringify(this.B.stations()));
        this.cmd = this.B.cmd;
    }
    // dados do troço [A,B] no formato que o Route espera
    section(A, B) {
        const D = this.B.axis(Math.max(0, A), Math.min(this.len, B));
        D.ax = Array.from(D.ax, a => [a[0], a[1], a[2], a[3], a[4], Array.from(a[5])]);
        D.cant = Array.from(D.cant);
        D.stations = this.stations.filter(s => s.pos > D.p0 + 60 && s.pos < D.p1 - 60);
        D.pn = JSON.parse(JSON.stringify(this.B.pn())).filter(q => q.pos > D.p0 && q.pos < D.p1);
        D.sig = JSON.parse(JSON.stringify(this.B.sig())).filter(g => g.p > D.p0 && g.p < D.p1);
        D.tunnels = Array.from(this.B.tunnels(), t => [t[0], t[1]]);
        return D;
    }
    // cenário
    chunk(c) { return this.B.chunk(c); }
    textures() { return this.B.tex(); }
    atlasKeys() { return this.B.atlasKeys(); }
    terr(p, o) { return this.B.terr(p, o); }
    lamps(A, B) { return Array.from(this.B.lamps(A, B), l => [l[0], l[1], l[2]]); }
    landmarks() { return this.B.landmarks(); }
    dyn(ex, ez) { return this.B.dyn(ex, ez); }
    // jogo
    timetable() { return JSON.parse(JSON.stringify(this.B.timetable())); }
    lineOpts(n) { return Array.from(this.B.lineOpts(n)); }
    start(n, ln) { this.B.startTT(n, ln); }
    tick(dt) { this.B.tick(dt); }
    state() { return this.B.state(); }
    hud() { return this.B.hud(); }
    end() { return this.B.end(); }
    tx(p) { return this.B.tx(p); }
    key(type, key, code) { this.B.key(type, key, code); }
    setCam(m) { this.B.setCam(m); }
    audio() { this.B.audio(); }
    set onToast(f) { this.B.onToast = f; }
}
