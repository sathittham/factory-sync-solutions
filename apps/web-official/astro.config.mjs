import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://www.factorysyncsolutions.com",
	integrations: [
		react(),
		sitemap({
			filter: (page) => !page.includes("/register") && !page.includes("/cookie-settings"),
		}),
	],
	output: "static",
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			include: ["react", "react-dom", "react-dom/client"],
		},
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"@shared": fileURLToPath(new URL("../../packages/shared", import.meta.url)),
			},
		},
	},
});
