"use client";

import { SiteShell } from "@/components/site/SiteShell";
import { useLocale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function LineIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
		</svg>
	);
}

function EmailIcon() {
	return (
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
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
		</svg>
	);
}

function PhoneIcon() {
	return (
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
			<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.34 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.05 6.05l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
		</svg>
	);
}

function ClockIcon() {
	return (
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
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
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

// ---------------------------------------------------------------------------
// ContactBody — uses useLocale(); rendered inside SiteShell's provider
// ---------------------------------------------------------------------------

const LINE_URL = "https://lin.ee/rWwdF9q";

function ContactBody({ appUrl }: { readonly appUrl: string }) {
	const { t } = useLocale();

	return (
		<>
			{/* Hero */}
			<section className="border-b border-slate-200 bg-sky-50 px-4 py-14 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto max-w-3xl text-center">
					<h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
						{t("contact.title")}
					</h1>
					<p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{t("contact.subtitle")}
					</p>
				</div>
			</section>

			{/* Contact cards */}
			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
					{/* LINE */}
					<div className="flex flex-col gap-4 rounded-xl border border-sky-200 bg-white p-6 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white">
							<LineIcon />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 dark:text-white">
								{t("contact.lineCard.title")}
							</h2>
							<p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
								{t("contact.lineCard.body")}
							</p>
							<p className="mt-2 text-base font-semibold text-green-600 dark:text-green-400">
								{t("landing.contact.lineHandle")}
							</p>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								{t("landing.contact.lineNote")}
							</p>
						</div>
						<a
							href={LINE_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-auto inline-flex items-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600"
						>
							{t("contact.lineCard.cta")}
							<ArrowRightIcon />
						</a>
					</div>

					{/* Email */}
					<div className="flex flex-col gap-4 rounded-xl border border-sky-200 bg-white p-6 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
							<EmailIcon />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 dark:text-white">
								{t("contact.emailCard.title")}
							</h2>
							<p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
								{t("contact.emailCard.body")}
							</p>
							<a
								href={`mailto:${t("landing.contact.email")}`}
								className="mt-2 block text-base font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-cyan-300 dark:hover:text-cyan-200"
							>
								{t("landing.contact.email")}
							</a>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								{t("landing.contact.emailNote")}
							</p>
						</div>
					</div>

					{/* Phone */}
					<div className="flex flex-col gap-4 rounded-xl border border-sky-200 bg-white p-6 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600 text-white">
							<PhoneIcon />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 dark:text-white">
								{t("contact.phoneCard.title")}
							</h2>
							<a
								href={`tel:${t("landing.contact.phone").replace(/-/g, "")}`}
								className="mt-1 block text-xl font-bold text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-cyan-300"
							>
								{t("landing.contact.phone")}
							</a>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								{t("landing.contact.phoneNote")}
							</p>
						</div>
					</div>

					{/* Hours */}
					<div className="flex flex-col gap-4 rounded-xl border border-sky-200 bg-white p-6 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-white dark:bg-slate-600">
							<ClockIcon />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 dark:text-white">
								{t("contact.hoursCard.title")}
							</h2>
							<p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
								{t("landing.contact.hours")}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* App CTA */}
			<section className="border-t border-sky-200 bg-sky-50 px-4 py-12 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto flex max-w-4xl flex-col items-start gap-5 rounded-xl border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
					<div>
						<h2 className="text-xl font-extrabold sm:text-2xl">{t("contact.appCard.title")}</h2>
						<p className="mt-1 text-sm text-cyan-100">{t("contact.appCard.body")}</p>
					</div>
					<a
						href={appUrl}
						className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-500 px-7 py-3 text-base font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] transition-colors hover:bg-blue-400"
					>
						{t("contact.appCard.cta")}
						<ArrowRightIcon />
					</a>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// ContactContent — public island export
// ---------------------------------------------------------------------------

export interface ContactContentProps {
	readonly appUrl: string;
	readonly version: string;
}

export function ContactContent({ appUrl, version }: ContactContentProps) {
	return (
		<SiteShell appUrl={appUrl} version={version}>
			<ContactBody appUrl={appUrl} />
		</SiteShell>
	);
}
