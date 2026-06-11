import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
		"nav.signUp": "สมัครใช้งานฟรี",
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
		"nav.peace": "โซลูชัน",
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
		// --- hero title line 2 parts ---
		"landing.hero.title2.prefix": "ด้วย",
		"landing.hero.title2.connector": "และ",
		"landing.hero.title2.engineers": "วุฒิวิศวกร",
		// --- dimensions heading ---
		"landing.dims.heading.highlight": "8 มิติ",
		"landing.dims.heading.suffix": "การตรวจสุขภาพโรงงาน",
		// --- expert heading ---
		"landing.expert.heading.main": "เชี่ยวชาญงานวิศวกรรม",
		"landing.expert.heading.level": "ระดับวุฒิวิศวกร",
		// --- process report caption ---
		"landing.process.reportCaption": "รายงานเชิงลึก พร้อมแผนปรับปรุง",
		// --- radar chart axis labels ---
		"landing.radar.axis.basic": "ง.เบื้องต้น",
		"landing.radar.axis.improve": "ปรับปรุง",
		"landing.radar.axis.coord": "ประสานงาน",
		"landing.radar.axis.maint": "บำรุงรักษา",
		"landing.radar.axis.quality": "คุณภาพ",
		"landing.radar.axis.prod": "การผลิต",
		"landing.radar.axis.mat": "วัสดุ",
		"landing.radar.axis.cost": "ต้นทุน",

		// --- register page ---
		"register.title": "ลงทะเบียนบริษัท",
		"register.subtitle": "กรอกข้อมูลบริษัทเพื่อเริ่มการประเมิน",
		"register.regId": "เลขทะเบียนนิติบุคคล (13 หลัก)",
		"register.lookup": "ค้นหา",
		"register.lookupLoading": "...",
		"register.lookupFound": "พบแล้ว",
		"register.regIdTaken.title": "บริษัทลงทะเบียนแล้ว",
		"register.regIdTaken.desc":
			"มีบัญชีที่ใช้เลขทะเบียนนี้แล้ว ระบบได้กรอกข้อมูลบริษัทให้แล้ว คุณยังสามารถลงทะเบียนด้วยอีเมลของคุณได้",
		"register.companyName": "ชื่อบริษัท",
		"register.industryType": "ประเภทอุตสาหกรรม",
		"register.companySize": "ขนาดบริษัท",
		"register.contactName": "ชื่อผู้ติดต่อ",
		"register.contactEmail": "อีเมลผู้ติดต่อ",
		"register.contactPhone": "เบอร์โทรศัพท์",
		"register.submit": "ลงทะเบียน",
		"register.submitting": "กำลังลงทะเบียน...",
		"register.error": "การลงทะเบียนล้มเหลว กรุณาลองอีกครั้ง",
		"register.captchaRequired": "กรุณายืนยันว่าคุณไม่ใช่บอท",
		"register.captchaUnavailable": "ไม่สามารถโหลด CAPTCHA ได้ คุณยังสามารถส่งแบบฟอร์มได้",
		"register.select": "เลือก...",
		"register.regIdError": "ต้องเป็นตัวเลข 13 หลัก",
		"register.companyNameError": "กรุณากรอกชื่อบริษัท",
		"register.industryTypeError": "กรุณาเลือกประเภทอุตสาหกรรม",
		"register.companySizeError": "กรุณาเลือกขนาดบริษัท",
		"register.contactNameError": "กรุณากรอกชื่อผู้ติดต่อ",
		"register.contactEmailError": "อีเมลไม่ถูกต้อง",
		"register.contactPhoneError": "กรุณากรอกเบอร์โทรศัพท์",
		"register.acceptTerms": "ฉันยอมรับ",
		"register.termsLink": "ข้อกำหนดการใช้งาน",
		"register.and": "และ",
		"register.privacyLink": "นโยบายความเป็นส่วนตัว",
		"register.acceptTermsError": "กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว",
		"register.marketingConsent": "ฉันยินยอมรับข้อมูลข่าวสารและกิจกรรมส่งเสริมการตลาด",
		"register.marketingConsentDetail": "คุณสามารถยกเลิกได้ทุกเมื่อ ดูรายละเอียดที่",
		"register.marketingPolicyLink": "นโยบายการตลาด",
		"register.success.title": "ลงทะเบียนสำเร็จ!",
		"register.success.desc": "บัญชีบริษัทของคุณพร้อมใช้งานแล้ว เข้าสู่ระบบในแอปเพื่อเริ่มประเมิน",
		"register.success.goToApp": "เข้าสู่ระบบในแอป",
		"register.authStep.title": "เข้าสู่ระบบหรือสร้างบัญชี",
		"register.authStep.desc": "เพื่อลงทะเบียนบริษัท กรุณาเข้าสู่ระบบก่อน",

		// --- auth (sign-in) ---
		"signin.title": "ยินดีต้อนรับกลับมา",
		"signin.subtitle": "เข้าสู่ระบบเพื่อดำเนินการต่อ",
		"signin.createAccountTitle": "สร้างบัญชีใหม่",
		"signin.createAccountSubtitle": "กรอกอีเมลและรหัสผ่านเพื่อเริ่มต้น",
		"signin.resetTitle": "รีเซ็ตรหัสผ่าน",
		"signin.resetSubtitle": "เราจะส่งลิงก์รีเซ็ตไปยังอีเมลของคุณ",
		"signin.emailLabel": "อีเมล",
		"signin.passwordLabel": "รหัสผ่าน",
		"signin.confirmPasswordLabel": "ยืนยันรหัสผ่าน",
		"signin.signInWithEmail": "เข้าสู่ระบบ",
		"signin.signInWithGoogle": "เข้าสู่ระบบด้วย Google",
		"signin.createAccount": "สร้างบัญชี",
		"signin.forgotPassword": "ลืมรหัสผ่าน?",
		"signin.sendResetEmail": "ส่งลิงก์รีเซ็ต",
		"signin.resetEmailSent": "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล",
		"signin.backToSignIn": "กลับสู่การเข้าสู่ระบบ",
		"signin.orContinueWith": "หรือ",
		"signin.noAccount": "ยังไม่มีบัญชี?",
		"signin.haveAccount": "มีบัญชีแล้ว?",
		"signin.signInLink": "เข้าสู่ระบบ",
		"signin.signUpLink": "สร้างบัญชี",
		"signin.loading": "กำลังโหลด...",
		"signin.showPassword": "แสดงรหัสผ่าน",
		"signin.hidePassword": "ซ่อนรหัสผ่าน",
		"signin.errorInvalidEmail": "รูปแบบอีเมลไม่ถูกต้อง",
		"signin.errorInvalidCredential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
		"signin.errorEmailInUse": "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ",
		"signin.errorWeakPassword": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
		"signin.errorTooManyRequests": "ลองผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง",
		"signin.errorNetwork": "เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ",
		"signin.errorGeneric": "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
		"signin.errorPasswordMismatch": "รหัสผ่านไม่ตรงกัน",
		"signin.errorAccountExistsOtherProvider": "อีเมลนี้ใช้วิธีการเข้าสู่ระบบอื่น ลองเข้าสู่ระบบด้วย Google แทน",

		// --- industry types ---
		"industry.manufacturing": "การผลิต",
		"industry.food": "อาหารและเครื่องดื่ม",
		"industry.automotive": "ยานยนต์",
		"industry.electronics": "อิเล็กทรอนิกส์",
		"industry.textile": "สิ่งทอและเครื่องนุ่งห่ม",
		"industry.chemical": "เคมีภัณฑ์และปิโตรเคมี",
		"industry.construction": "ก่อสร้างและวัสดุก่อสร้าง",
		"industry.agriculture": "เกษตรกรรมและธุรกิจเกษตร",
		"industry.logistics": "โลจิสติกส์และห่วงโซ่อุปทาน",
		"industry.energy": "พลังงานและสาธารณูปโภค",
		"industry.pharma": "ยาและเครื่องมือแพทย์",
		"industry.plastics": "พลาสติกและยาง",
		"industry.printing": "การพิมพ์และบรรจุภัณฑ์",
		"industry.metal": "โลหะและเหล็กกล้า",
		"industry.wood": "ไม้และเฟอร์นิเจอร์",
		"industry.other": "อื่นๆ",

		// --- company sizes ---
		"size.small": "เล็ก (< 50 คน)",
		"size.medium": "กลาง (50-200 คน)",
		"size.large": "ใหญ่ (> 200 คน)",

		// --- profile section label (reused in register form) ---
		"profile.contactSection": "ข้อมูลผู้ติดต่อ",

		// --- cookie consent ---
		"cookie.banner.title": "เว็บไซต์นี้ใช้คุกกี้",
		"cookie.banner.description":
			"เราใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งาน วิเคราะห์การใช้งาน และนำเสนอเนื้อหาที่เกี่ยวข้อง",
		"cookie.banner.acceptAll": "ยอมรับทั้งหมด",
		"cookie.banner.settings": "ตั้งค่าคุกกี้",
		"cookie.settings.title": "ตั้งค่าความเป็นส่วนตัว",
		"cookie.settings.description": "เลือกประเภทคุกกี้ที่คุณยินยอมให้เราใช้",
		"cookie.settings.essential.title": "คุกกี้ที่จำเป็น",
		"cookie.settings.essential.description": "จำเป็นสำหรับการทำงานของเว็บไซต์ ไม่สามารถปิดได้",
		"cookie.settings.analytics.title": "คุกกี้วิเคราะห์",
		"cookie.settings.analytics.description": "ช่วยให้เราเข้าใจวิธีการใช้งานเว็บไซต์",
		"cookie.settings.marketing.title": "คุกกี้การตลาด",
		"cookie.settings.marketing.description": "ใช้สำหรับนำเสนอโฆษณาที่เกี่ยวข้องกับคุณ",
		"cookie.settings.confirm": "บันทึกการตั้งค่า",
		"cookie.settings.always": "เปิดเสมอ",
		"cookie.link": "นโยบายคุกกี้",

		// --- new keys ---
		"register.companyName.unknown": "บริษัทที่ลงทะเบียนแล้ว",
		"register.emailPlaceholder": "email@example.com",
		"nav.toggleMenu": "เปิด/ปิดเมนู",
		"landing.radar.ariaLabel": "แผนภูมิเรดาร์แสดงคะแนนการประเมินโรงงาน 8 มิติ",
		"landing.goldSeal.ariaLabel": "ตราประทับวิศวกรรับรอง",
		"landing.report.alt": "ตัวอย่างรายงานการประเมินโรงงาน",
		"landing.contact.email": "info@factorysyncsolutions.com",
		"footer.companyName": "บริษัท แฟคทอรีซิงค์ โซลูชันส์ จำกัด",
		"common.close": "ปิด",
		"register.step.account": "สร้างบัญชี",
		"register.step.company": "ข้อมูลบริษัท",
		"register.step.contact": "ข้อมูลผู้ติดต่อ",
		"register.next": "ถัดไป",
		"register.back": "ย้อนกลับ",
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
		"nav.signUp": "Register Free",
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
		"nav.peace": "Solutions",
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
		// --- hero title line 2 parts ---
		"landing.hero.title2.prefix": "with",
		"landing.hero.title2.connector": "&",
		"landing.hero.title2.engineers": "Certified Engineers",
		// --- dimensions heading ---
		"landing.dims.heading.highlight": "8 Dimensions",
		"landing.dims.heading.suffix": "of Factory Health Check",
		// --- expert heading ---
		"landing.expert.heading.main": "Engineering Expertise",
		"landing.expert.heading.level": "Certified Engineer Level",
		// --- process report caption ---
		"landing.process.reportCaption": "In-Depth Report + Action Plan",
		// --- radar chart axis labels ---
		"landing.radar.axis.basic": "Basic",
		"landing.radar.axis.improve": "Improve",
		"landing.radar.axis.coord": "Coordination",
		"landing.radar.axis.maint": "Maintenance",
		"landing.radar.axis.quality": "Quality",
		"landing.radar.axis.prod": "Production",
		"landing.radar.axis.mat": "Materials",
		"landing.radar.axis.cost": "Cost",

		// --- register page ---
		"register.title": "Company Registration",
		"register.subtitle": "Fill in your company details to start the assessment",
		"register.regId": "Company Registration Number (13 digits)",
		"register.lookup": "Lookup",
		"register.lookupLoading": "...",
		"register.lookupFound": "Found",
		"register.regIdTaken.title": "Company Already Registered",
		"register.regIdTaken.desc":
			"An account already uses this registration number. We pre-filled the company info. You can still register with your own email.",
		"register.companyName": "Company Name",
		"register.industryType": "Industry Type",
		"register.companySize": "Company Size",
		"register.contactName": "Contact Name",
		"register.contactEmail": "Contact Email",
		"register.contactPhone": "Phone Number",
		"register.submit": "Register",
		"register.submitting": "Registering...",
		"register.error": "Registration failed. Please try again.",
		"register.captchaRequired": "Please verify you are not a robot.",
		"register.captchaUnavailable": "CAPTCHA could not load. You may still submit the form.",
		"register.select": "Select...",
		"register.regIdError": "Must be 13 digits",
		"register.companyNameError": "Please enter a company name",
		"register.industryTypeError": "Please select an industry type",
		"register.companySizeError": "Please select a company size",
		"register.contactNameError": "Please enter a contact name",
		"register.contactEmailError": "Invalid email address",
		"register.contactPhoneError": "Please enter a phone number",
		"register.acceptTerms": "I accept the",
		"register.termsLink": "Terms of Use",
		"register.and": "and",
		"register.privacyLink": "Privacy Policy",
		"register.acceptTermsError": "Please accept the terms and privacy policy",
		"register.marketingConsent": "I consent to receive marketing communications",
		"register.marketingConsentDetail": "You may unsubscribe at any time. See our",
		"register.marketingPolicyLink": "Marketing Policy",
		"register.success.title": "Registration Successful!",
		"register.success.desc":
			"Your company account is ready. Sign in to the app to start your assessment.",
		"register.success.goToApp": "Go to App",
		"register.authStep.title": "Sign In or Create Account",
		"register.authStep.desc": "To register your company, please sign in first.",

		// --- auth (sign-in) ---
		"signin.title": "Welcome back",
		"signin.subtitle": "Sign in to continue",
		"signin.createAccountTitle": "Create an account",
		"signin.createAccountSubtitle": "Enter your email and password to get started",
		"signin.resetTitle": "Reset password",
		"signin.resetSubtitle": "We will send a reset link to your email",
		"signin.emailLabel": "Email",
		"signin.passwordLabel": "Password",
		"signin.confirmPasswordLabel": "Confirm password",
		"signin.signInWithEmail": "Sign In",
		"signin.signInWithGoogle": "Sign in with Google",
		"signin.createAccount": "Create Account",
		"signin.forgotPassword": "Forgot password?",
		"signin.sendResetEmail": "Send Reset Link",
		"signin.resetEmailSent": "Password reset link sent. Please check your email.",
		"signin.backToSignIn": "Back to sign in",
		"signin.orContinueWith": "or",
		"signin.noAccount": "Don't have an account?",
		"signin.haveAccount": "Already have an account?",
		"signin.signInLink": "Sign in",
		"signin.signUpLink": "Create account",
		"signin.loading": "Loading...",
		"signin.showPassword": "Show password",
		"signin.hidePassword": "Hide password",
		"signin.errorInvalidEmail": "Invalid email format",
		"signin.errorInvalidCredential": "Invalid email or password",
		"signin.errorEmailInUse": "This email already has an account. Please sign in.",
		"signin.errorWeakPassword": "Password must be at least 6 characters",
		"signin.errorTooManyRequests": "Too many failed attempts. Please try again later.",
		"signin.errorNetwork": "Network error. Please check your connection.",
		"signin.errorGeneric": "An error occurred. Please try again.",
		"signin.errorPasswordMismatch": "Passwords do not match",
		"signin.errorAccountExistsOtherProvider":
			"This email uses a different sign-in method. Try signing in with Google.",

		// --- industry types ---
		"industry.manufacturing": "Manufacturing",
		"industry.food": "Food & Beverage",
		"industry.automotive": "Automotive",
		"industry.electronics": "Electronics",
		"industry.textile": "Textile & Apparel",
		"industry.chemical": "Chemical & Petrochemical",
		"industry.construction": "Construction & Materials",
		"industry.agriculture": "Agriculture & Agribusiness",
		"industry.logistics": "Logistics & Supply Chain",
		"industry.energy": "Energy & Utilities",
		"industry.pharma": "Pharma & Medical Devices",
		"industry.plastics": "Plastics & Rubber",
		"industry.printing": "Printing & Packaging",
		"industry.metal": "Metal & Steel",
		"industry.wood": "Wood & Furniture",
		"industry.other": "Other",

		// --- company sizes ---
		"size.small": "Small (< 50 people)",
		"size.medium": "Medium (50-200 people)",
		"size.large": "Large (> 200 people)",

		// --- profile section label (reused in register form) ---
		"profile.contactSection": "Contact Information",

		// --- cookie consent ---
		"cookie.banner.title": "This website uses cookies",
		"cookie.banner.description":
			"We use cookies to improve your experience, analyze usage, and show relevant content.",
		"cookie.banner.acceptAll": "Accept All",
		"cookie.banner.settings": "Cookie Settings",
		"cookie.settings.title": "Privacy Settings",
		"cookie.settings.description": "Choose which types of cookies you consent to",
		"cookie.settings.essential.title": "Essential Cookies",
		"cookie.settings.essential.description":
			"Required for the website to function. Cannot be disabled.",
		"cookie.settings.analytics.title": "Analytics Cookies",
		"cookie.settings.analytics.description": "Help us understand how the website is used.",
		"cookie.settings.marketing.title": "Marketing Cookies",
		"cookie.settings.marketing.description": "Used to show ads relevant to you.",
		"cookie.settings.confirm": "Save Settings",
		"cookie.settings.always": "Always On",
		"cookie.link": "Cookie Policy",

		// --- new keys ---
		"register.companyName.unknown": "Unknown company",
		"register.emailPlaceholder": "email@example.com",
		"nav.toggleMenu": "Toggle menu",
		"landing.radar.ariaLabel": "Radar chart showing factory assessment scores across 8 dimensions",
		"landing.goldSeal.ariaLabel": "Certified engineer seal",
		"landing.report.alt": "Sample factory assessment report",
		"landing.contact.email": "info@factorysyncsolutions.com",
		"footer.companyName": "FactorySync Solutions Co., Ltd.",
		"common.close": "Close",
		"register.step.account": "Create Account",
		"register.step.company": "Company Info",
		"register.step.contact": "Contact Info",
		"register.next": "Next",
		"register.back": "Back",
	},
};

export function LocaleProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>("th");

	useEffect(() => {
		const stored = getInitialLocale();
		if (stored !== "th") setLocaleState(stored);
	}, []);

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
