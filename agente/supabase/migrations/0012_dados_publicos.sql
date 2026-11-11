-- Os dados do IIE são públicos (decisão do usuário em 2026-11-11): qualquer pessoa consulta e compara todas as UFs.
-- Sai a lista de UFs por usuário (app.usuario.ufs_acesso, da 0006). O site manda ao n8n todas as UFs em
-- ufs_permitidas; as funções de dados continuam exigindo a lista (iie.fn_checar_acesso), só como contrato do pedido.

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
  insert into app.usuario (id, email, nome, perfil, instituicao, uf, municipio_ibge, municipio_nome, aceite_termo_em)
  values (new.id, new.email, trim(m ->> 'nome'), m ->> 'perfil', trim(m ->> 'instituicao'), v_uf, v_mun,
          trim(m ->> 'municipio_nome'), now());
  return new;
end $$;

drop trigger if exists validar_ufs_acesso on app.usuario;
drop function if exists app.validar_ufs_acesso();
alter table app.usuario drop column if exists ufs_acesso;
