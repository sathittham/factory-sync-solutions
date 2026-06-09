import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "node:child_process";

function getAppVersion(): string {
	try {
		return execSync("git describe --tags --always").toString().trim();
	} catch {
		return "dev";
	}
}

export default defineConfig({
	plugins: [react()],
	define: {
		__APP_VERSION__: JSON.stringify(getAppVersion()),
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@shared": path.resolve(__dirname, "../../packages/shared"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
		},
	},
});
