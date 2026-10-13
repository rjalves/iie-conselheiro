-- IIE Conselheiro — 0005: base de práticas completa (proposta 03, seção 6.1)
-- Catálogo das 541 práticas dos três referenciais, pré-condições, pacotes por perfil de território, lacunas,
-- busca textual e as funções iie.fn_buscar_praticas e iie.fn_pacote. A iie.fn_praticas passa a trazer as lacunas.

-- ------------------------------------------------------------ catálogo
-- Sem acento e imutável, para poder entrar na coluna de busca gerada.
create or replace function iie.sem_acento(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))
$$;

alter table iie.pratica
  add column if not exists nivel     text check (nivel in ('Escola', 'Secretaria', 'Estratégico')),
  add column if not exists secao     text,
  add column if not exists nome      text,
  add column if not exists descricao text,
  add column if not exists alavancas text[] not null default '{}'
    check (alavancas <@ array['acesso', 'fluxo', 'aprendizagem', 'equidade', 'dados', 'estruturantes']);

alter table iie.pratica add column if not exists busca tsvector generated always as (
  setweight(to_tsvector('portuguese', iie.sem_acento(nome)), 'A') ||
  setweight(to_tsvector('portuguese', iie.sem_acento(descricao)), 'B') ||
  setweight(to_tsvector('portuguese', iie.sem_acento(secao)), 'C')
) stored;
create index if not exists pratica_busca on iie.pratica using gin (busca);

-- ------------------------------------------------------------ relação completa do doc 09
create table if not exists iie.precondicao (
  id             text primary key,                    -- lideranca, acompanhamento, planejamento, ...
  nome           text not null,
  o_que_garantir text not null,
  ordem          int  not null
);

create table if not exists iie.precondicao_pratica (
  precondicao_id text not null references iie.precondicao (id) on delete cascade,
  pratica_id     text not null references iie.pratica (id),
  ordem          int  not null,
  primary key (precondicao_id, pratica_id)
);

create table if not exists iie.perfil_territorio (
  id        text primary key,                         -- fluxo, aprendizagem, duplo, evasao, perda_em, dado
  nome      text not null,
  criterio  text not null,
  sequencia text[] not null,                          -- IDs de indicador, ou 'base' (pré-condições)
  descricao text not null,
  ordem     int  not null
);

create table if not exists iie.perfil_pratica (
  perfil_id  text not null references iie.perfil_territorio (id) on delete cascade,
  pratica_id text not null references iie.pratica (id),
  ordem      int  not null,
  primary key (perfil_id, pratica_id)
);

create table if not exists iie.lacuna (
  id          text primary key,
  tema        text not null,
  cobertura   text not null,
  complemento text not null,
  indicadores text[] not null,
  ordem       int  not null
);

-- ------------------------------------------------------------ funções
create or replace function iie.fn_lacunas(p_indicadores text[])
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('tema', l.tema, 'cobertura', l.cobertura, 'complemento', l.complemento,
                                               'indicadores', to_jsonb(l.indicadores)) order by l.ordem), '[]'::jsonb)
  from iie.lacuna l
  where l.indicadores && p_indicadores
$$;

create or replace function iie.fn_praticas(p_indicador text, p_nivel text default null, p_papel text default null)
returns jsonb language plpgsql stable as $$
declare
  i iie.indicador;
begin
  select * into i from iie.indicador where id = upper(p_indicador);
  if not found then
    raise exception using errcode = 'P0002', message = format('indicador_desconhecido: %s', p_indicador);
  end if;
  return jsonb_build_object(
    'indicador', to_jsonb(i),
    'praticas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nivel', ip.nivel, 'papel', ip.papel, 'nome', ip.nome,
                                          'o_que_fazer', ip.o_que_fazer, 'fonte', p.fonte,
                                          'documento', p.documento, 'linhas', p.linhas)
                       order by case ip.papel when 'núcleo' then 0 else 1 end, ip.ordem)
      from iie.indicador_pratica ip join iie.pratica p on p.id = ip.pratica_id
      where ip.indicador_id = i.id
        and (p_nivel is null or iie.norm(ip.nivel) = iie.norm(p_nivel))
        and (p_papel is null or iie.norm(ip.papel) = iie.norm(p_papel))), '[]'::jsonb),
    'lacunas', iie.fn_lacunas(array[i.id]));
end $$;

create or replace function iie.fn_buscar_praticas(p_termo text, p_fonte text default null, p_nivel text default null,
                                                  p_limite int default 10)
returns jsonb language plpgsql stable as $$
declare
  v_lim int := least(greatest(coalesce(p_limite, 10), 1), 20);
  v_q   tsquery;
  v_res jsonb;
begin
  if coalesce(trim(p_termo), '') = '' then
    raise exception using errcode = '22023', message = 'termo_vazio: informe o que procurar';
  end if;
  v_q := websearch_to_tsquery('portuguese', iie.sem_acento(p_termo));
  for tentativa in 1..2 loop
    select jsonb_agg(x.pratica order by x.relevancia desc, x.id) into v_res
    from (
      select p.id, ts_rank(p.busca, v_q) as relevancia,
             jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'fonte', p.fonte,
                                'nivel', p.nivel, 'secao', p.secao, 'documento', p.documento, 'linhas', p.linhas,
                                'indicadores', coalesce((select jsonb_agg(distinct ip.indicador_id)
                                                         from iie.indicador_pratica ip
                                                         where ip.pratica_id = p.id), '[]'::jsonb)) as pratica
      from iie.pratica p
      where p.busca @@ v_q
        and (p_fonte is null or iie.norm(p.fonte) = iie.norm(p_fonte))
        and (p_nivel is null or iie.norm(p.nivel) = iie.norm(p_nivel))
      order by relevancia desc, p.id
      limit v_lim
    ) x;
    exit when v_res is not null or tentativa = 2;
    -- Nada com todas as palavras: tenta com qualquer uma delas.
    v_q := replace(v_q::text, ' & ', ' | ')::tsquery;
  end loop;
  return jsonb_build_object('termo', p_termo, 'fonte', p_fonte, 'nivel', p_nivel,
                            'praticas', coalesce(v_res, '[]'::jsonb),
                            'total', jsonb_array_length(coalesce(v_res, '[]'::jsonb)));
end $$;

create or replace function iie.fn_pacote(p_perfil text)
returns jsonb language plpgsql stable as $$
declare
  pf iie.perfil_territorio;
begin
  select * into pf from iie.perfil_territorio
  where id = iie.norm(p_perfil) or iie.norm(nome) = iie.norm(p_perfil);
  if not found then
    raise exception using errcode = 'P0002', message = format('perfil_desconhecido: %s', p_perfil),
      hint = (select 'Perfis: ' || string_agg(id, ', ' order by ordem) from iie.perfil_territorio);
  end if;
  return jsonb_build_object(
    'perfil', jsonb_build_object('id', pf.id, 'nome', pf.nome, 'criterio', pf.criterio,
                                 'sequencia', to_jsonb(pf.sequencia), 'descricao', pf.descricao),
    'praticas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'fonte', p.fonte,
                                          'nivel', p.nivel, 'documento', p.documento, 'linhas', p.linhas)
                       order by pp.ordem)
      from iie.perfil_pratica pp join iie.pratica p on p.id = pp.pratica_id
      where pp.perfil_id = pf.id), '[]'::jsonb),
    'precondicoes', (
      select jsonb_agg(jsonb_build_object(
               'id', pc.id, 'nome', pc.nome, 'o_que_garantir', pc.o_que_garantir,
               'praticas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'fonte', p.fonte,
                                                                         'linhas', p.linhas) order by cp.ordem)
                                     from iie.precondicao_pratica cp join iie.pratica p on p.id = cp.pratica_id
                                     where cp.precondicao_id = pc.id), '[]'::jsonb))
             order by pc.ordem)
      from iie.precondicao pc),
    'lacunas', iie.fn_lacunas(pf.sequencia));
end $$;

-- ------------------------------------------------------------ permissões (as tabelas novas seguem a 0003)
grant select on all tables in schema iie to agente_leitura, n8n_operacao;
grant execute on all functions in schema iie to agente_leitura, n8n_operacao;

do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'iie' loop
    execute format('alter table iie.%I enable row level security', r.tablename);
    execute format('drop policy if exists leitura on iie.%I', r.tablename);
    execute format('create policy leitura on iie.%I for select to agente_leitura, n8n_operacao using (true)', r.tablename);
  end loop;
end $$;
