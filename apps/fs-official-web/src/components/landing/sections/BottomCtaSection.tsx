"use client";

import { FadeIn } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Icons used only in BottomCtaSection
// ---------------------------------------------------------------------------

function LineIcon({ size = 20 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
		</svg>
	);
}

function EmailIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="M2 7l10 7 10-7" />
		</svg>
	);
}

function PhoneIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.23h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
		</svg>
	);
}

function ClockIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
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

// ---------------------------------------------------------------------------
// BottomCtaSection
// ---------------------------------------------------------------------------

export function BottomCtaSection({ appUrl }: { appUrl: string }) {
	const { t } = useLocale();

	const contactItems = [
		{
			icon: <LineIcon size={22} />,
			iconColor: "text-[#06C755]",
			primary: t("landing.contact.lineHandle"),
			secondary: t("landing.contact.lineNote"),
			href: "https://lin.ee/rWwdF9q",
		},
		{
			icon: <EmailIcon size={22} />,
			iconColor: "text-blue-400",
			primary: t("landing.contact.email"),
			secondary: t("landing.contact.emailNote"),
			href: `mailto:${t("landing.contact.email")}`,
		},
		{
			icon: <PhoneIcon size={22} />,
			iconColor: "text-blue-400",
			primary: t("landing.contact.phone"),
			secondary: t("landing.contact.phoneNote"),
			href: "tel:021234567",
		},
		{
			icon: <ClockIcon size={22} />,
			iconColor: "text-blue-400",
			primary: t("landing.contact.hours"),
			secondary: "",
			href: null,
		},
	];

	return (
		<section id="contact" className="bg-white px-2 pb-0 text-white dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] rounded-md border border-blue-200 bg-[#06285a] px-4 py-5 shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:px-6 dark:border-cyan-300/20">
				<FadeIn>
					<div className="grid gap-5 md:grid-cols-[1fr_1.35fr] md:items-center">
						<div>
							<h2 className="text-2xl font-extrabold sm:text-3xl">
								{t("landing.bottomCta.title")}
							</h2>
							<p className="mt-1 text-sm text-cyan-100">{t("landing.bottomCta.subtitle")}</p>
							<a
								href="/register"
								onClick={() => globalThis.gtag?.("event", "cta_click", { location: "bottom_cta" })}
								className={cn(
									buttonVariants({ size: "lg" }),
									"mt-4 bg-blue-600 px-10 text-base text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] hover:bg-blue-500"
								)}
							>
								{t("nav.signUp")}
							</a>
						</div>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							{contactItems.slice(0, 3).map((item) => {
								const sharedClass =
									"flex min-w-0 items-center gap-3 rounded-md border border-white/15 bg-white/5 p-3 transition-colors hover:bg-white/10";

								return (
									<a
										key={item.primary}
										href={item.href as string}
										target={item.href?.startsWith("http") ? "_blank" : undefined}
										rel={item.href?.startsWith("http") ? "noopener noreferrer" : undefined}
										className={sharedClass}
									>
										<span className={cn("shrink-0", item.iconColor)}>{item.icon}</span>
										<span className="min-w-0">
											<span className="block text-[13px] font-bold leading-tight text-white [overflow-wrap:anywhere]">
												{item.primary}
											</span>
											{item.secondary && (
												<span className="mt-0.5 block text-xs leading-tight text-white/60">
													{item.secondary}
												</span>
											)}
										</span>
									</a>
								);
							})}
						</div>
					</div>
				</FadeIn>
			</div>
		</section>
	);
}
