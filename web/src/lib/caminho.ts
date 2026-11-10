/** Aceita só caminhos internos ("/c/123"), para não redirecionar para outro site depois do login. */
export function caminhoSeguro(valor: string | null | undefined, padrao = "/"): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return padrao;
  return valor;
}

/**
 * Redireciona para um caminho do próprio site com endereço relativo, que o navegador resolve no domínio em que está.
 * Nas rotas, request.url traz o endereço interno do contêiner (https://0.0.0.0:80) quando o site roda atrás do proxy.
 */
export function redirecionarPara(caminho: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: caminhoSeguro(caminho) } });
}
