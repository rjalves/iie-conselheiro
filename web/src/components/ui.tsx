// Peças de formulário e aviso, com os mesmos estilos em todas as telas.
import type { ComponentProps, ReactNode } from "react";

export function Campo({
  rotulo,
  id,
  erro,
  ajuda,
  children,
}: {
  rotulo: string;
  id: string;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {rotulo}
      </label>
      {children}
      {ajuda && !erro && (
        <p id={`${id}-ajuda`} className="text-sm text-grafite-suave">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-sm font-semibold text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}

const estiloEntrada =
  "w-full rounded-md border border-linha bg-white px-3 py-2.5 text-grafite placeholder:text-grafite-suave/70 " +
  "aria-[invalid=true]:border-erro disabled:bg-papel";

export function Entrada({ invalido, ...props }: ComponentProps<"input"> & { invalido?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalido || undefined}
      aria-describedby={invalido ? `${props.id}-erro` : props["aria-describedby"]}
      className={`${estiloEntrada} ${props.className ?? ""}`}
    />
  );
}

export function Selecao({ invalido, ...props }: ComponentProps<"select"> & { invalido?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={invalido || undefined}
      aria-describedby={invalido ? `${props.id}-erro` : undefined}
      className={`${estiloEntrada} ${props.className ?? ""}`}
    />
  );
}

export function Botao({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: "principal" | "secundario" | "perigo" | "discreto" }) {
  const estilos = {
    principal: "bg-tinta text-white hover:bg-tinta-escura",
    secundario: "border border-tinta text-tinta hover:bg-tinta-clara",
    perigo: "bg-erro text-white hover:bg-[#8f1c13]",
    discreto: "text-tinta hover:bg-tinta-clara",
  }[variante];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 font-semibold ${estilos} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "erro" | "sucesso"; children: ReactNode }) {
  const estilos = {
    info: "border-tinta/30 bg-tinta-clara text-grafite",
    erro: "border-erro/40 bg-erro-fundo text-erro",
    sucesso: "border-sucesso/40 bg-sucesso-fundo text-sucesso",
  }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-md border px-4 py-3 ${estilos}`}>
      {children}
    </div>
  );
}
