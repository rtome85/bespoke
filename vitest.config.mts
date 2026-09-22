import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

const sourceDir = fileURLToPath(new URL("./src/", import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^~/,
        replacement: sourceDir
      }
    ]
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        statements: 25,
        branches: 20,
        functions: 23,
        lines: 26
      }
    }
  }
})
