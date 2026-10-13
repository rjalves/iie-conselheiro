import Link from "next/link";

/** Nome do produto. A lupa remete à Lupa Social e à leitura atenta dos dados. */
export function Marca({ claro = false, href = "/" }: { claro?: boolean; href?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-bold ${claro ? "text-white" : "text-tinta"}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" strokeLinecap="round" />
        <circle cx="10.5" cy="10.5" r="2.2" fill="var(--color-marca)" stroke="none" />
      </svg>
      <span className="text-lg tracking-tight">IIE Conselheiro</span>
    </Link>
  );
}
