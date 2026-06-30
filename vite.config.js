import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sqliteApiPlugin } from "./vite.sqlite-api.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sqliteApiPlugin()],
});
