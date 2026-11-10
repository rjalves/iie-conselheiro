"""Contrato do n8n simulado (proposta 03, seção 5.1): chave, NDJSON e gravação das mensagens."""
import json
import os
import threading
import urllib.error
import urllib.request

import pytest

from n8n.simulado import criar_servidor
from tests.sql.test_site import ativar, cadastrar, nova_conversa


@pytest.fixture(scope="module")
def webhook(banco):
    servidor = criar_servidor(os.environ["DATABASE_URL_TEST"], porta=0, chave="dev", atraso=0)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{servidor.server_address[1]}/webhook/iie-chat"
    servidor.shutdown()


def _post(url, corpo, chave="dev"):
    pedido = urllib.request.Request(url, data=json.dumps(corpo).encode(), method="POST",
                                    headers={"Content-Type": "application/json", "X-IIE-Chave": chave})
    with urllib.request.urlopen(pedido, timeout=10) as r:
        return [json.loads(linha) for linha in r.read().decode().splitlines() if linha.strip()]


def _pedido(uid, conversa, mensagem="Como está o Ceará?"):
    return {"usuario_id": str(uid), "conversa_id": str(conversa), "mensagem": mensagem, "perfil": "secretaria_estadual",
            "uf": "CE", "municipio": "Sobral", "data_referencia": "2026-10-13", "ufs_permitidas": ["CE"]}


def test_chave_errada_e_recusada(webhook):
    with pytest.raises(urllib.error.HTTPError) as erro:
        _post(webhook, {}, chave="errada")
    assert erro.value.code == 401


def test_pedido_incompleto_e_recusado(webhook):
    with pytest.raises(urllib.error.HTTPError) as erro:
        _post(webhook, {"mensagem": "oi"})
    assert erro.value.code == 400


def test_responde_em_ndjson_e_grava_pergunta_e_resposta(banco, sql, webhook):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    eventos = _post(webhook, _pedido(uid, conversa))
    assert eventos[0]["type"] == "begin" and eventos[-1]["type"] == "end"
    texto = "".join(e["content"] for e in eventos if e["type"] == "item")
    assert "Ceará" in texto and "18,1" in texto and "Sobral" in texto  # IIE 2023 do CE, o ano mais recente
    assert sql("select array_agg(papel order by criado_em) from app.mensagem where conversa_id = %s",
               conversa) == ["usuario", "agente"]
    assert sql("select texto from app.mensagem where conversa_id = %s and papel = 'agente'", conversa) == texto
    assert sql("select perguntas from app.cota_diaria where usuario_id = %s", uid) == 1


def test_simula_erro_no_meio_da_resposta(banco, sql, webhook):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    eventos = _post(webhook, _pedido(uid, conversa, "teste #erro"))
    assert eventos[-1]["type"] == "error"
    assert sql("select erro is not null from app.mensagem where conversa_id = %s and papel = 'agente'", conversa)


def test_pedido_sem_lista_de_ufs_e_recusado(banco, webhook):
    uid = ativar(banco, cadastrar(banco))
    pedido = _pedido(uid, nova_conversa(banco, uid))
    del pedido["ufs_permitidas"]
    with pytest.raises(urllib.error.HTTPError) as erro:
        _post(webhook, pedido)
    assert erro.value.code == 400
