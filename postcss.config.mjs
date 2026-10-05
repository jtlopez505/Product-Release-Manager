// Tailwind CSS v4 se engancha a Next.js por acá y no pide nada más: la paleta, la tipografía
// y las escalas se declaran como tokens en app/globals.css (ver docs/arquitectura/marca.md),
// no en un archivo de configuración aparte.
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
