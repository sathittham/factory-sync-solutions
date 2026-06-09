"use client";

import {
	LocaleSwitcher,
	LogoIcon,
	type ResolvedTheme,
	type Theme,
	ThemeSwitcher,
	useTheme,
} from "@/components/site/chrome";
import { buttonVariants } from "@/components/ui/button";
import { type Locale, LocaleProvider, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Fragment } from "react";

// ---------------------------------------------------------------------------
// NavBar — shares the logo, switchers and theme with the landing page
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

const SEP = <span className="text-slate-300 dark:text-slate-600">|</span>;

function Footer({ version, resolvedTheme }: { version: string; resolvedTheme: ResolvedTheme }) {
	const { t } = useLocale();
	const year = new Date().getFullYear();

	const legalLinks = [
		{ href: "/privacy", label: t("footer.privacy") },
		{ href: "/terms", label: t("footer.terms") },
		{ href: "/cookies", label: t("footer.cookiePolicy") },
		{ href: "/marketing", label: t("footer.marketing") },
		{ href: "/cookie-settings", label: t("footer.cookies") },
	];

	return (
		<footer className="border-t border-slate-200 bg-white py-6 text-slate-500 dark:border-cyan-300/15 dark:bg-[#041225] dark:text-slate-400">
			<div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
				{/* Brand */}
				<div className="flex items-center gap-3">
					<LogoIcon theme={resolvedTheme} />
					<div>
						<p className="text-sm font-semibold text-slate-900 dark:text-white">
							FactorySync Solutions Co., Ltd.
						</p>
						<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("footer.desc")}</p>
					</div>
				</div>

				{/* Legal links + copyright */}
				<div className="flex flex-col gap-2 text-xs md:items-end">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:justify-end">
						{legalLinks.map((link, index) => (
							<Fragment key={link.href}>
								<a
									href={link.href}
									className="transition-colors hover:text-blue-700 dark:hover:text-cyan-300"
								>
									{link.label}
								</a>
								{index < legalLinks.length - 1 && SEP}
							</Fragment>
						))}
					</div>
					<p className="text-slate-400 dark:text-slate-500">
						© {year} {t("footer.copyright")}
						<span className="ml-2 font-mono text-[10px] opacity-60">{version}</span>
					</p>
				</div>
			</div>
		</footer>
	);
}

// ---------------------------------------------------------------------------
// Legal content — Thai & English
// ---------------------------------------------------------------------------

const prose = "space-y-4 text-sm text-muted-foreground leading-relaxed";
const h2Class = "text-base font-bold text-foreground mt-6 mb-2";
const h3Class = "text-sm font-semibold text-foreground mt-4 mb-1";
const ulClass = "list-disc list-inside space-y-1 pl-2";

function TermsTh() {
	return (
		<div className={prose}>
			<h2 className={h2Class}>1. การยอมรับข้อกำหนด</h2>
			<p>
				การเข้าใช้งานระบบ FactorySync Solutions ("บริการ") ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขเหล่านี้ทั้งหมด
				หากท่านไม่ยอมรับข้อกำหนดเหล่านี้ กรุณาอย่าใช้บริการ
			</p>
			<h2 className={h2Class}>2. คำอธิบายบริการ</h2>
			<p>
				FactorySync Solutions เป็นเครื่องมือประเมินความพร้อมด้านการดำเนินงานของโรงงานอุตสาหกรรม ครอบคลุม 8
				มิติหลัก
			</p>
			<h2 className={h2Class}>3. บัญชีผู้ใช้</h2>
			<ul className={ulClass}>
				<li>ท่านต้องลงชื่อเข้าใช้ผ่านบัญชี Google เพื่อเข้าถึงบริการ</li>
				<li>ท่านต้องให้ข้อมูลบริษัทที่ถูกต้องและเป็นปัจจุบัน</li>
				<li>ท่านมีหน้าที่รักษาความปลอดภัยของบัญชี</li>
			</ul>
			<h2 className={h2Class}>4. การใช้งานที่ยอมรับได้</h2>
			<ul className={ulClass}>
				<li>ใช้บริการเพื่อวัตถุประสงค์ในการประเมินโรงงานเท่านั้น</li>
				<li>ไม่ส่งข้อมูลเท็จหรือข้อมูลที่ทำให้เข้าใจผิด</li>
				<li>ไม่พยายามเข้าถึงข้อมูลของผู้ใช้อื่นโดยไม่ได้รับอนุญาต</li>
				<li>ไม่ใช้บริการในทางที่ผิดกฎหมายหรือขัดต่อข้อกำหนดนี้</li>
			</ul>
			<h2 className={h2Class}>5. ทรัพย์สินทางปัญญา</h2>
			<p>
				เนื้อหา คำถาม เกณฑ์การประเมิน และซอฟต์แวร์ของ FactorySync Solutions เป็นทรัพย์สินของผู้ให้บริการ
				ท่านไม่มีสิทธิ์ทำซ้ำ แจกจ่าย หรือสร้างผลงานดัดแปลงจากบริการนี้
			</p>
			<h2 className={h2Class}>6. ผลการประเมิน</h2>
			<ul className={ulClass}>
				<li>ผลการประเมินเป็นเพียงข้อมูลอ้างอิงเท่านั้น ไม่ถือเป็นคำแนะนำจากผู้เชี่ยวชาญ</li>
				<li>ผู้ให้บริการไม่รับประกันความถูกต้องสมบูรณ์ของผลการประเมิน</li>
				<li>การตัดสินใจดำเนินการใดๆ ตามผลประเมิน เป็นความรับผิดชอบของท่านเอง</li>
			</ul>
			<h2 className={h2Class}>7. การจำกัดความรับผิด</h2>
			<p>
				บริการนี้ให้ "ตามสภาพ" (as is) โดยไม่มีการรับประกันใดๆ ผู้ให้บริการจะไม่รับผิดชอบต่อความเสียหายใดๆ
				ที่เกิดจากการใช้บริการ
			</p>
			<h2 className={h2Class}>8. การระงับหรือยกเลิกบริการ</h2>
			<p>ผู้ให้บริการสงวนสิทธิ์ในการระงับหรือยกเลิกการเข้าถึงบริการของท่านได้ทุกเมื่อ หากพบว่ามีการละเมิดข้อกำหนดเหล่านี้</p>
			<h2 className={h2Class}>9. การเปลี่ยนแปลงข้อกำหนด</h2>
			<p>
				ผู้ให้บริการสงวนสิทธิ์ในการแก้ไขข้อกำหนดเหล่านี้ได้ทุกเมื่อ การใช้งานบริการต่อหลังจากมีการเปลี่ยนแปลง
				ถือว่าท่านยอมรับข้อกำหนดใหม่
			</p>
			<h2 className={h2Class}>10. กฎหมายที่ใช้บังคับ</h2>
			<p>ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย</p>
			<h2 className={h2Class}>11. ติดต่อเรา</h2>
			<p>
				หากท่านมีคำถาม กรุณาติดต่อ:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function TermsEn() {
	return (
		<div className={prose}>
			<h2 className={h2Class}>1. Acceptance of Terms</h2>
			<p>
				By accessing and using FactorySync Solutions ("Service"), you agree to be bound by these
				Terms and Conditions. If you do not agree, please do not use the Service.
			</p>
			<h2 className={h2Class}>2. Description of Service</h2>
			<p>
				FactorySync Solutions is an online assessment tool that evaluates factory operational
				maturity across 8 key dimensions.
			</p>
			<h2 className={h2Class}>3. User Accounts</h2>
			<ul className={ulClass}>
				<li>You must sign in with a Google account to access the Service.</li>
				<li>You must provide accurate and current company information.</li>
				<li>You are responsible for maintaining the security of your account.</li>
			</ul>
			<h2 className={h2Class}>4. Acceptable Use</h2>
			<ul className={ulClass}>
				<li>Use the Service only for its intended purpose of factory assessment.</li>
				<li>Do not submit false or misleading information.</li>
				<li>Do not attempt to access other users' data without authorization.</li>
				<li>Do not use the Service for any unlawful purpose.</li>
			</ul>
			<h2 className={h2Class}>5. Intellectual Property</h2>
			<p>
				All content, questions, assessment criteria, and software of FactorySync Solutions are the
				property of the Service provider. You may not reproduce, distribute, or create derivative
				works from this Service.
			</p>
			<h2 className={h2Class}>6. Assessment Results</h2>
			<ul className={ulClass}>
				<li>
					Assessment results are for reference purposes only and do not constitute professional
					advice.
				</li>
				<li>The Service provider does not guarantee the completeness or accuracy of results.</li>
				<li>Any decisions made based on assessment results are your own responsibility.</li>
			</ul>
			<h2 className={h2Class}>7. Limitation of Liability</h2>
			<p>
				The Service is provided "as is" without warranties of any kind. The Service provider shall
				not be liable for any damages arising from the use of the Service.
			</p>
			<h2 className={h2Class}>8. Suspension or Termination</h2>
			<p>
				The Service provider reserves the right to suspend or terminate your access at any time if
				these Terms are violated.
			</p>
			<h2 className={h2Class}>9. Changes to Terms</h2>
			<p>
				The Service provider reserves the right to modify these Terms at any time. Continued use
				after changes constitutes acceptance of the new Terms.
			</p>
			<h2 className={h2Class}>10. Governing Law</h2>
			<p>These Terms are governed by the laws of the Kingdom of Thailand.</p>
			<h2 className={h2Class}>11. Contact</h2>
			<p>
				If you have questions about these Terms, please contact:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function PrivacyTh() {
	return (
		<div className={prose}>
			<p>
				FactorySync Solutions ("บริการ") ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
				นโยบายนี้อธิบายวิธีการเก็บรวบรวม ใช้ และปกป้องข้อมูลของท่าน สอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.
				2562 (PDPA)
			</p>
			<h2 className={h2Class}>1. ข้อมูลที่เราเก็บรวบรวม</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">ข้อมูลบัญชี:</strong> ชื่อ อีเมล และรูปโปรไฟล์จากบัญชี Google
					ของท่าน
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลบริษัท:</strong> ชื่อบริษัท เลขทะเบียนนิติบุคคล
					ประเภทอุตสาหกรรม ขนาดบริษัท
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลผู้ติดต่อ:</strong> ชื่อผู้ติดต่อ อีเมล เบอร์โทรศัพท์
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลการประเมิน:</strong> คำตอบแบบประเมิน คะแนน
					และผลวิเคราะห์
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลการใช้งาน:</strong> หน้าที่เยี่ยมชม การกระทำต่างๆ
					บนเว็บไซต์ ผ่าน Google Analytics
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลทางเทคนิค:</strong> IP address ประเภทเบราว์เซอร์
					ระบบปฏิบัติการ ผ่านคุกกี้
				</li>
			</ul>
			<h2 className={h2Class}>2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
			<ul className={ulClass}>
				<li>ให้บริการประเมินสุขภาพโรงงานและแสดงผลลัพธ์</li>
				<li>ยืนยันตัวตนและจัดการบัญชีผู้ใช้</li>
				<li>ตรวจสอบข้อมูลบริษัทผ่านระบบ DBD</li>
				<li>ป้องกันการใช้งานในทางที่ผิดผ่าน Cloudflare Turnstile</li>
				<li>วิเคราะห์และปรับปรุงบริการผ่าน Google Analytics</li>
				<li>ติดต่อสื่อสารเกี่ยวกับบริการ</li>
			</ul>
			<h2 className={h2Class}>3. ฐานทางกฎหมาย</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">ความยินยอม:</strong> การลงทะเบียนและทำแบบประเมิน
				</li>
				<li>
					<strong className="text-foreground">สัญญา:</strong> การให้บริการประเมินตามที่ท่านร้องขอ
				</li>
				<li>
					<strong className="text-foreground">ประโยชน์โดยชอบด้วยกฎหมาย:</strong>{" "}
					การวิเคราะห์และปรับปรุงบริการ
				</li>
			</ul>
			<h2 className={h2Class}>4. การแบ่งปันข้อมูล</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Google (Firebase):</strong> สำหรับการยืนยันตัวตน
				</li>
				<li>
					<strong className="text-foreground">Google (Analytics):</strong> สำหรับวิเคราะห์การใช้งาน
				</li>
				<li>
					<strong className="text-foreground">Cloudflare:</strong> สำหรับการรักษาความปลอดภัยและ CDN
				</li>
				<li>
					<strong className="text-foreground">Google Cloud Platform:</strong>{" "}
					สำหรับจัดเก็บข้อมูลและประมวลผล
				</li>
			</ul>
			<p>เราจะไม่ขายข้อมูลส่วนบุคคลของท่านให้แก่บุคคลที่สาม</p>
			<h2 className={h2Class}>5. คุกกี้และเทคโนโลยีการติดตาม</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">คุกกี้ที่จำเป็น:</strong> การยืนยันตัวตน การตั้งค่าภาษา
				</li>
				<li>
					<strong className="text-foreground">คุกกี้วิเคราะห์:</strong> Google Analytics
				</li>
				<li>
					<strong className="text-foreground">คุกกี้ความปลอดภัย:</strong> Cloudflare Turnstile
				</li>
			</ul>
			<h2 className={h2Class}>6. การเก็บรักษาข้อมูล</h2>
			<p>เราจะเก็บรักษาข้อมูลของท่านตราบเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่ระบุไว้ หรือตามที่กฎหมายกำหนด</p>
			<h2 className={h2Class}>7. สิทธิของเจ้าของข้อมูล</h2>
			<p>ภายใต้ PDPA ท่านมีสิทธิ: เข้าถึง แก้ไข ลบ คัดค้าน โอนย้ายข้อมูล และเพิกถอนความยินยอม</p>
			<p>
				ติดต่อ:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
			<h2 className={h2Class}>8. ความปลอดภัยของข้อมูล</h2>
			<p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัส HTTPS และการควบคุมการเข้าถึง</p>
			<h2 className={h2Class}>9. การเปลี่ยนแปลงนโยบาย</h2>
			<p>เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแจ้งการเปลี่ยนแปลงที่สำคัญผ่านทางบริการ</p>
			<h2 className={h2Class}>10. ติดต่อเรา</h2>
			<p>
				ติดต่อ:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function PrivacyEn() {
	return (
		<div className={prose}>
			<p>
				FactorySync Solutions ("Service") is committed to protecting your personal data. This policy
				explains how we collect, use, and protect your information, in compliance with Thailand's
				Personal Data Protection Act (PDPA).
			</p>
			<h2 className={h2Class}>1. Information We Collect</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Account data:</strong> Name, email, and profile
					picture from your Google account.
				</li>
				<li>
					<strong className="text-foreground">Company data:</strong> Company name, registration ID,
					industry type, and company size.
				</li>
				<li>
					<strong className="text-foreground">Contact data:</strong> Contact name, email, and phone
					number.
				</li>
				<li>
					<strong className="text-foreground">Assessment data:</strong> Quiz answers, scores, and
					analysis results.
				</li>
				<li>
					<strong className="text-foreground">Usage data:</strong> Pages visited and actions taken,
					collected via Google Analytics.
				</li>
				<li>
					<strong className="text-foreground">Technical data:</strong> IP address, browser type, OS,
					collected via cookies.
				</li>
			</ul>
			<h2 className={h2Class}>2. How We Use Your Data</h2>
			<ul className={ulClass}>
				<li>Provide factory health assessment services and display results.</li>
				<li>Authenticate and manage user accounts.</li>
				<li>Verify company information via the DBD system.</li>
				<li>Prevent misuse through Cloudflare Turnstile.</li>
				<li>Analyze and improve the Service via Google Analytics.</li>
				<li>Communicate with you about the Service.</li>
			</ul>
			<h2 className={h2Class}>3. Legal Basis</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Consent:</strong> Registration and taking assessments.
				</li>
				<li>
					<strong className="text-foreground">Contract:</strong> Providing assessment services as
					requested.
				</li>
				<li>
					<strong className="text-foreground">Legitimate interest:</strong> Service analytics and
					improvement.
				</li>
			</ul>
			<h2 className={h2Class}>4. Data Sharing</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Google (Firebase):</strong> For user authentication.
				</li>
				<li>
					<strong className="text-foreground">Google (Analytics):</strong> For usage analytics.
				</li>
				<li>
					<strong className="text-foreground">Cloudflare:</strong> For security and CDN.
				</li>
				<li>
					<strong className="text-foreground">Google Cloud Platform:</strong> For data storage and
					processing.
				</li>
			</ul>
			<p>We will never sell your personal data to third parties.</p>
			<h2 className={h2Class}>5. Cookies and Tracking</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Essential cookies:</strong> Authentication, language
					preferences.
				</li>
				<li>
					<strong className="text-foreground">Analytics cookies:</strong> Google Analytics.
				</li>
				<li>
					<strong className="text-foreground">Security cookies:</strong> Cloudflare Turnstile.
				</li>
			</ul>
			<h2 className={h2Class}>6. Data Retention</h2>
			<p>
				We retain your data for as long as necessary for the stated purposes, or as required by law.
			</p>
			<h2 className={h2Class}>7. Your Rights</h2>
			<p>
				Under the PDPA, you have the right to: access, rectify, delete, object, port your data, and
				withdraw consent.
			</p>
			<p>
				Contact:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
			<h2 className={h2Class}>8. Data Security</h2>
			<p>We implement HTTPS encryption, Google Cloud Platform storage, and access controls.</p>
			<h2 className={h2Class}>9. Changes to This Policy</h2>
			<p>
				We may update this policy from time to time. Significant changes will be communicated
				through the Service.
			</p>
			<h2 className={h2Class}>10. Contact</h2>
			<p>
				Contact:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function CookiesTh() {
	return (
		<div className={prose}>
			<p>
				FactorySync Solutions ("บริการ") ใช้คุกกี้และเทคโนโลยีที่คล้ายกันเพื่อให้บริการทำงานได้อย่างถูกต้อง
				ปรับปรุงประสบการณ์การใช้งาน และวิเคราะห์การเข้าชมเว็บไซต์
			</p>
			<h2 className={h2Class}>1. คุกกี้คืออะไร</h2>
			<p>
				คุกกี้คือไฟล์ข้อมูลขนาดเล็กที่จัดเก็บบนอุปกรณ์ของท่านเมื่อเข้าชมเว็บไซต์ คุกกี้ช่วยให้เว็บไซต์จดจำการตั้งค่าของท่าน เช่น
				ภาษา
			</p>
			<h2 className={h2Class}>2. ประเภทคุกกี้ที่เราใช้</h2>
			<h3 className={h3Class}>2.1 คุกกี้ที่จำเป็น (Essential Cookies)</h3>
			<p>คุกกี้เหล่านี้จำเป็นต่อการทำงานของเว็บไซต์ ไม่สามารถปิดได้</p>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Firebase Authentication:</strong>{" "}
					จัดเก็บสถานะการเข้าสู่ระบบ
				</li>
				<li>
					<strong className="text-foreground">การตั้งค่าภาษา (fss-locale):</strong> จดจำภาษาที่ท่านเลือก
				</li>
				<li>
					<strong className="text-foreground">การตั้งค่าคุกกี้ (fss-cookie-consent):</strong> จดจำการยินยอม
				</li>
			</ul>
			<h3 className={h3Class}>2.2 คุกกี้ความปลอดภัย</h3>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Cloudflare Turnstile:</strong> ตรวจสอบว่าท่านเป็นบุคคลจริง
					ไม่ใช่บอท
				</li>
				<li>
					<strong className="text-foreground">Cloudflare CDN:</strong> ส่งเนื้อหาอย่างปลอดภัย
				</li>
			</ul>
			<h3 className={h3Class}>2.3 คุกกี้วิเคราะห์</h3>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Google Analytics 4:</strong>{" "}
					วิเคราะห์การเข้าชมและพฤติกรรมการใช้งาน
				</li>
				<li>
					<strong className="text-foreground">Google Tag Manager:</strong> จัดการแท็กวิเคราะห์
				</li>
			</ul>
			<h3 className={h3Class}>2.4 คุกกี้ทางการตลาด</h3>
			<p>
				ทำงานเฉพาะเมื่อท่านให้ความยินยอม (opt-in) เท่านั้น สามารถเพิกถอนได้ผ่าน{" "}
				<a href="/cookie-settings" className="text-primary hover:underline">
					ตั้งค่าคุกกี้
				</a>
			</p>
			<h2 className={h2Class}>3. การจัดการคุกกี้</h2>
			<ul className={ulClass}>
				<li>
					ผ่าน{" "}
					<a href="/cookie-settings" className="text-primary hover:underline">
						หน้าตั้งค่าคุกกี้
					</a>
				</li>
				<li>ผ่านการตั้งค่าเบราว์เซอร์ของท่าน</li>
			</ul>
			<h2 className={h2Class}>4. ระยะเวลาการจัดเก็บ</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">คุกกี้เซสชัน:</strong> ลบเมื่อปิดเบราว์เซอร์
				</li>
				<li>
					<strong className="text-foreground">คุกกี้ถาวร:</strong> สูงสุด 2 ปี
				</li>
			</ul>
			<h2 className={h2Class}>5. การเปลี่ยนแปลงนโยบาย</h2>
			<p>เราอาจปรับปรุงนโยบายคุกกี้นี้เป็นครั้งคราว</p>
			<h2 className={h2Class}>6. ติดต่อเรา</h2>
			<p>
				ติดต่อ:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function CookiesEn() {
	return (
		<div className={prose}>
			<p>
				FactorySync Solutions ("Service") uses cookies and similar technologies to ensure the
				Service functions correctly, improve your experience, and analyze website traffic.
			</p>
			<h2 className={h2Class}>1. What Are Cookies</h2>
			<p>
				Cookies are small data files stored on your device when you visit a website. They help the
				website remember your preferences, such as language settings.
			</p>
			<h2 className={h2Class}>2. Types of Cookies We Use</h2>
			<h3 className={h3Class}>2.1 Essential Cookies</h3>
			<p>Required for the website to function and cannot be disabled.</p>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Firebase Authentication:</strong> Stores login state
					and session data.
				</li>
				<li>
					<strong className="text-foreground">Language preference (fss-locale):</strong> Remembers
					your chosen language.
				</li>
				<li>
					<strong className="text-foreground">Cookie consent (fss-cookie-consent):</strong>{" "}
					Remembers your cookie preferences.
				</li>
			</ul>
			<h3 className={h3Class}>2.2 Security Cookies</h3>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Cloudflare Turnstile:</strong> Verifies you are a real
					person, not a bot.
				</li>
				<li>
					<strong className="text-foreground">Cloudflare CDN:</strong> Secure content delivery and
					threat protection.
				</li>
			</ul>
			<h3 className={h3Class}>2.3 Analytics Cookies</h3>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Google Analytics 4:</strong> Analyzes traffic,
					behavior, and page performance.
				</li>
				<li>
					<strong className="text-foreground">Google Tag Manager:</strong> Manages analytics tags.
				</li>
			</ul>
			<h3 className={h3Class}>2.4 Marketing Cookies</h3>
			<p>
				Only activated with explicit consent (opt-in). Withdraw via{" "}
				<a href="/cookie-settings" className="text-primary hover:underline">
					Cookie Settings
				</a>
				.
			</p>
			<h2 className={h2Class}>3. Managing Cookies</h2>
			<ul className={ulClass}>
				<li>
					Via the{" "}
					<a href="/cookie-settings" className="text-primary hover:underline">
						Cookie Settings page
					</a>
					.
				</li>
				<li>Via your browser settings.</li>
			</ul>
			<h2 className={h2Class}>4. Retention Period</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Session cookies:</strong> Deleted when you close your
					browser.
				</li>
				<li>
					<strong className="text-foreground">Persistent cookies:</strong> Up to 2 years.
				</li>
			</ul>
			<h2 className={h2Class}>5. Changes to This Policy</h2>
			<p>We may update this Cookie Policy from time to time.</p>
			<h2 className={h2Class}>6. Contact</h2>
			<p>
				Contact:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function MarketingTh() {
	return (
		<div className={prose}>
			<p>
				นโยบายฉบับนี้อธิบายวิธีการที่ FactorySync Solutions ("บริการ") เก็บรวบรวม ใช้
				และเปิดเผยข้อมูลส่วนบุคคลเพื่อวัตถุประสงค์ทางการตลาด สอดคล้องกับ PDPA
			</p>
			<h2 className={h2Class}>1. ข้อมูลที่ใช้เพื่อการตลาด</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">ข้อมูลติดต่อ:</strong> ชื่อ อีเมล เบอร์โทรศัพท์
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลบริษัท:</strong> ชื่อบริษัท ประเภทอุตสาหกรรม ขนาดบริษัท
				</li>
				<li>
					<strong className="text-foreground">ข้อมูลการใช้งาน:</strong> ผลการประเมิน คะแนน
					และพฤติกรรมการใช้งาน
				</li>
			</ul>
			<h2 className={h2Class}>2. วัตถุประสงค์ทางการตลาด</h2>
			<ul className={ulClass}>
				<li>ส่งข่าวสาร อัปเดต และข้อมูลเกี่ยวกับบริการ</li>
				<li>แนะนำบริการหรือฟีเจอร์ใหม่</li>
				<li>ส่งข้อเสนอพิเศษ โปรโมชัน หรือกิจกรรม</li>
				<li>วิเคราะห์ประสิทธิภาพของแคมเปญการตลาด</li>
				<li>ทำแบบสำรวจความพึงพอใจหรือวิจัยตลาด</li>
			</ul>
			<h2 className={h2Class}>3. ฐานทางกฎหมาย</h2>
			<p>
				ดำเนินการบนฐาน <strong className="text-foreground">ความยินยอม</strong> ของท่านเท่านั้น
				ท่านสามารถให้หรือไม่ให้ความยินยอมได้โดยไม่กระทบการใช้บริการหลัก
			</p>
			<h2 className={h2Class}>4. ช่องทางการสื่อสาร</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">อีเมล:</strong> จดหมายข่าว อัปเดต ข้อเสนอพิเศษ
				</li>
				<li>
					<strong className="text-foreground">การแจ้งเตือนบนเว็บไซต์:</strong> ฟีเจอร์ใหม่หรือการปรับปรุงบริการ
				</li>
			</ul>
			<h2 className={h2Class}>5. การให้และเพิกถอนความยินยอม</h2>
			<ul className={ulClass}>
				<li>
					ให้ความยินยอมผ่าน{" "}
					<a href="/cookie-settings" className="text-primary hover:underline">
						ตั้งค่าคุกกี้
					</a>
				</li>
				<li>เพิกถอนได้ทุกเมื่อผ่านตั้งค่าคุกกี้ หรือลิงก์ยกเลิกในอีเมล หรือติดต่อ info@factorysyncsolutions.com</li>
			</ul>
			<h2 className={h2Class}>6. การแบ่งปันข้อมูล</h2>
			<ul className={ulClass}>
				<li>
					เราจะ <strong className="text-foreground">ไม่ขาย</strong> ข้อมูลส่วนบุคคลให้แก่บุคคลที่สาม
				</li>
				<li>อาจใช้ Google Analytics เพื่อวิเคราะห์แคมเปญ</li>
			</ul>
			<h2 className={h2Class}>7. ระยะเวลาการเก็บรักษา</h2>
			<p>จนกว่าท่านจะเพิกถอนความยินยอม หรือจนกว่าจะไม่จำเป็นอีกต่อไป</p>
			<h2 className={h2Class}>8. สิทธิของท่าน</h2>
			<ul className={ulClass}>
				<li>เพิกถอนความยินยอมได้ทุกเมื่อ</li>
				<li>เข้าถึงและลบข้อมูลที่ใช้เพื่อการตลาด</li>
				<li>คัดค้านการประมวลผลเพื่อการตลาดทางตรง</li>
			</ul>
			<h2 className={h2Class}>9. การเปลี่ยนแปลงนโยบาย</h2>
			<p>เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว</p>
			<h2 className={h2Class}>10. ติดต่อเรา</h2>
			<p>
				ติดต่อ:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function MarketingEn() {
	return (
		<div className={prose}>
			<p>
				This policy explains how FactorySync Solutions ("Service") collects, uses, and discloses
				your personal data for marketing purposes, in compliance with Thailand's PDPA.
			</p>
			<h2 className={h2Class}>1. Data Used for Marketing</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Contact data:</strong> Name, email, phone number.
				</li>
				<li>
					<strong className="text-foreground">Company data:</strong> Company name, industry type,
					company size.
				</li>
				<li>
					<strong className="text-foreground">Usage data:</strong> Assessment results, scores, and
					website behavior.
				</li>
			</ul>
			<h2 className={h2Class}>2. Marketing Purposes</h2>
			<ul className={ulClass}>
				<li>Send news, updates, and information about our Service.</li>
				<li>Recommend new services or features.</li>
				<li>Send special offers, promotions, or events.</li>
				<li>Analyze marketing campaign effectiveness.</li>
				<li>Conduct satisfaction surveys or market research.</li>
			</ul>
			<h2 className={h2Class}>3. Legal Basis</h2>
			<p>
				Processing is based solely on your <strong className="text-foreground">Consent</strong>. You
				may freely give or withhold consent without affecting your use of the core Service.
			</p>
			<h2 className={h2Class}>4. Communication Channels</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Email:</strong> Newsletters, updates, special offers.
				</li>
				<li>
					<strong className="text-foreground">Website notifications:</strong> New features or
					improvements.
				</li>
			</ul>
			<h2 className={h2Class}>5. Giving and Withdrawing Consent</h2>
			<ul className={ulClass}>
				<li>
					Give consent via{" "}
					<a href="/cookie-settings" className="text-primary hover:underline">
						Cookie Settings
					</a>
					.
				</li>
				<li>
					Withdraw at any time via Cookie Settings, email unsubscribe link, or contact
					info@factorysyncsolutions.com.
				</li>
			</ul>
			<h2 className={h2Class}>6. Data Sharing</h2>
			<ul className={ulClass}>
				<li>
					We will <strong className="text-foreground">never sell</strong> your personal data.
				</li>
				<li>We may use Google Analytics to analyze campaign performance.</li>
			</ul>
			<h2 className={h2Class}>7. Retention Period</h2>
			<p>Until you withdraw consent or until the data is no longer necessary.</p>
			<h2 className={h2Class}>8. Your Rights</h2>
			<ul className={ulClass}>
				<li>Withdraw consent at any time.</li>
				<li>Access and delete data used for marketing.</li>
				<li>Object to direct marketing processing.</li>
			</ul>
			<h2 className={h2Class}>9. Changes to This Policy</h2>
			<p>We may update this Marketing Policy from time to time.</p>
			<h2 className={h2Class}>10. Contact</h2>
			<p>
				Contact:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function CookieSettingsTh() {
	return (
		<div className={prose}>
			<p>ท่านสามารถจัดการความยินยอมคุกกี้สำหรับเว็บไซต์ FactorySync Solutions ได้ผ่านวิธีการต่อไปนี้</p>
			<h2 className={h2Class}>คุกกี้ที่จำเป็น</h2>
			<p>
				คุกกี้เหล่านี้ไม่สามารถปิดได้ เนื่องจากจำเป็นต่อการทำงานของเว็บไซต์ ได้แก่ การยืนยันตัวตน การตั้งค่าภาษา
				และการจดจำการตั้งค่าคุกกี้
			</p>
			<h2 className={h2Class}>คุกกี้วิเคราะห์และการตลาด</h2>
			<p>สำหรับคุกกี้วิเคราะห์ (Google Analytics) และคุกกี้การตลาด ท่านสามารถจัดการได้ผ่านการตั้งค่าเบราว์เซอร์</p>
			<h2 className={h2Class}>วิธีจัดการคุกกี้ผ่านเบราว์เซอร์</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Chrome:</strong> การตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย →
					คุกกี้
				</li>
				<li>
					<strong className="text-foreground">Firefox:</strong> การตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย
				</li>
				<li>
					<strong className="text-foreground">Safari:</strong> การตั้งค่า → ความเป็นส่วนตัว
				</li>
				<li>
					<strong className="text-foreground">Edge:</strong> การตั้งค่า → คุกกี้และการอนุญาตไซต์
				</li>
			</ul>
			<h2 className={h2Class}>ติดต่อเรา</h2>
			<p>
				หากมีคำถามเกี่ยวกับคุกกี้ กรุณาติดต่อ:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

function CookieSettingsEn() {
	return (
		<div className={prose}>
			<p>
				You can manage cookie consent for the FactorySync Solutions website through the following
				methods.
			</p>
			<h2 className={h2Class}>Essential Cookies</h2>
			<p>
				These cookies cannot be disabled as they are required for the website to function:
				authentication, language preferences, and consent tracking.
			</p>
			<h2 className={h2Class}>Analytics and Marketing Cookies</h2>
			<p>
				For analytics (Google Analytics) and marketing cookies, you can manage them through your
				browser settings.
			</p>
			<h2 className={h2Class}>Managing Cookies via Browser</h2>
			<ul className={ulClass}>
				<li>
					<strong className="text-foreground">Chrome:</strong> Settings → Privacy and Security →
					Cookies
				</li>
				<li>
					<strong className="text-foreground">Firefox:</strong> Settings → Privacy & Security
				</li>
				<li>
					<strong className="text-foreground">Safari:</strong> Preferences → Privacy
				</li>
				<li>
					<strong className="text-foreground">Edge:</strong> Settings → Cookies and site permissions
				</li>
			</ul>
			<h2 className={h2Class}>Contact Us</h2>
			<p>
				If you have questions about cookies, contact:{" "}
				<a href="mailto:info@factorysyncsolutions.com" className="text-primary hover:underline">
					info@factorysyncsolutions.com
				</a>
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page titles & content map
// ---------------------------------------------------------------------------

export type LegalPageType = "terms" | "privacy" | "cookies" | "marketing" | "cookie-settings";

const PAGE_TITLES: Record<LegalPageType, Record<Locale, string>> = {
	terms: { th: "ข้อกำหนดและเงื่อนไขการใช้งาน", en: "Terms and Conditions" },
	privacy: { th: "นโยบายความเป็นส่วนตัว", en: "Privacy Policy" },
	cookies: { th: "นโยบายคุกกี้", en: "Cookie Policy" },
	marketing: { th: "นโยบายทางการตลาด", en: "Marketing Policy" },
	"cookie-settings": { th: "ตั้งค่าคุกกี้", en: "Cookie Settings" },
};

const CONTENT_MAP: Record<LegalPageType, Record<Locale, React.ReactNode>> = {
	terms: { th: <TermsTh />, en: <TermsEn /> },
	privacy: { th: <PrivacyTh />, en: <PrivacyEn /> },
	cookies: { th: <CookiesTh />, en: <CookiesEn /> },
	marketing: { th: <MarketingTh />, en: <MarketingEn /> },
	"cookie-settings": { th: <CookieSettingsTh />, en: <CookieSettingsEn /> },
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const LEGAL_NAV: LegalPageType[] = ["terms", "privacy", "cookies", "marketing", "cookie-settings"];

function LegalSidebar({ page }: { page: LegalPageType }) {
	const { locale, t } = useLocale();

	return (
		<aside className="w-full shrink-0 md:w-64">
			<div className="overflow-hidden rounded-xl border border-sky-200 bg-white p-2 shadow-xs md:sticky md:top-20 dark:border-cyan-300/15 dark:bg-[#06172d]">
				<a
					href="/"
					className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
				>
					{t("nav.home")}
				</a>
				<nav className="mt-1 flex flex-col gap-0.5" aria-label="Legal pages">
					{LEGAL_NAV.map((p) => {
						const active = p === page;
						return (
							<a
								key={p}
								href={`/${p}`}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm leading-snug transition-colors",
									active
										? "border-l-[3px] border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-cyan-300 dark:bg-cyan-300/10 dark:text-cyan-300"
										: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
								)}
							>
								<span>{PAGE_TITLES[p][locale]}</span>
								{active && (
									<span aria-hidden="true" className="shrink-0">
										→
									</span>
								)}
							</a>
						);
					})}
				</nav>
			</div>
		</aside>
	);
}

// ---------------------------------------------------------------------------
// Inner + root
// ---------------------------------------------------------------------------

function LegalInner({
	page,
	appUrl,
	version,
}: { page: LegalPageType; appUrl: string; version: string }) {
	const { locale, t } = useLocale();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const title = PAGE_TITLES[page][locale];

	return (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<NavBar appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
			<main className="flex-1">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
					{/* Breadcrumb */}
					<nav
						className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
						aria-label="Breadcrumb"
					>
						<a
							href="/"
							className="transition-colors hover:text-slate-900 dark:hover:text-white"
						>
							{t("nav.home")}
						</a>
						<span aria-hidden="true">/</span>
						<span className="text-slate-700 dark:text-slate-200">{title}</span>
					</nav>

					<h1 className="text-2xl sm:text-3xl font-bold text-slate-950 mb-1 dark:text-white">
						{title}
					</h1>
					<p className="text-sm text-slate-500 mb-6 dark:text-slate-400">
						{locale === "th" ? "แก้ไขล่าสุด: 7 มีนาคม 2568" : "Last updated: March 7, 2025"}
					</p>

					{/* Sidebar + content */}
					<div className="flex flex-col gap-6 md:flex-row md:items-start">
						<LegalSidebar page={page} />
						<div className="min-w-0 flex-1 rounded-xl border border-sky-200 bg-white p-6 sm:p-8 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]">
							{CONTENT_MAP[page][locale]}
						</div>
					</div>
				</div>
			</main>
			<Footer version={version} resolvedTheme={resolvedTheme} />
		</div>
	);
}

export interface LegalContentProps {
	page: LegalPageType;
	appUrl: string;
	version: string;
}

export function LegalContent({ page, appUrl, version }: LegalContentProps) {
	return (
		<LocaleProvider>
			<LegalInner page={page} appUrl={appUrl} version={version} />
		</LocaleProvider>
	);
}
