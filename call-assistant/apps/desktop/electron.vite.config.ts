import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve("electron/main/index.ts"),
      },
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@main": resolve("electron/main"),
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve("electron/preload/index.ts"),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve("."),
    build: {
      rollupOptions: {
        input: resolve("index.html"),
      },
    },
    resolve: {
      alias: {
        "@renderer": resolve("src"),
      },
    },
    plugins: [react()],
  },
});
