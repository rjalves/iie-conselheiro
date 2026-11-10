-- IIE até 2023, como publicado no painel do IIE (Lupa Social).
-- De 2019 em diante, a decomposição vigente é o método "painel": P1, F2, F1 e A1 coerentes com o IIE publicado.
-- Em 2021 e 2023 não há a trajetória da geração (o Censo da coorte não é público) e, em 2019, não há o básico por
-- trajetória (o SAEB 2019 não traz a idade do aluno): essas colunas ficam vazias.

alter table iie.componente
  alter column pct_adiantado drop not null,
  alter column pct_em_linha drop not null,
  alter column pct_atrasado1 drop not null,
  alter column p_basico_adiantado drop not null,
  alter column p_basico_em_linha drop not null,
  alter column p_basico_atrasado1 drop not null,
  alter column coorte_ajustada drop not null;

create or replace view iie.vw_componente_vigente with (security_invoker = true) as
select *
from iie.componente
where metodo = case when ano <= 2017 then 'regular' else 'painel' end;

-- Os componentes do painel são oficiais; A2 é sempre reprodução (vem do SAEB por trajetória) e só existe com dado.
create or replace view iie.vw_indicador_valor with (security_invoker = true) as
with ofi as (
  select territorio_id, ano,
         max(valor) filter (where etapa = 'EM') as em,
         max(valor) filter (where etapa = 'AF') as af,
         max(valor) filter (where etapa = 'AI') as ai
  from iie.resultado_oficial
  group by territorio_id, ano
), comp as (
  select *, case when oficial then 'oficial' else 'reproducao' end as natureza from iie.vw_componente_vigente
)
select territorio_id, ano, 'IIE'::text as indicador_id, em::numeric as valor, 'oficial'::text as natureza from ofi where em is not null
union all select territorio_id, ano, 'E1', ai, 'oficial' from ofi where ai is not null
union all select territorio_id, ano, 'E2', af, 'oficial' from ofi where af is not null
union all select territorio_id, ano, 'E2R', af / ai, 'oficial' from ofi where af is not null and ai > 0
union all select territorio_id, ano, 'E3', em / af, 'oficial' from ofi where em is not null and af > 0
union all select territorio_id, ano, 'P1', pct_fora_escola, natureza from comp
union all select territorio_id, ano, 'F1', pct_concluiu_ate18, natureza from comp
union all select territorio_id, ano, 'F2', pct_atrasado2, natureza from comp
union all select territorio_id, ano, 'A1', pct_basico_entre_concluintes, natureza from comp
union all select territorio_id, ano, 'A2', p_basico_atrasado1, 'reproducao' from comp where p_basico_atrasado1 is not null;

-- A série mistura fontes (Tabela 7 em 2013 e nas etapas AI e AF; painel no EM de 2015 em diante): todas são citadas.
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
    'fonte', (select string_agg(f.fonte || ' (' || f.anos || ')', '; ' order by f.primeiro)
              from (select fonte, min(ano) as primeiro, string_agg(ano::text, ', ' order by ano) as anos
                    from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa
                    group by fonte) f),
    'alertas', iie.fn_alertas(t.id, null, 'oficial')
  );
end $$;

-- Anos disponíveis lidos do banco; natureza e alertas seguem o método (painel = oficial).
create or replace function iie.fn_decompor(p_territorio text, p_ano int, p_ufs text[] default null)
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  c       iie.vw_componente_vigente;
  g       iie.vw_ganho;
  v_prior jsonb;
  v_nat   text;
begin
  perform iie.fn_checar_acesso(t, p_ufs);
  select * into c from iie.vw_componente_vigente where territorio_id = t.id and ano = p_ano;
  if not found then
    raise exception using errcode = 'P0002',
      message = format('sem_componentes: %s em %s (anos disponíveis: %s)', t.nome, p_ano,
                       (select string_agg(ano::text, ', ' order by ano) from iie.vw_componente_vigente
                        where territorio_id = t.id));
  end if;
  v_nat := case when c.oficial then 'oficial' else 'reproducao' end;
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
    'natureza', v_nat,
    'metodo', c.metodo,
    'fonte', c.fonte,
    'alertas', iie.fn_alertas(t.id, p_ano, v_nat)
  );
end $$;
