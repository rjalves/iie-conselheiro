-- IIE Conselheiro — 0007: memória do agente num esquema próprio (agente), fora da API
-- O nó Postgres Chat Memory do n8n (v1.4) roda CREATE TABLE IF NOT EXISTS a cada uso, e o Postgres exige o
-- privilégio CREATE no esquema mesmo quando a tabela existe. Dar CREATE no esquema app (exposto na API) não é
-- aceitável; por isso a memória vai para o esquema agente, onde só o n8n_operacao cria tabelas.

create schema if not exists agente;

create table if not exists agente.memoria (
  id         serial primary key,
  session_id varchar(255) not null,                  -- id da conversa
  message    jsonb not null                          -- formato do LangChain (n8n)
);
create index if not exists memoria_sessao on agente.memoria (session_id, id);

-- Leva o que houver na tabela antiga e a remove.
do $$
begin
  if to_regclass('app.agente_memoria') is not null then
    insert into agente.memoria (session_id, message) select session_id, message from app.agente_memoria order by id;
    drop table app.agente_memoria;
  end if;
end $$;

revoke all on schema agente from public;
grant usage, create on schema agente to n8n_operacao;
grant select, insert, update, delete on agente.memoria to n8n_operacao;
grant usage, select on all sequences in schema agente to n8n_operacao;

alter table agente.memoria enable row level security;
drop policy if exists operacao on agente.memoria;
create policy operacao on agente.memoria for all to n8n_operacao using (true) with check (true);

-- Conversa apagada (pelo usuário ou pela exclusão da conta): apaga a memória no lugar novo.
create or replace function app.ao_apagar_conversa() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from agente.memoria where session_id = old.id::text;
  return old;
end $$;
