# Site do Agrupamento de Escolas D. António Taipa — backoffice

## O que está nesta pasta

| Ficheiro | Para que serve |
|---|---|
| `index.html` | Site público. Lê os conteúdos do Supabase; se não conseguir, mostra o conteúdo escrito na página. |
| `backoffice.html` | Área de gestão (entrada com email e palavra-passe do Supabase). |
| `assets/` | Logótipos e imagens de exemplo. **Não alterar os logótipos.** |
| `supabase-backoffice.sql` | Instalação da base de dados (executar uma vez). |

## Instalação (uma vez)

1. **Supabase → SQL Editor → New query**: cola o conteúdo de `supabase-backoffice.sql` e carrega em **Run**.
   Cria as tabelas, as permissões e o conteúdo inicial (igual ao da página atual). Pode voltar a ser executado sem perder dados.
2. **Authentication → Users → Add user**: cria a tua conta (email + palavra-passe).
3. No SQL Editor, executa (com o teu email):
   ```sql
   insert into public.site_perfis (user_id, email, perfil)
   select id, email, 'admin' from auth.users where email = 'o.teu.email@aefreamunde.com'
   on conflict (user_id) do update set perfil = 'admin';
   ```
4. Publica a pasta inteira no Cloudflare Pages (como no site da Direção de Curso).
   O site fica em `.../index.html` e o backoffice em `.../backoffice.html`.

O projeto Supabase configurado é o mesmo da Direção de Curso (`mvbzrmcytngsihkhglxe`). Para usar outro, muda
`SITE_SUPABASE_URL`/`SITE_SUPABASE_KEY` no fim do `index.html` e `SUPABASE_URL`/`SUPABASE_KEY` no `backoffice.html`.

## Perfis

| Perfil | Pode |
|---|---|
| **Administrador** | Tudo: notícias, avisos, menus e submenus, destaque, acessos rápidos e utilizadores. |
| **Editor** | Notícias e avisos. |

Novos utilizadores: cria a conta em *Authentication → Users* e atribui o perfil no separador **Utilizadores** do backoffice.
Uma conta sem perfil não entra no backoffice. As permissões são verificadas na base de dados (RLS), não só na interface.

## Imagens e documentos (OneDrive)

As imagens e os documentos ficam no OneDrive do agrupamento — o Supabase só guarda as ligações.

1. No OneDrive, clica no ficheiro → **Partilhar** → **Qualquer pessoa com a ligação pode ver** → **Copiar ligação**.
2. Cola a ligação no campo da imagem (ou na ligação de um menu/aviso).
3. O backoffice converte a ligação numa ligação direta e mostra uma pré-visualização. Se aparecer
   "Não foi possível abrir a imagem", a partilha não está aberta a qualquer pessoa ou o ficheiro não é uma imagem.

Nota: algumas contas Microsoft 365 escolares não permitem partilhas "Qualquer pessoa". Nesse caso, pede ao
administrador do Microsoft 365 para ativar essa opção para a pasta das imagens do site.

## Na página inicial

- **Notícias**: a notícia marcada como destaque (ou, se nenhuma estiver marcada, a mais recente) e as duas publicadas
  mais recentes. Rascunhos e notícias com data futura não aparecem.
- **Informação útil**: até 6 avisos publicados dentro do período indicado, pela ordem definida.
- **Menus**: os nomes e as entradas definidos no backoffice (as entradas ocultas não aparecem).
