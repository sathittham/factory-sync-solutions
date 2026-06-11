import { useAppSelector } from "@/store";
import { useEffect } from "react";
import { Outlet } from "react-router";

const OFFICIAL_WEB_URL = import.meta.env.VITE_OFFICIAL_WEB_URL ?? "";

export function RegisterGuard() {
	const { isRegistered } = useAppSelector((s) => s.auth);

	useEffect(() => {
		if (!isRegistered) {
			const dest = OFFICIAL_WEB_URL ? `${OFFICIAL_WEB_URL}/register` : "/";
			globalThis.location.replace(dest);
		}
	}, [isRegistered]);

	if (!isRegistered) return null;

	return <Outlet />;
}
