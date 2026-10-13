-- IIE Conselheiro — 0002: visões e funções de consulta (somente leitura)

create or replace function iie.norm(p text) returns text
language sql stable as $$ select lower(extensions.unaccent(trim(p))) $$;

-- Componentes vigentes: 2019 usa o procedimento publicado de imputação; demais anos, a fórmula regular.
create or replace view iie.vw_componente_vigente with (security_invoker = true) as
select *
from iie.componente
where metodo = case when ano = 2019 then '2019_B_procedimento_publicado' else 'regular' end;

-- Todos os indicadores numéricos em formato longo.
create or replace view iie.vw_indicador_valor with (security_invoker = true) as
with ofi as (
  select territorio_id, ano,
         max(valor) filter (where etapa = 'EM') as em,
         max(valor) filter (where etapa = 'AF') as af,
         max(valor) filter (where etapa = 'AI') as ai
  from iie.resultado_oficial
  group by territorio_id, ano
)
select territorio_id, ano, 'IIE'::text as indicador_id, em::numeric as valor, 'oficial'::text as natureza from ofi where em is not null
union all select territorio_id, ano, 'E1', ai, 'oficial' from ofi where ai is not null
union all select territorio_id, ano, 'E2', af, 'oficial' from ofi where af is not null
union all select territorio_id, ano, 'E2R', af / ai, 'oficial' from ofi where af is not null and ai > 0
union all select territorio_id, ano, 'E3', em / af, 'oficial' from ofi where em is not null and af > 0
union all select territorio_id, ano, 'P1', pct_fora_escola, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'F1', pct_concluiu_ate18, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'F2', pct_atrasado2, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'A1', pct_basico_entre_concluintes, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'A2', p_basico_atrasado1, 'reproducao' from iie.vw_componente_vigente;

-- Semáforo: atenção = pior que o Brasil; crítico = quartil das piores UFs no ano.
create or replace view iie.vw_semaforo with (security_invoker = true) as
with base as (
  select v.*, t.tipo,
         case when v.indicador_id in ('P1', 'F2') then 'alto_ruim' else 'baixo_ruim' end as sentido
  from iie.vw_indicador_valor v
  join iie.territorio t on t.id = v.territorio_id
), ref as (
  select ano, indicador_id,
         max(valor) filter (where tipo = 'BR') as valor_br,
         percentile_cont(0.25) within group (order by valor) filter (where tipo = 'UF') as p25,
         percentile_cont(0.75) within group (order by valor) filter (where tipo = 'UF') as p75
  from base
  group by ano, indicador_id
)
select b.territorio_id, b.ano, b.indicador_id, b.valor, b.natureza, b.sentido,
       r.valor_br, r.p25, r.p75,
       case
         when b.tipo = 'BR' then 'referencia'
         when b.sentido = 'baixo_ruim' then
           case when b.valor < r.p25 then 'critico' when b.valor < r.valor_br then 'atencao' else 'ok' end
         else
           case when b.valor > r.p75 then 'critico' when b.valor > r.valor_br then 'atencao' else 'ok' end
       end as status
from base b
join ref r using (ano, indicador_id);

-- Ganho potencial: pontos de IIE se o componente chegasse ao nível do Brasil (IIE = (100 − F2 − P1) × A1 / 100).
create or replace view iie.vw_ganho with (security_invoker = true) as
with c as (
  select territorio_id, ano, pct_fora_escola as p1, pct_atrasado2 as f2, pct_basico_entre_concluintes as a1
  from iie.vw_componente_vigente
), br as (
  select ano, p1, f2, a1 from c where territorio_id = 'BR'
)
select c.territorio_id, c.ano,
       round((100 - c.f2 - c.p1) * greatest(br.a1 - c.a1, 0) / 100, 2) as ganho_a1,
       round(greatest(c.f2 - br.f2, 0) * c.a1 / 100, 2)               as ganho_f2,
       round(greatest(c.p1 - br.p1, 0) * c.a1 / 100, 2)               as ganho_p1
from c
join br using (ano)
where c.territorio_id <> 'BR';

create or replace function iie.fn_resolver_territorio(p_texto text)
returns iie.territorio language plpgsql stable as $$
declare
  v_norm text := iie.norm(p_texto);
  v_row  iie.territorio;
  v_sug  text;
begin
  select * into v_row
  from iie.territorio t
  where lower(t.sigla) = v_norm or iie.norm(t.nome) = v_norm or v_norm = any (t.sinonimos)
  limit 1;
  if found then
    return v_row;
  end if;
  select string_agg(q.nome, ', ' order by q.s desc) into v_sug
  from (
    select t.nome,
           greatest(extensions.similarity(iie.norm(t.nome), v_norm),
                    coalesce((select max(extensions.similarity(x, v_norm)) from unnest(t.sinonimos) x), 0)) as s
    from iie.territorio t
    order by 2 desc
    limit 3
  ) q;
  raise exception using errcode = 'P0002',
    message = format('territorio_nao_encontrado: %s', p_texto),
    hint = format('Talvez: %s', v_sug);
end $$;

create or replace function iie.fn_alertas(p_territorio_id text, p_ano int, p_natureza text)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('severidade', a.severidade, 'indicador', a.indicador_id,
                                               'ano', a.ano, 'texto', a.texto)
                            order by case a.severidade when 'alta' then 0 when 'media' then 1 else 2 end, a.id),
                  '[]'::jsonb)
  from iie.alerta_dado a
  where (a.territorio_id = p_territorio_id or a.territorio_id is null)
    and (p_ano is null or a.ano = p_ano or a.ano is null)
    and a.natureza in (p_natureza, 'ambos')
$$;

create or replace function iie.fn_consultar_iie(p_territorio text, p_etapa text default 'EM')
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  v_etapa text := upper(coalesce(p_etapa, 'EM'));
  v_ind   text := case upper(coalesce(p_etapa, 'EM')) when 'EM' then 'IIE' when 'AF' then 'E2' when 'AI' then 'E1' end;
  v_ult   int;
begin
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

create or replace function iie.fn_decompor(p_territorio text, p_ano int)
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  c       iie.vw_componente_vigente;
  g       iie.vw_ganho;
  v_prior jsonb;
begin
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

create or replace function iie.fn_comparar(p_territorios text[], p_indicador text, p_ano int)
returns jsonb language plpgsql stable as $$
declare
  v_ids text[] := '{}';
  v_ind text := upper(p_indicador);
  v_res jsonb;
  x     text;
begin
  if coalesce(array_length(p_territorios, 1), 0) not between 2 and 6 then
    raise exception using errcode = '22023', message = 'informe de 2 a 6 territórios';
  end if;
  foreach x in array p_territorios loop
    v_ids := v_ids || (iie.fn_resolver_territorio(x)).id;
  end loop;
  select jsonb_agg(jsonb_build_object('sigla', t.sigla, 'nome', t.nome,
                                      'valor', round(s.valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end),
                                      'status', s.status)
                   order by array_position(v_ids, t.id))
    into v_res
  from iie.vw_semaforo s join iie.territorio t on t.id = s.territorio_id
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

create or replace function iie.fn_ranking(p_indicador text, p_ano int, p_regiao text default null, p_limite int default 27)
returns jsonb language plpgsql stable as $$
declare
  v_ind text := upper(p_indicador);
  v_res jsonb;
begin
  select jsonb_agg(jsonb_build_object('posicao', r.pos, 'sigla', r.sigla, 'nome', r.nome, 'regiao', r.regiao,
                                      'valor', round(r.valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end),
                                      'status', r.status) order by r.pos, r.sigla)
    into v_res
  from (
    select t.sigla, t.nome, t.regiao, s.valor, s.status,
           rank() over (order by case when s.sentido = 'alto_ruim' then s.valor else -s.valor end) as pos
    from iie.vw_semaforo s join iie.territorio t on t.id = s.territorio_id
    where s.indicador_id = v_ind and s.ano = p_ano and t.tipo = 'UF'
      and (p_regiao is null or iie.norm(t.regiao) = iie.norm(p_regiao))
  ) r
  where r.pos <= p_limite;
  if v_res is null then
    raise exception using errcode = 'P0002', message = format('sem_dados: %s em %s', v_ind, p_ano);
  end if;
  return jsonb_build_object('indicador', v_ind, 'ano', p_ano, 'ordem', 'melhor_primeiro', 'regiao', p_regiao,
                            'ranking', v_res,
                            'natureza', case when v_ind in ('IIE', 'E1', 'E2', 'E2R', 'E3') then 'oficial' else 'reproducao' end);
end $$;

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
        and (p_papel is null or iie.norm(ip.papel) = iie.norm(p_papel))), '[]'::jsonb));
end $$;

-- Painel de uso por dia (fuso de Brasília). O custo vem do relatório de uso da Anthropic: o nó do n8n não separa
-- os tokens de cache (proposta 03, seção 5.5).
create or replace view app.vw_uso_diario with (security_invoker = true) as
with msg as (
  select (m.criado_em at time zone 'America/Sao_Paulo')::date as dia,
         count(*) filter (where m.papel = 'usuario') as perguntas,
         count(*) filter (where m.papel = 'agente' and m.erro is null) as respostas,
         count(*) filter (where m.erro is not null) as erros,
         count(*) filter (where jsonb_array_length(coalesce(m.numeros_sem_origem, '[]')) > 0) as com_numero_sem_origem,
         count(*) filter (where jsonb_array_length(coalesce(m.praticas_sem_origem, '[]')) > 0) as com_pratica_sem_origem,
         count(distinct c.usuario_id) as usuarios,
         percentile_cont(0.5) within group (order by m.latencia_ms) filter (where m.papel = 'agente') as latencia_p50_ms,
         percentile_cont(0.95) within group (order by m.latencia_ms) filter (where m.papel = 'agente') as latencia_p95_ms
  from app.mensagem m
  join app.conversa c on c.id = m.conversa_id
  group by 1
), avaliacao as (
  select (f.criado_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as avaliacoes,
         round(count(*) filter (where f.nota = -1)::numeric / count(*), 3) as taxa_negativa
  from app.feedback f
  group by 1
)
select msg.*, avaliacao.avaliacoes, avaliacao.taxa_negativa,
       (select count(*) from app.usuario u where u.status = 'pendente') as cadastros_pendentes
from msg
left join avaliacao using (dia);
