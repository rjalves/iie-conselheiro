#!/bin/zsh
# Publica (cria ou atualiza pelo nome) um workflow do n8n a partir do JSON versionado no git.
# Uso (a partir de agente/): n8n/publicar.sh n8n/prova_tecnica.json
# Lê N8N_URL e N8N_API_KEY de agente/.env.dev. Não ativa o workflow: isso é feito à parte, quando for testar.
set -euo pipefail
ARQUIVO=$1
set -a; . ./.env.dev; set +a
NOME=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["name"])' "$ARQUIVO")
ID=$(curl -sf -m 30 "$N8N_URL/api/v1/workflows?limit=200" -H "X-N8N-API-KEY: $N8N_API_KEY" |
  python3 -I -c 'import json,sys; nome=sys.argv[1]; print(next((w["id"] for w in json.load(sys.stdin)["data"] if w["name"] == nome), ""))' "$NOME")
if [[ -n $ID ]]; then
  curl -sf -m 60 -X PUT "$N8N_URL/api/v1/workflows/$ID" -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' --data-binary @"$ARQUIVO" > /dev/null
  echo "atualizado: $NOME ($ID)"
else
  ID=$(curl -sf -m 60 -X POST "$N8N_URL/api/v1/workflows" -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' --data-binary @"$ARQUIVO" |
    python3 -I -c 'import json,sys; print(json.load(sys.stdin)["id"])')
  echo "criado: $NOME ($ID)"
fi
