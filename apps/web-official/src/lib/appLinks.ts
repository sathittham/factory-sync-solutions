const LOCAL_APP_URL = "http://localhost:5173";

interface AppRegisterUrlOptions {
	readonly isDevelopment?: boolean;
}

export function getAppRegisterUrl(
	appUrl: string,
	{ isDevelopment = false }: AppRegisterUrlOptions = {}
): string {
	try {
		const url = new URL(isDevelopment ? LOCAL_APP_URL : appUrl);
		url.pathname = "/register";
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		return "/register";
	}
}
