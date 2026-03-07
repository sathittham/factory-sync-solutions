import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppSelector } from "@/store";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function Layout() {
	const { isAuthenticated, isAdmin, profile } = useAppSelector((s) => s.auth);
	const navigate = useNavigate();
	const location = useLocation();
	const { locale, setLocale, t } = useLocale();

	const handleSignOut = async () => {
		await signOut(auth);
		navigate("/");
	};

	const isActive = (path: string) => location.pathname === path;

	return (
		<div className="min-h-screen flex flex-col bg-background">
			<header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md">
				<div className="container flex h-16 items-center justify-between">
					<Link to="/" className="flex items-center gap-2.5 group">
						<div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
								<path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
								<path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
								<circle cx="8" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
							</svg>
						</div>
						<span className="font-bold text-lg tracking-tight text-foreground">
							FHC
						</span>
					</Link>

					<nav className="flex items-center gap-1">
						{isAuthenticated && profile && (
							<>
								<Link
									to="/quiz"
									className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
										isActive("/quiz")
											? "bg-primary/10 text-primary font-medium"
											: "text-muted-foreground hover:text-foreground hover:bg-muted"
									}`}
								>
									{t("nav.quiz")}
								</Link>
								<Link
									to="/results"
									className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
										isActive("/results")
											? "bg-primary/10 text-primary font-medium"
											: "text-muted-foreground hover:text-foreground hover:bg-muted"
									}`}
								>
									{t("nav.results")}
								</Link>
								{isAdmin && (
									<Link
										to="/admin"
										className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
											isActive("/admin")
												? "bg-primary/10 text-primary font-medium"
												: "text-muted-foreground hover:text-foreground hover:bg-muted"
										}`}
									>
										{t("nav.admin")}
									</Link>
								)}

								<div className="w-px h-5 bg-border mx-2" />

								<Link
									to="/profile"
									className={`text-xs max-w-[120px] truncate hidden sm:block transition-colors ${
										isActive("/profile")
											? "text-primary font-medium"
											: "text-muted-foreground hover:text-foreground"
									}`}
									title={t("nav.profile")}
								>
									{profile.companyName}
								</Link>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleSignOut}
									className="text-muted-foreground hover:text-foreground"
								>
									{t("nav.signOut")}
								</Button>
							</>
						)}

						<button
							type="button"
							onClick={() => setLocale(locale === "th" ? "en" : "th")}
							className="ml-1 h-8 w-8 flex items-center justify-center text-xs font-semibold rounded-md border border-border bg-white hover:bg-muted transition-colors"
							title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
						>
							{locale === "th" ? "EN" : "TH"}
						</button>
					</nav>
				</div>
			</header>

			<main className="flex-1">
				<Outlet />
			</main>

			<footer className="border-t py-6 bg-white">
				<div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>Factory Health Check by STM23</span>
					<span className="font-mono">v0.0.1</span>
				</div>
			</footer>
		</div>
	);
}
