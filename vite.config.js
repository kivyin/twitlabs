import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sqliteApiPlugin } from "./vite.sqlite-api.js";

const packageJson = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
);

const appVersion = process.env.VITE_APP_VERSION || packageJson.version || "0.0.0";
const appRepo = process.env.VITE_APP_REPO || "kivyin/twitlabs";

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_REPO__: JSON.stringify(appRepo),
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    watch: {
      // Windows locks on zip files can crash the watcher (EBUSY).
      ignored: ["**/*.zip", "**/public.zip"],
    },
  },

  plugins: [tailwindcss(), react(), sqliteApiPlugin()],

  build: {
    // Vite 8 defaults to lightningcss minify, which needs a platform-native
    // binary. Shared Windows/WSL node_modules often miss the Linux binding.
    cssMinify: false,
  },
});
