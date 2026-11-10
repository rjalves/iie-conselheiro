#!/bin/zsh
# Executa SQL no Supabase de desenvolvimento (auto-hospedado) pela rota /pg/query do postgres-meta.
# O Postgres não tem porta pública; esta é a forma de aplicar migrações e cargas (P1, Tarefa 8).
# Cada envio roda numa transação só: se algo falhar, nada daquele envio fica aplicado.
# Uso (a partir de agente/): supabase/sql_dev.sh ARQUIVO.sql   |   supabase/sql_dev.sh -c "select 1"
# Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY de agente/.env.dev.
set -euo pipefail
set -a; . ./.env.dev; set +a
CORPO=$(mktemp); SAIDA=$(mktemp)
trap 'rm -f "$CORPO" "$SAIDA"' EXIT
if [[ $1 == -c ]]; then
  printf '%s' "$2" | python3 -I -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))' > "$CORPO"
else
  python3 -I -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1], encoding="utf-8").read()}))' "$1" > "$CORPO"
fi
CODIGO=$(curl -s -m 180 -o "$SAIDA" -w '%{http_code}' -X POST "$SUPABASE_URL/pg/query" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' --data-binary @"$CORPO")
head -c 2000 "$SAIDA"; echo
[[ $CODIGO == 2* ]] || { echo "ERRO HTTP $CODIGO"; exit 1; }
