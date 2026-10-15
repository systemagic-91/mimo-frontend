import { defineConfig, PluginOption } from "vitest/config";
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
    },
  };
});
