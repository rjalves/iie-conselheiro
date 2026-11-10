-- IIE Conselheiro — 0010: o cadastro já sai aprovado (status 'ativo') e o gestor entra direto no chat.
-- A administração continua podendo recusar ou bloquear depois. Quem ficou como 'pendente' antes desta migração
-- continua assim até a administração decidir.
alter table app.usuario alter column status set default 'ativo';
