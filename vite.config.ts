import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Self-contained Vite config — no Lovable-specific packages.
// Mirrors the plugin set previously provided by @lovable.dev/vite-tanstack-config.
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // src/server.ts is our SSR worker entry (wraps the framework handler).
      server: { entry: "server" },
    }),
    viteReact(),
    // Only run nitro at build time so dev stays fast.
    ...(command === "build"
      ? [
          nitro({
            preset: "cloudflare-module",
            output: {
              dir: "dist",
              serverDir: "dist/server",
              publicDir: "dist/client",
            },
            cloudflare: { nodeCompat: true },
          }),
        ]
      : []),
  ],
  server: {
    port: 8080,
    host: true,
  },
}));
