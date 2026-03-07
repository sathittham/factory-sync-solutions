import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import type { LegalType } from "@/components/LegalModal";
import { signOut, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { useAppSelector } from "@/store";
import { useLocale } from "@/lib/i18n";
import { CookieConsent, CONSENT_KEY } from "@/components/CookieConsent";
import { LegalModal } from "@/components/LegalModal";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ProfileDialog } from "@/components/ProfileDialog";

export function Layout() {
	const { isAuthenticated, isAdmin, profile, user } = useAppSelector((s) => s.auth);
	const navigate = useNavigate();
	const location = useLocation();
	const { locale, setLocale, t } = useLocale();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);
	const [legalModal, setLegalModal] = useState<LegalType>(null);
	const [cookieOpen, setCookieOpen] = useState(() => {
		try { return !localStorage.getItem(CONSENT_KEY); } catch { return true; }
	});
	const [cookieSettings, setCookieSettings] = useState(false);

	// Close sheet and track page view on route change
	useEffect(() => {
		setSheetOpen(false);
		trackPageView(location.pathname);
	}, [location.pathname]);

	const handleSignIn = async () => {
		trackEvent("sign_in_click", { method: "google", source: "nav" });
		try {
			await signInWithPopup(auth, googleProvider);
			trackEvent("sign_in_success", { method: "google" });
		} catch {
			trackEvent("sign_in_error", { method: "google" });
		}
	};

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
			{/* Top CTA bar */}
			<div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm py-1.5 px-4">
				<a
					href="https://lin.ee/rWwdF9q"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 hover:underline"
				>
					{t("topbar.cta")}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
						<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
					</svg>
				</a>
			</div>

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

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-full border bg-white hover:bg-secondary transition-colors"
										>
											{user?.photoURL ? (
												<img
													src={user.photoURL}
													alt=""
													referrerPolicy="no-referrer"
													className="h-6 w-6 rounded-full object-cover flex-shrink-0"
												/>
											) : (
												<div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0">
													{(profile.contactName || profile.displayName || profile.email || "U").charAt(0)}
												</div>
											)}
											<span className="text-xs font-medium text-foreground truncate max-w-[100px]">
												{profile.contactName || profile.displayName || profile.email}
											</span>
											<svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="flex-shrink-0 text-muted-foreground">
												<path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-52">
										<DropdownMenuLabel className="font-normal">
											<p className="text-sm font-medium truncate">{profile.contactName || profile.displayName}</p>
											<p className="text-xs text-muted-foreground truncate">{profile.email}</p>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={() => { trackEvent("profile_open", { source: "desktop_dropdown" }); setProfileOpen(true); }} className="gap-2" data-testid="nav-profile-btn">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
												<path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											{t("nav.profile")}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-1">
											{locale === "th" ? "ภาษา" : "Language"}
										</DropdownMenuLabel>
										<DropdownMenuItem
											onClick={() => setLocale("th")}
											className={`gap-2 ${locale === "th" ? "font-medium text-primary" : ""}`}
										>
											TH ภาษาไทย
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setLocale("en")}
											className={`gap-2 ${locale === "en" ? "font-medium text-primary" : ""}`}
										>
											EN English
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											</svg>
											{t("nav.signOut")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						)}

						{!isAuthenticated && (
							<>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											className="ml-1 h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-md border bg-white hover:bg-secondary transition-colors text-muted-foreground"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
												<circle cx="12" cy="12" r="10" />
												<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
											</svg>
											{locale === "th" ? "TH" : "EN"}
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="min-w-[140px]">
										<DropdownMenuItem
											onClick={() => setLocale("th")}
											className={locale === "th" ? "font-medium text-primary" : ""}
										>
											TH ภาษาไทย
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setLocale("en")}
											className={locale === "en" ? "font-medium text-primary" : ""}
										>
											EN English
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
								<Button
									size="sm"
									onClick={handleSignIn}
									className="text-xs h-8 px-3"
								>
									{t("nav.login")}
								</Button>
							</>
						)}
					</nav>

					{/* Mobile: language + sign-in + hamburger */}
					<div className="flex items-center gap-1.5 sm:hidden">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="h-8 px-2 flex items-center gap-1 text-xs font-medium rounded-md border bg-white hover:bg-secondary transition-colors text-muted-foreground"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
										<circle cx="12" cy="12" r="10" />
										<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
									</svg>
									{locale === "th" ? "TH" : "EN"}
									<svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="ml-0.5">
										<path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-[140px]">
								<DropdownMenuItem
									onClick={() => setLocale("th")}
									className={locale === "th" ? "font-medium text-primary" : ""}
								>
									TH ภาษาไทย
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setLocale("en")}
									className={locale === "en" ? "font-medium text-primary" : ""}
								>
									EN English
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{!isAuthenticated && (
							<Button
								size="sm"
								onClick={handleSignIn}
								className="text-xs h-8 px-3"
							>
								{t("nav.login")}
							</Button>
						)}

						{isAuthenticated && profile && (
							<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
								<SheetTrigger asChild>
									{user?.photoURL ? (
										<button type="button" aria-label="Open menu" className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
											<img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
										</button>
									) : (
										<button
											type="button"
											className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase"
											aria-label="Open menu"
										>
											{(profile.contactName || profile.displayName || profile.email || "U").charAt(0)}
										</button>
									)}
								</SheetTrigger>
								<SheetContent side="right" className="w-72 p-0">
									<SheetHeader className="px-5 pt-5 pb-4 border-b">
										<SheetTitle className="text-left text-base">
											{t("nav.appName")}
										</SheetTitle>
									</SheetHeader>

									{/* Profile summary */}
									<div className="px-5 py-4 border-b bg-muted/20">
										<button
											type="button"
											onClick={() => { setSheetOpen(false); trackEvent("profile_open", { source: "mobile_drawer" }); setProfileOpen(true); }}
											className="flex items-center gap-3 w-full text-left"
											data-testid="nav-profile-summary"
										>
											{user?.photoURL ? (
												<img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
											) : (
												<div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
													{(profile.contactName || profile.displayName || profile.email || "U").charAt(0)}
												</div>
											)}
											<div className="min-w-0">
												<p className="text-sm font-medium text-foreground truncate">
													{profile.contactName || profile.displayName}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{profile.email}
												</p>
											</div>
										</button>
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
										<button
											type="button"
											className={drawerLinkClass("/profile")}
											onClick={() => { setSheetOpen(false); trackEvent("profile_open", { source: "mobile_nav" }); setProfileOpen(true); }}
											data-testid="nav-profile-link"
										>
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
												<circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
												<path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											{t("nav.profile")}
										</button>
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
				<div className="container flex flex-col items-center gap-3 text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<span>{t("footer.contact")}:</span>
						<a
							href="https://lin.ee/rWwdF9q"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#06C755] flex-shrink-0">
								<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
							</svg>
							Line @STM23
						</a>
					</div>
					<div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2">
						<span>Factory Health Check &middot; STM23</span>
						<div className="flex items-center gap-3 flex-wrap justify-center">
							<button type="button" onClick={() => setLegalModal("terms")} className="hover:text-foreground transition-colors">
								{t("footer.terms")}
							</button>
							<span className="text-border">|</span>
							<button type="button" onClick={() => setLegalModal("privacy")} className="hover:text-foreground transition-colors">
								{t("footer.privacy")}
							</button>
							<span className="text-border">|</span>
							<button type="button" onClick={() => setLegalModal("cookies")} className="hover:text-foreground transition-colors">
								{t("footer.cookiePolicy")}
							</button>
							<span className="text-border">|</span>
							<button type="button" onClick={() => setLegalModal("marketing")} className="hover:text-foreground transition-colors">
								{t("footer.marketing")}
							</button>
							<span className="text-border">|</span>
							<button type="button" onClick={() => { setCookieOpen(true); setCookieSettings(true); }} className="hover:text-foreground transition-colors">
								{t("footer.cookies")}
							</button>
							<span className="text-border">|</span>
							<span className="font-mono text-[10px]">v0.1.0</span>
						</div>
					</div>
				</div>
			</footer>

			<ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
			<LegalModal open={legalModal} onClose={() => setLegalModal(null)} />
			<CookieConsent open={cookieOpen} openSettings={cookieSettings} onClose={() => { setCookieOpen(false); setCookieSettings(false); }} onOpenLegal={setLegalModal} />
		</div>
	);
}
