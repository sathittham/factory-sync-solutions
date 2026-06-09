import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

export type Locale = "th" | "en";

interface LocaleContextValue {
	locale: Locale;
	setLocale: (l: Locale) => void;
	t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "fss-locale";

export function getInitialLocale(): Locale {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "en" || stored === "th") return stored;
	} catch {
		// ignore SSR / private-mode errors
	}
	return "th";
}

const translations: Record<Locale, Record<string, string>> = {
	th: {
		// --- existing keys ---
		"landing.title": "FactorySync Solutions",
		"landing.subtitle":
			"ประเมินความพร้อมด้านการจัดการการผลิตของโรงงานใน 8 มิติหลัก รับข้อมูลเชิงลึกและคำแนะนำเฉพาะทาง",
		"landing.badge": "แบบประเมินออนไลน์ ฟรี",
		"landing.cta": "เริ่มตรวจสุขภาพโรงงานฟรี!",
		"landing.ctaBottom": "เริ่มประเมินฟรีเลย",
		"landing.howItWorks": "ขั้นตอนง่ายๆ 3 ขั้นตอน",
		"landing.testimonials.title": "เสียงจากผู้ใช้งานจริง",
		"landing.contact.title": "ติดต่อเรา",
		"landing.contact.subtitle": "สนใจตรวจสุขภาพโรงงาน หรือต้องการข้อมูลเพิ่มเติม ติดต่อทีมงานของเราได้เลย",
		"landing.contact.line": "แอดไลน์ @factorysyncsolutions",
		"landing.contact.or": "หรือ Email: ",
		"landing.free": "ฟรี ไม่มีค่าใช้จ่าย",
		"landing.dim.basic": "การจัดการงานเบื้องต้น",
		"landing.dim.improvement": "การปรับปรุงการทำงาน",
		"landing.dim.coordination": "การประสานงาน",
		"landing.dim.maintenance": "การบำรุงรักษา",
		"landing.dim.quality": "คุณภาพ/QA",
		"landing.dim.production": "การผลิตและการส่งมอบ",
		"landing.dim.material": "การควบคุมวัสดุ",
		"landing.dim.cost": "การควบคุมต้นทุน",
		"nav.signIn": "เข้าสู่ระบบ",
		"footer.contact": "ติดต่อ",
		"footer.copyright": "FactorySync Solutions สงวนลิขสิทธิ์",
		"footer.terms": "ข้อกำหนดการใช้งาน",
		"footer.privacy": "นโยบายความเป็นส่วนตัว",
		"footer.cookiePolicy": "นโยบายคุกกี้",
		"footer.marketing": "นโยบายการตลาด",
		"footer.cookies": "ตั้งค่าคุกกี้",

		// --- new keys ---
		"landing.hero.title1": "ตรวจสุขภาพโรงงานอัจฉริยะ",
		"landing.hero.title2highlight": "ด้วย AI และวุฒิวิศวกร",
		"landing.hero.desc":
			"ประเมินความพร้อมโรงงาน วิเคราะห์ 8 มิติหลัก พร้อมคำแนะนำเชิงลึก เพื่อยกระดับผลภาพ คุณภาพ ต้นทุน และความปลอดภัย",
		"landing.hero.cta2": "ขอคำปรึกษาผู้เชี่ยวชาญ",
		"landing.stat.questions": "คำถาม",
		"landing.stat.dims": "มิติ",
		"landing.stat.time": "นาที",
		"landing.stat.report": "รายงานเชิงลึก พร้อมแผนปรับปรุง",
		"landing.trust.exp": "ประสบการณ์มากกว่า 15 ปี",
		"landing.trust.expSub": "ด้านวิศวกรรมและการผลิต",
		"landing.trust.consult": "ให้คำปรึกษาโรงงาน 200+ แห่ง",
		"landing.trust.consultSub": "ครอบคลุมหลากหลายอุตสาหกรรม",
		"landing.trust.eng": "วุฒิวิศวกรอุตสาหการ",
		"landing.trust.engSub": "ขั้นตอนและสภาวิศวกร",
		"landing.trust.std": "แนวทางตามมาตรฐานวิศวกรรม",
		"landing.trust.stdSub": "และจรรยาบรรณวิชาชีพ",
		"landing.dims.title": "8 มิติการตรวจสุขภาพโรงงาน",
		"landing.dims.subtitle": "ประเมินครบทุกมิติสำคัญ เพื่อมองเห็นภาพรวมที่แม่นยำและแผนปรับปรุงที่ตรงจุด",
		"landing.radar.seeReport": "ดูตัวอย่างรายงาน",
		"landing.radar.score": "85%",
		"landing.radar.you": "โรงงานของคุณ",
		"landing.radar.avg": "เกณฑ์อุตสาหกรรม",
		"landing.radar.overview": "ภาพรวมผลการประเมิน",
		"landing.radar.totalScore": "คะแนนรวม",
		"landing.seal.line1": "วุฒิ",
		"landing.seal.line2": "วิศวกร",
		"landing.certificate.title": "ใบประกอบวิชาชีพวิศวกรรม",
		"landing.certificate.person": "นายวิศวกร ผู้เชี่ยวชาญ",
		"landing.certificate.level": "วุฒิวิศวกร",
		"landing.certificate.discipline": "วิศวกรรมอุตสาหการ",
		"landing.certificate.branch": "สาขา Industrial Engineering",
		"landing.certificate.authority": "สภาวิศวกร",
		"landing.expert.label": "ผู้เชี่ยวชาญระดับวิชาชีพ",
		"landing.expert.title": "เชี่ยวชาญงานวิศวกรรม ระดับวุฒิวิศวกร",
		"landing.expert.desc":
			"ให้คำปรึกษา ตรวจประเมิน และรับรองงานด้านวิศวกรรมอย่างมืออาชีพ โดยยึดหลักมาตรฐานและจรรยาบรรณวิชาชีพ",
		"landing.services.title": "บริการของเรา",
		"landing.process.title": "ขั้นตอนการตรวจสุขภาพโรงงาน",
		"landing.process.seeReport": "ดูตัวอย่างรายงาน →",
		"landing.results.title": "ผลลัพธ์ที่ลูกค้าของเราได้รับ",
		"landing.bottomCta.title": "พร้อมยกระดับโรงงานของคุณแล้วหรือยัง?",
		"landing.bottomCta.subtitle": "เริ่มต้นวันนี้ เพื่อผลลัพธ์ที่ดีกว่าเดิม",
		"landing.contact.lineHandle": "@factorysyncs",
		"landing.contact.lineNote": "ตอบกลับใน 1 วันทำการ",
		"landing.contact.emailNote": "ส่งทางอีเมล",
		"landing.contact.phone": "02-123-4567",
		"landing.contact.phoneNote": "โทรสอบถาม",
		"landing.contact.hours": "จันทร์-ศุกร์ 09.00-17.30",
		"nav.home": "หน้าแรก",
		"nav.healthCheck": "ตรวจสุขภาพโรงงาน",
		"nav.engineering": "บริการวิศวกรรม",
		"nav.peace": "ใจอุ่น",
		"nav.cases": "กรณีศึกษา",
		"nav.blog": "บทความ",
		"nav.about": "เกี่ยวกับเรา",
		"nav.contact": "ติดต่อเรา",
		"locale.label": "ภาษา",
		"theme.label": "ธีม",
		"theme.dark": "มืด",
		"theme.light": "สว่าง",
		"theme.system": "ระบบ",
		"footer.desc": "ผู้ให้บริการตรวจสอบสุขภาพโรงงานโดยทีมวุฒิวิศวกรครบวงจร",
	},
	en: {
		// --- existing keys ---
		"landing.title": "FactorySync Solutions",
		"landing.subtitle":
			"Assess your factory's production management readiness across 8 key dimensions. Get actionable insights and targeted recommendations.",
		"landing.badge": "Free Online Assessment",
		"landing.cta": "Start Free Factory Health Check!",
		"landing.ctaBottom": "Start Free Assessment",
		"landing.howItWorks": "How It Works",
		"landing.testimonials.title": "What Users Say",
		"landing.contact.title": "Contact Us",
		"landing.contact.subtitle":
			"Interested in a factory health check or need more information? Reach out to our team.",
		"landing.contact.line": "Add Line @factorysyncsolutions",
		"landing.contact.or": "Or Email: ",
		"landing.free": "Free, no cost involved",
		"landing.dim.basic": "Basic Management",
		"landing.dim.improvement": "Process Improvement",
		"landing.dim.coordination": "Coordination",
		"landing.dim.maintenance": "Maintenance",
		"landing.dim.quality": "Quality Control / QA",
		"landing.dim.production": "Production, Control & Delivery",
		"landing.dim.material": "Material Control",
		"landing.dim.cost": "Cost Control",
		"nav.signIn": "Sign In",
		"footer.contact": "Contact",
		"footer.copyright": "FactorySync Solutions. All rights reserved.",
		"footer.terms": "Terms of Use",
		"footer.privacy": "Privacy Policy",
		"footer.cookiePolicy": "Cookie Policy",
		"footer.marketing": "Marketing Policy",
		"footer.cookies": "Cookie Settings",

		// --- new keys ---
		"landing.hero.title1": "Intelligent Factory Health Check",
		"landing.hero.title2highlight": "with AI & Certified Engineers",
		"landing.hero.desc":
			"Assess your factory's readiness across 8 key dimensions. Get deep insights to improve performance, quality, cost, and safety.",
		"landing.hero.cta2": "Consult an Expert",
		"landing.stat.questions": "Questions",
		"landing.stat.dims": "Dimensions",
		"landing.stat.time": "Minutes",
		"landing.stat.report": "In-Depth Report + Action Plan",
		"landing.trust.exp": "15+ Years Experience",
		"landing.trust.expSub": "in Engineering & Manufacturing",
		"landing.trust.consult": "200+ Factory Clients",
		"landing.trust.consultSub": "across diverse industries",
		"landing.trust.eng": "Licensed Industrial Engineer",
		"landing.trust.engSub": "Council of Engineers Thailand",
		"landing.trust.std": "Engineering Standards",
		"landing.trust.stdSub": "and Professional Ethics",
		"landing.dims.title": "8 Factory Health Check Dimensions",
		"landing.dims.subtitle":
			"Comprehensive coverage of every critical dimension for accurate assessment and targeted improvement plans",
		"landing.radar.seeReport": "View Sample Report",
		"landing.radar.score": "85%",
		"landing.radar.you": "Your Factory",
		"landing.radar.avg": "Industry Benchmark",
		"landing.radar.overview": "Assessment Overview",
		"landing.radar.totalScore": "Total Score",
		"landing.seal.line1": "PRO",
		"landing.seal.line2": "ENG",
		"landing.certificate.title": "Professional Engineering License",
		"landing.certificate.person": "Specialist Engineer",
		"landing.certificate.level": "Certified Engineer",
		"landing.certificate.discipline": "Industrial Engineering",
		"landing.certificate.branch": "Industrial Engineering Branch",
		"landing.certificate.authority": "Engineering Council",
		"landing.expert.label": "Professional Expertise",
		"landing.expert.title": "Engineering Expertise at Licensed Engineer Level",
		"landing.expert.desc":
			"Professional consulting, assessment, and engineering certification, adhering to standards and professional ethics.",
		"landing.services.title": "Our Services",
		"landing.process.title": "Factory Health Check Process",
		"landing.process.seeReport": "View Sample Report →",
		"landing.results.title": "Results Our Clients Achieved",
		"landing.bottomCta.title": "Ready to elevate your factory?",
		"landing.bottomCta.subtitle": "Start today for better results",
		"landing.contact.lineHandle": "@factorysyncs",
		"landing.contact.lineNote": "Responds within 1 business day",
		"landing.contact.emailNote": "Send by email",
		"landing.contact.phone": "02-123-4567",
		"landing.contact.phoneNote": "Call for inquiry",
		"landing.contact.hours": "Mon-Fri 09:00-17:30",
		"nav.home": "Home",
		"nav.healthCheck": "Health Check",
		"nav.engineering": "Engineering",
		"nav.peace": "Peace of Mind",
		"nav.cases": "Case Studies",
		"nav.blog": "Blog",
		"nav.about": "About Us",
		"nav.contact": "Contact",
		"locale.label": "Language",
		"theme.label": "Theme",
		"theme.dark": "Dark",
		"theme.light": "Light",
		"theme.system": "System",
		"footer.desc": "Full-service factory health check by licensed engineers",
	},
};

export function LocaleProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

	const setLocale = useCallback((l: Locale) => {
		setLocaleState(l);
		try {
			localStorage.setItem(STORAGE_KEY, l);
		} catch {
			// ignore
		}
	}, []);

	const t = useCallback(
		(key: string): string => {
			return translations[locale][key] ?? key;
		},
		[locale]
	);

	const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
	const ctx = useContext(LocaleContext);
	if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
	return ctx;
}
