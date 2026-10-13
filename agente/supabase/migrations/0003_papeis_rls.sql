-- IIE Conselheiro — 0003: papéis, permissões e RLS
-- Os papéis são NOLOGIN. Os usuários de conexão são criados fora do git (ver P1, Tarefa 8).
do $$
begin
  if not exists (select from pg_roles where rolname = 'agente_leitura') then
    create role agente_leitura nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'n8n_operacao') then
    create role n8n_operacao nologin;
  end if;
end $$;

-- agente_leitura: credencial das ferramentas do agente no n8n. Só lê o esquema iie.
grant usage on schema iie, extensions to agente_leitura;
grant select on all tables in schema iie to agente_leitura;
grant execute on all functions in schema iie to agente_leitura;

-- n8n_operacao: grava mensagens e memória do agente; lê o resto de app (base ativa, monitoramento).
grant usage on schema iie, app, extensions to n8n_operacao;
grant select on all tables in schema iie to n8n_operacao;
grant execute on all functions in schema iie to n8n_operacao;
grant select on all tables in schema app to n8n_operacao;
grant insert, update, delete on app.mensagem, app.agente_memoria to n8n_operacao;
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

end $$;
