# Linha de Guimarães 3D — protótipo PlayCanvas

Qualquer troço da Linha de Guimarães do simulador (por omissão Vizela → Guimarães) com a UDD 9600, desenhado com o PlayCanvas.
O traçado e a paisagem são exatamente os do jogo: o simulador (`../index.html`) é carregado num iframe escondido e fornece o eixo,
as estações e a geometria do cenário em blocos de 200 m — terreno, via e agulhas, cais, rio, túneis, pontes, muros, edifícios,
árvores, campos e sinais. O protótipo acrescenta a luz física, as sombras, o céu e a automotora.

Abrir: `playcanvas/index.html` servido por HTTP (o Cloudflare Pages serve-o tal como está; não há passo de compilação).
Em local: `python3 -m http.server` na raiz do repositório e abrir `http://localhost:8000/playcanvas/`. Por `file://` não funciona
(módulos ES, `fetch` e o iframe do simulador).

## O que tem

- Escolha da origem e do destino no topo (qualquer par de estações da linha); o sentido de marcha segue a escolha.
- WebGPU quando o navegador o oferece, com recurso automático a WebGL2 (`?gpu=webgl2` força WebGL2, `?gpu=webgpu` tenta WebGPU).
- Luz física sobre o cenário do simulador: céu HDRI (iluminação ambiente e reflexos), sol com sombras em cascata, neblina,
  MSAA, SSAO (Alto), bloom e vinheta. Manhã, fim de tarde e noite (janelas e candeeiros acesos, faróis).
- Três perfis: Baixo (gráficos integrados), Médio e Alto: mudam a distância de cenário carregado, as sombras e o pós-processamento.
- UDD 9600 com bogies a seguir a via, rodados a girar, escala nas curvas, portas animadas com as pistas originais, faróis e
  farolins conforme o sentido, luz interior à noite.
- Marcha com o manípulo combinado (EM, F5–F1, 0, 1–5), motor diesel, freio a ar, aderência, resistências e rampas; sons originais.
- Paragens com marco, portas do lado do cais, agulha para a via de cruzamento das estações (30 km/h), inversão de marcha.
- Painel, câmaras (cabina, exterior em órbita, cinematográfica) e gravação da posição por troço.

## Ficheiros

| Ficheiro | Função |
|---|---|
| `index.html`, `style.css` | página, painel e menus |
| `src/main.js` | arranque, escolha do troço, operação (paragens, portas, agulhas), teclas, painel |
| `src/bridge.js` | ponte para o simulador: abre-o num iframe escondido e lê o eixo, as estações, os blocos de cenário e as texturas (`window.__PCB` no `index.html` do jogo) |
| `src/world.js` | cenário: converte os blocos do simulador em malhas e materiais do PlayCanvas; carrega-os à frente do comboio e liberta-os atrás |
| `src/route.js` | eixo do troço: posição, rumo, cota, escala, curvatura, limites e vias |
| `src/sky.js`, `src/quality.js` | céu e luz por hora do dia; perfis gráficos e pós-processamento |
| `src/train.js`, `src/physics.js`, `src/audio.js`, `src/cameras.js` | automotora, dinâmica, som e câmaras |
| `src/gfx.js` | vetores |

Recursos e licenças: `CREDITS.md`.
