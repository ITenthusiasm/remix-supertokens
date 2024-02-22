import path from "node:path";
import { vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [remix({ routes: createRoutesFromFolders })],
  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "./app"),
    },
  },
});
