import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type Locale = "th" | "en";

interface LocaleContextValue {
	locale: Locale;
	setLocale: (l: Locale) => void;
	t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "fss-locale";
const LOCALE_CHANGE_EVENT = "fss-locale-change";

export function getInitialLocale(): Locale {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "en" || stored === "th") return stored;
	} catch {
		// ignore SSR / private-mode errors
	}
	return "th";
}

/** Server-safe translation lookup — usable in Astro frontmatter (no React context). */
export function translate(key: string, locale: Locale): string {
	return translations[locale]?.[key] ?? key;
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
		"nav.services": "บริการของเรา",
		"nav.knowledge": "บทความ / ความรู้",
		"nav.freeCheckCta": "ตรวจสุขภาพโรงงานฟรี",
		"nav.viewAll": "ดูทั้งหมด",
		"nav.aboutCompany": "ประวัติบริษัท / วิสัยทัศน์",
		"nav.aboutTeam": "ทีมวิศวกร",
		"nav.aboutCaseStudies": "ผลงาน / ลูกค้าที่ไว้วางใจ",
		"cta.float": "ขอประเมิน / นัดตรวจสุขภาพโรงงานฟรี",
		"cta.floatShort": "ตรวจโรงงานฟรี",
		"svc.freeHealthCheck.title": "ตรวจสุขภาพโรงงานเบื้องต้น (ฟรี)",
		"svc.freeHealthCheck.sub": "ประเมิน 8 มิติ ฟรี พร้อมรายงานและคำแนะนำ",
		"svc.govSupported.title": "บริการที่รัฐสนับสนุน",
		"svc.engConsulting.title": "ที่ปรึกษางานวิศวกรรม",
		"svc.engConsulting.sub": "ภาพรวมและกลยุทธ์งานวิศวกรรมโดยวุฒิวิศวกร",
		"svc.engDesign.title": "ออกแบบงานวิศวกรรม & เซ็นรับรองแบบ",
		"svc.digitalFactory360.title": "Digital Factory Layout 360",
		"svc.smartPreventiveMaintenance.title": "Smart Preventive Maintenance",
		"svc.shindanLeanKaizen.title": "Shindan–Lean–Kaizen",
		"svc.onlineMarketingSmartOps.title": "การตลาดออนไลน์ & ระบบทำงานอัจฉริยะ",
		"svc.inHouseTraining.title": "In-House Training",
		"svc.factoryLicense.title": "ขอใบอนุญาตโรงงาน (รง.2 / รง.4)",
		"svc.machineAutomationDesign.title": "ออกแบบเครื่องจักร / ระบบอัตโนมัติ (SA/SI)",
		"svc.engConsultingProject.title": "ที่ปรึกษาวิศวกรรม (โครงการออกแบบ/เซ็นรับรอง)",
		"svc.constructionPermits.title": "งานขออนุญาตก่อสร้าง / อาคาร",
		"svc.specialSystems.title": "งานติดตั้งระบบพิเศษ",
		"svc.environmentalSystems.title": "งานระบบบำบัดมลพิษ / สิ่งแวดล้อม",
		"svc.machineRegistration.title": "ขึ้นทะเบียนเครื่องจักร",
		"svc.certifications.title": "ใบอนุญาตและรับรองระบบ (มาตรฐาน / ISO)",
		// --- service subtitles (taglines) ---
		"svc.govSupported.sub": "โครงการที่ได้รับการสนับสนุนจากภาครัฐ ช่วยลดต้นทุนการพัฒนาโรงงาน",
		"svc.engDesign.sub": "ออกแบบและเซ็นรับรองแบบงานวิศวกรรมโดยวุฒิวิศวกร",
		"svc.digitalFactory360.sub": "ออกแบบและจัดวางผังโรงงานแบบดิจิทัล 360°",
		"svc.smartPreventiveMaintenance.sub": "วางระบบบำรุงรักษาเชิงป้องกันอัจฉริยะ",
		"svc.shindanLeanKaizen.sub": "วินิจฉัยและปรับปรุงกระบวนการด้วย Lean–Kaizen",
		"svc.onlineMarketingSmartOps.sub": "การตลาดออนไลน์และระบบปฏิบัติการอัจฉริยะ",
		"svc.inHouseTraining.sub": "อบรมภายในองค์กรตามความต้องการเฉพาะ",
		"svc.factoryLicense.sub": "ดำเนินการขอใบอนุญาตประกอบกิจการโรงงาน รง.2 / รง.4",
		"svc.machineAutomationDesign.sub": "ออกแบบเครื่องจักรและระบบอัตโนมัติ (SA/SI)",
		"svc.engConsultingProject.sub": "ที่ปรึกษาวิศวกรรมสำหรับโครงการออกแบบและเซ็นรับรอง",
		"svc.constructionPermits.sub": "ดำเนินการขออนุญาตก่อสร้างและดัดแปลงอาคาร",
		"svc.specialSystems.sub": "ติดตั้งระบบพิเศษสำหรับงานอุตสาหกรรม",
		"svc.environmentalSystems.sub": "ออกแบบและติดตั้งระบบบำบัดมลพิษและสิ่งแวดล้อม",
		"svc.machineRegistration.sub": "ดำเนินการขึ้นทะเบียนเครื่องจักรตามกฎหมาย",
		"svc.certifications.sub": "ขอใบอนุญาตและการรับรองระบบมาตรฐาน / ISO",
		// --- service page UI ---
		"svc.ui.breadcrumbServices": "บริการของเรา",
		"svc.ui.servicesInGroup": "บริการในกลุ่มนี้",
		"svc.ui.overview": "ภาพรวมบริการ",
		"svc.ui.otherInGroup": "บริการอื่นในกลุ่มนี้",
		"svc.ui.relatedServices": "บริการอื่นๆ",
		"svc.ui.comingSoonTitle": "รายละเอียดบริการเร็วๆ นี้",
		"svc.ui.comingSoonBody": "ทีมงานกำลังเตรียมข้อมูลบริการนี้ ติดต่อเราเพื่อสอบถามรายละเอียดเพิ่มเติมได้ทันที",
		"svc.ui.ctaPrimary": "เริ่มประเมินฟรี",
		"svc.ui.ctaConsult": "ขอคำปรึกษา",
		"svc.ui.ctaContact": "ติดต่อเรา",
		"svc.ui.bottomCtaTitle": "พร้อมยกระดับโรงงานของคุณแล้วหรือยัง?",
		"svc.ui.bottomCtaSub": "เริ่มต้นวันนี้ เพื่อผลลัพธ์ที่ดีกว่าเดิม",
		"svc.ui.bottomCtaBtn": "เริ่มประเมินฟรีเลย",
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
		"signin.confirmPasswordLabel": "ยืนยันรหัสผ่าน", // NOSONAR S2068 — i18n label, not a credential
		"signin.signInWithEmail": "เข้าสู่ระบบ",
		"signin.signInWithGoogle": "เข้าสู่ระบบด้วย Google",
		"signin.createAccount": "สร้างบัญชี",
		"signin.forgotPassword": "ลืมรหัสผ่าน?", // NOSONAR S2068 — i18n label, not a credential
		"signin.sendResetEmail": "ส่งลิงก์รีเซ็ต",
		"signin.resetEmailSent": "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล",
		"signin.backToSignIn": "กลับสู่การเข้าสู่ระบบ",
		"signin.orContinueWith": "หรือ",
		"signin.noAccount": "ยังไม่มีบัญชี?",
		"signin.haveAccount": "มีบัญชีแล้ว?",
		"signin.signInLink": "เข้าสู่ระบบ",
		"signin.signUpLink": "สร้างบัญชี",
		"signin.loading": "กำลังโหลด...",
		"signin.showPassword": "แสดงรหัสผ่าน", // NOSONAR S2068 — i18n label, not a credential
		"signin.hidePassword": "ซ่อนรหัสผ่าน", // NOSONAR S2068 — i18n label, not a credential
		"signin.errorInvalidEmail": "รูปแบบอีเมลไม่ถูกต้อง",
		"signin.errorInvalidCredential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
		"signin.errorEmailInUse": "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ",
		"signin.errorWeakPassword": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
		"signin.errorTooManyRequests": "ลองผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง",
		"signin.errorNetwork": "เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ",
		"signin.errorGeneric": "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
		"signin.errorPasswordMismatch": "รหัสผ่านไม่ตรงกัน", // NOSONAR S2068 — i18n label, not a credential
		"signin.errorAccountExistsOtherProvider": "อีเมลนี้ใช้วิธีการเข้าสู่ระบบอื่น ลองเข้าสู่ระบบด้วย Google แทน",
		"signin.errorPopupBlocked": "ป๊อปอัปถูกบล็อก กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้แล้วลองอีกครั้ง",
		"signin.errorOperationNotAllowed": "การเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ",

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
		"topbar.cta": "สนใจตรวจสุขภาพโรงงาน? ติดต่อ Line @factorysyncsolutions",

		// --- contact page ---
		"contact.title": "ติดต่อเรา",
		"contact.subtitle": "สนใจตรวจสุขภาพโรงงาน หรือต้องการข้อมูลเพิ่มเติม ติดต่อทีมงานได้เลย",
		"contact.lineCard.title": "LINE Official Account",
		"contact.lineCard.body": "แอดไลน์เพื่อสอบถามข้อมูล นัดตรวจสุขภาพโรงงาน และรับโปรโมชัน",
		"contact.lineCard.cta": "เพิ่มเพื่อนใน LINE",
		"contact.emailCard.title": "อีเมล",
		"contact.emailCard.body": "ส่งคำถามหรือรายละเอียดโครงการมาได้เลย",
		"contact.phoneCard.title": "โทรศัพท์",
		"contact.hoursCard.title": "เวลาทำการ",
		"contact.appCard.title": "เริ่มประเมินฟรีทันที",
		"contact.appCard.body": "สมัครฟรี ไม่มีค่าใช้จ่าย ใช้เวลาเพียง 15 นาที",
		"contact.appCard.cta": "เริ่มตรวจสุขภาพโรงงาน",

		// --- about pages ---
		"about.overview.title": "เกี่ยวกับ FactorySync Solutions",
		"about.overview.subtitle": "ทีมวุฒิวิศวกรและที่ปรึกษาผู้เชี่ยวชาญ ที่พร้อมยกระดับโรงงานของคุณ",
		"about.overview.intro":
			"FactorySync Solutions คือบริษัทที่ปรึกษาด้านวิศวกรรมและการผลิต มุ่งเน้นช่วยให้โรงงานอุตสาหกรรมไทยเติบโตอย่างยั่งยืนด้วยเทคโนโลยีและความเชี่ยวชาญระดับวุฒิวิศวกร",
		"about.company.link": "ประวัติบริษัท / วิสัยทัศน์",
		"about.team.link": "ทีมวิศวกร",
		"about.caseStudies.link": "ผลงาน / ลูกค้าที่ไว้วางใจ",
		"about.company.title": "ประวัติบริษัทและวิสัยทัศน์",
		"about.company.subtitle": "จากความเชี่ยวชาญ 15 ปี สู่แพลตฟอร์มตรวจสุขภาพโรงงานอัจฉริยะ",
		"about.company.historyTitle": "ประวัติความเป็นมา",
		"about.company.historyBody":
			"FactorySync Solutions ก่อตั้งโดยทีมวุฒิวิศวกรอุตสาหการที่มีประสบการณ์มากกว่า 15 ปีในอุตสาหกรรมการผลิตของประเทศไทย เราเห็นว่าโรงงานขนาดกลางและขนาดย่อมขาดเครื่องมือที่เข้าถึงได้ง่ายในการประเมินและยกระดับการดำเนินงาน จึงพัฒนาระบบตรวจสุขภาพโรงงานที่ผสมผสาน AI และความเชี่ยวชาญของวุฒิวิศวกรเข้าด้วยกัน",
		"about.company.visionTitle": "วิสัยทัศน์",
		"about.company.visionBody":
			"เป็นพันธมิตรหลักด้านการยกระดับโรงงานอุตสาหกรรมไทย ให้ทุกโรงงานเข้าถึงการประเมินและคำแนะนำจากวุฒิวิศวกรได้อย่างสะดวก รวดเร็ว และมีประสิทธิภาพ",
		"about.company.missionTitle": "พันธกิจ",
		"about.company.missionBody":
			"ให้บริการตรวจสุขภาพโรงงานที่ครอบคลุม 8 มิติ ด้วยเทคโนโลยี AI ที่ตรวจสอบโดยวุฒิวิศวกร เพื่อมอบแผนปรับปรุงที่ปฏิบัติได้จริง วัดผลได้ และยั่งยืน",
		"about.company.valuesTitle": "ค่านิยมองค์กร",
		"about.company.values.integrity": "ซื่อสัตย์และมืออาชีพ",
		"about.company.values.excellence": "มุ่งมั่นความเป็นเลิศ",
		"about.company.values.impact": "สร้างผลลัพธ์ที่วัดได้",
		"about.company.values.accessibility": "เข้าถึงได้สำหรับทุกขนาดธุรกิจ",
		"about.team.title": "ทีมวิศวกรและที่ปรึกษา",
		"about.team.subtitle": "ทีมผู้เชี่ยวชาญที่พร้อมให้คำปรึกษาและรับรองงานวิศวกรรมอย่างมืออาชีพ",
		"about.team.engineerTitle": "วุฒิวิศวกร",
		"about.team.engineerDesc":
			"ทีมวุฒิวิศวกรอุตสาหการที่ได้รับใบอนุญาตจากสภาวิศวกร มีประสบการณ์ตรวจสุขภาพโรงงานและให้คำปรึกษาครอบคลุม 8 มิติ",
		"about.team.consultantTitle": "ที่ปรึกษาอาวุโส",
		"about.team.consultantDesc":
			"ผู้เชี่ยวชาญด้าน Lean, Kaizen และการปรับปรุงกระบวนการผลิต ที่มีประสบการณ์ทำงานร่วมกับโรงงาน 200+ แห่ง",
		"about.team.trainerTitle": "วิทยากรผู้เชี่ยวชาญ",
		"about.team.trainerDesc":
			"ทีม In-House Training ที่ออกแบบหลักสูตรเฉพาะสำหรับแต่ละโรงงาน ถ่ายทอดความรู้ด้านวิศวกรรมและการผลิตอย่างมืออาชีพ",
		"about.caseStudies.title": "ผลงานและลูกค้าที่ไว้วางใจ",
		"about.caseStudies.subtitle": "โรงงานและองค์กรชั้นนำที่เลือกใช้บริการ FactorySync Solutions",
		"about.caseStudies.stat1.value": "200+",
		"about.caseStudies.stat1.label": "โรงงานที่ให้บริการ",
		"about.caseStudies.stat2.value": "8",
		"about.caseStudies.stat2.label": "มิติการประเมิน",
		"about.caseStudies.stat3.value": "15+",
		"about.caseStudies.stat3.label": "ปีประสบการณ์",
		"about.caseStudies.stat4.value": "98%",
		"about.caseStudies.stat4.label": "ลูกค้าพึงพอใจ",
		"about.caseStudies.industriesTitle": "อุตสาหกรรมที่ให้บริการ",
		"about.caseStudies.ctaTitle": "พร้อมเป็นลูกค้าของเราหรือยัง?",
		"about.caseStudies.ctaBody": "เริ่มต้นด้วยการตรวจสุขภาพโรงงานฟรี ได้วันนี้เลย",
		"about.caseStudies.ctaButton": "เริ่มตรวจสุขภาพโรงงานฟรี",
		// --- Knowledge Hub (Phase 4) ---
		"knowledge.title": "บทความ / ความรู้",
		"knowledge.subtitle":
			"รวมความรู้ด้านวิศวกรรม การจัดการโรงงาน กฎหมาย และเทคโนโลยี เพื่อยกระดับโรงงานของคุณ",
		"knowledge.metaDescription":
			"บทความและความรู้สำหรับโรงงานอุตสาหกรรม — กฎหมายใบอนุญาต ความปลอดภัย Digital Factory เครื่องจักร สิ่งแวดล้อม Lean & Kaizen และสิทธิประโยชน์ภาครัฐ",
		"knowledge.browseByCategory": "หมวดหมู่บทความ",
		"knowledge.allArticles": "บทความทั้งหมด",
		"knowledge.latestArticles": "บทความล่าสุด",
		"knowledge.articlesInCategory": "บทความในหมวดนี้",
		"knowledge.readMore": "อ่านต่อ",
		"knowledge.backToHub": "กลับไปหน้าบทความทั้งหมด",
		"knowledge.publishedOn": "เผยแพร่เมื่อ",
		"knowledge.by": "โดย",
		"knowledge.empty": "ยังไม่มีบทความเผยแพร่ในขณะนี้ โปรดกลับมาใหม่อีกครั้ง",
		"knowledge.emptyCategory": "ยังไม่มีบทความในหมวดนี้ ลองดูหมวดอื่นหรือกลับมาใหม่ภายหลัง",
		"knowledge.category.law-licensing": "กฎหมาย / ใบอนุญาตโรงงาน",
		"knowledge.category.factory-safety": "ความปลอดภัยโรงงาน",
		"knowledge.category.digital-factory": "Digital Factory & เทคโนโลยี",
		"knowledge.category.machinery-automation": "เครื่องจักร & ระบบอัตโนมัติ",
		"knowledge.category.environment": "สิ่งแวดล้อม / บำบัดมลพิษ",
		"knowledge.category.lean-kaizen": "Lean & Kaizen / เพิ่มผลผลิต",
		"knowledge.category.digital-marketing": "การตลาดออนไลน์ & Digital Transformation",
		"knowledge.category.gov-benefits": "สิทธิประโยชน์ภาครัฐ / มาตรฐานสากล",
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
		"nav.services": "Services",
		"nav.knowledge": "Knowledge Hub",
		"nav.freeCheckCta": "Free Factory Health Check",
		"nav.viewAll": "View all",
		"nav.aboutCompany": "Company / Vision",
		"nav.aboutTeam": "Engineer Team",
		"nav.aboutCaseStudies": "Case Studies / Clients",
		"cta.float": "Get a free factory health check",
		"cta.floatShort": "Free check",
		"svc.freeHealthCheck.title": "Free Factory Health Check",
		"svc.freeHealthCheck.sub": "Free 8-dimension assessment with report & guidance",
		"svc.govSupported.title": "Government-Supported Services",
		"svc.engConsulting.title": "Engineering Consulting",
		"svc.engConsulting.sub": "Engineering overview & strategy by licensed engineers",
		"svc.engDesign.title": "Engineering Design & Certified Sign-off",
		"svc.digitalFactory360.title": "Digital Factory Layout 360",
		"svc.smartPreventiveMaintenance.title": "Smart Preventive Maintenance",
		"svc.shindanLeanKaizen.title": "Shindan–Lean–Kaizen",
		"svc.onlineMarketingSmartOps.title": "Online Marketing & Smart Ops",
		"svc.inHouseTraining.title": "In-House Training",
		"svc.factoryLicense.title": "Factory License (รง.2 / รง.4)",
		"svc.machineAutomationDesign.title": "Machine / Automation Design (SA/SI)",
		"svc.engConsultingProject.title": "Engineering Consulting (design/sign-off)",
		"svc.constructionPermits.title": "Construction / Building Permits",
		"svc.specialSystems.title": "Special System Installation",
		"svc.environmentalSystems.title": "Pollution / Environmental Systems",
		"svc.machineRegistration.title": "Machine Registration",
		"svc.certifications.title": "Certifications & Standards (ISO)",
		// --- service subtitles (taglines) ---
		"svc.govSupported.sub":
			"Government-backed programs that cut the cost of upgrading your factory",
		"svc.engDesign.sub": "Engineering design and certified sign-off by licensed engineers",
		"svc.digitalFactory360.sub": "Digital 360° factory layout design and planning",
		"svc.smartPreventiveMaintenance.sub": "Set up an intelligent preventive-maintenance system",
		"svc.shindanLeanKaizen.sub": "Diagnose and improve processes with Lean–Kaizen",
		"svc.onlineMarketingSmartOps.sub": "Online marketing paired with smart operations",
		"svc.inHouseTraining.sub": "In-house training tailored to your needs",
		"svc.factoryLicense.sub": "Handling factory operating licenses (รง.2 / รง.4)",
		"svc.machineAutomationDesign.sub": "Machine and automation system design (SA/SI)",
		"svc.engConsultingProject.sub": "Engineering consulting for design and sign-off projects",
		"svc.constructionPermits.sub": "Construction and building-modification permits",
		"svc.specialSystems.sub": "Special-system installation for industrial work",
		"svc.environmentalSystems.sub": "Pollution-treatment and environmental system design",
		"svc.machineRegistration.sub": "Statutory machine registration handling",
		"svc.certifications.sub": "Standard / ISO system licensing and certification",
		// --- service page UI ---
		"svc.ui.breadcrumbServices": "Our Services",
		"svc.ui.servicesInGroup": "Services in this group",
		"svc.ui.overview": "Overview",
		"svc.ui.otherInGroup": "Other services in this group",
		"svc.ui.relatedServices": "Other services",
		"svc.ui.comingSoonTitle": "Service details coming soon",
		"svc.ui.comingSoonBody":
			"We're preparing the details for this service. Contact us anytime for more information.",
		"svc.ui.ctaPrimary": "Start Free Assessment",
		"svc.ui.ctaConsult": "Request a consultation",
		"svc.ui.ctaContact": "Contact us",
		"svc.ui.bottomCtaTitle": "Ready to level up your factory?",
		"svc.ui.bottomCtaSub": "Start today for better results.",
		"svc.ui.bottomCtaBtn": "Start Free Assessment",
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
		"signin.errorPopupBlocked":
			"Popup was blocked. Please allow popups for this site and try again.",
		"signin.errorOperationNotAllowed":
			"Google sign-in is not enabled. Please contact the administrator.",

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
		"topbar.cta": "Interested in a factory health check? Contact Line @factorysyncsolutions",

		// --- contact page ---
		"contact.title": "Contact Us",
		"contact.subtitle":
			"Interested in a factory health check or need more information? Reach out to our team.",
		"contact.lineCard.title": "LINE Official Account",
		"contact.lineCard.body":
			"Add us on LINE to ask questions, book a factory health check, and receive promotions.",
		"contact.lineCard.cta": "Add on LINE",
		"contact.emailCard.title": "Email",
		"contact.emailCard.body": "Send us your questions or project details.",
		"contact.phoneCard.title": "Phone",
		"contact.hoursCard.title": "Office Hours",
		"contact.appCard.title": "Start Your Free Assessment",
		"contact.appCard.body": "Register free — no charge, takes only 15 minutes.",
		"contact.appCard.cta": "Start Factory Health Check",

		// --- about pages ---
		"about.overview.title": "About FactorySync Solutions",
		"about.overview.subtitle":
			"Licensed engineers and specialist consultants ready to elevate your factory.",
		"about.overview.intro":
			"FactorySync Solutions is an engineering and manufacturing consultancy focused on helping Thai factories grow sustainably through technology and licensed-engineer expertise.",
		"about.company.link": "Company / Vision",
		"about.team.link": "Engineer Team",
		"about.caseStudies.link": "Case Studies / Clients",
		"about.company.title": "Company History & Vision",
		"about.company.subtitle":
			"From 15 years of expertise to an intelligent factory health check platform.",
		"about.company.historyTitle": "Our History",
		"about.company.historyBody":
			"FactorySync Solutions was founded by a team of licensed industrial engineers with over 15 years of experience in Thai manufacturing. We saw that SME factories lacked accessible tools to assess and improve their operations, so we built a factory health check system that combines AI with licensed-engineer expertise.",
		"about.company.visionTitle": "Vision",
		"about.company.visionBody":
			"To be the primary partner for elevating Thai industrial factories, making licensed-engineer assessment and guidance accessible, fast, and effective for every factory.",
		"about.company.missionTitle": "Mission",
		"about.company.missionBody":
			"To deliver comprehensive factory health checks across 8 dimensions — powered by AI and verified by licensed engineers — producing improvement plans that are practical, measurable, and sustainable.",
		"about.company.valuesTitle": "Our Values",
		"about.company.values.integrity": "Integrity & Professionalism",
		"about.company.values.excellence": "Commitment to Excellence",
		"about.company.values.impact": "Measurable Impact",
		"about.company.values.accessibility": "Accessible to Every Business",
		"about.team.title": "Engineer & Consultant Team",
		"about.team.subtitle":
			"Specialists ready to consult and certify engineering work professionally.",
		"about.team.engineerTitle": "Licensed Engineers",
		"about.team.engineerDesc":
			"A team of licensed industrial engineers certified by the Engineering Council of Thailand, experienced in factory health checks and consulting across all 8 dimensions.",
		"about.team.consultantTitle": "Senior Consultants",
		"about.team.consultantDesc":
			"Lean, Kaizen, and manufacturing process-improvement specialists with hands-on experience across 200+ factories.",
		"about.team.trainerTitle": "Expert Trainers",
		"about.team.trainerDesc":
			"An In-House Training team that designs factory-specific curricula, delivering engineering and manufacturing knowledge with professionalism.",
		"about.caseStudies.title": "Case Studies & Trusted Clients",
		"about.caseStudies.subtitle":
			"Leading factories and organizations that choose FactorySync Solutions.",
		"about.caseStudies.stat1.value": "200+",
		"about.caseStudies.stat1.label": "Factories Served",
		"about.caseStudies.stat2.value": "8",
		"about.caseStudies.stat2.label": "Assessment Dimensions",
		"about.caseStudies.stat3.value": "15+",
		"about.caseStudies.stat3.label": "Years of Experience",
		"about.caseStudies.stat4.value": "98%",
		"about.caseStudies.stat4.label": "Client Satisfaction",
		"about.caseStudies.industriesTitle": "Industries We Serve",
		"about.caseStudies.ctaTitle": "Ready to join our clients?",
		"about.caseStudies.ctaBody": "Start with a free factory health check today.",
		"about.caseStudies.ctaButton": "Start Free Factory Health Check",
		// --- Knowledge Hub (Phase 4) ---
		"knowledge.title": "Knowledge Hub",
		"knowledge.subtitle":
			"Engineering, factory management, regulatory and technology insights to help you level up your plant.",
		"knowledge.metaDescription":
			"Articles and insights for industrial factories — licensing law, safety, Digital Factory, machinery, environment, Lean & Kaizen, and government benefits.",
		"knowledge.browseByCategory": "Browse by category",
		"knowledge.allArticles": "All articles",
		"knowledge.latestArticles": "Latest articles",
		"knowledge.articlesInCategory": "Articles in this category",
		"knowledge.readMore": "Read more",
		"knowledge.backToHub": "Back to all articles",
		"knowledge.publishedOn": "Published",
		"knowledge.by": "By",
		"knowledge.empty": "No articles have been published yet. Please check back soon.",
		"knowledge.emptyCategory": "No articles in this category yet. Try another category or check back later.",
		"knowledge.category.law-licensing": "Law / Factory Licensing",
		"knowledge.category.factory-safety": "Factory Safety",
		"knowledge.category.digital-factory": "Digital Factory & Tech",
		"knowledge.category.machinery-automation": "Machinery & Automation",
		"knowledge.category.environment": "Environment / Pollution Treatment",
		"knowledge.category.lean-kaizen": "Lean & Kaizen / Productivity",
		"knowledge.category.digital-marketing": "Online Marketing & DX",
		"knowledge.category.gov-benefits": "Gov Benefits / Intl Standards",
	},
};

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
	const [localeState, setLocaleState] = useState<Locale>("th");

	useEffect(() => {
		const stored = getInitialLocale();
		if (stored !== "th") setLocaleState(stored);

		// Sync locale changes broadcast by other islands on this page
		const handleLocaleChange = (e: Event) => {
			const detail = (e as CustomEvent<string>).detail;
			if (detail === "en" || detail === "th") setLocaleState(detail);
		};
		globalThis.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
		return () => globalThis.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
	}, []);

	const setLocale = useCallback((l: Locale) => {
		setLocaleState(l);
		try {
			localStorage.setItem(STORAGE_KEY, l);
		} catch {
			// ignore
		}
		// Broadcast to other islands on the same page (storage event doesn't fire in same window)
		globalThis.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: l }));
	}, []);

	const t = useCallback(
		(key: string): string => {
			return translations[localeState][key] ?? key;
		},
		[localeState]
	);

	const value = useMemo(() => ({ locale: localeState, setLocale, t }), [localeState, setLocale, t]);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
	const ctx = useContext(LocaleContext);
	if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
	return ctx;
}
