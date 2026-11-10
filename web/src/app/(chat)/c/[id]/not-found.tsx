import Link from "next/link";

/** Conversa apagada ou de outra pessoa (a RLS esconde): a barra lateral continua, para escolher outra. */
export default function ConversaNaoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-5 px-4 py-16 sm:px-8">
      <h1 className="text-3xl font-bold">Esta conversa não existe mais</h1>
      <p className="text-lg">Ela pode ter sido apagada. As suas outras conversas continuam na lista.</p>
      <Link href="/" className="rounded-md bg-tinta px-4 py-2.5 font-semibold text-white hover:bg-tinta-escura">
        Nova conversa
      </Link>
    </main>
  );
}
