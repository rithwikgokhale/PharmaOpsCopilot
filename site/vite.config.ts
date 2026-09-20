import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "fs";
import { resolve } from "path";

/** GitHub Pages has no SPA fallback; copy index.html to 404.html after build. */
function spaFallback404() {
  return {
    name: "spa-fallback-404",
    writeBundle() {
      const index = resolve(__dirname, "dist/index.html");
      const fallback = resolve(__dirname, "dist/404.html");
      if (existsSync(index)) copyFileSync(index, fallback);
    },
  };
}

export default defineConfig({
  base: "/PharmaOpsCopilot/",
  plugins: [react(), spaFallback404()],
  server: {
    fs: {
      allow: [".."],
    },
  },
});
