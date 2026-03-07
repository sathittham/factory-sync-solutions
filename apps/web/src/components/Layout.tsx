import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppSelector } from "@/store";
import { useLocale } from "@/lib/i18n";
import { trackPageView } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

export function Layout() {
	const { isAuthenticated, isAdmin, profile } = useAppSelector((s) => s.auth);
	const navigate = useNavigate();
	const location = useLocation();
	const { locale, setLocale, t } = useLocale();
	const [sheetOpen, setSheetOpen] = useState(false);

	// Close sheet and track page view on route change
	useEffect(() => {
		setSheetOpen(false);
		trackPageView(location.pathname);
	}, [location.pathname]);

	const handleSignOut = async () => {
		setSheetOpen(false);
		await signOut(auth);
		navigate("/");
	};

	const isActive = (path: string) => location.pathname === path;

	const desktopLinkClass = (path: string) =>
		`px-3 py-1.5 text-sm rounded-md transition-colors ${
			isActive(path)
				? "bg-secondary text-foreground font-medium"
				: "text-muted-foreground hover:text-foreground"
		}`;

	const drawerLinkClass = (path: string) =>
		`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
			isActive(path)
				? "bg-primary/5 text-primary font-medium"
				: "text-foreground hover:bg-muted/50"
		}`;

	return (
		<div className="min-h-screen flex flex-col bg-background">
			<header className="sticky top-0 z-50 border-b bg-white">
				<div className="container flex h-14 items-center justify-between">
					<Link to="/" className="flex items-center gap-2 group">
						<div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white">
								<path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
								<path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
							</svg>
						</div>
						<span className="font-bold text-foreground">FHC</span>
					</Link>

					{/* Desktop nav */}
					<nav className="hidden sm:flex items-center gap-1">
						{isAuthenticated && profile && (
							<>
								<Link to="/quiz" className={desktopLinkClass("/quiz")}>
									{t("nav.quiz")}
								</Link>
								<Link to="/results" className={desktopLinkClass("/results")}>
									{t("nav.results")}
								</Link>
								{isAdmin && (
									<Link to="/admin" className={desktopLinkClass("/admin")}>
										{t("nav.admin")}
									</Link>
								)}

								<div className="w-px h-4 bg-border mx-1.5" />

								<Link
									to="/profile"
									className={`text-xs truncate max-w-[120px] transition-colors ${
										isActive("/profile")
											? "text-foreground font-medium"
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
									className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
								>
									{t("nav.signOut")}
								</Button>
							</>
						)}

						<button
							type="button"
							onClick={() => setLocale(locale === "th" ? "en" : "th")}
							className="ml-1 h-8 w-8 flex items-center justify-center text-[10px] font-semibold rounded-md border bg-white hover:bg-secondary transition-colors text-muted-foreground"
							title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
						>
							{locale === "th" ? "EN" : "TH"}
						</button>
					</nav>

					{/* Mobile: language toggle + hamburger sheet */}
					<div className="flex items-center gap-1.5 sm:hidden">
						<button
							type="button"
							onClick={() => setLocale(locale === "th" ? "en" : "th")}
							className="h-8 w-8 flex items-center justify-center text-[10px] font-semibold rounded-md border bg-white hover:bg-secondary transition-colors text-muted-foreground"
							title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
						>
							{locale === "th" ? "EN" : "TH"}
						</button>

						{isAuthenticated && profile && (
							<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
								<SheetTrigger asChild>
									<button
										type="button"
										className="h-8 w-8 flex items-center justify-center rounded-md border bg-white hover:bg-secondary transition-colors text-muted-foreground"
										aria-label="Open menu"
									>
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
											<path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
										</svg>
									</button>
								</SheetTrigger>
								<SheetContent side="right" className="w-72 p-0">
									<SheetHeader className="px-5 pt-5 pb-4 border-b">
										<SheetTitle className="text-left text-base">
											{t("nav.appName")}
										</SheetTitle>
									</SheetHeader>

									{/* Profile summary */}
									<div className="px-5 py-4 border-b bg-muted/20">
										<Link
											to="/profile"
											onClick={() => setSheetOpen(false)}
											className="block"
										>
											<p className="text-sm font-medium text-foreground truncate">
												{profile.companyName}
											</p>
											<p className="text-xs text-muted-foreground truncate mt-0.5">
												{profile.email}
											</p>
										</Link>
									</div>

									{/* Nav links */}
									<nav className="px-3 py-3 space-y-0.5">
										<Link to="/quiz" className={drawerLinkClass("/quiz")} onClick={() => setSheetOpen(false)}>
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											{t("nav.quiz")}
										</Link>
										<Link to="/results" className={drawerLinkClass("/results")} onClick={() => setSheetOpen(false)}>
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<path d="M16 8v8M12 11v5M8 14v2M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											</svg>
											{t("nav.results")}
										</Link>
										{isAdmin && (
											<Link to="/admin" className={drawerLinkClass("/admin")} onClick={() => setSheetOpen(false)}>
												<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
													<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
													<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.2.55.68.94 1.27 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5"/>
												</svg>
												{t("nav.admin")}
											</Link>
										)}
										<Link to="/profile" className={drawerLinkClass("/profile")} onClick={() => setSheetOpen(false)}>
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
												<path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											{t("nav.profile")}
										</Link>
									</nav>

									{/* Sign out */}
									<div className="absolute bottom-0 left-0 right-0 border-t p-4">
										<Button
											variant="outline"
											className="w-full justify-center gap-2 text-muted-foreground"
											onClick={handleSignOut}
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											</svg>
											{t("nav.signOut")}
										</Button>
									</div>
								</SheetContent>
							</Sheet>
						)}
					</div>
				</div>
			</header>

			<main className="flex-1">
				<Outlet />
			</main>

			<footer className="border-t py-5">
				<div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>Factory Health Check &middot; STM23</span>
					<span className="font-mono text-[10px]">v0.1.0</span>
				</div>
			</footer>
		</div>
	);
}
