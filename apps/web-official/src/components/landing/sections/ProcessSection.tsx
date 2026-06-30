"use client";

import { FadeIn } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PROCESS_STEPS = {
	th: [
		{
			number: "01",
			label: "ลงทะเบียน",
			detail: "กรอกข้อมูลโรงงานเพื่อเริ่มประเมิน",
		},
		{
			number: "02",
			label: "ทำแบบประเมิน",
			detail: "ตอบ 43 ข้อ ใช้เวลาประมาณ 15 นาที",
		},
		{
			number: "03",
			label: "วิเคราะห์โดย AI + ผู้เชี่ยวชาญ",
			detail: "AI วิเคราะห์ข้อมูล ตรวจสอบโดยวุฒิวิศวกร",
		},
		{
			number: "04",
			label: "รับรายงานและแผนปรับปรุง",
			detail: "รายงานเชิงลึก พร้อมแผนที่ปฏิบัติได้จริง",
		},
	],
	en: [
		{
			number: "01",
			label: "Register",
			detail: "Fill in factory details to begin the assessment",
		},
		{
			number: "02",
			label: "Take Assessment",
			detail: "Answer 43 questions in approximately 15 minutes",
		},
		{
			number: "03",
			label: "AI + Expert Analysis",
			detail: "AI analyses data, reviewed by a licensed engineer",
		},
		{
			number: "04",
			label: "Receive Report & Action Plan",
			detail: "In-depth report with a practical improvement roadmap",
		},
	],
};

export function ProcessSection() {
	const { t, locale } = useLocale();
	const steps = PROCESS_STEPS[locale];

	return (
		<section
			id="process"
			className="border-y border-slate-200 bg-slate-50 py-12 dark:border-cyan-300/15 dark:bg-[#06172d]"
		>
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<FadeIn>
					<h2 className="mb-10 text-3xl font-extrabold text-slate-900 dark:text-white">
						{t("landing.process.title")}
					</h2>
				</FadeIn>

				<div className="grid gap-8 lg:grid-cols-[1fr_330px] lg:items-center">
					{/* Left — steps */}
					<div className="min-w-0">
						<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
							{steps.map((step, i) => (
								<FadeIn key={step.number} delay={i * 0.08}>
									<div className="relative">
										{i < steps.length - 1 && (
											<div
												className="absolute left-10 top-5 hidden w-[calc(100%+1.25rem)] border-t-2 border-dashed border-blue-300 lg:block"
												aria-hidden="true"
											/>
										)}
										<div className="relative z-10 mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.28)]">
											{i + 1}
										</div>
										<h3 className="mb-1 font-extrabold text-slate-900 dark:text-white">
											{step.label}
										</h3>
										<p className="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
											{step.detail}
										</p>
									</div>
								</FadeIn>
							))}
						</div>
					</div>

					{/* Right — report thumbnail */}
					<FadeIn delay={0.2}>
						<div className="grid grid-cols-[110px_1fr] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33] dark:shadow-none">
							<img
								src="https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&q=80"
								alt={t("landing.report.alt")}
								className="h-full min-h-40 w-full object-cover"
								loading="lazy"
							/>
							<div className="bg-white p-5 dark:bg-[#071b33]">
								<p className="mb-3 text-sm font-bold leading-relaxed text-blue-900 dark:text-cyan-100">
									{t("landing.process.reportCaption")}
								</p>
								<a
									href="#contact"
									className={cn(
										buttonVariants(),
										"w-full justify-center bg-blue-600 text-white hover:bg-blue-500"
									)}
								>
									{t("landing.process.seeReport")}
								</a>
							</div>
						</div>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}
