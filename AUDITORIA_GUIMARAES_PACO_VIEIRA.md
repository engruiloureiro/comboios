# Etapa A — Auditoria do troço Guimarães → Paçô Vieira (estado do código)

Estado: **investigação documental bloqueada** (ver §1). Nenhuma alteração ao jogo foi feita nesta etapa.

## 1. Fontes: o que foi possível consultar
| Fonte pedida | Resultado |
|---|---|
| ocomboio.net (estudo Sarmento & Mourão, PDF) | inacessível: o domínio não resolve na rede do ambiente |
| portal.arquivos.pt (cartografia 1976–82) | inacessível: o proxy do ambiente devolve 403 |
| hereditas.cm-guimaraes.pt (ficha de Paçô Vieira) | inacessível: o domínio não resolve |
| pt.wikipedia.org | inacessível: o domínio não resolve |
| Pesquisa web | só devolveu fichas de geocaching, sem PK, túneis nem apeadeiros |

Sem estas fontes não há como confirmar PK, designações, túnel, vias da estação nem traçado de 1985. Pelas regras do próprio pedido, nada foi alterado.

## 2. O que o código tem hoje (verificado)
- **Eixo horizontal**: `HDG[]` sai de `headingAtKm(k)` sobre os pontos `WPT` (só estações, coordenadas em `GPXC`), suavizado em 3 passagens de média ±12 segmentos, com **curvas em S aleatórias** sobrepostas (`rnd()`, λ 380–900 m, amplitude 0,18–0,40 rad) em `build()` (≈ linha 648). Entre Guimarães e Paçô Vieira o traçado é, por isso, **interpolação + ruído**, não cartografia.
- **Os GPX da pasta `gpx/`** declaram `creator="ChatGPT - reconstrução histórica de referência"` e dizem que os segmentos entre estações são linhas de ligação. Não são levantamento topográfico e **não devem ser tratados como fonte primária**.
- **Coordenadas das estações (`GPXC`)**: Guimarães 41,43529/−8,29506; Aldão–S. Torcato 41,45665/−8,26649; Penha 41,45117/−8,26084; Paçô Vieira 41,43906/−8,24756. A origem de cada uma não está documentada no código.
- **Túnel**: `TUN` = [PV.pos−160, PV.pos−89], 71 m, imediatamente antes de Paçô Vieira; trincheira com muros de 4,5 m em PV.pos−310…−160. Origem do comprimento não documentada.
- **PN** geradas por código (≈ linha 711) fora de pontes/túneis; **não** correspondem a passagens de nível documentadas.
- **Regiões de cenário** (`HIST_REGIONS`): "Encostas de Guimarães e Paçô Vieira" (PK 60,6–67,95) com parâmetros genéricos de densidade.
- PK de jogo vs. coordenadas: razão (PK ÷ distância em linha reta)

| Troço | reta | PK jogo | razão |
|---|---|---|---|
| Covas → Guimarães | 1,60 km | 1,48 km | 0,93 |
| Guimarães → Aldão | 3,36 km | 4,62 km | 1,37 |
| **Aldão → Penha** | **0,77 km** | **2,20 km** | **2,86** |
| Penha → Paçô Vieira | 1,74 km | 1,71 km | 0,98 |
| Paçô Vieira → Fareja | 3,58 km | 5,39 km | 1,51 |

## 3. Inconsistências suspeitas (a confirmar com fonte)
1. **Aldão → Penha**: 2,20 km de via para 0,77 km em linha reta (razão 2,86) é incompatível com um traçado de encosta normal. Ou o PK de um dos apeadeiros, ou as suas coordenadas, estão errados. **Penha → Paçô Vieira** tem razão 0,98 (praticamente reta), o que também é pouco plausível numa subida de ≈ 45 m de altitude (305 → 350 m).
2. A estação de Paçô Vieira tem `ex[0]` de 310 m (a = pos−80, b = pos+230): a existência de via de cruzamento em 1985 não está comprovada.
3. O Santuário da Penha fica a ≈ 3 km do apeadeiro "Penha" e a ≈ 2 km de Guimarães (posição aproximada do monte, a confirmar): dificilmente visível da via; o jogo não o coloca por critério de relevo.
4. Existência/denominação em 1985 de "Aldão – S. Torcato" e "Penha" como apeadeiros: não confirmada.

## 4. Plano proposto (assim que houver fontes)
- **B**: substituir `WPT`/ruído neste troço por polilinha georreferenciada a partir da cartografia; curvas com transição (clotóide aproximada); perfil `hy` por cotas das curvas de nível; túnel e trincheiras com dados confirmados; manter a deslocação de PK dos modos RG/GP.
- **C–E**: estações/apeadeiros conforme fichas e fotografias; cenário por núcleos (não aleatório) e sinais/PN documentados; testes nos dois sentidos, composição simples e dupla; relatório final com separação "comprovado / aproximado / não confirmado".
