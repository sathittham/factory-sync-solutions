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
	// Legacy service slugs → nested taxonomy (Phase 3). `factory-health-check`
	// is unchanged (it is now the flagship group slug) so needs no redirect.
	redirects: {
		"/services/production-assessment": "/services/government-supported/shindan-lean-kaizen",
		"/services/efficiency-consulting": "/services/engineering-consulting",
		"/services/digital-factory": "/services/government-supported/digital-factory-layout-360",
	},
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
