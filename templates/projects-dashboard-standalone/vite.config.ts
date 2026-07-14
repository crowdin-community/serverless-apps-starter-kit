import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    react({ plugins: [["@lingui/swc-plugin", {}]] }),
    tailwindcss(),
    cssInjectedByJs(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@lingui/core", "@lingui/react"],
  },
  // Vite library mode keeps process.env.NODE_ENV as-is; a classic <script> IIFE has no process.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      formats: ["iife"],
      name: "CrowdinApp",
      fileName: () => "app.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "app.js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
