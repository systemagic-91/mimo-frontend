import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";
import { enterDevPlugin, enterProdPlugin } from "vite-plugin-enter-dev";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [...enterProdPlugin()];
  if (mode === "development") {
    plugins.push(...enterDevPlugin());
  }
  return {
    server: {
      host: "::",
      port: 5173,
      // Mesmo papel do rewrite da Vercel: front e API na mesma origem, para o cookie de sessão funcionar.
      proxy: {
        "/api": process.env.API_PROXY_TARGET || "http://localhost:8080",
      },
    },
    plugins: plugins.filter(Boolean) as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: "/",
    build: {
      outDir: "dist",
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      restoreMocks: true,
      clearMocks: true,
      env: { VITE_API_BASE_URL: "http://localhost:8080/api/v1" },
    },
  };
});
