import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "../../module/apps/inventorymonitor/dist",
    sourcemap: false,
    minify: "esbuild",
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["@viamrobotics/sdk"],
          utils: ["js-cookie"],
          maps: ["leaflet"]
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    open: true
  },
  preview: {
    port: 4173,
    host: true
  },
  define: {
    // Environment variables for different deployments
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});