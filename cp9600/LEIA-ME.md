# CP UDD 9600 — recursos convertidos do modelo original

Origem: pacote `CP_9600_RW` para o Train Simulator (RailWorks), de Tiago Miranda e Gonçalo Redondo (licença BSD-3).

- `cp9600_motora.glb` — modelo 3D da motora convertido diretamente do ficheiro 3ds Max original
  (`CP 9600 Motora (MAX2013) Export New Springs R2T`), com a geometria, os UV e as texturas originais
  (31 peças: caixa, interior, bancos, janelas, bogies, rodados, engate, portas e luzes). Eixo y para cima, frente em −z, metros.
- `portas.json` — animações das quatro portas de fole (PortaD02, D03, E02, E03), lidas dos ficheiros `.IA`.
- `cp9600_sons.bin` — sons originais (motor em 7 patamares, subidas/descidas, portas, buzina, travões,
  compressor, rodagem, chiar em curva e juntas), em µ-law 8 bits a 22 kHz.
- `cp9600.json` — dados técnicos lidos dos XML/CSV (massa, dimensões, potência, curva de esforço de tração,
  travões, curvas do som do motor, posições das luzes).
- `ferramentas/` — conversores em Python: leitor do formato .max (blocos da cena), exportador para GLB,
  leitor das animações .IA, conversor DDS→PNG e empacotador de sons.

Não convertidos: os `.skp` (formato fechado do SketchUp; o reboque só existe nesse formato).
