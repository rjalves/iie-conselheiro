import { redirecionarPara } from "@/lib/caminho";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function POST() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  return redirecionarPara("/entrar");
}
