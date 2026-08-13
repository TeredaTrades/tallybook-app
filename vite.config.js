import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// OUT_DIR (no VITE_ prefix — only needed here at build-config time, not in
// client code) lets the standalone-expenses build write to its own output
// folder instead of overwriting the main "dist" build. See .env.standalone.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    base: "./",
    build: {
      outDir: env.OUT_DIR || "dist",
      emptyOutDir: true,
    },
  };
});
