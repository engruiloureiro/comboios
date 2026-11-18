# Testes automáticos (Playwright + Chromium)

Correm com `node testes/<ficheiro>.js` a partir da raiz do projeto (precisa de `playwright` instalado).

| Ficheiro | O que verifica |
|---|---|
| `continuidade.js` | Continuidade geométrica até 1,5 km depois da bifurcação da Senhora da Hora nas três linhas (saltos de rumo, de curvatura e de declive; raio mínimo) e igualdade exata do troço comum Trindade – Senhora da Hora entre a Linha de Guimarães, a da Póvoa e o mundo contínuo |
| `suburbano.js` | Serviço suburbano Trindade ↔ Senhora da Hora nos dois sentidos, com condutor automático; conta os cruzamentos com comboios contrários e as sobreposições na mesma via (devem ser 0) |
| `bifurcacao.js` | Trindade → Maia e Trindade → Custóias (atravessando a bifurcação) e os regressos à Trindade |
| `rampas.js` | Arranque com tração máxima e travagem em rampas e pendentes do perfil da Gazeta |
| `condutor.js` | Condutor automático usado pelos testes (respeita os limites de velocidade) |
