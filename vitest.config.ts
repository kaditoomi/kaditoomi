import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // "server-only" viskab vea väljaspool Next.js serverit; testides pole seda vaja.
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: { include: ["lib/**/*.test.ts", "tests/**/*.test.ts"], fileParallelism: false },
});
