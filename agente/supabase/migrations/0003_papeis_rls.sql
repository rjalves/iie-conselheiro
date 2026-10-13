-- IIE Conselheiro — 0003: papéis, permissões e RLS
-- Os papéis são NOLOGIN. Os usuários de conexão são criados fora do git (ver P1, Tarefa 6).
do $$
begin
  if not exists (select from pg_roles where rolname = 'agente_leitura') then
    create role agente_leitura nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'n8n_operacao') then
    create role n8n_operacao nologin;
  end if;
end $$;

grant usage on schema iie, app, extensions to agente_leitura, n8n_operacao;

grant select on all tables in schema iie to agente_leitura, n8n_operacao;
grant execute on all functions in schema iie to agente_leitura, n8n_operacao;

grant select on app.mensagem, app.kb_versao to agente_leitura;
grant select, insert, update, delete on all tables in schema app to n8n_operacao;
grant usage, select on all sequences in schema app to n8n_operacao;

do $$
declare
  r record;
begin
  for r in select schemaname, tablename from pg_tables where schemaname in ('iie', 'app') loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
  end loop;

  for r in select tablename from pg_tables where schemaname = 'iie' loop
    execute format('drop policy if exists leitura on iie.%I', r.tablename);
    execute format('create policy leitura on iie.%I for select to agente_leitura, n8n_operacao using (true)', r.tablename);
  end loop;

  for r in select tablename from pg_tables where schemaname = 'app' loop
    execute format('drop policy if exists operacao on app.%I', r.tablename);
    execute format('create policy operacao on app.%I for all to n8n_operacao using (true) with check (true)', r.tablename);
  end loop;

  drop policy if exists agente_le on app.mensagem;
  create policy agente_le on app.mensagem for select to agente_leitura using (true);
  drop policy if exists agente_le on app.kb_versao;
  create policy agente_le on app.kb_versao for select to agente_leitura using (true);
end $$;
