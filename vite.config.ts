import { defineConfig } from "vite";

export default defineConfig({
    build: {
        sourcemap: true,
        rollupOptions: {
            // The game, and the privacy policy, a page of its own served at /privacy
            input: ["index.html", "privacy.html"],
        },
    },
});
