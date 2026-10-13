/** Aceita só caminhos internos ("/c/123"), para não redirecionar para outro site depois do login. */
export function caminhoSeguro(valor: string | null | undefined, padrao = "/"): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return padrao;
  return valor;
}
