#!/bin/zsh
# Publica (cria ou atualiza pelo nome) um workflow do n8n a partir do JSON versionado no git.
# Uso (a partir de agente/): n8n/publicar.sh n8n/iie-agente-web.json
# Lê N8N_URL e N8N_API_KEY de agente/.env.dev. Não ativa o workflow: isso é feito à parte, quando for testar.
# - settings.errorWorkflow pode vir com o NOME do workflow de erros; ele é trocado pelo id antes de enviar.
# - Depois de enviar, confere se o workflow no n8n é igual ao do git (nós, parâmetros e conexões).
set -euo pipefail
ARQUIVO=$1
set -a; . ./.env.dev; set +a
ENVIO=$(mktemp); LISTA=$(mktemp); PUBLICADO=$(mktemp)
trap 'rm -f "$ENVIO" "$LISTA" "$PUBLICADO"' EXIT
curl -sf -m 30 "$N8N_URL/api/v1/workflows?limit=250" -H "X-N8N-API-KEY: $N8N_API_KEY" > "$LISTA"

ID=$(python3 -I - "$ARQUIVO" "$LISTA" "$ENVIO" <<'EOF'
import json, sys
w, lista = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))["data"]
ids = {x["name"]: x["id"] for x in lista}
erro = w.get("settings", {}).get("errorWorkflow")
if erro and erro not in ids.values():
    if erro not in ids:
        sys.exit(f"workflow de erros não encontrado: {erro} (publique-o antes)")
    w["settings"]["errorWorkflow"] = ids[erro]
json.dump(w, open(sys.argv[3], "w"), ensure_ascii=False)
print(ids.get(w["name"], ""))
EOF
)
NOME=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["name"])' "$ARQUIVO")
if [[ -n $ID ]]; then
  curl -sf -m 60 -X PUT "$N8N_URL/api/v1/workflows/$ID" -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' --data-binary @"$ENVIO" > /dev/null
  echo "atualizado: $NOME ($ID)"
else
  ID=$(curl -sf -m 60 -X POST "$N8N_URL/api/v1/workflows" -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' --data-binary @"$ENVIO" |
    python3 -I -c 'import json,sys; print(json.load(sys.stdin)["id"])')
  echo "criado: $NOME ($ID)"
fi

curl -sf -m 30 "$N8N_URL/api/v1/workflows/$ID" -H "X-N8N-API-KEY: $N8N_API_KEY" > "$PUBLICADO"
python3 -I - "$ENVIO" "$PUBLICADO" <<'EOF'
import json, sys
local, remoto = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
resumo = lambda w: ({n["name"]: (n["type"], n["typeVersion"], n["parameters"],
                                 {t: c["name"] for t, c in n.get("credentials", {}).items()}) for n in w["nodes"]},
                    w["connections"])
(nos_l, con_l), (nos_r, con_r) = resumo(local), resumo(remoto)
diferencas = [nome for nome in sorted(set(nos_l) | set(nos_r)) if nos_l.get(nome) != nos_r.get(nome)]
if con_l != con_r:
    diferencas.append("(conexões)")
if diferencas:
    sys.exit("DIFERENTE do git: " + ", ".join(diferencas))
sem_credencial = [n["name"] for n in remoto["nodes"] for c in n.get("credentials", {}).values() if c.get("id") == c.get("name")]
print("conferido: igual ao git" + (f" | credenciais não encontradas: {', '.join(sem_credencial)}" if sem_credencial else ""))
EOF
