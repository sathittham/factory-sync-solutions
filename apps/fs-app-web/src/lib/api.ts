import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

async function getAuthHeaders(): Promise<HeadersInit> {
	const user = auth.currentUser;
	if (!user) {
		return { "Content-Type": "application/json" };
	}
	const token = await user.getIdToken();
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

async function request<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const headers = await getAuthHeaders();
	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: { ...headers, ...options.headers },
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
		const errMsg = body.error?.message || body.error || res.statusText;
		throw new ApiError(res.status, typeof errMsg === "string" ? errMsg : res.statusText);
	}

	const json = await res.json();
	// API wraps all responses as { success, data, ... } — unwrap automatically
	return json.data !== undefined ? json.data : json;
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export const api = {
	get: <T>(path: string) => request<T>(path),

	post: <T>(path: string, body: unknown) =>
		request<T>(path, {
			method: "POST",
			body: JSON.stringify(body),
		}),

	put: <T>(path: string, body: unknown) =>
		request<T>(path, {
			method: "PUT",
			body: JSON.stringify(body),
		}),
};
