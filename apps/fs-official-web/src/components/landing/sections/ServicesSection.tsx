"use client";

import { StaggerChildren, StaggerItem } from "@/components/motion";
import { FadeIn } from "@/components/motion";
import { useLocale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// SERVICES data
// ---------------------------------------------------------------------------

interface Service {
	img: string;
	icon: React.ReactNode;
}

const SERVICES: Service[] = [
	{
		img: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&q=80&auto=format&fit=crop",
		icon: (
			<svg
				width="18"
				height="18"
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
		),
	},
	{
		img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&q=80&auto=format&fit=crop",
		icon: (
			<svg
				width="18"
				height="18"
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
		),
	},
	{
		img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80&auto=format&fit=crop",
		icon: (
			<svg
				width="18"
				height="18"
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
		),
	},
	{
		img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&auto=format&fit=crop",
		icon: (
			<svg
				width="18"
				height="18"
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
		),
	},
];

// Services content is hardcoded (TH/EN) because they are structural compound items
// kept close to the component rather than i18n keys for legibility of long descriptions
const SERVICES_CONTENT = {
	th: [
		{
			title: "ตรวจสุขภาพโรงงาน",
			desc: "ประเมินความพร้อม 8 มิติ โดยทีมวิศวกรผู้เชี่ยวชาญ พร้อมรายงานและแผนปรับปรุง",
			link: "ดูรายละเอียด →",
		},
		{
			title: "ตรวจประเมินระบบการผลิต",
			desc: "ตรวจสอบระบบการผลิต เครื่องจักร และกระบวนการ เพื่อเพิ่มประสิทธิภาพ",
			link: "ดูรายละเอียด →",
		},
		{
			title: "ที่ปรึกษาปรับปรุงประสิทธิภาพ",
			desc: "วิเคราะห์ปัญหา กำหนดแนวทาง และดำเนินการปรับปรุง ให้ผลลัพธ์ที่วัดได้",
			link: "ดูรายละเอียด →",
		},
		{
			title: "Digital Factory & Smart Dashboard",
			desc: "ระบบติดตาม KPI แบบออนไลน์ เชื่อมต่อข้อมูล วิเคราะห์ด้วย AI",
			link: "ดูรายละเอียด →",
		},
	],
	en: [
		{
			title: "Factory Health Check",
			desc: "8-dimension readiness assessment by specialist engineers, with report and improvement plan.",
			link: "View Details →",
		},
		{
			title: "Production System Assessment",
			desc: "Inspect production systems, machinery, and processes to improve efficiency.",
			link: "View Details →",
		},
		{
			title: "Efficiency Improvement Consulting",
			desc: "Analyze problems, define approaches, and drive measurable improvements.",
			link: "View Details →",
		},
		{
			title: "Digital Factory & Smart Dashboard",
			desc: "Online KPI tracking system, data integration, and AI-powered analytics.",
			link: "View Details →",
		},
	],
};

const SERVICE_SLUGS = [
	"factory-health-check",
	"production-assessment",
	"efficiency-consulting",
	"digital-factory",
];

// ---------------------------------------------------------------------------
// ServicesSection
// ---------------------------------------------------------------------------

export function ServicesSection() {
	const { t, locale } = useLocale();
	const cards = SERVICES_CONTENT[locale];

	return (
		<section id="services" className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<FadeIn>
					<div className="mb-8 text-center">
						<h2 className="relative mb-2 inline-block text-3xl font-extrabold text-slate-900 dark:text-white">
							{t("landing.services.title")}
							<span className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-blue-600" />
						</h2>
					</div>
				</FadeIn>

				<StaggerChildren className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{SERVICES.map((svc, i) => (
						<StaggerItem key={svc.img}>
							<div className="group flex h-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs transition-all hover:-translate-y-1 hover:shadow-lg dark:border-cyan-300/15 dark:bg-[#071b33] dark:shadow-none dark:hover:border-cyan-300/35">
								<div className="relative h-36">
									<img
										src={svc.img}
										alt=""
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
										loading="lazy"
									/>
									<div className="absolute inset-0 bg-linear-to-t from-slate-900/60 via-transparent to-transparent" />
									<div className="absolute -bottom-5 left-5 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-blue-700 text-white shadow-lg dark:border-[#071b33]">
										{svc.icon}
									</div>
								</div>
								<div className="flex flex-1 flex-col gap-2 p-5 pt-8">
									<h3 className="font-extrabold leading-snug text-slate-900 dark:text-white">
										{cards[i].title}
									</h3>
									<p className="text-slate-500 text-sm leading-relaxed flex-1 dark:text-slate-300">
										{cards[i].desc}
									</p>
									<a
										href={`/services/${SERVICE_SLUGS[i]}`}
										className="inline-flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-800 transition-colors mt-2 dark:text-cyan-300 dark:hover:text-cyan-200"
									>
										{cards[i].link}
									</a>
								</div>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>
		</section>
	);
}
