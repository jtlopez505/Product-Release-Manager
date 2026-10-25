import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` escribe por su cuenta un bloque de instrucciones en AGENTS.md. Ese archivo es
  // del harness del proyecto (espejo de CLAUDE.md): no lo administra Next.
  agentRules: false,
};

// Sentry sin token: no se suben source maps, no se manda la telemetría propia del build y no se
// agrega ninguna ruta (sin túnel), así el portón de proxy.ts queda como está.
export default withSentryConfig(nextConfig, {
  telemetry: false,
  silent: true,
  sourcemaps: { disable: true },
  release: { create: false },
});
