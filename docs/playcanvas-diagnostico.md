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

## 3. Cena demonstrativa (fase 2 — feita)

O troço é Lordelo–Vizela, PK 46,6–54,0, em `playcanvas/`. O detalhe está em `playcanvas/LEIA-ME.md` e os créditos em `playcanvas/CREDITS.md`.

**Via e cenário**
- Via com carris perfilados, travessas de madeira e balastro, que seguem o eixo, a cota e a escala do simulador.
- Terreno com parcelas agrícolas, árvores instanciadas, cais, edifícios das estações, casario, passagens de nível e sinais.

**UDD 9600**
- Bogies orientados pela tangente da via, rodados a girar e caixa apoiada nos dois pivôs, com a escala das curvas.
- Portas animadas com as pistas originais.
- Faróis, farolins e luz interior.

**Marcha e operação**
- Marcha com o manípulo combinado, motor diesel, freio a ar, aderência e rampas, com os sons originais.
- Paragens com marco e portas do lado do cais.
- Agulhas para a via 2 de Lordelo e de Vizela; inversão de marcha.

**Interface**
- Painel completo; câmaras de cabina, exterior e cinematográfica.
- Manhã, fim de tarde e noite.
- Perfis Baixo, Médio e Alto, com contador de FPS.

Capturas (renderização por software, perfil Baixo/Médio): `docs/capturas/playcanvas-prototipo.jpg` — câmara cinematográfica,
entrada na via 2 de Vizela, noite em Lordelo e cabina.

**Ligação ao simulador (início da fase 3):** botão «Lordelo → Vizela em 3D» no menu inicial. O simulador não foi alterado em mais nada.

## 4. Plano de migração

| Fase | Conteúdo | Critério para avançar |
|---|---|---|
| 1 | Diagnóstico (este documento) | — |
| 2 | Cena demonstrativa com um troço real | Feito. Falta ser julgada pelo utilizador em computadores reais (escola e casa). |
| 3 | Exportador genérico de troços: a linha inteira em blocos carregados à medida que o comboio avança, com o botão no menu. Separar a lógica ferroviária (horário, encravamento, marcha, passageiros) num módulo sem desenho, partilhado pelos dois motores. | O motor novo percorre Trindade–Fafe sem saltos. Os testes de continuidade passam com os dados exportados. |
| 4 | Migrar sistema a sistema: sinais com encravamento, outras automotoras e cruzamentos, horário, passageiros e chefe, Trindade de 1985, Linha da Póvoa, pinturas B e frentes sem porta. | Cada sistema tem o seu teste e é comparado com o simulador atual na mesma situação. |
| 5 | O motor novo passa a principal e o antigo fica como modo «compatível» para computadores sem WebGL2. | Paridade de funções e desempenho aceitável no perfil Baixo nos computadores da escola. |

## 5. Limitações conhecidas do protótipo

- **Âmbito:** só existe um troço de 7,4 km. Horário, encravamento (os sinais estão fixos), outras composições, passageiros e chefe de estação ainda não foram migrados.
- **Material circulante:**
  - Pintura: a do GLB (pós-1993). A pintura B e as frentes sem porta ainda não foram portadas.
  - Massa do reboque estimada em 30 t: o pacote só traz a da motora.
- **Cenário:**
  - Árvores procedimentais em cartões cruzados: ficam aquém do resto da cena.
  - Edifícios e casas genéricos: não são levantamentos das estações reais.
  - Terreno a partir das cotas exportadas e de relevo procedimental para lá de 1 km.
- **Desempenho:** não foi medido em hardware real. O contentor de testes não tem GPU e todas as medições foram feitas com renderização por software (SwiftShader):
  - perfil Baixo: cerca de 10–18 FPS em WebGL2 e 2–3 FPS em WebGPU;
  - o perfil Alto mal anda nesse renderizador.

  Estes números servem só para comparar perfis entre si.
- **Recursos:** o protótipo depende do Google Fonts para a letra Barlow. Sem rede, usa a letra do sistema.

## 6. Testes efetuados (Playwright, Chromium sem GPU)

**Arranque**
- Arranca sem erros de JavaScript em Baixo e Médio com WebGL2, e em Baixo com WebGPU (o SwiftShader é demasiado lento para os outros perfis em WebGPU).
- No caminho WebGPU, o céu ficava branco porque o sol do HDRI (cerca de 150 000) saturava a meia-precisão. Foi corrigido limitando o sol dos HDRI a 400.

**Marcha Lordelo → Cuca**
- Arranque, velocidade máxima de 54 km/h com limite de 60, e travagem até ao marco.
- Paragem a 0,6 m do marco; portas abertas do lado do cais e depois fechadas.

**Agulha de Vizela**
- Mudança para a via 2 com Z.
- A automotora segue o desvio de 4 m, com limite de 30 km/h.
- Paragem a 0,8 m do marco; portas do lado certo.

**Câmaras, hora do dia e qualidade**
- Câmaras de cabina, exterior e cinematográfica conferidas em capturas.
- Manhã, fim de tarde e noite: a noite com o céu acertado, os candeeiros e a luz interior.
- Perfis com nível de detalhe das árvores e das travessas pela distância à câmara. Este nível de detalhe estava a medir a partir da origem; foi corrigido.

**Simulador atual**
- Teste de regressão das três linhas depois de acrescentar o botão no menu.
