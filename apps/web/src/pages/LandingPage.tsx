import { useNavigate } from "react-router";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAppSelector } from "@/store";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const dimensionIcons = [
	<svg key="q" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1l2.5 5.5L18 7.5l-4 4 1 5.5L10 14.5 4.5 17l1-5.5-4-4 5.5-1L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
	<svg key="s" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L3 6v5c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
	<svg key="e" width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.2 4.2l1.4 1.4m8.8 8.8l1.4 1.4M4.2 15.8l1.4-1.4m8.8-8.8l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
	<svg key="w" width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="14" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 17c0-3 2.5-5 6-5s6 2 6 5M13 17c0-2.2 1-3.5 3-4s3 .8 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
	<svg key="d" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 16h6M10 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
	<svg key="sc" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 10h4l2-3h4l2 3h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="4" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
	<svg key="en" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18c-1-2-4-4-4-7a4 4 0 018 0c0 3-3 5-4 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 14v-3m-1.5 1.5L10 11l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
];

const dimKeys = [
	"landing.dim.quality",
	"landing.dim.safety",
	"landing.dim.equipment",
	"landing.dim.workforce",
	"landing.dim.digital",
	"landing.dim.supply",
	"landing.dim.environment",
] as const;

export function LandingPage() {
	const { isAuthenticated, isRegistered, hasCompletedQuiz } = useAppSelector((s) => s.auth);
	const navigate = useNavigate();
	const { locale, t } = useLocale();

	const handleSignIn = async () => {
		try {
			await signInWithPopup(auth, googleProvider);
		} catch {
			// User cancelled or error
		}
	};

	if (isAuthenticated && isRegistered && hasCompletedQuiz) {
		navigate("/results", { replace: true });
		return null;
	}
	if (isAuthenticated && isRegistered) {
		navigate("/quiz", { replace: true });
		return null;
	}
	if (isAuthenticated && !isRegistered) {
		navigate("/register", { replace: true });
		return null;
	}

	return (
		<div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-grid bg-mesh overflow-hidden">
			<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />
			<div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/5 to-transparent pointer-events-none" />

			<div className="w-full max-w-lg animate-fade-up" data-testid="landing-card">
				<div className="bg-white rounded-2xl shadow-lg shadow-primary/5 border border-border/60 overflow-hidden">
					<div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-accent" />
					<div className="p-8 sm:p-10">
						<div className="flex items-center gap-3 mb-6">
							<div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
								<svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="text-white">
									<path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
									<path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
									<circle cx="8" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
								</svg>
							</div>
							<h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
								{t("landing.title")}
							</h1>
						</div>

						<p className="text-muted-foreground leading-relaxed mb-8">
							{t("landing.subtitle")}
						</p>

						<div className="mb-8">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
								{t("landing.questionsInfo")}
							</p>
							<div className="grid grid-cols-2 gap-2">
								{dimKeys.map((key, i) => (
									<div
										key={key}
										className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 text-sm text-foreground/80 animate-fade-up"
										style={{ animationDelay: `${(i + 1) * 0.06}s` }}
									>
										<span className="text-primary/70 flex-shrink-0">{dimensionIcons[i]}</span>
										<span className="truncate">{t(key)}</span>
									</div>
								))}
							</div>
						</div>

						<Button
							size="lg"
							className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
							onClick={handleSignIn}
						>
							<svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mr-2">
								<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
								<path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
								<path d="M3.964 10.712A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.712V4.956H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.044l3.007-2.332z" fill="#FBBC05"/>
								<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.956L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
							</svg>
							{t("landing.signIn")}
						</Button>
					</div>
				</div>
				<p className="text-center text-xs text-muted-foreground mt-4">
					35 {locale === "th" ? "คำถาม" : "questions"} &middot; 7 {locale === "th" ? "มิติ" : "dimensions"} &middot; ~10 {locale === "th" ? "นาที" : "min"}
				</p>
			</div>
		</div>
	);
}
