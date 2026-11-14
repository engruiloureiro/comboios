# Créditos e licenças do protótipo PlayCanvas

Todos os recursos são gratuitos e têm licença que permite a redistribuição no Cloudflare Pages.

| Recurso | Origem | Licença | Onde está |
|---|---|---|---|
| Motor PlayCanvas 2.23.3 | playcanvas/engine (npm `playcanvas@2.23.3`, build ESM minificada) | MIT — ver `lib/LICENSE-playcanvas.txt` | `lib/playcanvas-2.23.3.min.mjs` |
| UDD CP 9600: modelo, texturas, animações das portas e sons | pacote `CP_9600_RW` para o Train Simulator, de Tiago Miranda e Gonçalo Redondo (já usado pelo simulador) | BSD-3 — ver `../cp9600/LEIA-ME.md` | reutilizado de `../cp9600/` sem cópia nem alteração |
| Céus HDRI `qwantani_mid_morning_puresky`, `qwantani_sunset_puresky`, `qwantani_night_puresky` | Poly Haven — Greg Zaal e Jarod Guest | CC0 | `assets/hdri/` (o disco do sol foi limitado a 400 para não saturar a meia-precisão do WebGPU; o sol vem da luz direcional) |
| Texturas PBR: `leafy_grass` (Charlotte Baglioni), `gray_rocks` (Dimitrios Savva), `old_wood_floor` (Guillaume Monsergent), `rust_coarse_01` (Dimitrios Savva e Rico Cilliers), `concrete_floor_01` e `asphalt_02` (Rob Tuytel), `clay_roof_tiles` e `white_stucco` (Amal Kumar) | Poly Haven | CC0 | `assets/textures/` (difusa e normal a 1k, rugosidade reduzida a 512) |
| Banco `painted_wooden_bench` | Poly Haven — Kirill Sannikov | CC0 | `assets/models/bench/` (texturas reduzidas) |
| Tipos de letra Barlow e Barlow Condensed | Google Fonts (Jeremy Tribby) | SIL Open Font License 1.1 | carregados de fonts.googleapis.com |

Gerados no próprio código (sem recursos externos): via (carris, travessas, balastro), terreno, árvores (folhagem desenhada em canvas), cais, edifícios, casas, sinais, passagens de nível e placas das estações.

Dados do troço (`data/lordelo-vizela.json`): exportados do próprio simulador (eixo, perfil, limites de velocidade, vias, estações, passagens de nível e sinais entre os PK 46,6 e 54,0).
