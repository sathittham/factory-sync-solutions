import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type Locale = "th" | "en";

interface LocaleContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: string) => string;
}

interface LocaleProviderProps {
	readonly children: ReactNode;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "fhc-locale";

function getInitialLocale(): Locale {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "en" || stored === "th") return stored;
	} catch {
		// SSR or storage unavailable
	}
	return "th";
}

export function LocaleProvider({ children }: LocaleProviderProps) {
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
			const dict = translations[locale];
			return dict[key] ?? key;
		},
		[locale],
	);

	const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

	return (
		<LocaleContext.Provider value={value}>
			{children}
		</LocaleContext.Provider>
	);
}

export function useLocale() {
	const ctx = useContext(LocaleContext);
	if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
	return ctx;
}

const translations: Record<Locale, Record<string, string>> = {
	th: {
		// Layout / Nav
		"nav.appName": "Factory Health Check",
		"nav.quiz": "แบบประเมิน",
		"nav.results": "ผลลัพธ์",
		"nav.admin": "แอดมิน",
		"nav.signOut": "ออกจากระบบ",
		"nav.profile": "โปรไฟล์บริษัท",

		// Landing
		"landing.title": "Factory Health Check",
		"landing.subtitle": "ประเมินความพร้อมด้านการดำเนินงานของโรงงานใน 7 มิติหลัก รับข้อมูลเชิงลึกและคำแนะนำเฉพาะทาง",
		"landing.questionsInfo": "35 คำถามใน 7 มิติ:",
		"landing.dim.quality": "การจัดการคุณภาพ",
		"landing.dim.safety": "ความปลอดภัยและการปฏิบัติตามกฎ",
		"landing.dim.equipment": "เครื่องจักรและการบำรุงรักษา",
		"landing.dim.workforce": "บุคลากรและการฝึกอบรม",
		"landing.dim.digital": "การเปลี่ยนผ่านสู่ดิจิทัล",
		"landing.dim.supply": "การจัดการห่วงโซ่อุปทาน",
		"landing.dim.environment": "สิ่งแวดล้อมและความยั่งยืน",
		"landing.signIn": "เข้าสู่ระบบด้วย Google",

		// Register
		"register.title": "ลงทะเบียนบริษัท",
		"register.subtitle": "กรอกข้อมูลบริษัทเพื่อเริ่มการประเมิน",
		"register.regId": "เลขทะเบียนนิติบุคคล (13 หลัก)",
		"register.lookup": "ค้นหา",
		"register.lookupLoading": "...",
		"register.lookupFound": "พบแล้ว",
		"register.regIdTaken.title": "บริษัทลงทะเบียนแล้ว",
		"register.regIdTaken.desc": "มีบัญชีที่ใช้เลขทะเบียนนี้แล้ว ระบบได้กรอกข้อมูลบริษัทให้แล้ว คุณยังสามารถลงทะเบียนด้วยอีเมลของคุณได้",
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
		"register.select": "เลือก...",
		"register.regIdError": "ต้องเป็นตัวเลข 13 หลัก",
		"register.companyNameError": "กรุณากรอกชื่อบริษัท",
		"register.industryTypeError": "กรุณาเลือกประเภทอุตสาหกรรม",
		"register.companySizeError": "กรุณาเลือกขนาดบริษัท",
		"register.contactNameError": "กรุณากรอกชื่อผู้ติดต่อ",
		"register.contactEmailError": "อีเมลไม่ถูกต้อง",
		"register.contactPhoneError": "กรุณากรอกเบอร์โทรศัพท์",

		// Industry types
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

		// Company sizes
		"size.small": "เล็ก (< 50 คน)",
		"size.medium": "กลาง (50-200 คน)",
		"size.large": "ใหญ่ (> 200 คน)",

		// Quiz
		"quiz.title": "แบบประเมินสุขภาพโรงงาน",
		"quiz.completed.title": "คุณทำแบบประเมินแล้ว",
		"quiz.completed.desc": "คุณสามารถดูผลลัพธ์ก่อนหน้า หรือทำแบบประเมินใหม่เพื่ออัปเดตคะแนน",
		"quiz.viewResults": "ดูผลลัพธ์",
		"quiz.retake": "ทำแบบประเมินใหม่",
		"quiz.loadError": "ไม่สามารถโหลดคำถามได้",
		"quiz.submitError": "การส่งแบบประเมินล้มเหลว กรุณาลองอีกครั้ง",
		"quiz.previous": "ก่อนหน้า",
		"quiz.next": "ถัดไป",
		"quiz.submit": "ส่งแบบประเมิน",
		"quiz.submitting": "กำลังส่ง...",
		"quiz.stronglyDisagree": "ไม่เห็นด้วยอย่างยิ่ง",
		"quiz.stronglyAgree": "เห็นด้วยอย่างยิ่ง",

		// Results
		"result.overallScore": "คะแนนรวม",
		"result.dimensionScores": "คะแนนรายมิติ",
		"result.strengths": "จุดแข็ง",
		"result.weaknesses": "ส่วนที่ควรปรับปรุง",
		"result.noResults.title": "ยังไม่มีผลลัพธ์",
		"result.noResults.desc": "ทำแบบประเมินเพื่อดูผลประเมินสุขภาพโรงงาน",
		"result.previousAssessments": "ผลประเมินก่อนหน้า",
		"result.dimensionDetail": "รายละเอียดรายมิติ",

		// Diagnosis
		"diagnosis.Beginning": "เริ่มต้น",
		"diagnosis.Developing": "กำลังพัฒนา",
		"diagnosis.Established": "มั่นคง",
		"diagnosis.Advanced": "ก้าวหน้า",

		// Admin
		"admin.title": "แดชบอร์ดแอดมิน",
		"admin.totalSubmissions": "จำนวนผู้ทำแบบประเมิน",
		"admin.avgScore": "คะแนนเฉลี่ย",
		"admin.distribution": "การกระจายผลวินิจฉัย",
		"admin.industry": "อุตสาหกรรม",
		"admin.companySize": "ขนาดบริษัท",
		"admin.allIndustries": "อุตสาหกรรมทั้งหมด",
		"admin.allSizes": "ทุกขนาด",
		"admin.exportCsv": "ส่งออก CSV",
		"admin.id": "รหัส",
		"admin.score": "คะแนน",
		"admin.diagnosis": "ผลวินิจฉัย",
		"admin.date": "วันที่",
		"admin.noAssessments": "ไม่พบข้อมูลการประเมิน",
		"admin.company": "บริษัท",
		"admin.contactName": "ผู้ติดต่อ",
		"admin.contactEmail": "อีเมลผู้ติดต่อ",
		"admin.noDetail": "ไม่มีรายละเอียดเพิ่มเติม",

		// Profile
		"profile.title": "โปรไฟล์บริษัท",
		"profile.subtitle": "แก้ไขข้อมูลบริษัทและผู้ติดต่อ",
		"profile.email": "อีเมลบัญชี",
		"profile.regId": "เลขทะเบียนนิติบุคคล",
		"profile.save": "บันทึกการเปลี่ยนแปลง",
		"profile.saving": "กำลังบันทึก...",
		"profile.saved": "บันทึกเรียบร้อยแล้ว",
		"profile.error": "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง",

		// 404
		"notFound.title": "ไม่พบหน้าที่ค้นหา",
		"notFound.goHome": "กลับหน้าหลัก",
	},

	en: {
		// Layout / Nav
		"nav.appName": "Factory Health Check",
		"nav.quiz": "Quiz",
		"nav.results": "Results",
		"nav.admin": "Admin",
		"nav.signOut": "Sign Out",
		"nav.profile": "Company Profile",

		// Landing
		"landing.title": "Factory Health Check",
		"landing.subtitle": "Assess your factory's operational maturity across 7 key dimensions. Get personalized insights and recommendations.",
		"landing.questionsInfo": "35 questions across 7 dimensions:",
		"landing.dim.quality": "Quality Management",
		"landing.dim.safety": "Safety & Compliance",
		"landing.dim.equipment": "Equipment & Maintenance",
		"landing.dim.workforce": "Workforce & Training",
		"landing.dim.digital": "Digital Transformation",
		"landing.dim.supply": "Supply Chain Management",
		"landing.dim.environment": "Environmental Sustainability",
		"landing.signIn": "Sign in with Google",

		// Register
		"register.title": "Register Your Company",
		"register.subtitle": "Fill in your company details to start the assessment.",
		"register.regId": "Company Registration ID (13 digits)",
		"register.lookup": "Lookup",
		"register.lookupLoading": "...",
		"register.lookupFound": "Found",
		"register.regIdTaken.title": "Company already registered",
		"register.regIdTaken.desc": "already has an account with this registration ID. Company details have been prefilled. You can still register with your email.",
		"register.companyName": "Company Name",
		"register.industryType": "Industry Type",
		"register.companySize": "Company Size",
		"register.contactName": "Contact Name",
		"register.contactEmail": "Contact Email",
		"register.contactPhone": "Contact Phone",
		"register.submit": "Register",
		"register.submitting": "Registering...",
		"register.error": "Registration failed. Please try again.",
		"register.captchaRequired": "Please complete the captcha verification.",
		"register.select": "Select...",
		"register.regIdError": "Must be 13 digits",
		"register.companyNameError": "Company name is required",
		"register.industryTypeError": "Industry type is required",
		"register.companySizeError": "Company size is required",
		"register.contactNameError": "Contact name is required",
		"register.contactEmailError": "Invalid email",
		"register.contactPhoneError": "Phone number is required",

		// Industry types
		"industry.manufacturing": "Manufacturing",
		"industry.food": "Food & Beverage",
		"industry.automotive": "Automotive",
		"industry.electronics": "Electronics",
		"industry.textile": "Textile & Garment",
		"industry.chemical": "Chemical & Petrochemical",
		"industry.construction": "Construction & Building Materials",
		"industry.agriculture": "Agriculture & Agribusiness",
		"industry.logistics": "Logistics & Supply Chain",
		"industry.energy": "Energy & Utilities",
		"industry.pharma": "Pharmaceutical & Medical Device",
		"industry.plastics": "Plastics & Rubber",
		"industry.printing": "Printing & Packaging",
		"industry.metal": "Metal & Steel",
		"industry.wood": "Wood & Furniture",
		"industry.other": "Other",

		// Company sizes
		"size.small": "Small (< 50 employees)",
		"size.medium": "Medium (50-200 employees)",
		"size.large": "Large (> 200 employees)",

		// Quiz
		"quiz.title": "Factory Health Check Assessment",
		"quiz.completed.title": "You've already completed an assessment",
		"quiz.completed.desc": "You can view your previous results or take the assessment again to get updated scores.",
		"quiz.viewResults": "View Results",
		"quiz.retake": "Retake Assessment",
		"quiz.loadError": "Failed to load questions.",
		"quiz.submitError": "Failed to submit quiz. Please try again.",
		"quiz.previous": "Previous",
		"quiz.next": "Next",
		"quiz.submit": "Submit Assessment",
		"quiz.submitting": "Submitting...",
		"quiz.stronglyDisagree": "Strongly Disagree",
		"quiz.stronglyAgree": "Strongly Agree",

		// Results
		"result.overallScore": "Overall Score",
		"result.dimensionScores": "Dimension Scores",
		"result.strengths": "Strengths",
		"result.weaknesses": "Areas for Improvement",
		"result.noResults.title": "No Results Yet",
		"result.noResults.desc": "Complete the quiz to see your factory health assessment.",
		"result.previousAssessments": "Previous Assessments",
		"result.dimensionDetail": "Dimension Detail",

		// Diagnosis
		"diagnosis.Beginning": "Beginning",
		"diagnosis.Developing": "Developing",
		"diagnosis.Established": "Established",
		"diagnosis.Advanced": "Advanced",

		// Admin
		"admin.title": "Admin Dashboard",
		"admin.totalSubmissions": "Total Submissions",
		"admin.avgScore": "Average Score",
		"admin.distribution": "Diagnosis Distribution",
		"admin.industry": "Industry",
		"admin.companySize": "Company Size",
		"admin.allIndustries": "All Industries",
		"admin.allSizes": "All Sizes",
		"admin.exportCsv": "Export CSV",
		"admin.id": "ID",
		"admin.score": "Score",
		"admin.diagnosis": "Diagnosis",
		"admin.date": "Date",
		"admin.noAssessments": "No assessments found.",
		"admin.company": "Company",
		"admin.contactName": "Contact",
		"admin.contactEmail": "Contact Email",
		"admin.noDetail": "No additional detail available.",

		// 404
		// Profile
		"profile.title": "Company Profile",
		"profile.subtitle": "Edit your company and contact information.",
		"profile.email": "Account Email",
		"profile.regId": "Registration ID",
		"profile.save": "Save Changes",
		"profile.saving": "Saving...",
		"profile.saved": "Changes saved successfully.",
		"profile.error": "Failed to save. Please try again.",

		// 404
		"notFound.title": "Page not found",
		"notFound.goHome": "Go Home",
	},
};
