-- =====================================================================
-- Backoffice do site do Agrupamento de Escolas D. António Taipa
-- Executar uma vez no Supabase: SQL Editor → New query → colar → Run.
-- Pode ser executado de novo sem perder dados (não volta a inserir o conteúdo inicial).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Perfis
-- admin  : gere tudo (notícias, avisos, menus, destaque, acessos rápidos e utilizadores)
-- editor : gere notícias e avisos
create table if not exists public.site_perfis (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  perfil    text not null check (perfil in ('admin','editor')),
  criado_em timestamptz not null default now()
);

create or replace function public.site_perfil() returns text
language sql stable security definer set search_path = public as $$
  select perfil from public.site_perfis where user_id = auth.uid()
$$;
create or replace function public.site_e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.site_perfil() = 'admin', false)
$$;
create or replace function public.site_e_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.site_perfil() in ('admin','editor'), false)
$$;

-- Atribuir/alterar/remover o perfil de uma conta existente (só administradores).
-- A conta tem de existir primeiro em Authentication → Users.
create or replace function public.site_definir_perfil(p_email text, p_perfil text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid;
begin
  if not public.site_e_admin() then raise exception 'Apenas administradores podem gerir utilizadores.'; end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then raise exception 'Não existe nenhuma conta com o email %. Cria-a primeiro em Authentication → Users.', p_email; end if;
  if v_id = auth.uid() and coalesce(p_perfil,'') <> 'admin' then raise exception 'Não podes retirar o teu próprio perfil de administrador.'; end if;
  if p_perfil is null or p_perfil = '' then
    delete from public.site_perfis where user_id = v_id;
  elsif p_perfil in ('admin','editor') then
    insert into public.site_perfis(user_id, email, perfil) values (v_id, lower(trim(p_email)), p_perfil)
    on conflict (user_id) do update set perfil = excluded.perfil, email = excluded.email;
  else
    raise exception 'Perfil inválido: %', p_perfil;
  end if;
end $$;
revoke all on function public.site_definir_perfil(text, text) from public, anon;
grant execute on function public.site_definir_perfil(text, text) to authenticated;

alter table public.site_perfis enable row level security;
drop policy if exists "perfis: ver o próprio ou admin" on public.site_perfis;
create policy "perfis: ver o próprio ou admin" on public.site_perfis for select to authenticated
  using (user_id = auth.uid() or public.site_e_admin());

-- ---------------------------------------------------------------- Notícias
create table if not exists public.site_noticias (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  resumo          text,
  categoria       text,
  cor             text not null default 'terra' check (cor in ('terra','sky','lilac','sun','green','orange')),
  imagem_url      text,                              -- ligação OneDrive (ou caminho assets/...)
  imagem_alt      text,
  imagem_topo     boolean not null default false,   -- cartazes: recortar a partir do topo
  video_url       text,                              -- ligação de um vídeo do YouTube (opcional)
  ligacao_url     text,
  ligacao_texto   text not null default 'Ver a notícia',
  data_publicacao date not null default current_date,
  destaque        boolean not null default false,
  publicado       boolean not null default false,
  idioma          text,                              -- ex.: 'en' quando o título está em inglês
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid default auth.uid()
);

-- instalações anteriores: acrescenta a coluna do vídeo se ainda não existir
alter table public.site_noticias add column if not exists video_url text;

-- ---------------------------------------------------------------- Avisos (Informação útil)
create table if not exists public.site_avisos (
  id             uuid primary key default gen_random_uuid(),
  publico        text not null default 'ALUNOS E FAMÍLIAS',
  titulo         text not null,
  ligacao_url    text,
  inicio         date,
  fim            date,
  ordem          integer not null default 0,
  publicado      boolean not null default false,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid default auth.uid()
);

-- ---------------------------------------------------------------- Menus
create table if not exists public.site_menus (
  chave   text primary key,                -- identificador fixo (não alterar)
  rotulo  text not null,
  ordem   integer not null
);
create table if not exists public.site_menu_itens (
  id        uuid primary key default gen_random_uuid(),
  menu      text not null references public.site_menus(chave) on delete cascade,
  rotulo    text not null,
  url       text not null default '#',
  icone     text not null default 'i-link',
  ordem     integer not null default 0,
  visivel   boolean not null default true,
  nova_aba  boolean not null default false
);

-- ---------------------------------------------------------------- Destaque e acessos rápidos
create table if not exists public.site_config (
  chave         text primary key,          -- 'destaque' | 'acessos'
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- Datas de atualização automáticas
create or replace function public.site_tocar() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['site_noticias','site_avisos','site_config'] loop
    execute format('drop trigger if exists tocar on public.%I', t);
    execute format('create trigger tocar before update on public.%I for each row execute function public.site_tocar()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- Permissões (RLS)
alter table public.site_noticias   enable row level security;
alter table public.site_avisos     enable row level security;
alter table public.site_menus      enable row level security;
alter table public.site_menu_itens enable row level security;
alter table public.site_config     enable row level security;

drop policy if exists "noticias: público vê publicadas" on public.site_noticias;
create policy "noticias: público vê publicadas" on public.site_noticias for select
  using (publicado and data_publicacao <= current_date or public.site_e_editor());
drop policy if exists "noticias: editores gerem" on public.site_noticias;
create policy "noticias: editores gerem" on public.site_noticias for all to authenticated
  using (public.site_e_editor()) with check (public.site_e_editor());

drop policy if exists "avisos: público vê ativos" on public.site_avisos;
create policy "avisos: público vê ativos" on public.site_avisos for select
  using ((publicado and (inicio is null or inicio <= current_date) and (fim is null or fim >= current_date)) or public.site_e_editor());
drop policy if exists "avisos: editores gerem" on public.site_avisos;
create policy "avisos: editores gerem" on public.site_avisos for all to authenticated
  using (public.site_e_editor()) with check (public.site_e_editor());

drop policy if exists "menus: público vê" on public.site_menus;
create policy "menus: público vê" on public.site_menus for select using (true);
drop policy if exists "menus: admin altera" on public.site_menus;
create policy "menus: admin altera" on public.site_menus for update to authenticated
  using (public.site_e_admin()) with check (public.site_e_admin());

drop policy if exists "itens: público vê visíveis" on public.site_menu_itens;
create policy "itens: público vê visíveis" on public.site_menu_itens for select using (visivel or public.site_e_admin());
drop policy if exists "itens: admin gere" on public.site_menu_itens;
create policy "itens: admin gere" on public.site_menu_itens for all to authenticated
  using (public.site_e_admin()) with check (public.site_e_admin());

drop policy if exists "config: público vê" on public.site_config;
create policy "config: público vê" on public.site_config for select using (true);
drop policy if exists "config: admin altera" on public.site_config;
create policy "config: admin altera" on public.site_config for all to authenticated
  using (public.site_e_admin()) with check (public.site_e_admin());

-- ---------------------------------------------------------------- Imagens e ficheiros
-- Não se usa o Storage do Supabase: imagens e documentos ficam no OneDrive do agrupamento.
-- O backoffice guarda apenas a ligação de partilha ("Qualquer pessoa com a ligação pode ver"),
-- que converte numa ligação direta para a imagem.

-- ---------------------------------------------------------------- Conteúdo inicial (igual à página atual)

insert into public.site_menus (chave, rotulo, ordem) values
  ('agrupamento', 'O agrupamento', 1),
  ('comunidade', 'Comunidade Ed.', 2),
  ('ptdigital', 'P.T.Digital', 3),
  ('projetos', 'Projetos e Clubes', 4),
  ('ligacoes', 'Ligações', 5),
  ('oferta', 'Oferta Formativa', 6)
on conflict (chave) do nothing;

insert into public.site_menu_itens (menu, rotulo, icone, ordem)
select * from (values
  ('agrupamento', 'História', 'i-clock', 10),
  ('agrupamento', 'Escolas', 'i-school', 20),
  ('agrupamento', 'Localização e contactos', 'i-pin', 30),
  ('agrupamento', 'Órgãos de gestão', 'i-org', 40),
  ('agrupamento', 'Documentos estruturantes', 'i-file', 50),
  ('agrupamento', 'Proteção de dados', 'i-shield', 60),
  ('agrupamento', 'MENAC', 'i-scale', 70),
  ('agrupamento', 'EQAVET', 'i-check', 80),
  ('agrupamento', 'Estratégia da Educação para a Cidadania', 'i-chat', 90),
  ('comunidade', 'Docentes', 'i-presentation', 10),
  ('comunidade', 'Não docentes', 'i-id', 20),
  ('comunidade', 'Alunos/EE', 'i-backpack', 30),
  ('ptdigital', 'Documentação', 'i-folder', 10),
  ('ptdigital', 'RED - Rec. Educ. Dig.', 'i-play', 20),
  ('ptdigital', 'KIT’s DIGITAIS', 'i-package', 30),
  ('ptdigital', 'Plataformas de Formação – MOOCs', 'i-laptop', 40),
  ('projetos', 'Projetos Internacionais', 'i-globe', 10),
  ('projetos', 'Projetos Nacionais', 'i-flag', 20),
  ('projetos', 'Projetos do Agrupamento', 'i-star', 30),
  ('projetos', 'Projetos de Saúde', 'i-heart', 40),
  ('projetos', 'Clubes', 'i-users', 50),
  ('projetos', 'Distinções', 'i-award', 60),
  ('projetos', 'Protocolos', 'i-pen', 70),
  ('ligacoes', 'Pedido de Manutenção', 'i-wrench', 10),
  ('ligacoes', 'Moodle', 'i-book', 20),
  ('ligacoes', 'Office365', 'i-grid', 30),
  ('ligacoes', 'Ligações internas', 'i-link', 40),
  ('ligacoes', 'Ligações externas', 'i-external', 50),
  ('ligacoes', 'GIAE', 'i-database', 60),
  ('oferta', 'Cursos Profissionais', 'i-cap', 10),
  ('oferta', 'Educação e Formação Profissional', 'i-briefcase', 20),
  ('oferta', 'Atividades Cursos Profissionais de Eletrónica e Mecatrónica', 'i-spark', 30),
  ('oferta', 'Folheto Curso Eletrónica, Automação e Computadores', 'i-cpu', 40),
  ('oferta', 'Folheto Curso Auxiliar de Saúde', 'i-heart', 50),
  ('oferta', 'Folheto Curso de Mecatrónica', 'i-cog', 60),
  ('oferta', 'Folheto de Técnico de Energias Renováveis', 'i-bolt', 70)
) v(menu, rotulo, icone, ordem)
where not exists (select 1 from public.site_menu_itens);

insert into public.site_noticias (titulo, resumo, categoria, cor, imagem_url, imagem_alt, imagem_topo, ligacao_url, ligacao_texto, data_publicacao, destaque, publicado, idioma)
select * from (values
  ('Aprender para lá da sala de aula.', 'Atividades práticas, descoberta e trabalho em equipa ao ar livre.', 'Aprendizagem · Erasmus+', 'terra',
   'assets/noticia-outdoor-learning.jpg', 'Atividades Outdoor Learning do agrupamento: alunos em tarefas práticas no exterior', false,
   'https://aefreamunde.com/index.php/projetos/712-atividade-outdoor-learning', 'Outdoor Learning', current_date - 2, true, true, null),
  ('Future Plan 2.0', 'Local Hands, Global Impact.', 'Projetos internacionais', 'sky',
   'assets/noticia-future-plan.jpg', 'Cartaz da iniciativa Future Plan 2.0', true,
   'https://aefreamunde.com/index.php/projetos/projetos-internacionais/programa-erasmus/informacoes/725-future-plan-2-0', 'Conhecer o projeto', current_date - 1, false, true, 'en'),
  ('O património local liga-nos à Europa.', 'Partilha de experiências com a comunidade escolar.', 'Comunidade · Cultura', 'lilac',
   'assets/noticia-local-voices.jpg', 'Comunidade escolar na sessão do projeto Local Voices to European Colours', false,
   'https://aefreamunde.com/index.php/projetos/709-comunidade-escolar-celebra-o-patrimonio-local-em-sessao-de-disseminacao-do-projeto-erasmus-local-voices-to-european-colours', 'Ver a notícia', current_date - 3, false, true, null)
) v(titulo, resumo, categoria, cor, imagem_url, imagem_alt, imagem_topo, ligacao_url, ligacao_texto, data_publicacao, destaque, publicado, idioma)
where not exists (select 1 from public.site_noticias);

insert into public.site_avisos (publico, titulo, ordem, publicado)
select * from (values
  ('ALUNOS E FAMÍLIAS', 'Manuais escolares 26/27', 10, true),
  ('COMUNIDADE EDUCATIVA', 'Associação de Pais: Assembleia Geral Ordinária', 20, true),
  ('DOCENTES', 'Contratação de escola — Grupo 540', 30, true)
) v(publico, titulo, ordem, publicado)
where not exists (select 1 from public.site_avisos);

insert into public.site_config (chave, valor) values
  ('destaque', jsonb_build_object(
     'eyebrow', 'A nossa comunidade educativa',
     'palavras', jsonb_build_array('Aprender.', 'Crescer.', 'Participar.'),
     'intro', 'Um espaço de encontro para alunos, famílias e profissionais de educação.',
     'percurso_eyebrow', 'Percursos de aprendizagem',
     'percurso_titulo', 'O teu futuro começa com uma escolha.',
     'percurso_texto', 'Conhece a oferta formativa e os percursos de ensino profissional do agrupamento.',
     'percurso_botao', 'Explorar a oferta formativa',
     'imagem_url', null)),
  ('acessos', jsonb_build_array(
     jsonb_build_object('rotulo', 'Inovar Consultas', 'url', '#', 'icone', 'i-cap'),
     jsonb_build_object('rotulo', 'Office365', 'url', '#', 'icone', 'i-monitor'),
     jsonb_build_object('rotulo', 'Moodle', 'url', '#', 'icone', 'i-book'),
     jsonb_build_object('rotulo', 'Ementas', 'url', '#', 'icone', 'i-utensils')))
on conflict (chave) do nothing;

-- ---------------------------------------------------------------- Primeiro administrador
-- 1) Cria a conta em Authentication → Users → Add user (com email e palavra-passe).
-- 2) Substitui o email abaixo e executa só esta linha:
-- insert into public.site_perfis (user_id, email, perfil) select id, email, 'admin' from auth.users where email = 'o.teu.email@aefreamunde.com' on conflict (user_id) do update set perfil = 'admin';
-- A partir daí, os restantes perfis atribuem-se no próprio backoffice (separador Utilizadores).
