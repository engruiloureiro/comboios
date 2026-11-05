# Reconstrução histórica de Porto-Trindade (1985) — caderno de trabalho

Este documento regista a investigação e as decisões da reconstrução da estação de Porto-Trindade.
Regra: nada entra no jogo como "histórico" sem fonte registada aqui. O que não tiver fonte fica marcado
como **reconstrução interpretativa**.

## Estado da investigação (Etapa 1)

| Fonte | Estado |
|---|---|
| Flickr filhodaCP — Trindade 1972 (https://www.flickr.com/photos/filhodacp/44960167654/) | **por ler** — rede da sessão bloqueava www.flickr.com |
| Flickr filhodaCP — Avenida de França 1979, CP 9609 (https://www.flickr.com/photos/filhodacp/46843892664/) | **por ler** — idem |
| Flickr filhodaCP — álbum (https://www.flickr.com/photos/filhodacp/albums/72157704909993501/) | **por ler** — idem |
| Porto de Antanho — imagem identificada como 1985 (https://portodeantanho.blogspot.com/2024/03/25234-bairro-do-laranjal-rua-do.html) | **por ler** — rede bloqueava o blog |
| Cronologia CP (https://www.cp.pt/info/pt/cronologia) | **por ler** — rede bloqueava www.cp.pt |
| Wikipédia (estação, Linha da Póvoa, séries 9600 e 9300) | **por ler** — rede bloqueava pt.wikipedia.org |
| Plantas de vias dos anos 80, ortofotos, documentação municipal | **por procurar** |

Foi criado o ambiente de nuvem pessoal **comboios** com acesso a estes sites. A investigação continua numa
sessão aberta nesse ambiente (a sessão atual não pode mudar de ambiente enquanto corre).

## O que o jogo representa hoje (levantamento do código, `index.html`)

Todos os valores abaixo são **internos do jogo**, não medidas históricas.

### Vias e plataformas
- Estação `SB = STN[0]` ("Porto-Trindade"), tipo `term`. Posição interna `pos=400` (km 0), cais de `pa=240` a `pb=414`
  (174 m), centro de paragem `bc=305`.
- Para-choques: `BUFFER_R = SB.pa - 25` (p = 215).
- Seis vias de topo com afastamentos transversais `0, 4, -5.5, 9, -11.5, 15` m (`LAY.VT`, linha 462).
  Numeração `LNNO`: 0→1, 4→2, −5.5→3, 9→4, −11.5→5, 15→6 (linha 1 = partidas da via dupla, 2 = chegadas).
- Plataformas `LAY.VT.pl`: [−1.8,−3.7], [5.8,7.2], [−7.3,−9.7], [10.8,13.2] (quatro cais entre vias).
- Agulhas `LAY.VT.ex`: dez ligações; as quatro primeiras saem da via principal, as outras seis atravessam
  (desfasadas 34 m entre si a partir de `SB.pb+110`).
- Via dupla de `DBL.a = SB.pa-160` até à Senhora da Hora (`DBL.b`, p = 6890, km 6,05 + 440 m).

### Coberturas e equipamento dos cais (linhas 1114–1120)
- `canopy`: palas em x = −2.75, 6.5, −8.5, 12 m, três troços de 50–56 m (a 30, 90 e 150 m do eixo).
- `lclock`: um relógio com números de linha por cais; `lnum`: placas sobre os para-choques e tabuletas suspensas.

### Envolvente (objeto `TRC`, linhas 1381–1410)
- Trincheira entre os para-choques e o túnel (km 0,32–0,78): muro esquerdo 9,2 m, muralha direita a subir
  de 4 a 13 m; hera e arbustos; blocos de prédios gerados por sorteio dos dois lados e sobre o túnel;
  viaduto à saída do túnel.
- Topo das vias: `head` (edifício com TRINDADE), `house` (casarão), `tower` (torre da igreja, a 120 m atrás
  dos para-choques, x = 30), canteiros com logótipo CP, cais de topo `conc`.
- Túnel `TUN`: km 0,32 a 0,78 (460 m). Primeira paragem: Avenida de França, km 1,75.

## Perguntas que as fontes têm de responder

1. Número de vias de topo em 1985 e a sua numeração.
2. Número, largura, comprimento e altura dos cais; que vias serve cada cais.
3. Tipo de cobertura (palas individuais, gare coberta?), estrutura e materiais.
4. Feixe de agulhas: onde começa, quantas ligações, vias de resguardo ou de serviço.
5. Edifício de passageiros: volumetria, fachada, entrada, posição em relação aos cais.
6. Trincheira: profundidade, muros, taludes, passagens superiores (que ruas), posição do portal do túnel.
7. Túnel e saída para a Lapa/Avenida de França: comprimento, curvas, portais, via dupla.
8. Linhas de visão para a Igreja da Trindade e a Rua de Camões.
9. Material circulante em serviço na Trindade em 1985 (9600, 9630, 9300, rebocado).
10. Data da imagem do Porto de Antanho identificada como 1985, e o que mostra.

## Decisões tomadas

Nenhuma alteração geométrica feita até haver fontes lidas.
