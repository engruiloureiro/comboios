# Linha de Guimarães 3D — protótipo PlayCanvas

Cena de demonstração da migração gráfica (fase 2 do plano em `../docs/playcanvas-diagnostico.md`): a UDD 9600 entre Lordelo e Vizela
(7,4 km, PK 46,6–54,0), com o eixo, o perfil, os limites, as vias e as estações exportados do simulador atual.

Abrir: `playcanvas/index.html` servido por HTTP (o Cloudflare Pages serve-o tal como está; não há passo de compilação).
Em local: `python3 -m http.server` na raiz do repositório e abrir `http://localhost:8000/playcanvas/`. Por `file://` não funciona
(módulos ES e `fetch`).

## O que tem

- WebGPU quando o navegador o oferece, com recurso automático a WebGL2 (`?gpu=webgl2` força WebGL2, `?gpu=webgpu` tenta WebGPU).
- Luz física: materiais PBR, céu HDRI (iluminação ambiente e reflexos), sol com sombras em cascata, neblina, tom ACES,
  MSAA, SSAO (Alto), bloom e vinheta. Manhã, fim de tarde e noite (candeeiros dos cais e faróis acesos).
- Três perfis: Baixo (gráficos integrados), Médio e Alto. A primeira visita escolhe um automaticamente; a escolha fica gravada.
- UDD 9600 com bogies a seguir a via, rodados a girar, escala nas curvas, portas animadas com as pistas originais, faróis e
  farolins conforme o sentido, luz interior à noite.
- Marcha com o manípulo combinado (EM, F5–F1, 0, 1–5), motor diesel com rotação, freio a ar com cilindro, aderência, resistências e
  rampas; sons originais (motor, rodagem, frisos nas curvas, juntas dos carris, compressor, portas, buzina).
- Paragens com marco (precisão da paragem), portas do lado do cais, agulhas de Lordelo e Vizela (via 2 a 30 km/h), inversão de marcha.
- Painel: velocímetro com arco do limite, limite atual, próxima paragem e distância, lado do cais, manípulo, cilindro do freio,
  rotação, portas e hora. Câmaras: cabina (posição do pacote), exterior em órbita e cinematográfica junto à via.
- Gravar e recuperar a posição (no navegador).

## Ficheiros

| Ficheiro | Função |
|---|---|
| `index.html`, `style.css` | página, painel e menus |
| `src/main.js` | arranque, carregamento, operação (paragens, portas, agulhas), teclas, painel, nível de detalhe |
| `src/route.js` | eixo do troço: posição, rumo, cota, escala, curvatura, limites e vias a partir dos dados exportados |
| `src/track.js`, `src/terrain.js`, `src/vegetation.js`, `src/stations.js` | via, terreno, árvores, estações, casas, passagens de nível e sinais |
| `src/sky.js`, `src/quality.js` | céu e luz por hora do dia; perfis gráficos e pós-processamento |
| `src/train.js`, `src/physics.js`, `src/audio.js`, `src/cameras.js` | automotora, dinâmica, som e câmaras |
| `src/gfx.js` | malhas, texturas e materiais |
| `data/lordelo-vizela.json` | troço exportado do simulador |
| `ferramentas/exportar-troco.js` | volta a gerar o JSON a partir do `index.html` (Playwright): `node playcanvas/ferramentas/exportar-troco.js` |

Recursos e licenças: `CREDITS.md`.
