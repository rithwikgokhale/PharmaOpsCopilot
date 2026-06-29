import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: "app",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/src"),
    },
  },
  publicDir: path.resolve(__dirname, "public"),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-recharts";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("/react/")
            ) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
