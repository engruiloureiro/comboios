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

| Fase | Conteúdo | Critério para avançar |
|---|---|---|
| 1 | Diagnóstico (este documento) | — |
| 2 | Cena demonstrativa com um troço real | Feito. Falta ser julgada pelo utilizador em computadores reais (escola e casa). |
| 3 | Ponte para o simulador: a linha inteira em blocos pedidos ao jogo à medida que o comboio avança (feito para a Linha de Guimarães), com o botão no menu. Falta separar a lógica ferroviária (horário, encravamento, marcha, passageiros) num módulo sem desenho, partilhado pelos dois motores. | O motor novo percorre Trindade–Fafe sem saltos (por testar fora de Lordelo–Guimarães). |
| 4 | Migrar sistema a sistema: sinais com encravamento, outras automotoras e cruzamentos, horário, passageiros e chefe, Trindade de 1985, Linha da Póvoa, pinturas B e frentes sem porta. | Cada sistema tem o seu teste e é comparado com o simulador atual na mesma situação. |
| 5 | O motor novo passa a principal e o antigo fica como modo «compatível» para computadores sem WebGL2. | Paridade de funções e desempenho aceitável no perfil Baixo nos computadores da escola. |

## 5. Limitações conhecidas do protótipo

- **Ainda por migrar:** horário, encravamento (os sinais são os do jogo, mas com o aspeto fixo), outras composições, passageiros e
  chefe de estação, barreiras das passagens de nível em movimento.
- **Linhas:** só a Linha de Guimarães; a ponte aceita as outras, mas não foram testadas.
- **Material circulante:** pintura do GLB (pós-1993); a pintura B e as frentes sem porta ainda não foram portadas. Massa do reboque
  estimada em 30 t.
- **Aspeto:** a geometria, as cores e as texturas são as do jogo; o salto está na luz, nas sombras e no céu. Materiais fotográficos
  (balastro, pedra, telha) ficam para depois, camada a camada.
- **Arranque:** o simulador é carregado em segundo plano, o que soma alguns segundos e memória.
- **Desempenho:** não foi medido aqui em hardware real (o contentor não tem GPU). O utilizador mediu 30–36 FPS no perfil Alto com
  a primeira versão; a versão atual tem mais geometria e tem de ser medida outra vez. As sombras só são calculadas para os blocos
  ao alcance da sombra, e o chão e a água não fazem sombra.

## 6. Testes efetuados (Playwright, Chromium sem GPU)

**Vizela → Guimarães**
- Arranque sem erros de JavaScript; condução automática com paragens em Nespereira, Covas e Guimarães, todas a cerca de 1 m do
  marco, portas abertas e fechadas, sem exceder os limites (2 amostras ligeiramente acima em Covas, do condutor de teste).
- Os blocos são carregados e libertados durante a viagem (8 a 9 blocos em memória no perfil Baixo).

**Lordelo → Vizela**
- Conferidos em capturas: o rio Vizela à direita da via, a passagem sobre a estrada, a trincheira com muros de granito e o túnel
  de Vizela (portal e interior escuro).

**Outros**
- Sentido inverso (Guimarães → Vizela) e noite: candeeiros, janelas e faróis.
- Perfil Médio em Guimarães (sombras suaves, oficina e Penha ao fundo).
- WebGPU: arranque e imagem corretos no perfil Baixo (Vizela → Guimarães).
- Teste de regressão do jogo principal nas três linhas, depois de acrescentar a ponte: sem erros.
