-- IIE Conselheiro — 0004: regras do site (cadastro pelo Supabase Auth, administração e RLS do usuário logado)
-- Proposta 03, seções 6.2 e 6.3. O esquema app é exposto na API do Supabase; o iie não.

-- ------------------------------------------------------------ funções auxiliares
-- Administrador ativo? security definer para não depender da RLS de app.usuario.
create or replace function app.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.usuario u
                 where u.id = (select auth.uid()) and u.papel = 'admin' and u.status = 'ativo')
$$;

-- Perguntas feitas hoje (fuso de Brasília) pelo usuário logado. Lê app.cota_diaria, que o usuário não apaga.
create or replace function app.fn_perguntas_hoje() returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.perguntas from app.cota_diaria c
                   where c.usuario_id = (select auth.uid())
                     and c.dia = (now() at time zone 'America/Sao_Paulo')::date), 0)
$$;

-- ------------------------------------------------------------ gatilhos
-- Cadastro: o signUp do site manda nome, perfil, instituição, UF, município e aceite do termo nos metadados.
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
  -- Os 2 primeiros dígitos do código IBGE do município são o código da UF.
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

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function app.ao_criar_usuario();

-- Quem aprovou, recusou ou bloqueou, e quando.
create or replace function app.ao_decidir_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.decidido_por := (select auth.uid());
    new.decidido_em := now();
  end if;
  return new;
end $$;

drop trigger if exists ao_decidir_status on app.usuario;
create trigger ao_decidir_status before update on app.usuario
  for each row execute function app.ao_decidir_status();

-- Mensagem nova (gravada pelo n8n): atualiza a conversa e, se for pergunta, soma na cota do dia.
create or replace function app.ao_inserir_mensagem() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid;
begin
  update app.conversa set atualizada_em = now() where id = new.conversa_id returning usuario_id into v_usuario;
  if new.papel = 'usuario' then
    insert into app.cota_diaria (usuario_id, dia, perguntas)
    values (v_usuario, (now() at time zone 'America/Sao_Paulo')::date, 1)
    on conflict (usuario_id, dia) do update set perguntas = app.cota_diaria.perguntas + 1;
  end if;
  return new;
end $$;

drop trigger if exists ao_inserir_mensagem on app.mensagem;
create trigger ao_inserir_mensagem after insert on app.mensagem
  for each row execute function app.ao_inserir_mensagem();

-- Conversa apagada (pelo usuário ou pela exclusão da conta): apaga também a memória do agente.
create or replace function app.ao_apagar_conversa() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from app.agente_memoria where session_id = old.id::text;
  return old;
end $$;

drop trigger if exists ao_apagar_conversa on app.conversa;
create trigger ao_apagar_conversa after delete on app.conversa
  for each row execute function app.ao_apagar_conversa();

-- ------------------------------------------------------------ permissões do usuário logado
revoke execute on all functions in schema app from public;
grant usage on schema app to authenticated;
grant execute on function app.eh_admin(), app.fn_perguntas_hoje() to authenticated;

grant select on app.usuario, app.conversa, app.mensagem, app.feedback to authenticated;
grant update (nome, perfil, instituicao, uf, municipio_ibge, municipio_nome, status, papel) on app.usuario to authenticated;
grant insert (usuario_id, titulo), update (titulo), delete on app.conversa to authenticated;
grant insert (mensagem_id, usuario_id, nota, motivo), update (nota, motivo) on app.feedback to authenticated;

drop policy if exists usuario_le on app.usuario;
create policy usuario_le on app.usuario for select to authenticated
  using (id = (select auth.uid()) or app.eh_admin());
drop policy if exists usuario_admin_muda on app.usuario;
create policy usuario_admin_muda on app.usuario for update to authenticated
  using (app.eh_admin()) with check (app.eh_admin());

drop policy if exists conversa_le on app.conversa;
create policy conversa_le on app.conversa for select to authenticated
  using (usuario_id = (select auth.uid()));
drop policy if exists conversa_cria on app.conversa;
create policy conversa_cria on app.conversa for insert to authenticated
  with check (usuario_id = (select auth.uid())
              and exists (select 1 from app.usuario u where u.id = (select auth.uid()) and u.status = 'ativo'));
drop policy if exists conversa_muda on app.conversa;
create policy conversa_muda on app.conversa for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists conversa_apaga on app.conversa;
create policy conversa_apaga on app.conversa for delete to authenticated
  using (usuario_id = (select auth.uid()));

drop policy if exists mensagem_le on app.mensagem;
create policy mensagem_le on app.mensagem for select to authenticated
  using (exists (select 1 from app.conversa c where c.id = conversa_id and c.usuario_id = (select auth.uid())));

drop policy if exists feedback_le on app.feedback;
create policy feedback_le on app.feedback for select to authenticated
  using (usuario_id = (select auth.uid()));
drop policy if exists feedback_cria on app.feedback;
create policy feedback_cria on app.feedback for insert to authenticated
  with check (usuario_id = (select auth.uid())
              and exists (select 1 from app.mensagem m join app.conversa c on c.id = m.conversa_id
                          where m.id = mensagem_id and m.papel = 'agente' and c.usuario_id = (select auth.uid())));
drop policy if exists feedback_muda on app.feedback;
create policy feedback_muda on app.feedback for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
