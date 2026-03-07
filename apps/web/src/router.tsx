import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { RegisterGuard } from "@/components/guards/RegisterGuard";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { LandingPage } from "@/pages/LandingPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { QuizPage } from "@/pages/QuizPage";
import { ResultPage } from "@/pages/ResultPage";
import { AdminPage } from "@/pages/AdminPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
	{
		element: <Layout />,
		children: [
			{ index: true, element: <LandingPage /> },
			{
				element: <AuthGuard />,
				children: [
					{ path: "register", element: <RegisterPage /> },
					{
						element: <RegisterGuard />,
						children: [
							{ path: "quiz", element: <QuizPage /> },
							{ path: "results", element: <ResultPage /> },
							],
					},
					{
						element: <AdminGuard />,
						children: [{ path: "admin", element: <AdminPage /> }],
					},
				],
			},
			{ path: "*", element: <NotFoundPage /> },
		],
	},
]);
