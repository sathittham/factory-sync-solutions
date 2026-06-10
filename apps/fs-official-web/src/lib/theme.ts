import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
	try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} catch {
		return "light";
	}
}

export function getInitialTheme(): Theme {
	try {
		const stored = localStorage.getItem("fss-theme");
		if (stored === "dark" || stored === "light" || stored === "system") return stored;
	} catch {
		// ignore SSR / private-mode errors
	}
	return "system";
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
		getInitialTheme() === "system" ? getSystemTheme() : (getInitialTheme() as ResolvedTheme)
	);

	const setTheme = useCallback((t: Theme) => {
		setThemeState(t);
		try {
			localStorage.setItem("fss-theme", t);
		} catch {}
	}, []);

	useEffect(() => {
		const applyTheme = () => {
			const next = theme === "system" ? getSystemTheme() : theme;
			setResolvedTheme(next);
			document.documentElement.classList.toggle("dark", next === "dark");
		};

		applyTheme();

		if (theme !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		media.addEventListener("change", applyTheme);
		return () => media.removeEventListener("change", applyTheme);
	}, [theme]);

	return { theme, resolvedTheme, setTheme };
}
