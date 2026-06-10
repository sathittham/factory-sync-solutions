import { defineConfig, loadEnv } from "vite";
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

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	// VITE_PROXY_TARGET controls where /api/* requests are forwarded.
	// Default: local backend. Set to staging URL in .env.development to proxy through.
	const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8080";

	return {
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
					target: proxyTarget,
					changeOrigin: true,
					secure: false,
				},
			},
		},
	};
});
