-- Só no Supabase local (roda em `supabase start` na primeira vez e em `supabase db reset`).
-- Usuários de login como os da P1, Tarefa 8, com senhas de desenvolvimento que valem só nesta máquina.
do $$
begin
  if not exists (select from pg_roles where rolname = 'n8n_app') then
    create role n8n_app login password 'n8n_app_local' in role n8n_operacao;
  end if;
  if not exists (select from pg_roles where rolname = 'agente_app') then
    create role agente_app login password 'agente_app_local' in role agente_leitura;
  end if;
end $$;
