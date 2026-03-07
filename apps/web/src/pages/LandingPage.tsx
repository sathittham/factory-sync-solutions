import { useState } from "react";
import { useNavigate } from "react-router";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAppSelector } from "@/store";
import { useLocale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/motion";

const HERO_IMG =
	"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80&auto=format&fit=crop";

const FEATURES = [
	{
		key: "landing.dim.basic",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.improvement",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" strokeLinecap="round" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.coordination",
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
		key: "landing.dim.maintenance",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.quality",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.production",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<rect x="2" y="7" width="20" height="14" rx="2" />
				<path d="M16 3h-8l-2 4h12l-2-4z" />
				<path d="M12 11v6M9 14h6" strokeLinecap="round" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.material",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<rect x="1" y="3" width="15" height="13" rx="2" />
				<path d="M16 8h4l3 3v5h-7V8z" />
				<circle cx="5.5" cy="18.5" r="2.5" />
				<circle cx="18.5" cy="18.5" r="2.5" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&auto=format&fit=crop",
	},
	{
		key: "landing.dim.cost",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
				<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
		img: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=400&q=80&auto=format&fit=crop",
	},
] as const;

const TESTIMONIALS_TH = [
	{ name: "สมชาย ว.", role: "ผู้จัดการโรงงาน, อุตสาหกรรมอาหาร", quote: "ผลประเมินช่วยให้เราเห็นจุดอ่อนที่ไม่เคยสังเกตมาก่อน ปรับปรุงได้ตรงจุดทันที" },
	{ name: "วิภา ส.", role: "ผู้อำนวยการฝ่ายผลิต, อิเล็กทรอนิกส์", quote: "ใช้เวลาแค่ 10 นาที แต่ได้ข้อมูลเชิงลึกที่นำไปวางแผนพัฒนาโรงงานได้จริง" },
	{ name: "ประเสริฐ ก.", role: "เจ้าของกิจการ SME, พลาสติก", quote: "เปรียบเทียบคะแนนกับค่าเฉลี่ยอุตสาหกรรมได้ ทำให้รู้ว่าเราอยู่ตรงไหน" },
];

const TESTIMONIALS_EN = [
	{ name: "Somchai W.", role: "Factory Manager, Food Industry", quote: "The assessment helped us identify blind spots we never noticed. We improved immediately." },
	{ name: "Wipa S.", role: "Production Director, Electronics", quote: "Just 10 minutes for deep insights that we actually used for factory development planning." },
	{ name: "Prasert K.", role: "SME Owner, Plastics", quote: "Being able to compare scores with industry averages showed us exactly where we stand." },
];

const STEPS_TH = [
	{ num: "01", title: "ลงทะเบียน", desc: "ลงชื่อเข้าใช้และกรอกข้อมูลบริษัท" },
	{ num: "02", title: "ทำแบบประเมิน", desc: "ตอบคำถาม 43 ข้อ ใน 8 มิติ ใช้เวลาราว 15 นาที" },
	{ num: "03", title: "รับผลวิเคราะห์", desc: "ดูคะแนน จุดแข็ง และข้อเสนอแนะ" },
];

const STEPS_EN = [
	{ num: "01", title: "Register", desc: "Sign in and fill in your company details" },
	{ num: "02", title: "Take Assessment", desc: "Answer 43 questions across 8 dimensions (~15 min)" },
	{ num: "03", title: "Get Insights", desc: "View scores, strengths, and recommendations" },
];

function TestimonialsSection({ locale }: Readonly<{ locale: string }>) {
	const testimonials = locale === "th" ? TESTIMONIALS_TH : TESTIMONIALS_EN;
	return (
		<section className="py-16 sm:py-20 bg-background">
			<div className="max-w-6xl mx-auto px-4 sm:px-6">
				<FadeIn>
					<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10 text-center">
						{locale === "th" ? "เสียงจากผู้ใช้งานจริง" : "What Users Say"}
					</h2>
				</FadeIn>
				<StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-6">
					{testimonials.map((item) => (
						<StaggerItem
							key={item.name}
							className="bg-secondary/30 rounded-lg p-5 sm:p-6"
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary/30 mb-3">
								<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" fill="currentColor" />
								<path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="currentColor" />
							</svg>
							<p className="text-base text-foreground leading-relaxed mb-4">{item.quote}</p>
							<div>
								<p className="text-base font-semibold text-foreground">{item.name}</p>
								<p className="text-sm text-muted-foreground">{item.role}</p>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>
		</section>
	);
}

function ContactSection({ locale }: Readonly<{ locale: string }>) {
	return (
		<section className="py-16 sm:py-20 bg-secondary/30">
			<div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
					{locale === "th" ? "ติดต่อเรา" : "Contact Us"}
				</h2>
				<p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
					{locale === "th"
						? "สนใจตรวจสุขภาพโรงงาน หรือต้องการข้อมูลเพิ่มเติม ติดต่อทีมงานของเราได้เลย"
						: "Interested in a factory health check or need more information? Reach out to our team."}
				</p>
				<a
					href="https://lin.ee/rWwdF9q"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold text-[15px] h-12 px-8 rounded-lg transition-colors"
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
						<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
					</svg>
					{locale === "th" ? "แอดไลน์ @STM23" : "Add Line @STM23"}
				</a>
				<p className="text-sm text-muted-foreground mt-4">
					{locale === "th" ? "หรือ Email: " : "Or Email: "}
					<a href="mailto:contact@stm23.com" className="text-primary hover:underline font-medium">contact@stm23.com</a>
				</p>
			</div>
		</section>
	);
}

function SignInDialog({ open, onOpenChange, locale, onSignIn }: Readonly<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	locale: string;
	onSignIn: () => void;
}>) {
	const dialogSteps = locale === "th"
		? [
			{ num: "1", text: "เข้าสู่ระบบด้วย Google" },
			{ num: "2", text: "กรอกข้อมูลบริษัทของคุณ" },
			{ num: "3", text: "ทำแบบประเมิน 43 ข้อ (~15 นาที)" },
			{ num: "4", text: "รับผลวิเคราะห์และคำแนะนำทันที" },
		]
		: [
			{ num: "1", text: "Sign in with Google" },
			{ num: "2", text: "Fill in your company details" },
			{ num: "3", text: "Complete 43 questions (~15 min)" },
			{ num: "4", text: "Get instant results & recommendations" },
		];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-xl">
						{locale === "th" ? "เริ่มต้นใช้งาน" : "Get Started"}
					</DialogTitle>
					<DialogDescription className="text-base">
						{locale === "th"
							? "ขั้นตอนง่ายๆ เพียง 4 ขั้นตอน"
							: "Just 4 simple steps to get your results"}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					{dialogSteps.map((step) => (
						<div key={step.num} className="flex items-center gap-3">
							<div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
								{step.num}
							</div>
							<span className="text-[15px] text-foreground">{step.text}</span>
						</div>
					))}
				</div>
				<div className="flex flex-col gap-2 pt-2">
					<Button
						size="lg"
						className="h-12 text-[15px] font-semibold gap-2"
						onClick={() => {
							onOpenChange(false);
							onSignIn();
						}}
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
						</svg>
						{locale === "th" ? "เข้าสู่ระบบด้วย Google" : "Sign in with Google"}
					</Button>
					<p className="text-xs text-center text-muted-foreground">
						{locale === "th" ? "ฟรี ไม่มีค่าใช้จ่าย" : "Free, no cost involved"}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function BottomCtaSection({ locale, onCtaClick, ctaLabel }: Readonly<{
	locale: string;
	onCtaClick: () => void;
	ctaLabel: string;
}>) {
	return (
		<section className="py-16 sm:py-20 bg-background">
			<div className="max-w-xl mx-auto px-4 sm:px-6 text-center animate-fade-up">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
					{locale === "th" ? "พร้อมประเมินโรงงานของคุณแล้วหรือยัง?" : "Ready to assess your factory?"}
				</h2>
				<p className="text-base text-muted-foreground mb-6">
					{locale === "th"
						? "เริ่มต้นฟรี ใช้เวลาเพียง 15 นาที"
						: "Get started for free in about 15 minutes"}
				</p>
				<Button
					size="lg"
					className="h-12 px-10 text-[15px] font-semibold"
					onClick={onCtaClick}
				>
					{ctaLabel}
				</Button>
			</div>
		</section>
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
	const [showDialog, setShowDialog] = useState(false);

	const handleSignIn = async () => {
		trackEvent("sign_in_click", { method: "google" });
		try {
			await signInWithPopup(auth, googleProvider);
			trackEvent("sign_in_success", { method: "google" });
		} catch {
			trackEvent("sign_in_error", { method: "google" });
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
					<FadeIn className="max-w-xl" y={32}>
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
								onClick={() => setShowDialog(true)}
							>
								{t("landing.cta")}
							</Button>

							<div className="flex items-center gap-4 text-sm text-white/50 sm:ml-2 sm:mt-0 mt-2">
								{[
									{ value: "43", label: locale === "th" ? "คำถาม" : "questions" },
									{ value: "8", label: locale === "th" ? "มิติ" : "dimensions" },
									{ value: "~15", label: locale === "th" ? "นาที" : "min" },
								].map((stat, i) => (
									<div key={stat.value + stat.label} className="flex items-center gap-1">
										{i > 0 && <span className="text-white/20 mr-2">|</span>}
										<span className="font-mono font-semibold text-white/70">{stat.value}</span>
										<span className="text-xs">{stat.label}</span>
									</div>
								))}
							</div>
						</div>
					</FadeIn>
				</div>
			</section>

			{/* How It Works */}
			<section className="py-16 sm:py-20 bg-background">
				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<FadeIn>
						<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10 text-center">
							{locale === "th" ? "ขั้นตอนง่ายๆ 3 ขั้นตอน" : "How It Works"}
						</h2>
					</FadeIn>
					<StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10" stagger={0.12}>
						{steps.map((step) => (
							<StaggerItem key={step.num} className="text-center">
								<div className="text-4xl font-bold text-primary/15 mb-2 font-mono">{step.num}</div>
								<h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
								<p className="text-base text-muted-foreground">{step.desc}</p>
							</StaggerItem>
						))}
					</StaggerChildren>
				</div>
			</section>

			{/* 8 Dimensions Grid */}
			<section className="py-16 sm:py-20 bg-secondary/30">
				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<FadeIn className="text-center mb-10">
						<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
							{locale === "th" ? "8 มิติหลักที่ประเมิน" : "8 Key Dimensions"}
						</h2>
						<p className="text-base text-muted-foreground max-w-md mx-auto">
							{locale === "th"
								? "ครอบคลุมทุกด้านที่สำคัญต่อการจัดการด้านการผลิตของโรงงาน"
								: "Comprehensive coverage of every aspect critical to production management"}
						</p>
					</FadeIn>

					<StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" stagger={0.06}>
						{FEATURES.map((feat) => (
							<StaggerItem
								key={feat.key}
								className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
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
									<span className="text-base font-medium text-foreground">{t(feat.key)}</span>
								</div>
							</StaggerItem>
						))}
					</StaggerChildren>
				</div>
			</section>

			<TestimonialsSection locale={locale} />
			<ContactSection locale={locale} />

			<BottomCtaSection locale={locale} onCtaClick={() => setShowDialog(true)} ctaLabel={t("landing.ctaBottom")} />

			<SignInDialog open={showDialog} onOpenChange={setShowDialog} locale={locale} onSignIn={handleSignIn} />
		</div>
	);
}
