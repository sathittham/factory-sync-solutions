import { Navigate, Outlet } from "react-router";
import { useAppSelector } from "@/store";

export function RegisterGuard() {
	const { isRegistered } = useAppSelector((s) => s.auth);

	if (!isRegistered) {
		return <Navigate to="/register" replace />;
	}

	return <Outlet />;
}
