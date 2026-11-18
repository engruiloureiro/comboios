# Migração para PlayCanvas — diagnóstico e plano

Data: 14 de novembro de 2026. Âmbito: avaliar o salto para um motor 3D com luz física e validar a escolha com uma cena real,
sem substituir o simulador atual.

## 1. Diagnóstico do sistema atual (`index.html`)

| Aspeto | Situação |
|---|---|
| Forma | Um só ficheiro: 6 536 linhas, 11,5 MB (o GLB da UDD 9600 e várias texturas vêm embutidos em Base64). Tudo é descarregado antes de começar. |
| Gráficos | Motor próprio sobre WebGL2, com shaders escritos à mão. Luz difusa simples com neblina (`uFog`, `uFogD`). Sem mapas de sombras, sem PBR, sem iluminação por imagem (HDRI), sem pós-processamento nem antisserrilhado por amostragem. |
| Geometria | Mundo gerado a partir do eixo paramétrico (posição p ao longo da via, desvio lateral x): `HDG`/`WX`/`WZ`/`hy`, `PI()`, `wp()`. É um bom modelo de dados e passa sem perdas para outro motor. |
| Exploração | Horário de 1985, encravamento e sinais, cruzamentos, outras automotoras, passageiros e chefe de estação, manobras de depósito, gravação, modo de exploração da Trindade e serviço suburbano: tudo no mesmo âmbito global (`S`, `REV`, `camMode`…). |
| Material circulante | UDD 9600 do pacote `CP_9600_RW` (BSD-3), com bogies, rodados, portas animadas, pinturas A e B e frentes com e sem porta. |
| Testes | Playwright: continuidade, bifurcação, suburbano, rampas e o teste de regressão das três linhas. |

**Limitações principais:**

1. A qualidade visual está no limite do que o motor próprio dá sem um trabalho grande: faltam sombras, reflexos, materiais
   físicos e céu real.
2. A lógica ferroviária e o desenho estão entrelaçados. Por exemplo, `trainDraw` recebe o estado das portas, as pinturas e a câmara.
3. O ficheiro único dificulta a carga progressiva e o trabalho em paralelo.

## 2. Viabilidade do PlayCanvas

- **Motor:** PlayCanvas 2.23.3 (licença MIT, gratuito), usado como módulo ES. Não há compilação nem dependências pagas, e o Cloudflare Pages serve os ficheiros tal como estão.
- **Renderização:** WebGPU com recurso automático a WebGL2. Inclui:
  - PBR, sombras em cascata, iluminação por HDRI e iluminação em grelha (muitas luzes pontuais baratas);
  - pós-processamento integrado (`CameraFrame`: ACES, MSAA, SSAO, bloom, vinheta);
  - instanciação de malhas, usada nas árvores.
- **Reaproveitamento:** os dados da via são reaproveitados sem conversão manual, através de um exportador do simulador. O GLB da 9600, as pistas das portas e os sons são carregados diretamente de `cp9600/`, sem alterar o Base64 do jogo.
- **Risco:** a lógica de exploração (cerca de dois terços do ficheiro) tem de ser separada do desenho antes de migrar. É trabalho de engenharia, não de motor.

## 3. Cena demonstrativa (fase 2 — feita) e ponte para o simulador (fase 3 — começada)

Está em `playcanvas/`. O detalhe está em `playcanvas/LEIA-ME.md` e os créditos em `playcanvas/CREDITS.md`.

**Primeira versão (Lordelo–Vizela).** Só o eixo, as cotas, os limites, as vias e as estações vinham do simulador. A paisagem era
gerada à parte e não respeitava o jogo: faltavam o rio Vizela, a passagem sobre a estrada, o túnel de Vizela, os muros e os
taludes, e as casas e árvores não estavam nos sítios certos.

**Versão atual: o cenário é o do simulador.** O protótipo carrega o jogo num iframe escondido e pede-lhe, por uma ponte só de leitura
(`window.__PCB`), o que precisa:

- o eixo, a escala, os limites, as vias e as estações de qualquer troço;
- a geometria de cada bloco de 200 m tal como o jogo a gera: terreno, via e agulhas, cais, rio, túneis e portais, pontes, muros,
  edifícios das estações, casario, fábricas, árvores, campos, postes e sinais;
- as texturas do cenário e o atlas dos letreiros.

O PlayCanvas desenha essa geometria com sol e sombras em cascata, céu HDRI, neblina e pós-processamento, e acrescenta a automotora,
a marcha, as paragens, as portas e as agulhas. Os blocos são carregados à frente do comboio e libertados atrás.

**Vantagens:** fidelidade total ao jogo, a linha inteira disponível (origem e destino à escolha) e nenhum ficheiro de dados novo.
**Custos:** o jogo (11,5 MB) é descarregado e inicializado em segundo plano no arranque, e as cores e texturas são as do jogo
(simples), não materiais fotográficos.

**Ligação ao simulador:** botão «Linha de Guimarães em 3D» no menu inicial. No jogo só entraram a ponte e o parâmetro `?linha=`
(escolhe a linha sem mexer nas preferências guardadas); o jogo em si não usa nada disto.

Capturas (renderização por software): `docs/capturas/playcanvas-prototipo.jpg` — Guimarães, Covas, o rio Vizela, o túnel de Vizela.

## 4. Plano de migração

| Fase | Conteúdo | Estado |
|---|---|---|
| 1 | Diagnóstico (este documento) | Feito. |
| 2 | Cena demonstrativa com um troço real | Feito. |
| 3 | Ponte para o simulador: o cenário da linha inteira pedido ao jogo em blocos | Feito para a Linha de Guimarães. |
| 4a | **Jogo completo no PlayCanvas, 1.ª fase:** Trindade ↔ Guimarães com o horário de 1985, os outros comboios e cruzamentos, sinais, chefe de estação, passageiros nos cais, pontuação, buzinas, homem-morto e o painel novo. O simulador corre escondido como motor de regras (`?embed`); o PlayCanvas comanda o ciclo e desenha. | Feito (ver os testes). |
| 4b | 2.ª fase: abastecimento e manobras de oficina, unidade dupla e acoplagem, pinturas de origem e frentes sem porta, passageiros a bordo, fumo, gravar e retomar, Fafe e as outras linhas. | Por fazer. |
| 5 | Separar as regras do desenho dentro do próprio simulador (hoje o PlayCanvas usa o jogo inteiro, escondido), para deixar de carregar o motor gráfico antigo. O motor novo passa a principal e o antigo fica como modo «compatível». | Por fazer. |

**Como funciona a 1.ª fase do jogo.** O `index.html` do jogo ganhou um modo `?embed`: não desenha nem corre o seu ciclo; em vez
disso, a ponte `window.__PCB` oferece `tick(dt)` (um passo das regras e do som), `state()` (posição, sentido, portas e via do
comboio do jogador e dos outros), `dyn()` (geometria dinâmica: sinais, cancelas, agulhas, passageiros e chefe), `hud()` (dados do
painel), `timetable()` e `startTT()` (horário) e os comandos. As teclas são reenviadas ao jogo, por isso o comportamento é o mesmo.
No modo embutido ficam desligados o abastecimento, a saída da oficina e a acoplagem (2.ª fase).

## 5. Limitações conhecidas do protótipo

- **Ainda por migrar (2.ª fase):** abastecimento, manobras de oficina, unidade dupla, pinturas de origem e frentes sem porta,
  passageiros a bordo, fumo do escape, gravar e retomar o jogo.
- **Linhas:** só a Linha de Guimarães entre a Trindade e Guimarães; os comboios que seguem para Fafe e as outras linhas ficam de fora.
- **Material circulante:** pintura do GLB (pós-1993); a pintura B e as frentes sem porta ainda não foram portadas. Massa do reboque
  estimada em 30 t.
- **Aspeto:** a geometria, as cores e as texturas são as do jogo; o salto está na luz, nas sombras e no céu. Materiais fotográficos
  (balastro, pedra, telha) ficam para depois, camada a camada.
- **Arranque:** o simulador é carregado em segundo plano, o que soma alguns segundos e memória.
- **Desempenho:** não foi medido aqui em hardware real (o contentor não tem GPU). O utilizador mediu 30–36 FPS no perfil Alto com
  a primeira versão; a versão atual tem mais geometria e tem de ser medida outra vez. As sombras só são calculadas para os blocos
  ao alcance da sombra, e o chão e a água não fazem sombra.

## 6. Testes efetuados (Playwright, Chromium sem GPU)

**Jogo completo, 1.ª fase** (condutor automático que usa as mesmas teclas do jogador: I, E, 8/2, 9, 7)

- **Comboio 7341, Trindade → Guimarães (17:39), viagem inteira:** ignição, embarque na origem, partida depois do apito do chefe e
  paragem em todas as estações do horário, a 1–3 m do marco. Cruzamento na Maia com entrada pela via desviada e espera pelo outro
  comboio; outros cruzamentos a seguir. Homem-morto confirmado com o 9 e buzina nas passagens de nível (+15 pontos cada). O céu
  passou de dia a fim de tarde e a noite. Chegou a Guimarães com 2 556 pontos e 18 minutos de atraso (o condutor de teste é
  prudente e esperou pelos cruzamentos). Sem erros de JavaScript.
- **Tranvia 7901, Trindade → Senhora da Hora (05:55, de noite), serviço completo:** 5 paragens de 5, fim de serviço ao desligar o
  motor, painel final com três estrelas e 1 064 pontos em 1 100.
- **Comboio 7342, Guimarães → Trindade (sentido inverso):** partida e paragens em Vizela e Lordelo, com um cruzamento.
- **Regras conferidas por erros do próprio condutor de teste:** passar um sinal de saída fechado depois de falhar a paragem da Maia
  acabou em colisão com o comboio contrário e serviço interrompido; partir antes do apito deixou o sinal de saída fechado.
- **Som:** o contexto de áudio do simulador fica a correr depois da primeira tecla; não foi possível ouvi-lo neste ambiente.
- **Painel:** losangos da velocidade máxima e da seguinte, sinal adiante com o aspeto e a distância, passagem de nível com o aviso
  de buzinar, mensagens do serviço e painel final, conferidos em capturas.

**Cenário** (versão anterior, sem alterações)

- Vizela → Guimarães, Lordelo → Vizela (rio, passagem sobre a estrada, túnel), Lordelo → Santo Tirso (ponte de Caniços), noite e
  perfil Médio. WebGPU só foi testado antes de o jogo completo entrar; a 1.ª fase do jogo foi testada em WebGL2.

**Jogo principal**

- Teste de regressão nas três linhas e teste de continuidade, depois de acrescentar o modo `?embed` e a ponte: sem erros.

**Por medir:** o desempenho em hardware real. Com muita gente nos cais (Trindade: cerca de 190 mil vértices de geometria dinâmica)
essa geometria é refeita de 3 em 3 imagens para não pesar.
