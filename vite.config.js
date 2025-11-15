import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                options: resolve(__dirname, "options/options.html"),
                popup: resolve(__dirname, "popup/index.html"),
                images: resolve(__dirname, "images/icon-16.png"),
            },
            output: {
                entryFileNames: "[name].js",
                dir: "dist",
                format: "es",
            },
        },
    },
});
