import { defineConfig, Plugin } from "vite";

// itch.io serves a browser game from a folder of its own on its own domain, so its build
// (--mode itch) refers to everything relative to the page, and drops index.html's
// <base href="/">, which would send the game's images, sounds and fonts to that domain's
// root. It has no source maps either, as itch.io limits a game to 1,000 files
const relativeToPage = (): Plugin => ({
    name: "relative-to-page",
    transformIndexHtml: html => html.replace(/<base href="\/">\n?/, ""),
});

export default defineConfig(({ mode }) => ({
    base: mode === "itch" ? "./" : "/",
    plugins: mode === "itch" ? [relativeToPage()] : [],
    build: {
        sourcemap: mode !== "itch",
        rollupOptions: {
            // The game, and the privacy policy, a page of its own served at /privacy. The
            // website's build (--mode web) adds its home page, which the Android, desktop
            // and itch.io builds don't have: they open straight into the game
            input: ["index.html", "privacy.html", ...(mode === "web" ? ["home.html"] : [])],
        },
    },
}));
