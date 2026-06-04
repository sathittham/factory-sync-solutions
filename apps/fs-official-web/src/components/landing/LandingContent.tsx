"use client";

import { useState, useCallback, useEffect } from "react";
import { LocaleProvider, useLocale, type Locale } from "@/lib/i18n";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
	try {
		const stored = localStorage.getItem("fss-theme");
		if (stored === "dark" || stored === "light") return stored;
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} catch {
		return "light";
	}
}

function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);

	const setTheme = useCallback((t: Theme) => {
		setThemeState(t);
		try {
			localStorage.setItem("fss-theme", t);
			document.documentElement.classList.toggle("dark", t === "dark");
		} catch {}
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	return { theme, setTheme };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HERO_IMG =
	"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80&auto=format&fit=crop";

interface Feature {
	key: string;
	img: string;
	icon: React.ReactNode;
}

const FEATURES: Feature[] = [
	{
		key: "landing.dim.basic",
		img: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
			</svg>
		),
	},
	{
		key: "landing.dim.improvement",
		img: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
			</svg>
		),
	},
	{
		key: "landing.dim.coordination",
		img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
		),
	},
	{
		key: "landing.dim.maintenance",
		img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
		),
	},
	{
		key: "landing.dim.quality",
		img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22 4 12 14.01 9 11.01" />
			</svg>
		),
	},
	{
		key: "landing.dim.production",
		img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
			</svg>
		),
	},
	{
		key: "landing.dim.material",
		img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<rect x="1" y="3" width="15" height="13" rx="1" />
				<path d="M16 8h4l3 3v5h-7V8z" />
				<circle cx="5.5" cy="18.5" r="2.5" />
				<circle cx="18.5" cy="18.5" r="2.5" />
			</svg>
		),
	},
	{
		key: "landing.dim.cost",
		img: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=400&q=70&auto=format&fit=crop",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<line x1="12" y1="1" x2="12" y2="23" />
				<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
			</svg>
		),
	},
];

interface Testimonial {
	name: string;
	role: string;
	quote: string;
}

const TESTIMONIALS: Record<Locale, Testimonial[]> = {
	th: [
		{ name: "สมชาย ว.", role: "ผู้จัดการโรงงาน, อุตสาหกรรมอาหาร", quote: "ผลประเมินช่วยให้เราเห็นจุดอ่อนที่ไม่เคยสังเกตมาก่อน ปรับปรุงได้ตรงจุดทันที" },
		{ name: "วิภา ส.", role: "ผู้อำนวยการฝ่ายผลิต, อิเล็กทรอนิกส์", quote: "ใช้เวลาแค่ 10 นาที แต่ได้ข้อมูลเชิงลึกที่นำไปวางแผนพัฒนาโรงงานได้จริง" },
		{ name: "ประเสริฐ ก.", role: "เจ้าของกิจการ SME, พลาสติก", quote: "เปรียบเทียบคะแนนกับค่าเฉลี่ยอุตสาหกรรมได้ ทำให้รู้ว่าเราอยู่ตรงไหน" },
	],
	en: [
		{ name: "Somchai W.", role: "Factory Manager, Food Industry", quote: "The assessment helped us identify blind spots we never noticed. We improved immediately." },
		{ name: "Wipa S.", role: "Production Director, Electronics", quote: "Just 10 minutes for deep insights that we actually used for factory development planning." },
		{ name: "Prasert K.", role: "SME Owner, Plastics", quote: "Being able to compare scores with industry averages showed us exactly where we stand." },
	],
};

interface Step {
	number: string;
	label: string;
	detail: string;
}

const STEPS: Record<Locale, Step[]> = {
	th: [
		{ number: "01", label: "ลงทะเบียน", detail: "สร้างบัญชีฟรีในไม่กี่วินาที" },
		{ number: "02", label: "ทำแบบประเมิน", detail: "43 ข้อ ใน 8 มิติ ใช้เวลาประมาณ 15 นาที" },
		{ number: "03", label: "รับผลวิเคราะห์", detail: "รายงานเชิงลึกพร้อมคำแนะนำเฉพาะทาง" },
	],
	en: [
		{ number: "01", label: "Register", detail: "Create a free account in seconds" },
		{ number: "02", label: "Take Assessment", detail: "43 questions across 8 dimensions, ~15 minutes" },
		{ number: "03", label: "Get Insights", detail: "In-depth report with targeted recommendations" },
	],
};

// ---------------------------------------------------------------------------
// Nav bar
// ---------------------------------------------------------------------------

function SunIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
			<circle cx="12" cy="12" r="5" />
			<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	);
}

function NavBar({ appUrl, theme, setTheme }: { appUrl: string; theme: Theme; setTheme: (t: Theme) => void }) {
	const { locale, setLocale, t } = useLocale();

	return (
		<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between gap-4">
				{/* Logo */}
				<a href="/" className="flex items-center gap-2 font-bold text-foreground shrink-0">
					<div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-primary-foreground" aria-hidden="true">
							<path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
							<path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
						</svg>
					</div>
					<span className="hidden sm:inline">FactorySync Solutions</span>
					<span className="sm:hidden">FS</span>
				</a>

				{/* Controls */}
				<div className="flex items-center gap-2">
					{/* Locale toggle */}
					<div className="flex rounded-md border bg-background overflow-hidden text-xs font-medium">
						<button
							type="button"
							onClick={() => setLocale("th")}
							className={cn(
								"px-3 py-1.5 transition-colors",
								locale === "th" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							TH
						</button>
						<button
							type="button"
							onClick={() => setLocale("en")}
							className={cn(
								"px-3 py-1.5 transition-colors",
								locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							EN
						</button>
					</div>

					{/* Theme toggle */}
					<button
						type="button"
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						aria-label="Toggle theme"
						className="h-8 w-8 flex items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
					>
						{theme === "dark" ? <SunIcon /> : <MoonIcon />}
					</button>

					{/* Sign in */}
					<a
						href={appUrl}
						className={cn(buttonVariants({ size: "sm" }), "text-xs h-8 px-4")}
					>
						{t("nav.signIn")}
					</a>
				</div>
			</div>
		</header>
	);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function HeroSection({ appUrl }: { appUrl: string }) {
	const { t, locale } = useLocale();

	return (
		<section className="relative min-h-[580px] flex items-center justify-center overflow-hidden bg-slate-900">
			<div className="absolute inset-0">
				<img src={HERO_IMG} alt="" className="w-full h-full object-cover opacity-25" loading="eager" />
				<div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80" />
			</div>

			<div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center text-white py-20">
				<FadeIn delay={0}>
					<span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/80 text-primary-foreground text-sm font-semibold tracking-wide">
						{t("landing.badge")}
					</span>
				</FadeIn>

				<FadeIn delay={0.08}>
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
						{t("landing.title")}
					</h1>
				</FadeIn>

				<FadeIn delay={0.16}>
					<p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
						{t("landing.subtitle")}
					</p>
				</FadeIn>

				<FadeIn delay={0.24}>
					<div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
						<a
							href={appUrl}
							className={cn(buttonVariants({ size: "lg" }), "text-base px-8 py-3 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform")}
						>
							{t("landing.cta")}
						</a>
						<span className="text-white/60 text-sm">{t("landing.free")}</span>
					</div>
				</FadeIn>

				<FadeIn delay={0.36}>
					<div className="mt-12 flex flex-wrap justify-center gap-6 sm:gap-10">
						{[
							{ value: "43", label: locale === "th" ? "คำถาม" : "Questions" },
							{ value: "8", label: locale === "th" ? "มิติ" : "Dimensions" },
							{ value: "15 min", label: locale === "th" ? "ใช้เวลา" : "Duration" },
							{ value: "100%", label: locale === "th" ? "ฟรี" : "Free" },
						].map((stat) => (
							<div key={stat.label} className="text-center">
								<div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
								<div className="text-white/60 text-sm mt-0.5">{stat.label}</div>
							</div>
						))}
					</div>
				</FadeIn>
			</div>
		</section>
	);
}

function HowItWorksSection({ locale }: { locale: Locale }) {
	const { t } = useLocale();
	const steps = STEPS[locale];

	return (
		<section className="py-20 bg-muted/40">
			<div className="max-w-5xl mx-auto px-4 sm:px-6">
				<FadeIn>
					<h2 className="text-3xl font-bold text-center mb-14">{t("landing.howItWorks")}</h2>
				</FadeIn>
				<StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-8">
					{steps.map((step) => (
						<StaggerItem key={step.number}>
							<div className="flex flex-col items-center text-center p-6 rounded-2xl bg-background border shadow-sm">
								<div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mb-4">
									{step.number}
								</div>
								<h3 className="text-lg font-semibold mb-2">{step.label}</h3>
								<p className="text-muted-foreground text-sm">{step.detail}</p>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>
		</section>
	);
}

function DimensionsSection() {
	const { t } = useLocale();

	return (
		<section className="py-20">
			<div className="max-w-6xl mx-auto px-4 sm:px-6">
				<FadeIn>
					<div className="text-center mb-14">
						<h2 className="text-3xl font-bold mb-3">{t("landing.dims.title")}</h2>
						<p className="text-muted-foreground max-w-xl mx-auto">{t("landing.dims.subtitle")}</p>
					</div>
				</FadeIn>
				<StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
					{FEATURES.map((feature) => (
						<StaggerItem key={feature.key}>
							<div className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow bg-background">
								<div className="relative h-36">
									<img src={feature.img} alt="" className="w-full h-full object-cover" loading="lazy" />
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
									<div className="absolute bottom-3 left-3 p-2 rounded-lg bg-primary/90 text-primary-foreground">
										{feature.icon}
									</div>
								</div>
								<div className="px-4 py-3">
									<p className="font-semibold text-sm leading-snug">{t(feature.key)}</p>
								</div>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>
		</section>
	);
}

function TestimonialsSection({ locale }: { locale: Locale }) {
	const { t } = useLocale();
	const testimonials = TESTIMONIALS[locale];

	return (
		<section className="py-20 bg-muted/40">
			<div className="max-w-5xl mx-auto px-4 sm:px-6">
				<FadeIn>
					<h2 className="text-3xl font-bold text-center mb-14">{t("landing.testimonials.title")}</h2>
				</FadeIn>
				<StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-6">
					{testimonials.map((testimonial) => (
						<StaggerItem key={testimonial.name}>
							<div className="bg-background rounded-2xl border shadow-sm p-6 flex flex-col gap-4 h-full">
								<div className="flex-1">
									<svg width="28" height="20" viewBox="0 0 28 20" fill="none" className="text-primary/30 mb-3" aria-hidden="true">
										<path d="M0 20V12C0 5.373 4.477 1.12 13.43 0L14 1.867C9.827 2.72 7.04 4.8 5.64 8.107H11V20H0zm17 0V12C17 5.373 21.477 1.12 30.43 0L31 1.867C26.827 2.72 24.04 4.8 22.64 8.107H28V20H17z" fill="currentColor" />
									</svg>
									<p className="text-muted-foreground leading-relaxed">{testimonial.quote}</p>
								</div>
								<div className="border-t pt-4">
									<p className="font-semibold">{testimonial.name}</p>
									<p className="text-sm text-muted-foreground">{testimonial.role}</p>
								</div>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>
		</section>
	);
}

function ContactSection() {
	const { t } = useLocale();

	return (
		<section className="py-20">
			<div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
				<FadeIn>
					<h2 className="text-3xl font-bold mb-4">{t("landing.contact.title")}</h2>
					<p className="text-muted-foreground mb-10">{t("landing.contact.subtitle")}</p>
				</FadeIn>
				<FadeIn delay={0.1}>
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<a
							href="https://lin.ee/rWwdF9q"
							target="_blank"
							rel="noopener noreferrer"
							className={cn(buttonVariants({ variant: "default", size: "lg" }), "rounded-full gap-2")}
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
							</svg>
							{t("landing.contact.line")}
						</a>
						<span className="text-muted-foreground text-sm">
							{t("landing.contact.or")}
							<a href="mailto:contact@stm23.com" className="text-primary hover:underline ml-1">
								contact@stm23.com
							</a>
						</span>
					</div>
				</FadeIn>
			</div>
		</section>
	);
}

function BottomCtaSection({ appUrl }: { appUrl: string }) {
	const { t } = useLocale();

	return (
		<section className="py-24 bg-slate-900 text-white">
			<div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
				<FadeIn>
					<h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("landing.bottomCta.title")}</h2>
					<p className="text-white/70 text-lg mb-10">{t("landing.bottomCta.subtitle")}</p>
					<a
						href={appUrl}
						className={cn(buttonVariants({ size: "lg" }), "text-base px-10 py-3 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform")}
					>
						{t("landing.ctaBottom")}
					</a>
					<p className="mt-4 text-white/50 text-sm">{t("landing.free")}</p>
				</FadeIn>
			</div>
		</section>
	);
}

const LINE_ICON = (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#06C755] flex-shrink-0" aria-hidden="true">
		<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
	</svg>
);

const SEP = <span className="text-border">|</span>;

function Footer({ version }: { version: string }) {
	const { t } = useLocale();

	return (
		<footer className="border-t py-5">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-3 text-xs text-muted-foreground">
				{/* LINE contact row */}
				<div className="flex items-center gap-2">
					<span>{t("footer.contact")}:</span>
					<a
						href="https://lin.ee/rWwdF9q"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
					>
						{LINE_ICON}
						Line @STM23
					</a>
				</div>

				{/* Branding + legal links row */}
				<div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2">
					<span>{t("footer.copyright")}</span>
					<div className="flex items-center gap-2 flex-wrap justify-center">
						<a href="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</a>
						{SEP}
						<a href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a>
						{SEP}
						<a href="/cookies" className="hover:text-foreground transition-colors">{t("footer.cookiePolicy")}</a>
						{SEP}
						<a href="/marketing" className="hover:text-foreground transition-colors">{t("footer.marketing")}</a>
						{SEP}
						<a href="/cookie-settings" className="hover:text-foreground transition-colors">{t("footer.cookies")}</a>
						{SEP}
						<span className="font-mono text-[10px]">{version}</span>
					</div>
				</div>
			</div>
		</footer>
	);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function LandingInner({ appUrl, version }: { appUrl: string; version: string }) {
	const { locale } = useLocale();
	const { theme, setTheme } = useTheme();

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			<NavBar appUrl={appUrl} theme={theme} setTheme={setTheme} />
			<main className="flex-1">
				<HeroSection appUrl={appUrl} />
				<HowItWorksSection locale={locale} />
				<DimensionsSection />
				<TestimonialsSection locale={locale} />
				<ContactSection />
				<BottomCtaSection appUrl={appUrl} />
			</main>
			<Footer version={version} />
		</div>
	);
}

export interface LandingContentProps {
	appUrl: string;
	version: string;
}

export function LandingContent({ appUrl, version }: LandingContentProps) {
	return (
		<LocaleProvider>
			<LandingInner appUrl={appUrl} version={version} />
		</LocaleProvider>
	);
}
