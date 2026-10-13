import type { NextConfig } from "next";

// ponytail: sem cacheComponents. O site é todo personalizado pela sessão do usuário, então não há casca estática a
// aproveitar; renderização dinâmica comum é mais simples. Rever se surgir página pública com muito tráfego.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
