# Créditos e licenças do protótipo PlayCanvas

Todos os recursos são gratuitos e têm licença que permite a redistribuição no Cloudflare Pages.

| Recurso | Origem | Licença | Onde está |
|---|---|---|---|
| Motor PlayCanvas 2.23.3 | playcanvas/engine (npm `playcanvas@2.23.3`, build ESM minificada) | MIT — ver `lib/LICENSE-playcanvas.txt` | `lib/playcanvas-2.23.3.min.mjs` |
| Traçado, cenário e texturas do cenário | o próprio simulador (`../index.html`), carregado em tempo real | os do simulador | não há cópia: vêm do jogo |
| UDD CP 9600: modelo, texturas, animações das portas e sons | pacote `CP_9600_RW` para o Train Simulator, de Tiago Miranda e Gonçalo Redondo (já usado pelo simulador) | BSD-3 — ver `../cp9600/LEIA-ME.md` | reutilizado de `../cp9600/` sem cópia nem alteração |
| Céus HDRI `qwantani_mid_morning_puresky`, `qwantani_sunset_puresky`, `qwantani_night_puresky` | Poly Haven — Greg Zaal e Jarod Guest | CC0 | `assets/hdri/` (o disco do sol foi limitado a 400 para não saturar a meia-precisão do WebGPU; o sol vem da luz direcional) |
| Tipos de letra Barlow e Barlow Condensed | Google Fonts (Jeremy Tribby) | SIL Open Font License 1.1 | carregados de fonts.googleapis.com |

As texturas e o banco do Poly Haven usados na primeira versão (cenário gerado à parte) foram retirados: o cenário passou a ser o do simulador.
