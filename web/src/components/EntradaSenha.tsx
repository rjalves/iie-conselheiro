"use client";

import { useState, type ComponentProps } from "react";
import { Entrada } from "./ui";

/** Campo de senha com "Mostrar" / "Ocultar": evita erro de digitação, principalmente no celular. */
export function EntradaSenha(props: Omit<ComponentProps<typeof Entrada>, "type">) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Entrada {...props} type={visivel ? "text" : "password"} className="pr-24" />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-controls={props.id}
        className="absolute inset-y-1.5 right-1.5 rounded px-3 text-sm font-semibold text-tinta hover:bg-tinta-clara"
      >
        {visivel ? "Ocultar" : "Mostrar"}
        <span className="sr-only"> senha</span>
      </button>
    </div>
  );
}
