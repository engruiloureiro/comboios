# UDD CP 9600: pinturas e frentes

## 1. Fontes
| Fonte | O que mostra |
|---|---|
| *Trainspotter* (Portugal Ferroviário), n.º 2013-09, pp. 42–43 («CP 9600», modelo de José Luís/Carlos Micaelo; fotografia de Johannes Smit) | «O esquema de pintura escolhido é relativo aos primeiros anos de vida desta série, sendo que **após 1993** estas automotoras receberam um novo esquema de pintura onde foram **eliminadas as riscas na frente e lateral**.» Fotografia e modelo: branco-creme em cima, vermelho em baixo, riscas diagonais na frente e na ponta das laterais |
| Flickr filhodaCP — CP 9609, Avenida da França, junho de 1979 | Pintura de origem: caixa branca, faixa vermelha em baixo, riscas diagonais vermelhas/brancas («/») na parte de baixo da frente e a dobrar a esquina até à porta da cabina; tejadilho escuro; frente com três janelas (a do meio é a porta) |
| Wikimedia Commons — «26.11.90 Porto Trindade Class 9600s» (1990) | A mesma pintura de origem em 1990; portas com a metade de baixo vermelha |
| Wikimedia Commons — «Bf Guimarães, Meterspur-VT» (1996) | Pintura posterior: vermelho em cima, faixa cinzenta em baixo, frente toda vermelha sem riscas, logótipo «cp» vermelho na faixa — **é a textura original do modelo do jogo** |
| Aventar (c. 1980) e Flickr «Estação da Senhora da Hora, 1991» | Pintura de origem; frente com porta central |
| Fotografias fornecidas pelo utilizador (sem data nem local): UDD tripla junto a uma oficina; UDD numa estação urbana | Pintura de origem: cúpula da frente escura, riscas «/» paralelas, avental vermelho, logótipo «cp» preto na faixa junto à porta da cabina, placas amarelas na faixa, faixa amarela por cima das janelas num dos veículos |
| Wikipédia (pt) — Série 9600 da CP | 22 unidades 9601–9622, Alsthom, entregues em 1976–77; serviço até 2002 |
| Wikimedia Commons — «CP 9600 Series railcar, at Porto Boavista depot, in 1977» | Indisponível (o servidor limitou os pedidos) |

## 2. Análise do código (antes de alterar)
- `CP.TX`: texturas originais do GLB embutido; `1_1000_main.png` (2048²) é a da caixa (faixas laterais, frente, extremos).
- `CP.livB`: segunda textura gerada por **troca global de cores** (vermelho → creme, cinzento → vermelho, um quadrado
  forçado a preto para o logótipo). Estava anulada em três sítios (`cpDraw: livB=false`, `start: S.livB=false`, `t.lb=false`).
  Dependências: `trainDraw` passava `lb` a `cpVehicle` e a `cpDraw`, e ao modelo simplificado (`TM.carB`). A troca global
  recoloria também pormenores e não acompanhava a geometria, e as riscas da pintura de origem não existiam.
- A pintura atual (A) é a **posterior a 1993** — anacrónica para 1985.
- Motora e reboque usam a mesma malha (o reboque do pacote só existe em `.skp`, não convertido); cada veículo é desenhado
  com a cabina para fora da UDD.

## 3. Pinturas (fase A — implementada)
- **A** — textura original, sem qualquer alteração (pós-1993).
- **B** — pintura de origem (1976–1993), em `cpLiveryB()`: textura independente gerada a partir da **geometria**. Para cada
  triângulo da caixa percorrem-se os texéis no espaço UV e calcula-se o ponto 3D; só mudam texéis de tinta da pintura A:
  - laterais: a própria faixa da pintura A dá o limite (vermelho → creme, cinzento → vermelho) — limite exato, UV respeitadas;
  - frente (normal para +z): creme acima do limite, riscas a 45° de 0,31 m até 1,05 m abaixo, vermelho por baixo;
  - últimos ~1,5 m das laterais junto à cabina: riscas a continuar as da frente (dobram a esquina, como em 1979/1990);
  - superfícies viradas para cima: cinzento-escuro (tejadilho e cúpula da frente);
  - logótipo, placas e faixa da 1.ª classe: ver 3.1;
  - o sombreado original conserva-se; janelas, juntas, faróis, farolins, engates, bogies e vidros não mudam;
  - as laterais «possuem» os seus texéis (o atlas reutiliza zonas da textura noutras superfícies); triângulos degenerados ignorados;
  - porta frontal e portas laterais (cor lisa no modelo): **cópias derivadas** das malhas com UV planas e textura própria
    (metade de baixo vermelha; riscas na porta da cabina); malhas, animações e texturas originais intactas.
- Se a geração falhar, desenha-se a pintura A (sem erro).

### 3.1 Afinação com as fotografias de referência (fornecidas: UDD em frente a uma oficina, e UDD numa estação; sem data nem local indicados)
Comparação ponto a ponto (fotografias como referência, capturas do jogo para ver as diferenças) e correções, **só na textura B e
nos materiais** — geometria, portas, janelas, bogies, engates e todos os outros sistemas intactos:
| Ponto | Fotografia | Antes | Agora |
|---|---|---|---|
| Cúpula da frente (acima das janelas, com o farol) | cinzento muito escuro | creme | escura a partir de 3,22 m (logo acima da porta) |
| Ombreiras das janelas, frisos, borda do tejadilho | creme / alumínio | restos vermelhos (vermelho na sombra da textura A não era reconhecido) | creme; frisos cinzentos acima da faixa ficam como estão |
| Posse dos texéis das laterais | — | o código estava dentro de um comentário (sem efeito) | corrigido |
| Riscas da frente | «/» paralelas, vermelho e branco iguais, ~0,6 m | 0,56 m | 0,62 m, mesma direção |
| Avental por baixo da frente | vermelho | preto (textura dos baixos) | vermelho, sombreado conservado; limpa-vias e equipamentos não mudam |
| Logótipo «cp» | preto sobre o vermelho, perto da porta da cabina | apagado | preto, com a forma e o lugar do logótipo da textura A (z ≈ 6,8 m, junto à porta da cabina, como na fotografia) |
| Placa amarela | na faixa, a seguir à porta do meio, a meia altura | inexistente | placa amarela 0,6 × 0,15 m com orla; a inscrição (ilegível nas fotografias) só é sugerida com traços escuros |
| Faixa amarela da 1.ª classe | por cima das janelas, entre as duas portas de passageiros, num dos veículos | inexistente | só no **reboque**, textura própria (a da motora não muda) |
| Desgaste | ligeiro, mais sujo em baixo | nenhum | ±2,5 % de variação de tom, fundo da caixa até 12 % mais escuro, leves escorridos sob as janelas |

### 3.2 Materiais (as duas pinturas)
Código de material por superfície, lido só pelo shader da automotora (o resto do cenário não passa por este ramo):
- chapa pintada: reflexo do sol fraco e largo + ponto pequeno, reflexo do céu só em ângulos rasantes, atenuado nas cores escuras
  (o branco não brilha em excesso, não parece plástico);
- metal (puxadores, molduras): brilho mais forte e reflexo do céu;
- borracha: escura e mate;
- vidro: transparência como antes, reflexo moderado do céu, mais opaco visto de lado.
A textura A não foi tocada; a pintura A só ganha estes materiais.

Custo: ~0,6–0,8 s no arranque (sem GPU); texturas extra ≈ 50 MB de memória gráfica (B da caixa e dos pormenores, reboque, baixos e portas).

## 4. Identidade das unidades e distribuição
- `UDD9600`: as 22 unidades reais 9601–9622, cada uma com `pintura1985` (B), `pinturaPos1993` (A), `pinturaLivre`
  (determinística, **interpretativa**), `frenteMotora`/`frenteReboque` ('comPorta'). Não há documentação unidade a unidade:
  a atribuição histórica é ao nível da série (em 1985 todas de origem; depois de 1993 todas sem riscas).
- Menu inicial, «Pinturas 9600»: **1985 (de origem)** — por defeito, todas B; **Variantes livres** — cada unidade com a sua
  (12 A e 10 B); **Pós-1993** — todas A. A escolha fica guardada no navegador.
- A nossa automotora é a 9611 (como já indicavam os botões do menu) e, em composição dupla, a 9611 + 9614. As automotoras do
  horário recebem a unidade a partir do número do comboio (determinístico); na rotação da Trindade a partida herda a unidade
  da chegada; as paradas, a partir do lugar. Motora e reboque da mesma UDD têm sempre a mesma pintura; numa dupla cada UDD tem
  a sua.
- Gravação: `udd` e `liv` no JSON; jogos antigos sem estes campos ficam com a 9611 e o modo do menu.
- Pintura da automotora que conduzes (menu «A minha automotora»): «Como os outros» (segue o modo), «Pintura de origem» (B) ou
  «Pós-1993» (A). Aplica-se às unidades da tua composição; fica gravada em `pliv` no JSON (jogos antigos seguem o modo).
- Variedade: com «Variantes livres» os outros comboios recebem as duas pinturas (determinístico por unidade e por comboio).
  Em «1985 (de origem)» todas são B, porque A só existe desde 1993.

## 5. Frente sem porta (fase B — **pendente**, por falta de documentação)
Investigação do objeto `1_1000_portaF`:
- é uma **malha independente** (324 vértices; materiais Red, Glass, Shinny_Metal, Rubber): a porta central da frente da cabina,
  com vidro, borracha e puxador, recuada ~0,3 m em relação à face da frente;
- escondê-la (teste numa cópia temporária, fora do repositório) deixa **uma abertura** para o interior da cabina — vê-se o banco
  (`docs/capturas/cp9600/portaF_com_e_sem_teste.jpg`); uma frente sem porta exigiria painel, janela, moldura, juntas e limpa-vidros
  novos;
- **nenhuma fonte** mostra uma 9600 sem porta frontal: a fotografia de J. Smit (sem data) e as de 1979, c. 1980, 1990, 1991 e 1996 têm todas a
  mesma frente de três vãos com a porta ao centro, nas duas pinturas e nas duas extremidades.

Pelas regras do pedido (não esconder a porta deixando um buraco; não inventar uma versão sem documentação; não criar listas de
unidades), a variante sem porta **não foi feita**. Todas as unidades ficam `comPorta`, que é o que as fontes mostram. As
combinações A2 e B2 da tabela de testes não existem.

## 6. Testes
| Teste | Resultado |
|---|---|
| Automotora do jogador com A e com B (frente, lados, traseira, cima, porta, quina, noite) | correto — `docs/capturas/cp9600/` |
| Outros comboios com as duas pinturas (modo livre) | A e B misturados; 6 automotoras em circulação |
| Composição simples e dupla (9611 B + 9614 A no modo livre) | cada UDD com a sua pintura, motora e reboque iguais |
| Câmaras, túnel, aproximação | a pintura não muda (propriedade da unidade) |
| Portas laterais abertas e fechadas (B) | animação intacta; cópias pintadas seguem a animação |
| Faróis e farolins de noite | intactos |
| Gravação/recuperação nova e jogo antigo sem campos novos | correto |
| Três linhas (Guimarães, Póvoa, Póvoa↔Guimarães): arranque, 5 min de simulação, gravação | sem erros JavaScript |
| Continuidade geométrica do corredor (`testes/continuidade.js`) | OK (nada mudou) |
| Cabina (vista interior) | sem superfícies a tapar a vista |
| Afinação 3.1/3.2 — pintura A antes/depois | textura igual; só o reflexo dos materiais muda (`pintura_A_antes_depois_materiais.jpg`) |
| Afinação 3.1 — B: frente, cúpula, avental, lado, logótipo, placa, reboque com faixa da 1.ª classe, noite | `pintura_B_*.jpg` |
| Afinação — modos 1985 / livre / pós-1993, dupla, túnel, câmaras, gravação | como antes (motora B e reboque com a faixa da 1.ª classe) |
| Afinação — três linhas, 5 min, e `testes/continuidade.js` | sem erros; OK |

## 7. Por fazer
- Frente sem porta: só com fotografia ou desenho que mostre essa versão.
- Inscrições das placas amarelas e número da unidade: ilegíveis nas fotografias disponíveis (as placas são genéricas).
- Cor exata do creme e do vermelho: estimada pelas fotografias (desbotadas).
