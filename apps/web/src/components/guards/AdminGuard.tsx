import { Navigate, Outlet } from "react-router";
import { useAppSelector } from "@/store";

export function AdminGuard() {
	const { isAdmin } = useAppSelector((s) => s.auth);

	if (!isAdmin) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
