-- IIE Conselheiro — 0001: extensões, esquemas e tabelas
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists iie;
create schema if not exists app;

-- ---------------------------------------------------------------- iie
create table iie.territorio (
  id          text primary key,                       -- 'BR', 'UF-23'
  tipo        text not null check (tipo in ('BR', 'UF', 'CAPITAL', 'MUNICIPIO')),
  codigo_ibge text not null,
  sigla       text not null unique,
  nome        text not null,
  regiao      text not null,
  uf_pai      text references iie.territorio (id),
  sinonimos   text[] not null default '{}'             -- minúsculas, sem acento
);

create table iie.resultado_oficial (
  territorio_id text not null references iie.territorio (id),
  ano           int  not null,
  etapa         text not null check (etapa in ('AI', 'AF', 'EM')),
  valor         numeric(6, 2) not null,
  fonte         text not null,
  primary key (territorio_id, ano, etapa)
);

create table iie.componente (
  territorio_id                text not null references iie.territorio (id),
  ano                          int  not null,
  metodo                       text not null,
  oficial                      boolean not null default false,
  iie_reproduzido              numeric(8, 3) not null,
  pct_adiantado                numeric(8, 3) not null,
  pct_em_linha                 numeric(8, 3) not null,
  pct_atrasado1                numeric(8, 3) not null,
  pct_atrasado2                numeric(8, 3) not null,
  pct_fora_escola              numeric(8, 3) not null,
  pct_concluiu_ate18           numeric(8, 3) not null,
  pct_basico_entre_concluintes numeric(8, 3) not null,
  p_basico_adiantado           numeric(8, 3) not null,
  p_basico_em_linha            numeric(8, 3) not null,
  p_basico_atrasado1           numeric(8, 3) not null,
  coorte_ajustada              numeric(14, 3) not null,
  fonte                        text not null,
  primary key (territorio_id, ano, metodo)
);

create table iie.indicador (
  id              text primary key,                   -- P1, F2, F1, A1, A2, A3, E1, E2, E3, Q1, D1
  nome            text not null,
  grupo           text not null,
  pergunta        text not null,
  metrica         text not null,
  sentido         text not null check (sentido in ('baixo_ruim', 'alto_ruim', 'nenhum')),
  gatilho_atencao text not null,
  gatilho_critico text not null,
  significado     text not null,
  diagnostico     text[] not null,
  monitorar       text[] not null,
  horizonte       text not null
);

create table iie.pratica (
  id        text primary key,                         -- GE-73, GE-SEC-68, SM-79, PE-11
  fonte     text not null check (fonte in ('MEC', 'Itaú Social', 'TPE')),
  documento text not null,
  linhas    text not null
);

create table iie.indicador_pratica (
  indicador_id text not null references iie.indicador (id),
  pratica_id   text not null references iie.pratica (id),
  nivel        text not null check (nivel in ('Escola', 'Secretaria', 'Estratégico')),
  papel        text not null check (papel in ('núcleo', 'complementar')),
  nome         text not null,
  o_que_fazer  text not null,
  ordem        int  not null,
  primary key (indicador_id, pratica_id)
);

create table iie.alerta_dado (
  id            serial primary key,
  territorio_id text references iie.territorio (id),  -- null = todos
  ano           int,                                  -- null = todos
  indicador_id  text references iie.indicador (id),
  natureza      text not null check (natureza in ('oficial', 'reproducao', 'ambos')),
  severidade    text not null check (severidade in ('info', 'media', 'alta')),
  texto         text not null
);

create table iie.carga (
  id           bigserial primary key,
  hash         text not null,
  linhas       jsonb not null,
  carregado_em timestamptz not null default now(),
  responsavel  text not null
);

-- ---------------------------------------------------------------- app
create table app.usuario (
  id              uuid primary key default gen_random_uuid(),
  telefone_e164   text unique check (telefone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  nome            text not null,
  perfil          text not null check (perfil in ('escola', 'secretaria_municipal', 'secretaria_estadual', 'equipe_interna')),
  instituicao     text,
  uf_padrao       text references iie.territorio (sigla),
  status          text not null default 'pendente' check (status in ('pendente', 'ativo', 'bloqueado', 'removido')),
  aceite_termo_em timestamptz,
  criado_em       timestamptz not null default now()
);

create table app.solicitacao_acesso (
  id            bigserial primary key,
  telefone_e164 text not null,
  mensagem      text,
  status        text not null default 'aberta' check (status in ('aberta', 'aprovada', 'recusada')),
  criado_em     timestamptz not null default now()
);

create table app.conversa (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null references app.usuario (id) on delete cascade,
  iniciada_em        timestamptz not null default now(),
  ultima_mensagem_em timestamptz not null default now()
);

create table app.mensagem (
  id                 uuid primary key default gen_random_uuid(),
  conversa_id        uuid not null references app.conversa (id) on delete cascade,
  wamid              text unique,
  papel              text not null check (papel in ('usuario', 'agente')),
  texto              text not null,
  ferramentas        jsonb,
  uso                jsonb,
  numeros_sem_origem jsonb,
  latencia_ms        int,
  modelo             text,
  kb_versao          text,
  erro               text,
  criado_em          timestamptz not null default now()
);
create index mensagem_conversa_criado on app.mensagem (conversa_id, criado_em);

create table app.feedback (
  id          bigserial primary key,
  mensagem_id uuid not null references app.mensagem (id) on delete cascade,
  nota        smallint not null check (nota in (-1, 1)),
  motivo      text,
  criado_em   timestamptz not null default now()
);

create table app.kb_versao (
  versao    text primary key,
  hash      text not null,
  tokens    int  not null,
  conteudo  text not null,
  ativa     boolean not null default false,
  avaliacao jsonb,
  criado_em timestamptz not null default now()
);
create unique index kb_versao_uma_ativa on app.kb_versao (ativa) where ativa;
