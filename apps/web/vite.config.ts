import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  const port = parseInt(env.VITE_PORT || "5173", 10);
  const x402ServerPort = parseInt(env.X402_SERVER_PORT || "8402", 10);
  const x402FacilitatorPort = parseInt(
    env.X402_FACILITATOR_PORT || "8403",
    10
  );

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port,
      strictPort: true,
      host: true, // Enable network access
      proxy: {
        // Proxy API requests to X402 server
        "/api/x402-server": {
          target: `http://localhost:${x402ServerPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/x402-server/, ""),
        },
        // Proxy API requests to X402 facilitator
        "/api/x402-facilitator": {
          target: `http://localhost:${x402FacilitatorPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/x402-facilitator/, ""),
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
