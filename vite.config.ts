import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
    build: {
        sourcemap: true,
        rollupOptions: {
            // The game, and the privacy policy, a page of its own served at /privacy. The
            // website's build (--mode web) adds its home page, which the Android and
            // desktop apps don't have: they open straight into the game
            input: ["index.html", "privacy.html", ...(mode === "web" ? ["home.html"] : [])],
        },
    },
}));
