"""n8n simulado, para desenvolver e testar o site sem o n8n real.

Cumpre o contrato da proposta 03, seção 5.1:
- POST /webhook/iie-chat, com o cabeçalho X-IIE-Chave;
- corpo {usuario_id, conversa_id, mensagem, perfil, uf, municipio, data_referencia, ufs_permitidas};
- resposta em NDJSON: begin, item (com content), end ou error.

Grava a pergunta e a resposta em app.mensagem, como fazem os nós 2 e 6 do workflow real, com as permissões do papel
n8n_operacao. A resposta traz números reais de iie.fn_consultar_iie.

Para testar a interface, mensagens com "#erro" simulam uma falha no meio da resposta, e com "#lento" demoram mais.

Uso (a partir de agente/):
    python -m n8n.simulado --database-url postgresql://n8n_app:n8n_app_local@127.0.0.1:59322/postgres
"""
from __future__ import annotations

import argparse
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import psycopg
from psycopg.types.json import Jsonb

CAMPOS = ("usuario_id", "conversa_id", "mensagem", "perfil", "uf", "municipio", "data_referencia", "ufs_permitidas")
ERRO_INSTABILIDADE = "Estou com instabilidade agora. Tente de novo em alguns minutos."


def _num(valor: float) -> str:
    return f"{valor:.1f}".replace(".", ",")


def montar_resposta(conn: psycopg.Connection, pedido: dict) -> tuple[str, list[dict]]:
    """Texto em markdown e trilha de ferramentas da resposta simulada."""
    ferramentas = [{"nome": "consultar_iie", "args": {"territorio": pedido["uf"], "etapa": "EM"}}]
    # Como as ferramentas do n8n real: a lista de UFs vem do pedido (do site), nunca do modelo.
    r = conn.execute("select iie.fn_consultar_iie(%s, 'EM', %s)", (pedido["uf"], pedido["ufs_permitidas"])).fetchone()[0]
    nome, serie, brasil, pos = r["territorio"]["nome"], r["serie"], r["brasil"][-1], r["posicao"]
    ultimo = serie[-1]
    evolucao = " → ".join(f"{_num(p['valor'])} ({p['ano']})" for p in serie)
    texto = (
        f"**{nome}: IIE {ultimo['ano']} de {_num(ultimo['valor'])}**, {pos['posicao']}º lugar entre as {pos['de']} UFs. "
        f"O Brasil tem {_num(brasil['valor'])}.\n\n"
        f"De cada 100 jovens nascidos em {ultimo['ano'] - 17}, cerca de {round(ultimo['valor'])} concluíram o "
        "Ensino Médio até os 18 anos com o básico em Língua Portuguesa e Matemática.\n\n"
        f"- Evolução: {evolucao}\n"
        f"- Os dados do IIE são por estado. Ainda não há dados de {pedido['municipio']}.\n\n"
        f"_Resposta do n8n simulado, para desenvolvimento. Pergunta recebida: “{pedido['mensagem'][:200]}”._"
    )
    return texto, ferramentas


class _Webhook(BaseHTTPRequestHandler):
    servidor_cfg: dict = {}

    def log_message(self, formato, *args):  # silencioso nos testes
        pass

    def _recusar(self, codigo: int, mensagem: str) -> None:
        corpo = json.dumps({"message": mensagem}).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _evento(self, evento: dict) -> None:
        self.wfile.write((json.dumps(evento, ensure_ascii=False) + "\n").encode())
        self.wfile.flush()

    def do_POST(self):  # noqa: N802 (nome exigido pelo http.server)
        cfg = self.servidor_cfg
        if self.path != "/webhook/iie-chat":
            return self._recusar(404, "webhook não encontrado")
        if self.headers.get("X-IIE-Chave") != cfg["chave"]:
            return self._recusar(401, "chave inválida")
        try:
            pedido = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        except json.JSONDecodeError:
            return self._recusar(400, "JSON inválido")
        faltando = [c for c in CAMPOS if not pedido.get(c)]
        if not faltando and not (isinstance(pedido["ufs_permitidas"], list)
                                 and all(isinstance(u, str) for u in pedido["ufs_permitidas"])):
            faltando = ["ufs_permitidas (lista de siglas)"]
        if faltando:
            return self._recusar(400, f"campos obrigatórios: {', '.join(faltando)}")

        inicio = time.monotonic()
        with psycopg.connect(cfg["database_url"], autocommit=True) as conn:
            conn.execute("set role n8n_operacao")
            conn.execute("insert into app.mensagem (conversa_id, papel, texto) values (%s, 'usuario', %s)",
                         (pedido["conversa_id"], pedido["mensagem"]))
            texto, ferramentas = montar_resposta(conn, pedido)
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
            self.end_headers()
            self._evento({"type": "begin", "metadata": {"nodeName": "AI Agent"}})
            atraso = cfg["atraso"] * (20 if "#lento" in pedido["mensagem"] else 1)
            enviado, erro = "", None
            for i, palavra in enumerate(texto.split(" ")):
                if "#erro" in pedido["mensagem"] and i == 8:
                    erro = "erro simulado no meio da resposta"
                    self._evento({"type": "error", "content": ERRO_INSTABILIDADE})
                    break
                trecho = palavra if i == 0 else " " + palavra
                enviado += trecho
                self._evento({"type": "item", "content": trecho, "metadata": {"nodeName": "AI Agent"}})
                time.sleep(atraso)
            else:
                self._evento({"type": "end", "metadata": {"nodeName": "AI Agent"}})
            conn.execute(
                """insert into app.mensagem (conversa_id, papel, texto, ferramentas, numeros_sem_origem,
                                             praticas_sem_origem, latencia_ms, modelo, kb_versao, erro)
                   values (%s, 'agente', %s, %s, '[]', '[]', %s, 'simulado', 'simulado', %s)""",
                (pedido["conversa_id"], enviado if erro is None else ERRO_INSTABILIDADE, Jsonb(ferramentas),
                 int((time.monotonic() - inicio) * 1000), erro))


def criar_servidor(database_url: str, porta: int = 5679, chave: str = "dev", atraso: float = 0.03) -> ThreadingHTTPServer:
    handler = type("Webhook", (_Webhook,), {"servidor_cfg": {"database_url": database_url, "chave": chave,
                                                             "atraso": atraso}})
    return ThreadingHTTPServer(("127.0.0.1", porta), handler)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--porta", type=int, default=5679)
    parser.add_argument("--chave", default="dev")
    parser.add_argument("--atraso", type=float, default=0.03, help="segundos entre os trechos da resposta")
    args = parser.parse_args(argv)
    servidor = criar_servidor(args.database_url, args.porta, args.chave, args.atraso)
    print(f"n8n simulado em http://127.0.0.1:{servidor.server_address[1]}/webhook/iie-chat")
    servidor.serve_forever()


if __name__ == "__main__":
    main()
