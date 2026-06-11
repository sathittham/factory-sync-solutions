"use client";

import {
	LocaleSwitcher,
	LogoIcon,
	type ResolvedTheme,
	SiteFooter,
	type Theme,
	ThemeSwitcher,
	useTheme,
} from "@/components/site/chrome";
import { buttonVariants } from "@/components/ui/button";
import { type Locale, LocaleProvider, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ServiceSlug =
	| "factory-health-check"
	| "production-assessment"
	| "efficiency-consulting"
	| "digital-factory";

// ---------------------------------------------------------------------------
// NavBar — shared chrome with the landing page
// ---------------------------------------------------------------------------

function NavBar({
	appUrl,
	theme,
	setTheme,
	resolvedTheme,
}: {
	appUrl: string;
	theme: Theme;
	setTheme: (t: Theme) => void;
	resolvedTheme: ResolvedTheme;
}) {
	const { t } = useLocale();
	return (
		<header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur-sm dark:border-cyan-300/10 dark:bg-[#041225]/95 dark:text-white">
			<div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
				<a
					href="/"
					className="flex items-center gap-2 font-bold text-slate-950 shrink-0 dark:text-white"
				>
					<LogoIcon theme={resolvedTheme} />
					<span className="hidden text-lg leading-tight sm:inline">
						FactorySync
						<span className="block text-sm font-extrabold text-cyan-400 -mt-1">Solutions</span>
					</span>
					<span className="font-bold text-slate-950 sm:hidden dark:text-white">FS</span>
				</a>
				<div className="flex items-center gap-2 shrink-0">
					<LocaleSwitcher />
					<ThemeSwitcher theme={theme} setTheme={setTheme} />
					<a
						href={appUrl}
						className={cn(
							buttonVariants({ size: "sm" }),
							"rounded-md bg-blue-600 px-4 text-xs text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:bg-blue-500 xl:px-7 xl:text-sm"
						)}
					>
						{t("nav.signIn")}
					</a>
				</div>
			</div>
		</header>
	);
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="shrink-0"
			aria-hidden="true"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

function ArrowRightIcon() {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	);
}

const HEALTH_ICON = (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
		<polyline points="22 4 12 14.01 9 11.01" />
	</svg>
);

const PRODUCTION_ICON = (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<rect x="2" y="7" width="20" height="14" rx="2" />
		<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
	</svg>
);

const CONSULTING_ICON = (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
	</svg>
);

const DIGITAL_ICON = (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<rect x="2" y="3" width="20" height="14" rx="2" />
		<polyline points="8 21 12 17 16 21" />
	</svg>
);

// ---------------------------------------------------------------------------
// Service content (TH / EN)
// ---------------------------------------------------------------------------

interface ServiceCopy {
	title: string;
	tagline: string;
	overview: string;
	featuresTitle: string;
	features: string[];
	processTitle: string;
	process: Array<{ step: string; detail: string }>;
}

interface ServiceDetail {
	img: string;
	icon: React.ReactNode;
	th: ServiceCopy;
	en: ServiceCopy;
}

export const SERVICE_ORDER: ServiceSlug[] = [
	"factory-health-check",
	"production-assessment",
	"efficiency-consulting",
	"digital-factory",
];

const SERVICE_DETAILS: Record<ServiceSlug, ServiceDetail> = {
	"factory-health-check": {
		img: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1600&q=80&auto=format&fit=crop",
		icon: HEALTH_ICON,
		th: {
			title: "ตรวจสุขภาพโรงงาน",
			tagline: "ประเมินความพร้อมโรงงานครบ 8 มิติ โดยทีมวุฒิวิศวกร พร้อมรายงานเชิงลึกและแผนปรับปรุง",
			overview:
				"บริการตรวจสุขภาพโรงงานช่วยให้คุณเห็นภาพรวมความพร้อมด้านการดำเนินงานอย่างเป็นระบบ ครอบคลุม 8 มิติหลัก ตั้งแต่การจัดการเบื้องต้น คุณภาพ การผลิต ไปจนถึงต้นทุน วิเคราะห์ด้วย AI และตรวจสอบโดยวุฒิวิศวกร เพื่อให้คุณได้แผนปรับปรุงที่ทำได้จริง",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ประเมินครบ 8 มิติ พร้อมคะแนนรายมิติ",
				"รายงานเชิงลึกพร้อมจุดแข็งและจุดที่ต้องปรับปรุง",
				"เปรียบเทียบกับเกณฑ์มาตรฐานอุตสาหกรรม",
				"แผนปรับปรุงที่จัดลำดับความสำคัญ",
				"ตรวจสอบและรับรองโดยวุฒิวิศวกร",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ลงทะเบียน", detail: "กรอกข้อมูลโรงงานเพื่อเริ่มประเมิน" },
				{ step: "ทำแบบประเมิน", detail: "ตอบ 43 ข้อ ใช้เวลาประมาณ 15 นาที" },
				{ step: "วิเคราะห์", detail: "AI วิเคราะห์ข้อมูลและตรวจสอบโดยวุฒิวิศวกร" },
				{ step: "รับรายงาน", detail: "รายงานเชิงลึกพร้อมแผนปรับปรุงที่ปฏิบัติได้จริง" },
			],
		},
		en: {
			title: "Factory Health Check",
			tagline:
				"A full 8-dimension factory readiness assessment by licensed engineers, with an in-depth report and improvement plan.",
			overview:
				"The Factory Health Check gives you a systematic view of your operational readiness across 8 key dimensions — from basic management and quality to production and cost. Powered by AI and verified by licensed engineers, you receive an improvement plan you can actually act on.",
			featuresTitle: "What you get",
			features: [
				"Assessment across all 8 dimensions with per-dimension scoring",
				"In-depth report with strengths and improvement areas",
				"Benchmarking against industry standards",
				"A prioritized improvement roadmap",
				"Reviewed and certified by a licensed engineer",
			],
			processTitle: "How it works",
			process: [
				{ step: "Register", detail: "Fill in factory details to begin the assessment" },
				{ step: "Take assessment", detail: "Answer 43 questions in about 15 minutes" },
				{ step: "Analysis", detail: "AI analyses the data, reviewed by a licensed engineer" },
				{ step: "Receive report", detail: "An in-depth report with a practical improvement plan" },
			],
		},
	},
	"production-assessment": {
		img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1600&q=80&auto=format&fit=crop",
		icon: PRODUCTION_ICON,
		th: {
			title: "ตรวจประเมินระบบการผลิต",
			tagline: "ตรวจสอบระบบการผลิต เครื่องจักร และกระบวนการ เพื่อเพิ่มประสิทธิภาพและลดของเสีย",
			overview:
				"เราเข้าตรวจประเมินสายการผลิต เครื่องจักร และกระบวนการทำงานจริงในโรงงาน เพื่อค้นหาคอขวด จุดสูญเสีย และโอกาสในการเพิ่มประสิทธิภาพ พร้อมข้อเสนอแนะเชิงปฏิบัติจากทีมวิศวกรผู้เชี่ยวชาญ",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"วิเคราะห์ประสิทธิผลโดยรวมของเครื่องจักร (OEE)",
				"ค้นหาคอขวดและจุดสูญเสียในสายการผลิต",
				"ประเมินการบำรุงรักษาและความน่าเชื่อถือ (MTBF)",
				"ข้อเสนอแนะลดของเสียและเพิ่มผลผลิต",
				"รายงานพร้อมตัวชี้วัดที่วัดผลได้",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจหน้างาน", detail: "เก็บข้อมูลการผลิตและสังเกตการณ์จริง" },
				{ step: "วิเคราะห์", detail: "ประเมิน OEE และกระบวนการผลิต" },
				{ step: "ระบุโอกาส", detail: "ค้นหาคอขวดและโอกาสในการปรับปรุง" },
				{ step: "นำเสนอ", detail: "รายงานและแผนดำเนินการพร้อมตัวชี้วัด" },
			],
		},
		en: {
			title: "Production System Assessment",
			tagline:
				"Inspect production systems, machinery, and processes to improve efficiency and reduce waste.",
			overview:
				"We assess your production lines, machinery, and real working processes on the floor to find bottlenecks, losses, and opportunities to improve efficiency — with practical recommendations from our specialist engineers.",
			featuresTitle: "What you get",
			features: [
				"Overall Equipment Effectiveness (OEE) analysis",
				"Identification of bottlenecks and losses on the line",
				"Maintenance and reliability assessment (MTBF)",
				"Recommendations to cut waste and raise output",
				"A report with measurable KPIs",
			],
			processTitle: "How it works",
			process: [
				{ step: "Site survey", detail: "Collect production data and observe operations" },
				{ step: "Analysis", detail: "Evaluate OEE and production processes" },
				{ step: "Identify opportunities", detail: "Pinpoint bottlenecks and improvement areas" },
				{ step: "Present", detail: "Report and action plan with measurable KPIs" },
			],
		},
	},
	"efficiency-consulting": {
		img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1600&q=80&auto=format&fit=crop",
		icon: CONSULTING_ICON,
		th: {
			title: "ที่ปรึกษาปรับปรุงประสิทธิภาพ",
			tagline: "วิเคราะห์ปัญหา กำหนดแนวทาง และดำเนินการปรับปรุง ให้ผลลัพธ์ที่วัดได้",
			overview:
				"บริการที่ปรึกษาแบบครบวงจร ตั้งแต่วิเคราะห์ต้นตอของปัญหา ออกแบบแนวทางปรับปรุง ไปจนถึงลงมือดำเนินการร่วมกับทีมของคุณ ด้วยหลักการ Lean และการปรับปรุงอย่างต่อเนื่อง เพื่อผลลัพธ์ที่ยั่งยืน",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"วิเคราะห์ต้นตอของปัญหา (Root Cause Analysis)",
				"ออกแบบแนวทางปรับปรุงด้วยหลัก Lean",
				"ลงมือดำเนินการร่วมกับทีมหน้างาน",
				"ติดตามผลและปรับแผนอย่างต่อเนื่อง",
				"ถ่ายทอดความรู้ให้ทีมของคุณ",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ประเมินสถานการณ์", detail: "วิเคราะห์ปัญหาและตั้งเป้าหมายร่วมกัน" },
				{ step: "ออกแบบแผน", detail: "กำหนดแนวทางปรับปรุงที่เหมาะกับองค์กร" },
				{ step: "ดำเนินการ", detail: "ลงมือปรับปรุงและทดลองร่วมกับทีม" },
				{ step: "ขยายผล", detail: "วัดผลและขยายผลทั่วทั้งองค์กร" },
			],
		},
		en: {
			title: "Efficiency Improvement Consulting",
			tagline:
				"Analyze problems, define the approach, and drive improvements with measurable results.",
			overview:
				"End-to-end consulting — from root-cause analysis and designing the improvement approach to implementing it alongside your team. Built on Lean and continuous-improvement principles for results that last.",
			featuresTitle: "What you get",
			features: [
				"Root-cause analysis of your problems",
				"An improvement approach designed with Lean principles",
				"Hands-on implementation with your floor team",
				"Ongoing tracking and plan adjustment",
				"Knowledge transfer to your team",
			],
			processTitle: "How it works",
			process: [
				{ step: "Assess", detail: "Analyze problems and set goals together" },
				{ step: "Design plan", detail: "Define an improvement approach that fits you" },
				{ step: "Implement", detail: "Drive and pilot improvements with the team" },
				{ step: "Scale", detail: "Measure results and roll out across the organization" },
			],
		},
	},
	"digital-factory": {
		img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80&auto=format&fit=crop",
		icon: DIGITAL_ICON,
		th: {
			title: "Digital Factory & Smart Dashboard",
			tagline: "ระบบติดตาม KPI แบบออนไลน์ เชื่อมต่อข้อมูล วิเคราะห์ด้วย AI",
			overview:
				"ยกระดับโรงงานสู่ดิจิทัลด้วยแดชบอร์ดติดตาม KPI แบบเรียลไทม์ เชื่อมต่อข้อมูลจากเครื่องจักรและระบบต่างๆ พร้อมการวิเคราะห์ด้วย AI เพื่อการตัดสินใจที่รวดเร็วและแม่นยำ",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"แดชบอร์ดติดตาม KPI แบบเรียลไทม์",
				"เชื่อมต่อข้อมูลจากเครื่องจักรและ IoT",
				"วิเคราะห์แนวโน้มและแจ้งเตือนอัตโนมัติด้วย AI",
				"รายงานอัตโนมัติสำหรับผู้บริหาร",
				"เข้าถึงได้ทุกที่ทุกเวลาผ่านเว็บและมือถือ",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจความต้องการ", detail: "ระบุ KPI และแหล่งข้อมูลที่ต้องเชื่อมต่อ" },
				{ step: "เชื่อมต่อระบบ", detail: "ออกแบบและเชื่อมต่อข้อมูลจากเครื่องจักร" },
				{ step: "ตั้งค่าแดชบอร์ด", detail: "สร้างแดชบอร์ดและตัวชี้วัดตามที่ต้องการ" },
				{ step: "ดูแลต่อเนื่อง", detail: "อบรมการใช้งานและดูแลระบบอย่างต่อเนื่อง" },
			],
		},
		en: {
			title: "Digital Factory & Smart Dashboard",
			tagline: "Online KPI tracking, data integration, and AI-powered analytics.",
			overview:
				"Take your factory digital with a real-time KPI dashboard that connects data from machines and systems, paired with AI analytics for faster, more accurate decisions.",
			featuresTitle: "What you get",
			features: [
				"Real-time KPI tracking dashboard",
				"Data integration from machines and IoT",
				"AI trend analysis and automatic alerts",
				"Automated reports for management",
				"Access anywhere, anytime on web and mobile",
			],
			processTitle: "How it works",
			process: [
				{ step: "Discover", detail: "Identify KPIs and data sources to connect" },
				{ step: "Integrate", detail: "Design and connect data from machines" },
				{ step: "Configure", detail: "Build the dashboards and metrics you need" },
				{ step: "Support", detail: "Train your team and maintain the system" },
			],
		},
	},
};

// ---------------------------------------------------------------------------
// Inner + root
// ---------------------------------------------------------------------------

function ServiceInner({
	slug,
	appUrl,
	version,
}: {
	slug: ServiceSlug;
	appUrl: string;
	version: string;
}) {
	const { locale, t } = useLocale();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const data = SERVICE_DETAILS[slug];
	const copy = data[locale];
	const servicesLabel = locale === "th" ? "บริการของเรา" : "Our Services";
	const related = SERVICE_ORDER.filter((s) => s !== slug);

	return (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<NavBar appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />

			<main className="flex-1">
				{/* Hero */}
				<section className="relative overflow-hidden border-b border-slate-200 bg-sky-50 dark:border-cyan-300/10 dark:bg-[#041225]">
					<div className="absolute inset-0">
						<img
							src={data.img}
							alt=""
							className="h-full w-full object-cover opacity-30 dark:opacity-40"
							loading="eager"
						/>
						<div className="absolute inset-0 bg-[linear-gradient(90deg,#f8fafc_0%,rgba(248,250,252,0.9)_45%,rgba(240,249,255,0.5)_100%)] dark:bg-[linear-gradient(90deg,#041225_0%,rgba(4,18,37,0.9)_45%,rgba(4,18,37,0.55)_100%)]" />
					</div>
					<div className="relative mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-16">
						<nav
							className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
							aria-label="Breadcrumb"
						>
							<a href="/" className="transition-colors hover:text-slate-900 dark:hover:text-white">
								{t("nav.home")}
							</a>
							<span aria-hidden="true">/</span>
							<a
								href="/#services"
								className="transition-colors hover:text-slate-900 dark:hover:text-white"
							>
								{servicesLabel}
							</a>
							<span aria-hidden="true">/</span>
							<span className="text-slate-700 dark:text-slate-200">{copy.title}</span>
						</nav>

						<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_0_28px_rgba(37,99,235,0.4)]">
							{data.icon}
						</div>
						<h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
							{copy.title}
						</h1>
						<p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
							{copy.tagline}
						</p>
						<div className="mt-7 flex flex-wrap gap-3">
							<a
								href={appUrl}
								className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-7 font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.5)] transition-colors hover:bg-blue-500"
							>
								{locale === "th" ? "เริ่มประเมินฟรี" : "Start Free Assessment"}
								<ArrowRightIcon />
							</a>
							<a
								href="/#contact"
								className="inline-flex h-11 items-center gap-2 rounded-md border border-blue-200 bg-white/75 px-7 font-medium text-slate-900 transition-colors hover:bg-white dark:border-cyan-300/35 dark:bg-[#06172d]/45 dark:text-white dark:hover:bg-white/10"
							>
								{locale === "th" ? "ขอคำปรึกษา" : "Request a consultation"}
							</a>
						</div>
					</div>
				</section>

				{/* Overview */}
				<section className="bg-white py-12 dark:bg-[#041225]">
					<div className="mx-auto max-w-[820px] px-4 sm:px-6">
						<h2 className="mb-3 text-2xl font-extrabold text-slate-950 dark:text-white">
							{locale === "th" ? "ภาพรวมบริการ" : "Overview"}
						</h2>
						<p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
							{copy.overview}
						</p>
					</div>
				</section>

				{/* Features */}
				<section className="border-y border-sky-200 bg-sky-50 py-12 dark:border-cyan-300/10 dark:bg-[#06172d]">
					<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
						<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
							{copy.featuresTitle}
						</h2>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{copy.features.map((feature) => (
								<div
									key={feature}
									className="flex items-start gap-3 rounded-md border border-sky-200 bg-white p-4 shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33]"
								>
									<span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:bg-cyan-300/10 dark:text-cyan-300">
										<CheckIcon />
									</span>
									<p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
										{feature}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Process */}
				<section className="bg-white py-12 dark:bg-[#041225]">
					<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
						<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
							{copy.processTitle}
						</h2>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{copy.process.map((item, index) => (
								<div
									key={item.step}
									className="rounded-md border border-sky-200 bg-white p-5 shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33]"
								>
									<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
										{String(index + 1).padStart(2, "0")}
									</div>
									<h3 className="mb-1 font-bold text-slate-900 dark:text-white">{item.step}</h3>
									<p className="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
										{item.detail}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Related services */}
				<section className="border-t border-sky-200 bg-sky-50 py-12 dark:border-cyan-300/10 dark:bg-[#06172d]">
					<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
						<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
							{locale === "th" ? "บริการอื่นๆ" : "Other services"}
						</h2>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							{related.map((s) => {
								const r = SERVICE_DETAILS[s][locale];
								return (
									<a
										key={s}
										href={`/services/${s}`}
										className="group flex items-center justify-between gap-3 rounded-md border border-sky-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-300/15 dark:bg-[#071b33] dark:hover:border-cyan-300/35"
									>
										<span className="flex items-center gap-3">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
												{SERVICE_DETAILS[s].icon}
											</span>
											<span className="text-sm font-semibold text-slate-900 dark:text-white">
												{r.title}
											</span>
										</span>
										<span className="text-blue-600 transition-transform group-hover:translate-x-1 dark:text-cyan-300">
											<ArrowRightIcon />
										</span>
									</a>
								);
							})}
						</div>
					</div>
				</section>

				{/* Bottom CTA */}
				<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
					<div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 rounded-md border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
						<div>
							<h2 className="text-2xl font-extrabold sm:text-3xl">
								{locale === "th"
									? "พร้อมยกระดับโรงงานของคุณแล้วหรือยัง?"
									: "Ready to level up your factory?"}
							</h2>
							<p className="mt-1 text-sm text-cyan-100">
								{locale === "th" ? "เริ่มต้นวันนี้ เพื่อผลลัพธ์ที่ดีกว่าเดิม" : "Start today for better results."}
							</p>
						</div>
						<a
							href={appUrl}
							className={cn(
								buttonVariants({ size: "lg" }),
								"shrink-0 bg-blue-600 px-10 text-base text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] hover:bg-blue-500"
							)}
						>
							{locale === "th" ? "เริ่มประเมินฟรีเลย" : "Start Free Assessment"}
						</a>
					</div>
				</section>
			</main>

			<SiteFooter version={version} resolvedTheme={resolvedTheme} />
		</div>
	);
}

export function getServiceTitle(slug: ServiceSlug, locale: "th" | "en" = "th"): string {
	return SERVICE_DETAILS[slug][locale].title;
}

export function getServiceTagline(slug: ServiceSlug, locale: "th" | "en" = "th"): string {
	return SERVICE_DETAILS[slug][locale].tagline;
}

export interface ServiceContentProps {
	slug: ServiceSlug;
	appUrl: string;
	version: string;
}

export function ServiceContent({ slug, appUrl, version }: ServiceContentProps) {
	return (
		<LocaleProvider>
			<ServiceInner slug={slug} appUrl={appUrl} version={version} />
		</LocaleProvider>
	);
}
