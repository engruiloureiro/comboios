# Linha de Guimarães em PlayCanvas

O jogo completo entre a Trindade e Guimarães, com o horário de 1985, desenhado com o PlayCanvas.

As regras são as do simulador (`../simulador.html`), que corre escondido num iframe em modo `?embed`: marcha, horário, outros comboios e
cruzamentos, sinais, chefe de estação, passageiros, pontuação e som. O simulador fornece também o eixo da via e a geometria do
cenário. O PlayCanvas comanda o ciclo, envia os comandos e desenha tudo com luz física, sombras e céu HDRI.

Abrir: `playcanvas/index.html` servido por HTTP (o Cloudflare Pages serve-o tal como está; não há passo de compilação).
Em local: `python3 -m http.server` na raiz do repositório e abrir `http://localhost:8000/playcanvas/`. Por `file://` não funciona
(módulos ES, `fetch` e o iframe do simulador).

## 1.ª fase (feita)

- Lista do horário de 1985: os comboios que circulam só entre a Trindade e Guimarães (regionais, rápidos, serviços de Lousado e
  Santo Tirso e tranvias da Senhora da Hora). Na Trindade e em Guimarães escolhe-se a linha de partida.
- Outros comboios à hora, com cruzamentos nas estações; sinais com o aspeto real, cancelas, agulhas, passageiros nos cais e chefe
  de estação (geometria dinâmica do simulador, refeita em cada imagem).
- Teclas do simulador: 8/2 (ou setas) manípulo, 9 homem-morto, 7/3/1/4 buzinas (Espaço = aguda), E portas, R inversor, Z agulha,
  T tempo acelerado, P pausa, I ignição. C muda de câmara.
- Painel: velocímetro, velocidade máxima em losango branco (sinalização ferroviária), próxima mudança de velocidade com a
  distância, próximo sinal (aspeto e distância), próxima passagem de nível (com o aviso de buzinar), próxima paragem, hora,
  tempo de viagem, pontualidade, pontos, gasóleo, mensagens do serviço e alarme do homem-morto.
- Céu conforme a hora do comboio (manhã, fim de tarde, noite), com candeeiros, janelas e faróis à noite.
- Fim de serviço com a pontuação do simulador; pausa.

## 2.ª fase (por fazer)

Abastecimento e manobras de oficina, unidade dupla e acoplagem, pinturas de origem e frentes sem porta, passageiros a bordo vistos
pelas janelas, fumo do escape, gravar e retomar o jogo, comboios para lá de Guimarães (Fafe) e as outras linhas.

## Ficheiros

| Ficheiro | Função |
|---|---|
| `index.html`, `style.css` | página, painel, horário e sobreposições |
| `src/main.js` | arranque, horário, ciclo (tick do simulador, espelho dos comboios, cenário), teclas e painel |
| `src/bridge.js` | ponte para o simulador (`window.__PCB` no `simulador.html`) |
| `src/world.js` | cenário: blocos de 200 m do simulador convertidos em malhas do PlayCanvas, geometria dinâmica e casario distante |
| `src/train.js` | automotoras UDD 9600: a do jogador e as outras, com 2 ou 4 veículos |
| `src/route.js` | eixo da linha: posição, rumo, cota, escala |
| `src/sky.js`, `src/quality.js` | céu e luz por hora do dia; perfis gráficos e pós-processamento |
| `src/cameras.js`, `src/gfx.js` | câmaras (cabina, exterior, cinematográfica); vetores |

Recursos e licenças: `CREDITS.md`.
