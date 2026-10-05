import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` escribe por su cuenta un bloque de instrucciones en AGENTS.md. Ese archivo es
  // del harness del proyecto (espejo de CLAUDE.md): no lo administra Next.
  agentRules: false,
};

export default nextConfig;
