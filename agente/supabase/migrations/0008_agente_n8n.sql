-- IIE Conselheiro — 0008: ajustes para o agente no n8n
-- 1. A ferramenta Postgres do n8n devolve ao modelo só a mensagem do erro ({"error": "<message>"}), sem a dica.
--    As três funções que dão dica passam a repeti-la na mensagem: '<código>: <detalhe>. <dica>'. O hint continua igual.
-- 2. app.falha: falhas não tratadas dos workflows, gravadas pelo workflow iie-erros (n8n_operacao).

create or replace function iie.fn_checar_acesso(t iie.territorio, p_ufs text[])
returns void language plpgsql stable set search_path = '' as $$
declare
  v_dica text;
begin
  if p_ufs is null then
    raise exception using errcode = '42501', message = 'acesso_nao_informado: a lista de UFs do usuário é obrigatória';
  end if;
  if t.tipo <> 'BR' and coalesce(t.uf_pai, t.id) not in (
       select u.id from iie.territorio u where u.sigla = any (p_ufs)) then
    v_dica := format('Estados liberados para este usuário: %s. Para ver outros, peça acesso à equipe do IIE.',
                     (select string_agg(u.nome, ', ' order by u.nome) from iie.territorio u where u.sigla = any (p_ufs)));
    raise exception using errcode = '42501', message = format('territorio_sem_acesso: %s. %s', t.nome, v_dica),
      hint = v_dica;
  end if;
end $$;

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
    message = format('territorio_nao_encontrado: %s. Talvez: %s', p_texto, v_sug),
    hint = format('Talvez: %s', v_sug);
end $$;

create or replace function iie.fn_pacote(p_perfil text)
returns jsonb language plpgsql stable as $$
declare
  pf     iie.perfil_territorio;
  v_dica text;
begin
  select * into pf from iie.perfil_territorio
  where id = iie.norm(p_perfil) or iie.norm(nome) = iie.norm(p_perfil);
  if not found then
    v_dica := (select 'Perfis: ' || string_agg(id, ', ' order by ordem) from iie.perfil_territorio);
    raise exception using errcode = 'P0002', message = format('perfil_desconhecido: %s. %s', p_perfil, v_dica),
      hint = v_dica;
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

create table if not exists app.falha (
  id        bigint generated always as identity primary key,
  execucao  text,                                   -- id da execução no n8n
  workflow  text not null,
  no        text,                                   -- último nó executado
  mensagem  text not null,
  criado_em timestamptz not null default now()
);
alter table app.falha enable row level security;
grant select, insert on app.falha to n8n_operacao;
drop policy if exists operacao on app.falha;
create policy operacao on app.falha for all to n8n_operacao using (true) with check (true);
