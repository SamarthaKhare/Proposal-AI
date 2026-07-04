import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"]
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
