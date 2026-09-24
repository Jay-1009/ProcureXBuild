import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [
    // Plain client-side TanStack Router codegen (no SSR/Nitro) — regenerates
    // src/routeTree.gen.ts from the src/routes/* file structure.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../procurex/public/frontend",
    emptyOutDir: true,
  },
  server: {
    port: 3008,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env["VITE_FRAPPE_URL"] || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/files": {
        target: process.env["VITE_FRAPPE_URL"] || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/private/files": {
        target: process.env["VITE_FRAPPE_URL"] || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
