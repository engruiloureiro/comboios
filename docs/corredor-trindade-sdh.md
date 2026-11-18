# Corredor Porto-Trindade – Senhora da Hora (1985): reconstrução contínua

Caderno de investigação e relatório. Mantém a regra da reconstrução da Trindade (`docs/trindade-1985.md`): o que não tem
fonte está marcado como **aproximação** ou **reconstrução interpretativa**.

## 1. Fontes

### Consultadas
| Fonte | O que deu |
|---|---|
| **Gazeta dos Caminhos de Ferro n.º 1381** (1-07-1945), Hemeroteca Digital de Lisboa, pp. 253–254 (OCR feito nesta sessão) | Perfil e traçado Trindade – Senhora da Hora: *«à saída [da Trindade] … uma rampa de 17 mm em 788 m, que tem a agravá-la a circunstância de, na sua maior parte, estar no túnel. … curvas … uma de 160 m de raio e outra de 200 m. Da Boavista até ao apeadeiro de Ramalde a linha continua em pendente, e apenas o apeadeiro da Avenida da França se encontra em curva de 200 m de raio. Depois dum pequeno patamar, sobe-se uma rampa de 20 mm durante 744 metros; para depois encontrar uma pequena rampa (303 m) de 16 mm, à entrada da Senhora da Hora. No sentido descendente, encontra-se uma rampa de 16 mm em 352 m, antes de atingir o apeadeiro da Circunvalação, subindo depois as linhas, quási consecutivamente, desde o apeadeiro de Ramalde até quási à entrada do túnel da Lapa, sem que haja rampas com mais de 250 m de extensão, de inclinação superior a 14 mm. Entre o apeadeiro de Ramalde e o de Circunvalação existe um trainel em patamar de 173 m, entre duas pendentes»*. Também: Linha da Póvoa com rampas até 25 ‰ e raios mínimos de 150 m. |
| **CP — Cronologia** (www.cp.pt/info/pt/cronologia) | 01-10-1875 abertura Porto-Boavista – Póvoa; 06-05-1893 Ramal de Matosinhos; 14-03-1932 inauguração do túnel da Trindade; 30-10-1938 «abertura do troço entre Porto Trindade e **bifurcação da Boavista**»; 10-04-1948 nova estação de Porto-Trindade; 12-09-1962 supressão do Ramal de Matosinhos |
| Wikipédia (pt): Estação da Senhora da Hora | PK 3,852 (contado da Boavista), altitude 80 m; edifício do lado poente da via; entroncamento da Póvoa, de Guimarães (1932) e do Ramal de Matosinhos (exploração fechada em 30-06-1965); troço Boavista – Senhora da Hora duplicado em janeiro de 1933; barracão de madeira das mercadorias (ardeu em 2007); atual estação do metro 110 m a norte do antigo edifício; diagrama esquemático do entroncamento |
| Wikipédia (pt): Estação da Boavista | Coordenadas e altitude (90 m); origem dos PK das duas linhas; em 1939 já quase só mercadorias; ramal da Trindade «iniciava-se na bifurcação da Boavista»; apeadeiro da Avenida da França «a curta distância» |
| Wikipédia (pt): apeadeiros de Avenida da França, Francos, Ramalde e Circunvalação; estações do Metro (Lapa, Carolina Michaëlis, Casa da Música, Francos, Ramalde, Viso, Sete Bicas, Senhora da Hora) | Coordenadas. As do Metro só como pontos do **antigo canal** (a Wikipédia diz que o Metro ocupou «o antigo canal da linha»); nada da infraestrutura do Metro foi copiado |
| Flickr filhodaCP — CP 9609 na Avenida da França, junho de 1979 | Via dupla em curva, à superfície; «à esquerda as vias para Porto-Boavista»; casas baixas e árvores |
| Flickr (Colecção J. J. Smit / BVA) — Avenida da França, 13-04-1973 | Via dupla em curva com cais dos dois lados, passagem de pranchas entre os cais, muros e prédios de 3–4 pisos junto à via para o lado da Trindade |
| Flickr filhodaCP — CP E162 perto da Circunvalação, 1973 | Via à superfície, campos e casas baixas, prédios de 3 pisos ao fundo |
| Aventar — «Estação da Senhora da Hora» (2011) e Flickr «Estação da Senhora da Hora, 1991» | Edifício térreo branco, de empenas, cunhais e molduras de granito, telhado de telha, placa SENHORA DA HORA na empena; cais largo do lado do edifício e outros cais; depósito de água elevado e torre de iluminação de treliça; muitas vias |

### Não acessíveis (limitação, nada foi inventado a partir delas)
- **Património Cultural — ficha da estação da Senhora da Hora** (imovel.patrimoniocultural.gov.pt): o sítio devolveu 403.
- **Diagrama «Sinalização da Estação da Senhora da Hora» (anexo à I.T. n.º 28)**, arquivado em archive.ph: o anfitrião não
  está acessível a partir desta sessão (o pedido de acesso foi recusado pelo serviço de ambientes). É a fonte mais importante
  em falta para o feixe, as agulhas e os sinais da Senhora da Hora.
- **OpenStreetMap (Overpass)**: o servidor fecha a ligação; não houve traçado cartográfico contínuo — usaram-se as coordenadas
  das estações e apeadeiros como pontos de controlo.
- Fotografias de Ramalde e da Circunvalação ligadas na Wikipédia (Flickr): não são públicas.
- Plantas de via da CP, cartografia municipal e fotografia aérea antiga do Porto e de Matosinhos: não encontradas em linha.

## 2. Auditoria do código anterior
- `GEO`/`WPT`: interpolação Catmull-Rom entre as estações (`GPXC`), com **curvas em S aleatórias** sobrepostas (`rnd()`), e
  suavização. Entre a Trindade e a Senhora da Hora o traçado era, portanto, ruído e não cartografia.
- PK: Av. França 1,75 · Francos 3,20 · Ramalde 3,95 · Circunvalação 4,80 · Senhora da Hora 6,05 — o troço Avenida de França –
  Senhora da Hora tinha 4,3 km; as coordenadas dão 3,6 km em linha reta e a Wikipédia 3,852 km desde a Boavista.
- Perfil: cotas das estações (95, 100, 96, 93, 96, 101 m) e dois pontos sem fonte (PK 0,55 = 78 m; 1,2 = 92 m).
- Bifurcação `JSH = SDH.pos + 500` (500 m a norte da estação), sem fonte.
- Passagens superiores sorteadas a cada 500–1400 m e três «pontes cénicas» (PK 1,10, 2,12 e 4,56), sem fonte.
- As três linhas (Guimarães, Póvoa, mundo contínuo) construíam o troço comum cada uma com o seu sorteio.

## 3. Geometria reconstruída

### Eixo horizontal (objeto `COR` em `index.html`; cálculo em `docs/ferramentas/eixo_corredor.py`)
Uma só definição paramétrica (retas e curvas circulares, com curvas de transição de ~30 m), usada pelas três linhas até à
bifurcação. s = 0 no edifício da Trindade (p = 200 do jogo; PK = (s − 200)/1000).

| Elemento | s (m) | Rumo / raio | Fundamento |
|---|---|---|---|
| Reta da estação, garganta e boca do túnel | 0–558 | 325° (N 35° W) | rumo **aproximado** (a estação era reta nas fotografias; o rumo exato não está documentado) |
| Curva | 558–650 | R = 160 m, 33° à esquerda, **no túnel** | Gazeta: curva de 160 m no troço Trindade–Boavista; «rampa … na sua maior parte no túnel» |
| Reta Lapa – Carolina Michaëlis – Avenida de França | 650–1986 | 292° | pontos de controlo a 7,5 m (Lapa) e 2,6 m (C. Michaëlis) do eixo |
| Curva do apeadeiro da Avenida de França | 1986–2052 | R = 200 m, 19° à direita | **Gazeta: apeadeiro em curva de 200 m** (também a «outra de 200 m» do troço Trindade–Boavista) |
| Reta para Francos | 2052–2834 | 311° | |
| Curva de Francos | 2834–2945 | R = 300 m, 21° à direita | raio **aproximado** |
| Reta Francos – Ramalde | 2945–3749 | 332° | |
| Curva de Ramalde | 3749–3829 | R = 400 m, 11° à esquerda | raio **aproximado** |
| Reta Ramalde – Circunvalação – Sete Bicas | 3829–5095 | 320° | |
| Curva antes da Senhora da Hora | 5095–5198 | R = 300 m, 20° à direita | raio **aproximado** |
| Reta da Senhora da Hora até à bifurcação | 5198– | 340° | |

Afastamento dos pontos de controlo ao eixo: Lapa 7,5 m, Carolina Michaëlis 2,6 m, Avenida de França 2,9 m, Francos 5,9 m,
Ramalde 1,2 m, Circunvalação 2,1 m, Sete Bicas 5,8 m, Senhora da Hora 2,0 m.

**PK do jogo (novos):** Avenida de França 1,819 · Francos 2,689 · Ramalde 3,589 · Circunvalação 4,238 · Senhora da Hora 5,478.
Verificação independente: do ponto da bifurcação da Boavista à Senhora da Hora mais o ramal de 185 m até à Boavista dá
3,88 km — a Wikipédia dá 3,852 km.

### Perfil longitudinal (`COR.prof`, concordâncias verticais por média em ±40 m)
| PK | Cota | Trainel | Fonte |
|---|---|---|---|
| −0,40 – 0,12 | 84,0 | patamar (estação e garganta) | cota da Trindade **estimada** |
| 0,12 – 0,908 | 84,0 → 97,4 | **rampa 17 ‰ em 788 m**, quase toda no túnel (0,35–0,85) | Gazeta |
| 0,908 – 1,75 | 97,4 → 90,4 | pendentes de 10 e 9 ‰ (≤ 250 m) com patamares | Gazeta (≤ 14 ‰, ≤ 250 m); Boavista 90 m (Wikipédia) |
| 1,75 – 1,95 | 90,4 | patamar no apeadeiro da Avenida de França | aproximação |
| 1,95 – 3,609 | 90,4 → 69,4 | pendentes de 14 ‰ em 250 m com patamares de 30 m | Gazeta (limites); repartição **aproximada** |
| 3,609 – 3,838 | 69,4 → 65,9 | pendente | Gazeta («entre duas pendentes») |
| 3,838 – 4,011 | 65,9 | **patamar de 173 m** | Gazeta |
| 4,011 – 4,363 | 65,9 → 60,3 | **pendente de 16 ‰ em 352 m** | Gazeta |
| 4,363 – 4,393 | 60,3 | pequeno patamar | Gazeta |
| 4,393 – 5,137 | 60,3 → 75,2 | **rampa de 20 ‰ em 744 m** | Gazeta |
| 5,137 – 5,44 | 75,2 → 80,0 | **rampa de 16 ‰ em 303 m** à entrada | Gazeta; Senhora da Hora 80 m (Wikipédia) |

Incoerência registada: com os comprimentos da Gazeta, o apeadeiro da Circunvalação fica ~105 m dentro da pendente de 352 m
(a Gazeta diz que ela acaba antes do apeadeiro). Pode ser diferença entre o apeadeiro de 1945 e as coordenadas usadas.

### Túnel da Lapa
PK 0,35–0,85 (500 m, «cerca de 500 m» na Wikipédia), via dupla (entre-eixos 4 m), curva de 160 m no seu interior. Folga de
~1,5 m a cada parede para uma automotora de 2,70 m em cada via; abóbada a ~5,8 m. Luz natural a esmorecer da boca para dentro
(metade a ~12 m, quase nada a 60 m). Incoerência: a estação Lapa do Metro fica ~95 m dentro do túnel assim posicionado; o
comprimento de 500 m foi mantido por ser o documentado.

### Via dupla e bifurcação
Via dupla (0 = descendente, 4 = ascendente, entre-eixos 4 m) desde a Trindade até à Senhora da Hora, como desde 1933.
Bifurcação na garganta norte da Senhora da Hora (`JSH = SDH.pb + 60`, antes 500 m a norte): a Linha de Guimarães sai para
nascente; as duas linhas abrem ~22° (ângulo entre os rumos para Custóias e para Araújo); a outra linha continua visível até
~60 m de afastamento. Até à bifurcação as três versões do mundo são **idênticas** (teste automático, diferença 0,000 m).

## 4. O que foi feito no código (`index.html`)
- `COR`: eixo paramétrico e perfil; substitui o rumo e a cota até à bifurcação e concorda depois com cada linha em 400 m.
- PK e cotas das estações; remoção dos pontos de perfil sem fonte; limites de velocidade ligados ao novo PK da Senhora da Hora
  e à bifurcação (30 km/h nas agulhas).
- Trincheira Lapa – Avenida de França: muros de granito de ~8 m à saída do túnel, a baixar até ao apeadeiro; terreno por trás à
  cota do topo dos muros (patamar de 7 m; vale para todas as trincheiras do jogo); casario contínuo de 3–4 pisos com quintais e
  alguns prédios dos anos 60/70.
- Retiradas as passagens superiores sorteadas e as «pontes cénicas» do corredor.
- Avenida de França: duas vias da Boavista do lado sul, agulha na via descendente a poente e travessia da ascendente; curva para
  a Boavista a nascente; passagem de pranchas entre os cais; anexos ferroviários deslocados para fora das vias.
- Francos, Ramalde, Circunvalação: cais dos dois lados; **sem abrigo** (não documentado); subúrbio de 1985 com casas de 1–2 pisos,
  quintais e muros, oficinas e armazéns, terrenos livres e alguns prédios perto de Ramalde e da Circunvalação.
- Senhora da Hora: disposição `SDH` (cais largo do edifício na via 0, cais-ilha na via 4, via em topo a nascente do cais-ilha,
  resguardo das mercadorias); edifício térreo de empenas com a placa SENHORA DA HORA; depósito de água, torre de iluminação,
  barracão de madeira das mercadorias; para-choques.
- Agulha da bifurcação encravada com a automotora em marcha a menos de 500 m (só parada se pede outro itinerário).
- Menu: **Serviço suburbano — Trindade ↔ Senhora da Hora** (sentido, todas as paragens ou nenhuma, hora; composição e luz do
  menu), identificado como percurso livre e não como horário histórico.
- Modo de exploração a pé estendido às plataformas das estações e apeadeiros do corredor, com notas históricas.
- Testes automáticos em `testes/` (ver `testes/LEIA-ME.md`).

## 5. Elementos comprovados
Rampa de 17 ‰ em 788 m à saída da Trindade, quase toda no túnel · curvas de 160 m e 200 m no troço Trindade–Boavista ·
apeadeiro da Avenida de França em curva de 200 m e à superfície, com as vias da Boavista ao lado · pendentes até Ramalde ·
patamar de 173 m entre Ramalde e Circunvalação · 16 ‰ em 352 m, 20 ‰ em 744 m e 16 ‰ em 303 m até à Senhora da Hora ·
cotas da Boavista (90 m) e da Senhora da Hora (80 m) · PK 3,852 Boavista–Senhora da Hora · via dupla desde 1933 · túnel de
~500 m inaugurado em 1932 · edifício da Senhora da Hora do lado poente, térreo, de empenas · Ramal de Matosinhos fechado
antes de 1985 · coordenadas dos apeadeiros.

## 6. Elementos aproximados / interpretativos
Rumo da reta da Trindade · raios de 300 e 400 m (Francos, Ramalde, antes da Senhora da Hora) · repartição exata das pendentes
entre a Lapa e Ramalde · cota da Trindade · posição dos portais · geometria das vias da Boavista e do seu ramal · disposição das
vias e cais da Senhora da Hora (via em topo, resguardo) · posição exata das agulhas da bifurcação · dimensões dos edifícios ·
casario e subúrbio (composição genérica, não edifício a edifício) · sinalização luminosa de cantonamento (mantida, já marcada
como interpretativa) · o horário das outras automotoras (o do jogo, com dados de base de 1978).

## 7. Incertezas históricas
- A data e o regime da sinalização do troço em 1985 (luminosa automática ou mecânica com bloqueio) não foram confirmados.
- A Gazeta descreve 1945; não se encontrou prova de alterações ao perfil ou às curvas até 1985 (supõe-se que não houve, por
  serem obra de 1932–38 em trincheira e túnel).
- Tipo de travessia da Estrada da Circunvalação (passagem inferior, superior ou de nível): não documentado — não representado.
- Data de supressão do Ramal de Matosinhos: CP indica 12-09-1962, a Wikipédia 30-06-1965.

## 8. Testes executados (Playwright + Chromium/SwiftShader)
| # | Teste | Resultado |
|---|---|---|
| 1, 8–11 | Trindade → Senhora da Hora (suburbano, todas as paragens, 08:10) | chegou, sem incidentes; 2 cruzamentos com contrários, 0 na mesma via |
| 2 | Senhora da Hora → Trindade (18:05) | chegou aos para-choques, sem incidentes; 2 cruzamentos, 0 na mesma via |
| 3 | Trindade → Maia (Linha de Guimarães), pela bifurcação | sem incidentes |
| 4 | Trindade → Custóias (Linha da Póvoa), pela bifurcação | sem incidentes |
| 5 | Maia → Trindade e Custóias → Trindade | sem incidentes |
| 6 | Via dupla com comboios contrários | 4 cruzamentos, nenhuma sobreposição na mesma via |
| 7 | Túnel da Lapa (entrada e saída, visual e limites) | luz a esmorecer; limite 35–40 km/h na curva de 160 m |
| 12 | Agulhas: partidas das linhas 1, 2, 3 e 5 da Trindade até depois da Av. de França; chegadas às linhas 2, 4 e 5; bifurcação nos dois sentidos | sem incidentes |
| 13 | Sinal de entrada da Trindade | precaução com linha livre; fechado com linha ocupada |
| 14 | Rampas (40 s em tração máxima) | 20 ‰: 37,6 km/h · 17 ‰ no túnel: 39,2 · patamar: 58,9 · pendente 14 ‰: 61,6; travagem desde 50 km/h: 63 m a subir 20 ‰, 93 m a descer 14 ‰ |
| 15 | Composição simples e dupla | em uso nos testes e nas automotoras do horário (2 e 4 caixas) |
| 17 | Desempenho | troços 0–39: 1,41 M vértices (antes 1,36 M, +3,6 %); construção ≤ 78 ms por troço |
| 18 | Erros JavaScript/WebGL | nenhum nas três linhas, menus, viagens e modo de exploração |
| 19 | Percursos longos | Trindade → Maia (12,6 km) e Trindade → Custóias conduzidos até ao fim; as três linhas simulam 5 min com o horário completo, sem erros |
| 20 | Jogos guardados | gravação e recuperação em JSON nas três linhas |
| — | Continuidade geométrica (`testes/continuidade.js`) | rumo máx. 1,79°/5 m, salto de curvatura 0,26°, raio mín. 160 m, declive máx. 20 ‰; troço comum idêntico nas três linhas |

Não feito: teste 16 (posição dos passageiros) só visualmente nos apeadeiros; não houve teste de fluidez com placa gráfica real.

## 9. Problemas por resolver e melhorias futuras
1. Obter o diagrama de sinalização da Senhora da Hora (I.T. 28) e a ficha do Património Cultural para corrigir o feixe, as
   agulhas e os sinais.
2. Traçado cartográfico contínuo (cartas 1:2 000 do Porto e de Matosinhos dos anos 70/80, ou OSM do canal) para afinar os raios
   aproximados e o rumo da Trindade.
3. Reconstruir a estação da Boavista e o ramal completo (a via já fica preparada a partir da Avenida de França).
4. Identificar as passagens superiores reais entre a Lapa e a Avenida de França e a travessia da Circunvalação.
5. Abrigos e acessos dos apeadeiros a partir de fotografias.
6. Sinalização com sinais por via e rotas na Senhora da Hora; manobras dos suburbanos que acabam na Senhora da Hora.
