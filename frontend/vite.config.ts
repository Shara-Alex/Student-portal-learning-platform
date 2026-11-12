import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// In dev, any request to /api is forwarded to Django so the browser sees one origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Writes the version from package.json into the app, for the status footer. npm sets this variable when it runs a script.
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev") },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_API_URL || "http://localhost:8000" },
  },
});
