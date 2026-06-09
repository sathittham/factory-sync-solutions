import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	integrations: [react()],
	output: "static",
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			include: ["react", "react-dom", "react-dom/client"],
		},
		resolve: {
			alias: {
				"@shared": fileURLToPath(new URL("../../packages/shared", import.meta.url)),
			},
		},
	},
});
