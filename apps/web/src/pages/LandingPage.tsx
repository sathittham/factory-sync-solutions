import { useNavigate } from "react-router";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAppSelector } from "@/store";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const HERO_IMG =
	"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80&auto=format&fit=crop";

const FEATURES = [
	{
		key: "landing.dim.quality",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.safety",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.equipment",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.workforce",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.digital",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<rect x="2" y="3" width="20" height="14" rx="2" />
				<path d="M8 21h8M12 17v4" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.supply",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<rect x="1" y="3" width="15" height="13" rx="2" />
				<path d="M16 8h4l3 3v5h-7V8z" />
				<circle cx="5.5" cy="18.5" r="2.5" />
				<circle cx="18.5" cy="18.5" r="2.5" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.environment",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M2 22c1-6 6-12 12-13M22 2c-6 1-12 6-13 12" />
				<path d="M22 2 13 13" strokeLinecap="round" />
				<path d="M2 22l9-9" strokeLinecap="round" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=400&q=80&auto=format&fit=crop",
	},
] as const;

const STEPS_TH = [
	{ num: "01", title: "ลงทะเบียน", desc: "ลงชื่อเข้าใช้และกรอกข้อมูลบริษัท" },
	{ num: "02", title: "ทำแบบประเมิน", desc: "ตอบคำถาม 35 ข้อ ใช้เวลาราว 10 นาที" },
	{ num: "03", title: "รับผลวิเคราะห์", desc: "ดูคะแนน จุดแข็ง และข้อเสนอแนะ" },
];

const STEPS_EN = [
	{ num: "01", title: "Register", desc: "Sign in and fill in your company details" },
	{ num: "02", title: "Take Assessment", desc: "Answer 35 questions in about 10 minutes" },
	{ num: "03", title: "Get Insights", desc: "View scores, strengths, and recommendations" },
];

function GoogleIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mr-2.5">
			<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
			<path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
			<path d="M3.964 10.712A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.712V4.956H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.044l3.007-2.332z" fill="#FBBC05" />
			<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.956L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
		</svg>
	);
}

function useRedirectIfAuthenticated() {
	const { isAuthenticated, isRegistered, hasCompletedQuiz } = useAppSelector((s) => s.auth);
	const navigate = useNavigate();

	if (isAuthenticated && isRegistered && hasCompletedQuiz) {
		navigate("/results", { replace: true });
		return true;
	}
	if (isAuthenticated && isRegistered) {
		navigate("/quiz", { replace: true });
		return true;
	}
	if (isAuthenticated && !isRegistered) {
		navigate("/register", { replace: true });
		return true;
	}
	return false;
}

export function LandingPage() {
	const redirected = useRedirectIfAuthenticated();
	const { locale, t } = useLocale();

	const handleSignIn = async () => {
		try {
			await signInWithPopup(auth, googleProvider);
		} catch {
			// User cancelled or error
		}
	};

	if (redirected) return null;

	const steps = locale === "th" ? STEPS_TH : STEPS_EN;

	return (
		<div className="min-h-[calc(100vh-3.5rem)]">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-slate-900">
				{/* Background image */}
				<img
					src={HERO_IMG}
					alt=""
					className="absolute inset-0 w-full h-full object-cover opacity-30"
					loading="eager"
				/>
				<div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40" />

				<div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36">
					<div className="max-w-xl animate-fade-up">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium mb-6">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
							{locale === "th" ? "แบบประเมินออนไลน์ ฟรี" : "Free Online Assessment"}
						</div>

						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
							{t("landing.title")}
						</h1>

						<p className="text-base sm:text-lg text-white/70 leading-relaxed mb-8 max-w-lg">
							{t("landing.subtitle")}
						</p>

						<div className="flex flex-col sm:flex-row items-start gap-3">
							<Button
								size="lg"
								className="h-12 px-8 text-[15px] font-semibold bg-white text-slate-900 hover:bg-white/90"
								onClick={handleSignIn}
							>
								<GoogleIcon />
								{t("landing.signIn")}
							</Button>

							<div className="flex items-center gap-4 text-sm text-white/50 sm:ml-2 sm:mt-0 mt-2">
								{[
									{ value: "35", label: locale === "th" ? "คำถาม" : "questions" },
									{ value: "7", label: locale === "th" ? "มิติ" : "dimensions" },
									{ value: "~10", label: locale === "th" ? "นาที" : "min" },
								].map((stat, i) => (
									<div key={stat.value + stat.label} className="flex items-center gap-1">
										{i > 0 && <span className="text-white/20 mr-2">|</span>}
										<span className="font-mono font-semibold text-white/70">{stat.value}</span>
										<span className="text-xs">{stat.label}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* How It Works */}
			<section className="py-16 sm:py-20 bg-white">
				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<h2 className="text-xl sm:text-2xl font-bold text-foreground mb-10 text-center">
						{locale === "th" ? "ขั้นตอนง่ายๆ 3 ขั้นตอน" : "How It Works"}
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
						{steps.map((step, i) => (
							<div
								key={step.num}
								className="text-center animate-fade-up"
								style={{ animationDelay: `${i * 0.1}s` }}
							>
								<div className="text-4xl font-bold text-primary/15 mb-2 font-mono">{step.num}</div>
								<h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
								<p className="text-sm text-muted-foreground">{step.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* 7 Dimensions Grid */}
			<section className="py-16 sm:py-20 bg-secondary/30">
				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<div className="text-center mb-10">
						<h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
							{locale === "th" ? "7 มิติหลักที่ประเมิน" : "7 Key Dimensions"}
						</h2>
						<p className="text-sm text-muted-foreground max-w-md mx-auto">
							{locale === "th"
								? "ครอบคลุมทุกด้านที่สำคัญต่อการดำเนินงานของโรงงาน"
								: "Comprehensive coverage of every aspect critical to factory operations"}
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{FEATURES.map((feat, i) => (
							<div
								key={feat.key}
								className="group relative bg-white rounded-lg border overflow-hidden animate-fade-up hover:shadow-md transition-shadow"
								style={{ animationDelay: `${i * 0.06}s` }}
							>
								<div className="h-32 overflow-hidden">
									<img
										src={feat.img}
										alt=""
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
										loading="lazy"
									/>
								</div>
								<div className="p-4 flex items-center gap-3">
									<div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
										{feat.icon}
									</div>
									<span className="text-sm font-medium text-foreground">{t(feat.key)}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="py-16 sm:py-20 bg-white">
				<div className="max-w-xl mx-auto px-4 sm:px-6 text-center animate-fade-up">
					<h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
						{locale === "th" ? "พร้อมประเมินโรงงานของคุณแล้วหรือยัง?" : "Ready to assess your factory?"}
					</h2>
					<p className="text-sm text-muted-foreground mb-6">
						{locale === "th"
							? "เริ่มต้นฟรี ใช้เวลาเพียง 10 นาที"
							: "Get started for free in just 10 minutes"}
					</p>
					<Button
						size="lg"
						className="h-12 px-10 text-[15px] font-semibold"
						onClick={handleSignIn}
					>
						<GoogleIcon />
						{t("landing.signIn")}
					</Button>
				</div>
			</section>
		</div>
	);
}
