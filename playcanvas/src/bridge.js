// Ponte para o simulador atual (../index.html): é carregado num iframe escondido e fornece, só para leitura, o eixo da via, as
// estações, a geometria do cenário em blocos de 200 m (terreno, via, rio, túneis, pontes, muros, edifícios, árvores) e as texturas.
// Assim o traçado e a paisagem do protótipo são exatamente os do jogo, em qualquer troço da linha, sem ficheiros exportados.

export async function openGame(line = 'guimaraes') {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:absolute;width:640px;height:360px;left:-9999px;top:0;visibility:hidden;border:0';
    f.src = '../index.html?linha=' + line;
    document.body.appendChild(f);
    await new Promise((res, rej) => { f.onload = res; f.onerror = () => rej(new Error('Não foi possível carregar o simulador (../index.html).')); });
    const w = f.contentWindow;
    for (let k = 0; k < 200 && !w.__PCB; k++) await new Promise(r => setTimeout(r, 50));
    if (!w.__PCB) throw new Error('O simulador carregado não tem a ponte do protótipo (versão antiga do index.html?).');
    return new Game(w, f);
}

export class Game {
    constructor(w, frame) {
        this.w = w; this.frame = frame; this.B = w.__PCB;
        this.seg = this.B.seg; this.total = this.B.total; this.ch = this.B.ch;
        this.len = this.total * this.seg;
        this.stations = JSON.parse(JSON.stringify(this.B.stations()));
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
    chunk(c) { return this.B.chunk(c); }
    textures() { return this.B.tex(); }
    atlasKeys() { return this.B.atlasKeys(); }
    terr(p, o) { return this.B.terr(p, o); }
    lamps(A, B) { return Array.from(this.B.lamps(A, B), l => [l[0], l[1], l[2]]); }
}
