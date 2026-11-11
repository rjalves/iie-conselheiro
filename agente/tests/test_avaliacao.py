"""A correção da avaliação de modelos (n8n/avaliacao.py) aprova a resposta ideal e reprova as ruins, sem gastar."""
import re

from n8n import montar
from n8n.avaliacao import CASOS, PRECO, VARIANTES, corrigir

CASO = {c.id: c for c in CASOS}


def linha(texto, ferramentas=("consultar_iie",), numeros=(), praticas=(), completa=True, erro=None):
    return {"texto": texto, "ferramentas": list(ferramentas), "numeros_sem_origem": list(numeros),
            "praticas_sem_origem": list(praticas), "completa": completa, "erro": erro}


def test_casos_bem_formados():
    assert len(CASO) == len(CASOS) == 30
    for c in CASOS:
        assert c.perguntas and c.contem, c.id
        for padrao in c.contem + c.nao_contem:
            re.compile(padrao)
    assert VARIANTES["base"] == (montar.MODELO, "medium")  # a produção é a referência do juiz
    assert all(modelo in PRECO for modelo, _ in VARIANTES.values())


def test_resposta_ideal_passa_e_as_ruins_nao():
    assert corrigir(CASO["C01"], linha("O Ceará tem IIE 2023 de 18,1, em 5º lugar entre as 27 UFs."))["passou"]
    for ruim in (linha(""), linha("O Ceará tem IIE de 21,2, em 7º lugar."), linha("18,1, em 5º lugar.", ferramentas=()),
                 linha("18,1, em 5º lugar.", completa=False), linha("18,1, em 5º lugar.", erro="falhou")):
        assert not corrigir(CASO["C01"], ruim)["passou"]


def test_recusa_por_uf_e_praticas():
    assert corrigir(CASO["A01"], linha("Só Pernambuco está liberado para você.", ferramentas=()))["passou"]
    assert not corrigir(CASO["A01"], linha("Pernambuco está liberado. O Ceará tem 18,1.", ferramentas=()))["passou"]
    pratica = linha("Busca Ativa Escolar (Itaú Social, SM-79).", ferramentas=("praticas_para_indicador",))
    assert corrigir(CASO["R01"], pratica)["passou"]
    assert not corrigir(CASO["R01"], {**pratica, "praticas_sem_origem": ["SM-999"]})["passou"]


def test_numero_sem_origem_e_listado_mas_nao_reprova():
    nota = corrigir(CASO["C01"], linha("18,1, em 5º lugar; caiu 3,2 pontos.", numeros=["3,2"]))
    assert nota["passou"] and not nota["numeros_com_origem"]
