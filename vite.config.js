import { defineConfig } from "vite";

export default defineConfig({
  // Reuse the legacy PWA shell assets while Vite owns the new application bundle.
  publicDir: "dist",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
