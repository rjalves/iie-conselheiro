// Grupos de datas da lista de conversas. Sem dependência de servidor.

// Dia no horário de Brasília (o mesmo da cota diária), igual no servidor (UTC) e no navegador: sem erro de hidratação.
const diaDeBrasilia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** Agrupa itens já em ordem decrescente: Hoje, Ontem, Últimos 7 dias, Últimos 30 dias, Mais antigas. */
export function agruparPorDia<T extends { atualizada_em: string }>(itens: T[], agora = new Date()): [string, T[]][] {
  const hoje = Date.parse(diaDeBrasilia.format(agora));
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const d = Math.round((hoje - Date.parse(diaDeBrasilia.format(new Date(item.atualizada_em)))) / 86_400_000);
    const nome =
      d <= 0 ? "Hoje" : d === 1 ? "Ontem" : d <= 7 ? "Últimos 7 dias" : d <= 30 ? "Últimos 30 dias" : "Mais antigas";
    grupos.set(nome, [...(grupos.get(nome) ?? []), item]);
  }
  return [...grupos];
}
