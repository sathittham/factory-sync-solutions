import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import { store } from "@/store";
import { router } from "@/router";
import { useAuth } from "@/hooks/useAuth";
import { LocaleProvider } from "@/lib/i18n";

function AuthInitializer({ children }: { children: React.ReactNode }) {
	useAuth();
	return <>{children}</>;
}

export function App() {
	return (
		<Provider store={store}>
			<LocaleProvider>
				<AuthInitializer>
					<RouterProvider router={router} />
				</AuthInitializer>
			</LocaleProvider>
		</Provider>
	);
}
