-- IIE Conselheiro — 0011: na recuperação de senha, o site (chave de serviço) confere se o e-mail tem conta antes de
-- pedir o código ao Auth. Só leitura de id e e-mail; o service_role já ignora a RLS.
grant usage on schema app to service_role;
grant select (id, email) on app.usuario to service_role;
