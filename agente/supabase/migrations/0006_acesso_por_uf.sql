-- IIE Conselheiro — 0006: acesso por UF (proposta 03, decisão W5 revista em 2026-10-13)
-- Cada usuário tem a lista de UFs cujos dados pode ver (app.usuario.ufs_acesso), que começa com a UF do cadastro.
-- Administradores veem todas. As funções de dados do IIE recebem a lista (p_ufs) e recusam o que estiver fora dela;
-- sem a lista, recusam tudo. Brasil e práticas de gestão continuam liberados.

-- ------------------------------------------------------------ lista de UFs do usuário
create or replace function iie.ufs_todas() returns text[]
language sql stable set search_path = '' as $$
  select array_agg(t.sigla order by t.sigla) from iie.territorio t where t.tipo = 'UF'
$$;

alter table app.usuario add column if not exists ufs_acesso text[];
update app.usuario set ufs_acesso = array[uf] where ufs_acesso is null;
alter table app.usuario alter column ufs_acesso set not null;

-- Normaliza (maiúsculas, sem repetição, em ordem) e recusa lista vazia ou com sigla que não é UF.
create or replace function app.validar_ufs_acesso() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_invalidas text[];
begin
  new.ufs_acesso := (select array_agg(distinct upper(trim(x)) order by upper(trim(x))) from unnest(new.ufs_acesso) x);
  if coalesce(cardinality(new.ufs_acesso), 0) = 0 then
    raise exception using errcode = '22023', message = 'ufs_acesso_vazia: libere ao menos uma UF';
  end if;
  select array_agg(x) into v_invalidas from unnest(new.ufs_acesso) x
  where not exists (select 1 from iie.territorio t where t.sigla = x and t.tipo = 'UF');
  if v_invalidas is not null then
    raise exception using errcode = '22023', message = format('ufs_acesso_invalidas: %s', array_to_string(v_invalidas, ', '));
  end if;
  return new;
end $$;

drop trigger if exists validar_ufs_acesso on app.usuario;
create trigger validar_ufs_acesso before insert or update of ufs_acesso on app.usuario
  for each row execute function app.validar_ufs_acesso();

-- O cadastro passa a gravar a lista com a UF informada.
create or replace function app.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_uf     text  := upper(trim(m ->> 'uf'));
  v_mun    text  := trim(m ->> 'municipio_ibge');
  v_codigo text;
begin
  select t.codigo_ibge into v_codigo from iie.territorio t where t.sigla = v_uf and t.tipo = 'UF';
  if v_codigo is null then
    raise exception using errcode = '22023', message = format('cadastro_invalido: UF %s', coalesce(v_uf, '(vazia)'));
  end if;
  if v_mun is null or v_mun !~ '^[0-9]{7}$' or left(v_mun, 2) <> v_codigo then
    raise exception using errcode = '22023',
      message = format('cadastro_invalido: município %s não pertence à UF %s', coalesce(v_mun, '(vazio)'), v_uf);
  end if;
  if coalesce(m ->> 'aceite_termo', 'false') <> 'true' then
    raise exception using errcode = '22023', message = 'cadastro_invalido: o aceite do termo de uso é obrigatório';
  end if;
  insert into app.usuario (id, email, nome, perfil, instituicao, uf, municipio_ibge, municipio_nome, aceite_termo_em,
                           ufs_acesso)
  values (new.id, new.email, trim(m ->> 'nome'), m ->> 'perfil', trim(m ->> 'instituicao'), v_uf, v_mun,
          trim(m ->> 'municipio_nome'), now(), array[v_uf]);
  return new;
end $$;

-- Só administradores mudam a lista (a política usuario_admin_muda, da 0004, já restringe o update).
grant update (ufs_acesso) on app.usuario to authenticated;

-- ------------------------------------------------------------ verificação nas funções de dados
-- Recusa (42501) se a lista não veio ou se o território é uma UF fora dela. Brasil é sempre liberado.
create or replace function iie.fn_checar_acesso(t iie.territorio, p_ufs text[])
returns void language plpgsql stable set search_path = '' as $$
begin
  if p_ufs is null then
    raise exception using errcode = '42501', message = 'acesso_nao_informado: a lista de UFs do usuário é obrigatória';
  end if;
  if t.tipo <> 'BR' and coalesce(t.uf_pai, t.id) not in (
       select u.id from iie.territorio u where u.sigla = any (p_ufs)) then
    raise exception using errcode = '42501', message = format('territorio_sem_acesso: %s', t.nome),
      hint = format('Estados liberados para este usuário: %s. Para ver outros, peça acesso à equipe do IIE.',
                    (select string_agg(u.nome, ', ' order by u.nome) from iie.territorio u where u.sigla = any (p_ufs)));
  end if;
end $$;

-- As assinaturas mudam (p_ufs no fim); as versões antigas saem para não haver chamada sem verificação.
drop function if exists iie.fn_consultar_iie(text, text);
drop function if exists iie.fn_decompor(text, int);
drop function if exists iie.fn_comparar(text[], text, int);
drop function if exists iie.fn_ranking(text, int, text, int);

create or replace function iie.fn_consultar_iie(p_territorio text, p_etapa text default 'EM', p_ufs text[] default null)
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  v_etapa text := upper(coalesce(p_etapa, 'EM'));
  v_ind   text := case upper(coalesce(p_etapa, 'EM')) when 'EM' then 'IIE' when 'AF' then 'E2' when 'AI' then 'E1' end;
  v_ult   int;
begin
  perform iie.fn_checar_acesso(t, p_ufs);
  if v_ind is null then
    raise exception using errcode = '22023', message = format('etapa_invalida: %s (use EM, AF ou AI)', p_etapa);
  end if;
  select max(ano) into v_ult from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa;
  return jsonb_build_object(
    'territorio', jsonb_build_object('sigla', t.sigla, 'nome', t.nome, 'regiao', t.regiao),
    'etapa', v_etapa,
    'serie', (select jsonb_agg(jsonb_build_object('ano', ano, 'valor', valor) order by ano)
              from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa),
    'brasil', (select jsonb_agg(jsonb_build_object('ano', ano, 'valor', valor) order by ano)
               from iie.resultado_oficial where territorio_id = 'BR' and etapa = v_etapa),
    'posicao', case when t.tipo = 'UF' then (
                 select jsonb_build_object('ano', v_ult, 'posicao', r.pos, 'de', r.n)
                 from (select ro.territorio_id, rank() over (order by ro.valor desc) as pos, count(*) over () as n
                       from iie.resultado_oficial ro join iie.territorio tt on tt.id = ro.territorio_id
                       where ro.etapa = v_etapa and ro.ano = v_ult and tt.tipo = 'UF') r
                 where r.territorio_id = t.id) end,
    'status_ultimo_ano', (select status from iie.vw_semaforo
                          where territorio_id = t.id and ano = v_ult and indicador_id = v_ind),
    'natureza', 'oficial',
    'fonte', (select fonte from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa limit 1),
    'alertas', iie.fn_alertas(t.id, null, 'oficial')
  );
end $$;

create or replace function iie.fn_decompor(p_territorio text, p_ano int, p_ufs text[] default null)
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  c       iie.vw_componente_vigente;
  g       iie.vw_ganho;
  v_prior jsonb;
begin
  perform iie.fn_checar_acesso(t, p_ufs);
  select * into c from iie.vw_componente_vigente where territorio_id = t.id and ano = p_ano;
  if not found then
    raise exception using errcode = 'P0002',
      message = format('sem_componentes: %s em %s (anos disponíveis: 2015, 2017, 2019)', t.nome, p_ano);
  end if;
  select * into g from iie.vw_ganho where territorio_id = t.id and ano = p_ano;
  select coalesce(jsonb_agg(x.k order by x.v desc), '[]'::jsonb) into v_prior
  from (values ('A1', g.ganho_a1), ('F2', g.ganho_f2), ('P1', g.ganho_p1)) as x (k, v)
  where x.v >= 0.05;
  return jsonb_build_object(
    'territorio', jsonb_build_object('sigla', t.sigla, 'nome', t.nome, 'regiao', t.regiao),
    'ano', p_ano,
    'iie_oficial', (select valor from iie.resultado_oficial where territorio_id = t.id and ano = p_ano and etapa = 'EM'),
    'iie_reproduzido', round(c.iie_reproduzido, 1),
    'componentes', jsonb_build_object(
      'F1_conclui_ate_18', round(c.pct_concluiu_ate18, 1),
      'F2_atraso_2_ou_mais', round(c.pct_atrasado2, 1),
      'P1_fora_da_escola_sem_em', round(c.pct_fora_escola, 1),
      'A1_basico_entre_concluintes', round(c.pct_basico_entre_concluintes, 1),
      'A2_basico_atrasados_1_ano', round(c.p_basico_atrasado1, 1),
      'distancia_em_linha_menos_atrasados_pp', round(c.p_basico_em_linha - c.p_basico_atrasado1, 1)),
    'trajetoria', jsonb_build_object(
      'adiantados', round(c.pct_adiantado, 1), 'em_linha', round(c.pct_em_linha, 1),
      'atraso_1_ano', round(c.pct_atrasado1, 1), 'atraso_2_ou_mais', round(c.pct_atrasado2, 1),
      'fora_da_escola', round(c.pct_fora_escola, 1)),
    'basico_por_trajetoria', jsonb_build_object(
      'adiantados', round(c.p_basico_adiantado, 1), 'em_linha', round(c.p_basico_em_linha, 1),
      'atraso_1_ano', round(c.p_basico_atrasado1, 1)),
    'semaforo', (select jsonb_object_agg(indicador_id, status) from iie.vw_semaforo
                 where territorio_id = t.id and ano = p_ano),
    'brasil', (select jsonb_object_agg(indicador_id, round(valor, 1)) from iie.vw_indicador_valor
               where territorio_id = 'BR' and ano = p_ano and indicador_id in ('P1', 'F1', 'F2', 'A1', 'A2')),
    'ganho_potencial', case when t.tipo = 'BR' then null
                            else jsonb_build_object('A1', g.ganho_a1, 'F2', g.ganho_f2, 'P1', g.ganho_p1) end,
    'prioridade', case when t.tipo = 'BR' then '[]'::jsonb else v_prior end,
    'identidade', 'IIE = (100 - F2 - P1) x A1 / 100',
    'natureza', 'reproducao',
    'metodo', c.metodo,
    'fonte', c.fonte,
    'alertas', iie.fn_alertas(t.id, p_ano, 'reproducao')
  );
end $$;

create or replace function iie.fn_comparar(p_territorios text[], p_indicador text, p_ano int, p_ufs text[] default null)
returns jsonb language plpgsql stable as $$
declare
  v_ids text[] := '{}';
  v_ind text := upper(p_indicador);
  v_res jsonb;
  t     iie.territorio;
  x     text;
begin
  if p_ufs is null then
    raise exception using errcode = '42501', message = 'acesso_nao_informado: a lista de UFs do usuário é obrigatória';
  end if;
  if coalesce(array_length(p_territorios, 1), 0) not between 2 and 6 then
    raise exception using errcode = '22023', message = 'informe de 2 a 6 territórios';
  end if;
  foreach x in array p_territorios loop
    t := iie.fn_resolver_territorio(x);
    perform iie.fn_checar_acesso(t, p_ufs);
    v_ids := v_ids || t.id;
  end loop;
  select jsonb_agg(jsonb_build_object('sigla', tt.sigla, 'nome', tt.nome,
                                      'valor', round(s.valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end),
                                      'status', s.status)
                   order by array_position(v_ids, tt.id))
    into v_res
  from iie.vw_semaforo s join iie.territorio tt on tt.id = s.territorio_id
  where s.territorio_id = any (v_ids) and s.indicador_id = v_ind and s.ano = p_ano;
  if v_res is null then
    raise exception using errcode = 'P0002', message = format('sem_dados: %s em %s', v_ind, p_ano);
  end if;
  return jsonb_build_object(
    'indicador', v_ind, 'ano', p_ano, 'valores', v_res,
    'brasil', (select round(valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end)
               from iie.vw_indicador_valor where territorio_id = 'BR' and indicador_id = v_ind and ano = p_ano),
    'natureza', case when v_ind in ('IIE', 'E1', 'E2', 'E2R', 'E3') then 'oficial' else 'reproducao' end);
end $$;

-- Ranking: a posição é sempre a nacional (ou da região pedida); só aparecem as UFs liberadas.
create or replace function iie.fn_ranking(p_indicador text, p_ano int, p_regiao text default null, p_limite int default 27,
                                          p_ufs text[] default null)
returns jsonb language plpgsql stable as $$
declare
  v_ind text := upper(p_indicador);
  v_res jsonb;
begin
  if p_ufs is null then
    raise exception using errcode = '42501', message = 'acesso_nao_informado: a lista de UFs do usuário é obrigatória';
  end if;
  select jsonb_agg(jsonb_build_object('posicao', r.pos, 'sigla', r.sigla, 'nome', r.nome, 'regiao', r.regiao,
                                      'valor', round(r.valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end),
                                      'status', r.status) order by r.pos, r.sigla)
    into v_res
  from (
    select * from (
      select t.sigla, t.nome, t.regiao, s.valor, s.status,
             rank() over (order by case when s.sentido = 'alto_ruim' then s.valor else -s.valor end) as pos
      from iie.vw_semaforo s join iie.territorio t on t.id = s.territorio_id
      where s.indicador_id = v_ind and s.ano = p_ano and t.tipo = 'UF'
        and (p_regiao is null or iie.norm(t.regiao) = iie.norm(p_regiao))
    ) todas
    where todas.sigla = any (p_ufs)
    order by todas.pos, todas.sigla
    limit greatest(coalesce(p_limite, 27), 1)
  ) r;
  if v_res is null then
    raise exception using errcode = 'P0002', message = format('sem_dados: %s em %s para os estados liberados', v_ind, p_ano);
  end if;
  return jsonb_build_object('indicador', v_ind, 'ano', p_ano, 'ordem', 'melhor_primeiro', 'regiao', p_regiao,
                            'de', (select count(*) from iie.territorio where tipo = 'UF'
                                   and (p_regiao is null or iie.norm(regiao) = iie.norm(p_regiao))),
                            'apenas_ufs_liberadas', not (iie.ufs_todas() <@ p_ufs),
                            'ranking', v_res,
                            'natureza', case when v_ind in ('IIE', 'E1', 'E2', 'E2R', 'E3') then 'oficial' else 'reproducao' end);
end $$;

-- As funções recriadas perdem as permissões: devolve.
grant execute on all functions in schema iie to agente_leitura, n8n_operacao;
