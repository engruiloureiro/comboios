# CP UME 3400 — Modelo original 3D para Three.js

## O que está incluído

- `CP_UME3400_ThreeJS.glb` — modelo 3D GLB com quatro veículos, duas cabinas, cinco bogies, portas, janelas, equipamento de teto e pantógrafo levantado.
- `gerar_ume3400.py` — código-fonte Python que cria o modelo, mantendo a geometria e os materiais editáveis e reprodutíveis.
- `index.html` — visualizador 3D com Three.js para executar localmente ou publicar no Cloudflare Pages.
- `LICENSE.txt` — condições de licenciamento.

## Utilização

1. Copia `CP_UME3400_ThreeJS.glb` para a pasta `assets/models/` do teu projeto Three.js.
2. Carrega-o com `GLTFLoader` do Three.js. O modelo tem escala em metros (comprimento nominal aproximado de 66,8 m) e o eixo longitudinal é Z.
3. Para ver o visualizador fornecido, abre o terminal **na pasta deste projeto** e executa:

   ```bash
   python -m http.server 8000
   ```

4. Visita `http://localhost:8000/`. É necessário acesso à internet para os módulos do Three.js carregados por CDN.
5. Para voltar a gerar o GLB, instala `pip install numpy trimesh Pillow` e corre `python gerar_ume3400.py`.

## Exemplo Three.js

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

new GLTFLoader().load('/assets/models/CP_UME3400_ThreeJS.glb', (gltf) => {
  const automotora = gltf.scene;
  scene.add(automotora);
  automotora.position.set(0, 0, 0);
});
```

## Fidelidade

Trata-se de um **modelo original simplificado** destinado a experiências WebGL, não de um CAD oficial nem de uma cópia do modelo de terceiros. A caixa tem a decoração amarela/cinzenta e proporções exteriores características; **cabinas, janelas, porta e pantógrafo são aproximações artísticas**. Não possui interior detalhado, nem articulações e portas animadas. O pantógrafo levantado ultrapassa a altura nominal da caixa.

Dimensões de referência: comprimento 66,8 m; largura 3,122 m; altura da caixa 3,946 m. O número 3401 e destino Guimarães são ilustrações decorativas, não configuráveis no GLB (mas editáveis no gerador).

Fontes de referência: [CP — automotoras Série 3400](https://www2.cp.pt/info/web/cp/w/as-automotoras-serie-cp-3400) e [Comboios em Portugal — dados técnicos históricos](https://combport.portugalferroviario.net/artigos/material/CBP2003-01.pdf).

## Licença

Todo o código-fonte e geometria original deste pacote são disponibilizados sob **CC0 1.0** (domínio público). Nomes, marca e sinais distintivos da **CP — Comboios de Portugal** não são licenciados por esta dedicação, continuando sujeitos aos direitos dos respetivos titulares.
