import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sqliteApiPlugin } from "./vite.sqlite-api.js";

// https://vite.dev/config/
export default defineConfig({
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