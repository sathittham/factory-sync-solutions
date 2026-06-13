import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Locale = 'th' | 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

interface LocaleProviderProps {
  readonly children: ReactNode;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'fss-locale';

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'th') return stored;
  } catch {
    // SSR or storage unavailable
  }
  return 'th';
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale); // NOSONAR typescript:S6754 — setter intentionally renamed; setLocale is the public wrapper that also persists to localStorage

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

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

const translations: Record<Locale, Record<string, string>> = {
  th: {
    // Layout / Nav
    'nav.appName': 'FactorySync Solutions',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.quiz': 'แบบประเมิน',
    'nav.results': 'ผลลัพธ์',
    'nav.admin': 'แอดมิน',
    'nav.signOut': 'ออกจากระบบ',
    'nav.profile': 'โปรไฟล์',
    'nav.brandName': 'FactorySync',
    'nav.brandUnit': 'Solutions',
    'nav.main': 'เมนูหลัก',
    'nav.adminMenu': 'การจัดการระบบ',
    'nav.manageUsers': 'จัดการผู้ใช้งาน',
    'nav.companySettings': 'ตั้งค่าบริษัท',

    // Landing
    'landing.title': 'FactorySync Solutions',
    'landing.subtitle':
      'ประเมินความพร้อมด้านการจัดการการผลิตของโรงงานใน 8 มิติหลัก รับข้อมูลเชิงลึกและคำแนะนำเฉพาะทาง',
    'landing.questionsInfo': '43 คำถามใน 8 มิติ:',
    'landing.dim.basic': 'การจัดการงานเบื้องต้น',
    'landing.dim.improvement': 'การปรับปรุงการทำงาน',
    'landing.dim.coordination': 'การประสานงาน',
    'landing.dim.maintenance': 'การบำรุงรักษา',
    'landing.dim.quality': 'การควบคุมคุณภาพ/การประกันคุณภาพ',
    'landing.dim.production': 'การผลิต การควบคุม การส่งมอบ',
    'landing.dim.material': 'การควบคุมวัสดุ',
    'landing.dim.cost': 'การควบคุมต้นทุน',
    'landing.signIn': 'เข้าสู่ระบบด้วย Google',
    'landing.cta': 'เริ่มตรวจสุขภาพโรงงานฟรี!',

    // Sign In page
    'signin.title': 'ยินดีต้อนรับกลับมา',
    'signin.subtitle': 'เข้าสู่ระบบเพื่อดูผลการประเมินสุขภาพโรงงานของคุณ',
    'signin.free': 'ฟรี ไม่มีค่าใช้จ่าย',
    'signin.termsPrefix': 'การเข้าสู่ระบบถือว่าคุณยอมรับ',
    'signin.brandingQuote': 'ประเมินความพร้อมโรงงานใน 8 มิติหลัก รับข้อมูลเชิงลึกและคำแนะนำที่ตรงจุด',
    'landing.ctaBottom': 'เริ่มประเมินฟรีเลย',
    'nav.login': 'เข้าสู่ระบบ',

    // Sign In — email/password
    'signin.emailLabel': 'อีเมล',
    'signin.passwordLabel': 'รหัสผ่าน',
    'signin.confirmPasswordLabel': 'ยืนยันรหัสผ่าน', // NOSONAR typescript:S2068
    'signin.signInWithEmail': 'เข้าสู่ระบบ',
    'signin.signInWithGoogle': 'เข้าสู่ระบบด้วย Google',
    'signin.resetTitle': 'รีเซ็ตรหัสผ่าน',
    'signin.resetSubtitle': 'เราจะส่งลิงก์รีเซ็ตไปยังอีเมลของคุณ',
    'signin.forgotPassword': 'ลืมรหัสผ่าน?', // NOSONAR typescript:S2068
    'signin.sendResetEmail': 'ส่งลิงก์รีเซ็ต',
    'signin.resetEmailSent': 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล',
    'signin.backToSignIn': 'กลับสู่การเข้าสู่ระบบ',
    'signin.orContinueWith': 'หรือ',
    'signin.noAccount': 'ยังไม่มีบัญชี?',
    'signin.signInLink': 'เข้าสู่ระบบ',
    'signin.signUpLink': 'สร้างบัญชี',
    'signin.loading': 'กำลังโหลด...',
    'signin.showPassword': 'แสดงรหัสผ่าน', // NOSONAR typescript:S2068
    'signin.hidePassword': 'ซ่อนรหัสผ่าน', // NOSONAR typescript:S2068
    'signin.errorEmailRequired': 'กรุณากรอกอีเมล',
    'signin.errorPasswordRequired': 'กรุณากรอกรหัสผ่าน', // NOSONAR typescript:S2068
    'signin.errorInvalidEmail': 'รูปแบบอีเมลไม่ถูกต้อง',
    'signin.errorInvalidCredential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'signin.errorEmailInUse': 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ',
    'signin.errorWeakPassword': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'signin.errorTooManyRequests': 'ลองผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง',
    'signin.errorNetwork': 'เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ',
    'signin.errorGeneric': 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    'signin.errorPasswordMismatch': 'รหัสผ่านไม่ตรงกัน', // NOSONAR typescript:S2068
    'signin.errorAccountExistsOtherProvider': 'อีเมลนี้ใช้วิธีการเข้าสู่ระบบอื่น ลองเข้าสู่ระบบด้วย Google แทน',
    'signin.createAccountTitle': 'สร้างบัญชีใหม่',
    'signin.createAccountSubtitle': 'กรอกอีเมลและรหัสผ่านเพื่อเริ่มใช้งาน',
    'signin.createAccount': 'สร้างบัญชี',
    'signin.haveAccount': 'มีบัญชีอยู่แล้ว?',

    // No profile dialog
    'noProfile.title': 'ไม่พบบัญชีบริษัท',
    'noProfile.desc': 'คุณยังไม่มีบัญชีบริษัทในระบบ ต้องการสร้างบริษัทใหม่หรือไม่?',
    'noProfile.create': 'สร้างบริษัท',
    'noProfile.signOut': 'ออกจากระบบ',

    // Register
    'register.title': 'ลงทะเบียนบริษัท',
    'register.subtitle': 'กรอกข้อมูลบริษัทเพื่อเริ่มการประเมิน',
    'register.kicker': 'เริ่มใช้งานใน 3 ขั้นตอน',
    'register.assurance':
      'ข้อมูลนี้ใช้สำหรับสร้างพื้นที่ทำงานของบริษัทและจัดทำรายงานประเมินเท่านั้น คุณสามารถอัปเดตข้อมูลบริษัทได้ภายหลัง',
    'register.form.stepPrefix': 'ขั้นตอน',
    'register.metric.time.label': 'เวลาโดยประมาณ',
    'register.metric.time.value': '15 นาที',
    'register.metric.review.label': 'การตรวจทาน',
    'register.metric.review.value': 'โดยผู้เชี่ยวชาญ',
    'register.metric.report.label': 'ผลลัพธ์',
    'register.metric.report.value': 'รายงานพร้อมแผน',
    'register.regId': 'เลขทะเบียนนิติบุคคล (13 หลัก)',
    'register.lookup': 'ค้นหา',
    'register.lookupLoading': '...',
    'register.lookupFound': 'พบแล้ว',
    'register.regIdTaken.title': 'บริษัทลงทะเบียนแล้ว',
    'register.regIdTaken.desc':
      'มีบัญชีที่ใช้เลขทะเบียนนี้แล้ว ระบบได้กรอกข้อมูลบริษัทให้แล้ว คุณยังสามารถลงทะเบียนด้วยอีเมลของคุณได้',
    'register.companyName': 'ชื่อบริษัท',
    'register.industryType': 'ประเภทอุตสาหกรรม',
    'register.companySize': 'ขนาดบริษัท',
    'register.contactName': 'ชื่อผู้ติดต่อ',
    'register.contactEmail': 'อีเมลผู้ติดต่อ',
    'register.contactPhone': 'เบอร์โทรศัพท์',
    'register.submit': 'ลงทะเบียน',
    'register.submitting': 'กำลังลงทะเบียน...',
    'register.error': 'การลงทะเบียนล้มเหลว กรุณาลองอีกครั้ง',
    'register.captchaRequired': 'กรุณายืนยันว่าคุณไม่ใช่บอท',
    'register.captchaUnavailable': 'ไม่สามารถโหลด CAPTCHA ได้ คุณยังสามารถส่งแบบฟอร์มได้',
    'register.select': 'เลือก...',
    'register.regIdError': 'ต้องเป็นตัวเลข 13 หลัก',
    'register.companyNameError': 'กรุณากรอกชื่อบริษัท',
    'register.industryTypeError': 'กรุณาเลือกประเภทอุตสาหกรรม',
    'register.companySizeError': 'กรุณาเลือกขนาดบริษัท',
    'register.contactNameError': 'กรุณากรอกชื่อผู้ติดต่อ',
    'register.contactEmailError': 'อีเมลไม่ถูกต้อง',
    'register.contactPhoneError': 'กรุณากรอกเบอร์โทรศัพท์',
    'register.acceptTerms': 'ฉันยอมรับ',
    'register.termsLink': 'ข้อกำหนดการใช้งาน',
    'register.and': 'และ',
    'register.privacyLink': 'นโยบายความเป็นส่วนตัว',
    'register.acceptTermsError': 'กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว',
    'register.marketingConsent': 'ฉันยินยอมรับข้อมูลข่าวสารและกิจกรรมส่งเสริมการตลาด',
    'register.marketingConsentDetail': 'คุณสามารถยกเลิกได้ทุกเมื่อ ดูรายละเอียดที่',
    'register.marketingPolicyLink': 'นโยบายการตลาด',
    'register.step.account': 'สร้างบัญชี',
    'register.step.account.detail': 'สร้างบัญชีหรือเข้าสู่ระบบเพื่อผูกผู้ใช้งานกับบริษัทของคุณ',
    'register.step.company': 'ข้อมูลบริษัท',
    'register.step.company.detail': 'กรอกเลขทะเบียน ชื่อบริษัท อุตสาหกรรม และขนาดบริษัท',
    'register.step.contact': 'ข้อมูลผู้ติดต่อ',
    'register.step.contact.detail': 'ยืนยันข้อมูลผู้ประสานงานเพื่อเริ่มใช้งานแบบประเมิน',
    'register.next': 'ถัดไป',
    'register.back': 'ย้อนกลับ',
    'register.companyName.unknown': 'บริษัทที่ลงทะเบียนแล้ว',
    'register.success.title': 'ลงทะเบียนสำเร็จ!',
    'register.success.desc': 'บัญชีบริษัทของคุณพร้อมใช้งานแล้ว',
    'register.success.toDashboard': 'ไปยังแดชบอร์ด',

    // Industry types
    'industry.manufacturing': 'การผลิต',
    'industry.food': 'อาหารและเครื่องดื่ม',
    'industry.automotive': 'ยานยนต์',
    'industry.electronics': 'อิเล็กทรอนิกส์',
    'industry.textile': 'สิ่งทอและเครื่องนุ่งห่ม',
    'industry.chemical': 'เคมีภัณฑ์และปิโตรเคมี',
    'industry.construction': 'ก่อสร้างและวัสดุก่อสร้าง',
    'industry.agriculture': 'เกษตรกรรมและธุรกิจเกษตร',
    'industry.logistics': 'โลจิสติกส์และห่วงโซ่อุปทาน',
    'industry.energy': 'พลังงานและสาธารณูปโภค',
    'industry.pharma': 'ยาและเครื่องมือแพทย์',
    'industry.plastics': 'พลาสติกและยาง',
    'industry.printing': 'การพิมพ์และบรรจุภัณฑ์',
    'industry.metal': 'โลหะและเหล็กกล้า',
    'industry.wood': 'ไม้และเฟอร์นิเจอร์',
    'industry.other': 'อื่นๆ',

    // Company sizes
    'size.small': 'เล็ก (< 50 คน)',
    'size.medium': 'กลาง (50-200 คน)',
    'size.large': 'ใหญ่ (> 200 คน)',

    // Quiz
    'quiz.title': 'แบบประเมินสุขภาพโรงงาน',
    'quiz.completed.title': 'คุณทำแบบประเมินแล้ว',
    'quiz.completed.desc': 'คุณสามารถดูผลลัพธ์ก่อนหน้า หรือทำแบบประเมินใหม่เพื่ออัปเดตคะแนน',
    'quiz.viewResults': 'ดูผลลัพธ์',
    'quiz.retake': 'ทำแบบประเมินใหม่',
    'quiz.loadError': 'ไม่สามารถโหลดคำถามได้',
    'quiz.submitError': 'การส่งแบบประเมินล้มเหลว กรุณาลองอีกครั้ง',
    'quiz.previous': 'ก่อนหน้า',
    'quiz.next': 'ถัดไป',
    'quiz.submit': 'ส่งแบบประเมิน',
    'quiz.submitting': 'กำลังส่ง...',
    'quiz.stronglyDisagree': 'ไม่เห็นด้วยอย่างยิ่ง',
    'quiz.stronglyAgree': 'เห็นด้วยอย่างยิ่ง',
    'quiz.welcomeBack': 'ยินดีต้อนรับกลับ',
    'quiz.yourCompany': 'บริษัทของคุณ',
    'quiz.viewResultsDesc': 'ดูผลวิเคราะห์เชิงลึก กราฟเรดาร์ จุดแข็ง และข้อเสนอแนะ',
    'quiz.viewResultsAction': 'ดูผลลัพธ์',
    'quiz.retakeDesc': 'ทำแบบประเมินใหม่อีกครั้งเพื่อเปรียบเทียบกับผลลัพธ์ก่อนหน้า',
    'quiz.retakeAction': 'เริ่มทำใหม่',
    'quiz.otherAssessments': 'แบบประเมินอื่น',
    'quiz.startNewAssessment': 'เริ่มทำแบบประเมินชุดใหม่',
    'quiz.start': 'เริ่มทำ',
    'quiz.totalAssessments': 'คุณมีผลประเมินทั้งหมด {count} ครั้ง',
    'quiz.latestScore': 'คะแนนล่าสุด',
    'quiz.assessedOn': 'ประเมินเมื่อ ',
    'quiz.exit': 'ออก',
    'quiz.exitConfirm.title': 'ออกจากแบบประเมิน?',
    'quiz.exitConfirm.desc': 'คำตอบที่ทำไว้จะไม่ถูกบันทึก คุณแน่ใจหรือไม่?',
    'quiz.exitConfirm.stay': 'ทำต่อ',
    'quiz.exitConfirm.leave': 'ออก',
    'quiz.noResults.title': 'ยังไม่มีผลประเมิน',
    'quiz.noResults.desc': 'เริ่มทำแบบประเมินเพื่อตรวจสุขภาพโรงงานของคุณ',
    'quiz.resultReady': 'ส่งแบบประเมินเรียบร้อย!',
    'quiz.calculating': 'กำลังโหลดผลการประเมิน...',

    // Dashboard KPI labels
    'dashboard.level': 'ระดับ',
    'dashboard.assessmentCount': 'ครั้งที่ประเมิน',

    // Results
    'result.overallScore': 'คะแนนรวม',
    'result.dimensionScores': 'คะแนนรายมิติ',
    'result.strengths': 'จุดแข็ง',
    'result.weaknesses': 'ส่วนที่ควรปรับปรุง',
    'result.noResults.title': 'ยังไม่มีผลลัพธ์',
    'result.noResults.desc': 'ทำแบบประเมินเพื่อดูผลประเมินสุขภาพโรงงาน',
    'result.previousAssessments': 'ผลประเมินก่อนหน้า',
    'result.dimensionDetail': 'รายละเอียดรายมิติ',
    'result.scoreBreakdown': 'รายละเอียดคะแนน',
    'result.levelBeginning': 'เริ่มต้น',
    'result.levelAdvanced': 'ก้าวหน้า',
    'result.justCompleted': 'ผลการประเมินล่าสุดของคุณพร้อมแล้ว',
    'result.backToDashboard': 'กลับแดชบอร์ด',
    'result.nextSteps': 'ขั้นตอนถัดไป',

    // Diagnosis
    'diagnosis.Beginning': 'เริ่มต้น',
    'diagnosis.Developing': 'กำลังพัฒนา',
    'diagnosis.Established': 'มั่นคง',
    'diagnosis.Advanced': 'ก้าวหน้า',

    // Admin
    'admin.title': 'แดชบอร์ดแอดมิน',
    'admin.totalSubmissions': 'จำนวนผู้ทำแบบประเมิน',
    'admin.avgScore': 'คะแนนเฉลี่ย',
    'admin.distribution': 'การกระจายผลวินิจฉัย',
    'admin.industry': 'อุตสาหกรรม',
    'admin.companySize': 'ขนาดบริษัท',
    'admin.allIndustries': 'อุตสาหกรรมทั้งหมด',
    'admin.allSizes': 'ทุกขนาด',
    'admin.exportCsv': 'ส่งออก CSV',
    'admin.id': 'รหัส',
    'admin.score': 'คะแนน',
    'admin.diagnosis': 'ผลวินิจฉัย',
    'admin.date': 'วันที่',
    'admin.noAssessments': 'ไม่พบข้อมูลการประเมิน',
    'admin.company': 'บริษัท',
    'admin.contactName': 'ผู้ติดต่อ',
    'admin.contactEmail': 'อีเมลผู้ติดต่อ',
    'admin.noDetail': 'ไม่มีรายละเอียดเพิ่มเติม',
    'admin.subtitle': 'ภาพรวมและจัดการการประเมิน',
    'admin.tabQuiz': 'แบบประเมิน',
    'admin.tabUsers': 'ผู้ใช้งาน',
    'admin.users': 'ผู้ใช้งาน',
    'admin.email': 'อีเมล',
    'admin.role': 'บทบาท',
    'admin.registered': 'วันลงทะเบียน',
    'admin.promoteAdmin': 'ตั้งเป็นแอดมิน',
    'admin.demoteUser': 'ลดเป็นผู้ใช้',
    'admin.roleAdmin': 'แอดมิน',
    'admin.roleOwner': 'เจ้าของ',
    'admin.roleSystemAdmin': 'ผู้ดูแลระบบ',
    'admin.roleManager': 'ผู้จัดการ',
    'admin.roleUser': 'ผู้ใช้',
    'admin.noUsers': 'ไม่พบข้อมูลผู้ใช้',
    'admin.confirmPromote': 'ยืนยันตั้ง {name} เป็นแอดมิน?',
    'admin.confirmDemote': 'ยืนยันลด {name} เป็นผู้ใช้ปกติ?',
    'admin.editRole': 'แก้ไขบทบาท',
    'admin.saveRole': 'บันทึก',
    'admin.roleUpdated': 'อัปเดตบทบาทเรียบร้อย',
    'admin.roleError': 'อัปเดตบทบาทไม่สำเร็จ',
    'admin.cancel': 'ยกเลิก',
    'admin.searchPlaceholder': 'ค้นหาชื่อ หรืออีเมล',
    'admin.manageUsersTitle': 'จัดการผู้ใช้งาน',
    'admin.manageUsersSubtitle': 'ดูและจัดการบัญชีผู้ใช้ในระบบ',
    'admin.allUsers': 'ทั้งหมด',
    'admin.allRoles': 'บทบาททั้งหมด',
    'admin.filterAdmin': 'เฉพาะแอดมิน',
    'admin.filterOwner': 'เฉพาะเจ้าของ',
    'admin.filterManager': 'เฉพาะผู้จัดการ',
    'admin.filterUser': 'เฉพาะผู้ใช้',
    'admin.userDetail': 'รายละเอียดผู้ใช้',
    'admin.regId': 'เลขทะเบียนนิติบุคคล',
    'admin.phone': 'เบอร์โทรศัพท์',
    'admin.lastUpdated': 'อัปเดตล่าสุด',
    'admin.accountEmail': 'อีเมลบัญชี',
    'admin.inviteMember': 'เชิญสมาชิก',
    'admin.inviteMemberTitle': 'เชิญสมาชิกใหม่',
    'admin.inviteMemberDesc': 'สมาชิกจะได้รับอีเมลพร้อมลิงก์ตั้งรหัสผ่านและเข้าสู่ระบบ',
    'admin.inviteEmail': 'อีเมล',
    'admin.inviteRole': 'บทบาท',
    'admin.inviteSend': 'ส่งคำเชิญ',
    'admin.inviteSending': 'กำลังส่ง...',
    'admin.inviteSent': 'ส่งคำเชิญเรียบร้อย',
    'admin.inviteError': 'ส่งคำเชิญไม่สำเร็จ กรุณาลองอีกครั้ง',
    'admin.inviteAlreadyExists': 'อีเมลนี้มีบัญชีในระบบแล้ว',
    'admin.inviteForbidden': 'คุณไม่มีสิทธิ์เชิญสมาชิก กรุณาตรวจสอบบทบาทของคุณ',
    'admin.pendingInvite': 'รอการยืนยัน',
    'admin.inviteEmailPlaceholder': 'name@company.com',
    'admin.inviteEmailRequired': 'กรุณากรอกอีเมล',
    'admin.inviteEmailInvalid': 'รูปแบบอีเมลไม่ถูกต้อง',
    'admin.inviteResent': 'ส่งคำเชิญอีกครั้งแล้ว',
    'admin.cancelInvite': 'ยกเลิกคำเชิญ',
    'admin.resendInvite': 'ส่งคำเชิญอีกครั้ง',

    // Permissions matrix
    'permissions.title': 'สิทธิ์การใช้งาน',
    'permissions.desc': 'สิทธิ์การเข้าถึงฟีเจอร์ตามบทบาท: User < Manager < System Admin < Owner',
    'permissions.feature': 'ฟีเจอร์',
    'permissions.takeAssessment': 'ทำแบบประเมิน',
    'permissions.viewOwnResults': 'ดูผลการประเมินของตัวเอง',
    'permissions.viewCompanyResults': 'ดูผลการประเมินของทีม',
    'permissions.manageUsers': 'จัดการสมาชิก',
    'permissions.inviteMembers': 'เชิญสมาชิกใหม่',
    'permissions.editRoles': 'แก้ไขบทบาทสมาชิก',
    'permissions.viewAllAssessments': 'ดูผลการประเมินทั้งหมด (ทุกบริษัท)',
    'permissions.exportCsv': 'ส่งออกข้อมูล CSV',

    // Profile
    'profile.title': 'โปรไฟล์',
    'profile.subtitle': 'แก้ไขข้อมูลส่วนตัวและข้อมูลบริษัท',
    'profile.tabProfile': 'ข้อมูลโปรไฟล์',
    'profile.avatarUpload': 'อัปโหลดรูปภาพ',
    'profile.avatarDelete': 'ลบรูปภาพ',
    'profile.avatarError': 'อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง',
    'profile.avatarSizeError': 'ขนาดไฟล์ต้องไม่เกิน 2 MB',
    'profile.avatarTypeError': 'กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, WebP)',
    'profile.tabNotifications': 'การแจ้งเตือน',
    'profile.tabActivity': 'ประวัติการใช้งาน',
    'profile.tabSecurity': 'ความปลอดภัย',
    'profile.activityEmpty': 'ยังไม่มีประวัติการใช้งาน',
    'profile.activity.user_login': 'เข้าสู่ระบบ',
    'profile.activity.user_registered': 'ลงทะเบียนบัญชี',
    'profile.activity.user_profile_updated': 'อัปเดตข้อมูลโปรไฟล์',
    'profile.activity.user_role_changed': 'เปลี่ยนสิทธิ์ผู้ใช้',
    'profile.activity.assessment_submitted': 'ส่งแบบประเมิน',
    'profile.activity.admin_export': 'ส่งออกข้อมูล',
    'profile.userSection': 'บัญชีผู้ใช้',
    'profile.contactSection': 'ข้อมูลผู้ติดต่อ',
    'profile.companySection': 'ข้อมูลบริษัท',
    'profile.email': 'อีเมลบัญชี',
    'profile.regId': 'เลขทะเบียนนิติบุคคล',
    'profile.preferencesSection': 'การตั้งค่า',
    'profile.emailNotifications': 'รับการแจ้งเตือนทางอีเมล',
    'profile.emailNotificationsDesc': 'รับผลการประเมินและข่าวสารทางอีเมล',
    'profile.save': 'บันทึกการเปลี่ยนแปลง',
    'profile.saving': 'กำลังบันทึก...',
    'profile.saved': 'บันทึกเรียบร้อยแล้ว',
    'profile.error': 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง',

    // Profile — security & linking
    'profile.securitySection': 'ความปลอดภัย',
    'profile.changePassword': 'เปลี่ยนรหัสผ่าน', // NOSONAR typescript:S2068
    'profile.passwordChanging': 'กำลังเปลี่ยน...', // NOSONAR typescript:S2068
    'profile.passwordChanged': 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', // NOSONAR typescript:S2068
    'profile.currentPassword': 'รหัสผ่านปัจจุบัน', // NOSONAR typescript:S2068
    'profile.newPassword': 'รหัสผ่านใหม่', // NOSONAR typescript:S2068
    'profile.confirmNewPassword': 'ยืนยันรหัสผ่านใหม่', // NOSONAR typescript:S2068
    'profile.errorWrongPassword': 'รหัสผ่านปัจจุบันไม่ถูกต้อง', // NOSONAR typescript:S2068
    'profile.errorRecentLogin': 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน',
    'profile.linkingSection': 'วิธีการเข้าสู่ระบบ',
    'profile.linked': 'เชื่อมต่อแล้ว',
    'profile.linkGoogle': 'เชื่อมต่อ Google',
    'profile.unlinkGoogle': 'ยกเลิก Google',
    'profile.linkEmailPassword': 'เชื่อมต่ออีเมล', // NOSONAR typescript:S2068
    'profile.unlinkEmailPassword': 'ยกเลิกอีเมล',
    'profile.linkEmailLabel': 'อีเมล',
    'profile.linkPasswordLabel': 'รหัสผ่าน',
    'profile.linkConfirmPasswordLabel': 'ยืนยันรหัสผ่าน', // NOSONAR typescript:S2068
    'profile.linkSubmit': 'เชื่อมต่อ',
    'profile.linkSuccess': 'เชื่อมต่อบัญชีเรียบร้อยแล้ว',
    'profile.unlinkSuccess': 'ยกเลิกการเชื่อมต่อแล้ว',
    'profile.cannotUnlinkLast': 'ต้องมีวิธีเข้าสู่ระบบอย่างน้อยหนึ่งวิธี',
    'profile.linking': 'กำลังดำเนินการ...',
    'profile.googleProvider': 'Google',
    'profile.emailPasswordProvider': 'อีเมล & รหัสผ่าน',
    'profile.errorCredentialInUse': 'บัญชีนี้เชื่อมต่อกับบัญชีอื่นอยู่แล้ว',

    // Company Settings page
    'companySettings.title': 'ตั้งค่าบริษัท',
    'companySettings.subtitle': 'แก้ไขข้อมูลบริษัทและการติดต่อ',
    'companySettings.saved': 'บันทึกข้อมูลเรียบร้อยแล้ว',
    'companySettings.error': 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    'companySettings.save': 'บันทึก',
    'companySettings.saving': 'กำลังบันทึก...',

    // Top bar
    'topbar.cta': 'สนใจตรวจสุขภาพโรงงาน? ติดต่อ Line @factorysyncsolutions',

    // Theme
    'theme.label': 'ธีม',
    'theme.light': 'สว่าง',
    'theme.dark': 'มืด',
    'theme.system': 'ตามระบบ',

    // Company switcher
    'companySwitcher.label': 'บริษัท',

    // Footer
    'footer.terms': 'ข้อกำหนดการใช้งาน',
    'footer.privacy': 'นโยบายความเป็นส่วนตัว',
    'footer.cookies': 'ตั้งค่าคุกกี้',
    'footer.cookiePolicy': 'นโยบายคุกกี้',
    'footer.marketing': 'นโยบายการตลาด',
    'footer.contact': 'ติดต่อเรา',
    'footer.lineContact': 'Line @factorysyncsolutions',

    // Export
    'export.error': 'ส่งออกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง',

    // Locale
    'locale.label': 'ภาษา',
    'locale.th': 'ภาษาไทย',
    'locale.en': 'English',

    // Auth action (password reset / invite)
    'auth.setPassword.title': 'ตั้งรหัสผ่านของคุณ', // NOSONAR typescript:S2068
    'auth.setPassword.subtitle': 'ตั้งรหัสผ่านเพื่อเข้าใช้งาน FactorySync Solutions',
    'auth.setPassword.passwordLabel': 'รหัสผ่านใหม่', // NOSONAR typescript:S2068
    'auth.setPassword.confirmLabel': 'ยืนยันรหัสผ่าน', // NOSONAR typescript:S2068
    'auth.setPassword.submit': 'บันทึกรหัสผ่าน', // NOSONAR typescript:S2068
    'auth.setPassword.minLength': 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    'auth.setPassword.passwordMismatch': 'รหัสผ่านไม่ตรงกัน', // NOSONAR typescript:S2068
    'auth.setPassword.success': 'ตั้งรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ', // NOSONAR typescript:S2068
    'auth.setPassword.expiredLink': 'ลิงก์หมดอายุแล้ว กรุณาขอคำเชิญใหม่',
    'auth.setPassword.invalidLink': 'ลิงก์ไม่ถูกต้อง กรุณาตรวจสอบอีเมลอีกครั้ง',
    'auth.setPassword.genericError': 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    'auth.setPassword.goSignIn': 'ไปยังหน้าเข้าสู่ระบบ',

    // 404
    'notFound.title': 'ไม่พบหน้าที่ค้นหา',
    'notFound.desc': 'หน้านี้อาจถูกลบออก เปลี่ยนชื่อ หรือไม่เคยมีอยู่',
    'notFound.goHome': 'กลับหน้าหลัก',
    'notFound.goBack': 'ย้อนกลับ',
    'notFound.quickLinks': 'ไปยังหน้าที่ใช้บ่อย',
  },

  en: {
    // Layout / Nav
    'nav.appName': 'FactorySync Solutions',
    'nav.dashboard': 'Dashboard',
    'nav.quiz': 'Quiz',
    'nav.results': 'Results',
    'nav.admin': 'Admin',
    'nav.signOut': 'Sign Out',
    'nav.profile': 'Profile',
    'nav.brandName': 'FactorySync',
    'nav.brandUnit': 'Solutions',
    'nav.main': 'Main',
    'nav.adminMenu': 'Administration',
    'nav.manageUsers': 'Manage users',
    'nav.companySettings': 'Company settings',

    // Landing
    'landing.title': 'FactorySync Solutions',
    'landing.subtitle':
      "Assess your factory's production management maturity across 8 key dimensions. Get personalized insights and recommendations.",
    'landing.questionsInfo': '43 questions across 8 dimensions:',
    'landing.dim.basic': 'Basic Management',
    'landing.dim.improvement': 'Work Improvement',
    'landing.dim.coordination': 'Coordination',
    'landing.dim.maintenance': 'Maintenance (TPM)',
    'landing.dim.quality': 'Quality Control & Assurance',
    'landing.dim.production': 'Production, Control & Delivery',
    'landing.dim.material': 'Material Control',
    'landing.dim.cost': 'Cost Control',
    'landing.signIn': 'Sign in with Google',
    'landing.cta': 'Start Free Assessment!',

    // Sign In page
    'signin.title': 'Welcome back',
    'signin.subtitle': 'Sign in to view your factory health assessment results',
    'signin.free': 'Free, no cost involved',
    'signin.termsPrefix': 'By continuing, you agree to our',
    'signin.brandingQuote':
      'Assess your factory across 8 key dimensions. Get targeted insights and actionable recommendations.',
    'landing.ctaBottom': 'Start Free Assessment',
    'nav.login': 'Sign In',

    // Sign In — email/password
    'signin.emailLabel': 'Email',
    'signin.passwordLabel': 'Password',
    'signin.confirmPasswordLabel': 'Confirm Password',
    'signin.signInWithEmail': 'Sign In',
    'signin.signInWithGoogle': 'Sign in with Google',
    'signin.resetTitle': 'Reset your password',
    'signin.resetSubtitle': "We'll send a reset link to your email",
    'signin.forgotPassword': 'Forgot password?',
    'signin.sendResetEmail': 'Send Reset Link',
    'signin.resetEmailSent': 'Password reset email sent. Check your inbox.',
    'signin.backToSignIn': 'Back to sign in',
    'signin.orContinueWith': 'or',
    'signin.noAccount': "Don't have an account?",
    'signin.signInLink': 'Sign in',
    'signin.signUpLink': 'Sign up',
    'signin.loading': 'Loading...',
    'signin.showPassword': 'Show password',
    'signin.hidePassword': 'Hide password',
    'signin.errorEmailRequired': 'Email is required',
    'signin.errorPasswordRequired': 'Password is required',
    'signin.errorInvalidEmail': 'Invalid email address',
    'signin.errorInvalidCredential': 'Incorrect email or password',
    'signin.errorEmailInUse': 'This email is already registered. Try signing in.',
    'signin.errorWeakPassword': 'Password must be at least 6 characters',
    'signin.errorTooManyRequests': 'Too many failed attempts. Try again later.',
    'signin.errorNetwork': 'Network error. Check your connection.',
    'signin.errorGeneric': 'Something went wrong. Please try again.',
    'signin.errorPasswordMismatch': 'Passwords do not match',
    'signin.errorAccountExistsOtherProvider':
      'This email uses a different sign-in method. Try signing in with Google instead.',
    'signin.createAccountTitle': 'Create an account',
    'signin.createAccountSubtitle': 'Enter your email and password to get started',
    'signin.createAccount': 'Create Account',
    'signin.haveAccount': 'Already have an account?',

    // No profile dialog
    'noProfile.title': 'No Company Account Found',
    'noProfile.desc': "You don't have a company account yet. Would you like to create one?",
    'noProfile.create': 'Create Company',
    'noProfile.signOut': 'Sign Out',

    // Register
    'register.title': 'Register Your Company',
    'register.subtitle': 'Fill in your company details to start the assessment.',
    'register.kicker': 'Get started in 3 steps',
    'register.assurance':
      'These details are used to create your company workspace and prepare assessment reporting. You can update company information later.',
    'register.form.stepPrefix': 'Step',
    'register.metric.time.label': 'Estimated time',
    'register.metric.time.value': '15 minutes',
    'register.metric.review.label': 'Review',
    'register.metric.review.value': 'Expert checked',
    'register.metric.report.label': 'Outcome',
    'register.metric.report.value': 'Report + plan',
    'register.regId': 'Company Registration ID (13 digits)',
    'register.lookup': 'Lookup',
    'register.lookupLoading': '...',
    'register.lookupFound': 'Found',
    'register.regIdTaken.title': 'Company already registered',
    'register.regIdTaken.desc':
      'already has an account with this registration ID. Company details have been prefilled. You can still register with your email.',
    'register.companyName': 'Company Name',
    'register.industryType': 'Industry Type',
    'register.companySize': 'Company Size',
    'register.contactName': 'Contact Name',
    'register.contactEmail': 'Contact Email',
    'register.contactPhone': 'Contact Phone',
    'register.submit': 'Register',
    'register.submitting': 'Registering...',
    'register.error': 'Registration failed. Please try again.',
    'register.captchaRequired': 'Please complete the captcha verification.',
    'register.captchaUnavailable': 'CAPTCHA could not load. You can still submit the form.',
    'register.select': 'Select...',
    'register.regIdError': 'Must be 13 digits',
    'register.companyNameError': 'Company name is required',
    'register.industryTypeError': 'Industry type is required',
    'register.companySizeError': 'Company size is required',
    'register.contactNameError': 'Contact name is required',
    'register.contactEmailError': 'Invalid email',
    'register.contactPhoneError': 'Phone number is required',
    'register.acceptTerms': 'I accept the',
    'register.termsLink': 'Terms & Conditions',
    'register.and': 'and',
    'register.privacyLink': 'Privacy Policy',
    'register.acceptTermsError': 'You must accept the Terms & Conditions and Privacy Policy',
    'register.marketingConsent': 'I consent to receive marketing communications and promotions',
    'register.marketingConsentDetail': 'You can unsubscribe at any time. See our',
    'register.marketingPolicyLink': 'Marketing Policy',
    'register.step.account': 'Create Account',
    'register.step.account.detail':
      'Create an account or sign in to connect your user to the company.',
    'register.step.company': 'Company Info',
    'register.step.company.detail':
      'Enter registration ID, company name, industry, and company size.',
    'register.step.contact': 'Contact Info',
    'register.step.contact.detail': 'Confirm the main contact before starting the assessment.',
    'register.next': 'Next',
    'register.back': 'Back',
    'register.companyName.unknown': 'Unknown company',
    'register.success.title': 'Registration Successful!',
    'register.success.desc': 'Your company account is ready. Start your assessment now.',
    'register.success.toDashboard': 'Go to Dashboard',

    // Industry types
    'industry.manufacturing': 'Manufacturing',
    'industry.food': 'Food & Beverage',
    'industry.automotive': 'Automotive',
    'industry.electronics': 'Electronics',
    'industry.textile': 'Textile & Garment',
    'industry.chemical': 'Chemical & Petrochemical',
    'industry.construction': 'Construction & Building Materials',
    'industry.agriculture': 'Agriculture & Agribusiness',
    'industry.logistics': 'Logistics & Supply Chain',
    'industry.energy': 'Energy & Utilities',
    'industry.pharma': 'Pharmaceutical & Medical Device',
    'industry.plastics': 'Plastics & Rubber',
    'industry.printing': 'Printing & Packaging',
    'industry.metal': 'Metal & Steel',
    'industry.wood': 'Wood & Furniture',
    'industry.other': 'Other',

    // Company sizes
    'size.small': 'Small (< 50 employees)',
    'size.medium': 'Medium (50-200 employees)',
    'size.large': 'Large (> 200 employees)',

    // Quiz
    'quiz.title': 'FactorySync Solutions Assessment',
    'quiz.completed.title': "You've already completed an assessment",
    'quiz.completed.desc':
      'You can view your previous results or take the assessment again to get updated scores.',
    'quiz.viewResults': 'View Results',
    'quiz.retake': 'Retake Assessment',
    'quiz.loadError': 'Failed to load questions.',
    'quiz.submitError': 'Failed to submit quiz. Please try again.',
    'quiz.previous': 'Previous',
    'quiz.next': 'Next',
    'quiz.submit': 'Submit Assessment',
    'quiz.submitting': 'Submitting...',
    'quiz.stronglyDisagree': 'Strongly Disagree',
    'quiz.stronglyAgree': 'Strongly Agree',
    'quiz.welcomeBack': 'Welcome back',
    'quiz.yourCompany': 'Your Company',
    'quiz.viewResultsDesc': 'View detailed analysis, radar chart, strengths & recommendations',
    'quiz.viewResultsAction': 'View results',
    'quiz.retakeDesc': 'Take the assessment again and compare with your previous results',
    'quiz.retakeAction': 'Start over',
    'quiz.otherAssessments': 'Other Assessments',
    'quiz.startNewAssessment': 'Start this new assessment',
    'quiz.start': 'Start',
    'quiz.totalAssessments': 'You have {count} assessments total',
    'quiz.latestScore': 'Latest Score',
    'quiz.assessedOn': 'Assessed on ',
    'quiz.exit': 'Exit',
    'quiz.exitConfirm.title': 'Exit assessment?',
    'quiz.exitConfirm.desc': 'Your answers will not be saved. Are you sure?',
    'quiz.exitConfirm.stay': 'Continue',
    'quiz.exitConfirm.leave': 'Exit',
    'quiz.noResults.title': 'No assessments yet',
    'quiz.noResults.desc': 'Start an assessment to check your factory health',
    'quiz.resultReady': 'Assessment submitted!',
    'quiz.calculating': 'Loading your results...',

    // Dashboard KPI labels
    'dashboard.level': 'Level',
    'dashboard.assessmentCount': 'Assessments',

    // Results
    'result.overallScore': 'Overall Score',
    'result.dimensionScores': 'Dimension Scores',
    'result.strengths': 'Strengths',
    'result.weaknesses': 'Areas for Improvement',
    'result.noResults.title': 'No Results Yet',
    'result.noResults.desc': 'Complete the quiz to see your factory health assessment.',
    'result.previousAssessments': 'Previous Assessments',
    'result.dimensionDetail': 'Dimension Detail',
    'result.scoreBreakdown': 'Score breakdown',
    'result.levelBeginning': 'Beginning',
    'result.levelAdvanced': 'Advanced',
    'result.justCompleted': 'Your latest assessment is ready',
    'result.backToDashboard': 'Back to Dashboard',
    'result.nextSteps': 'Next Steps',

    // Diagnosis
    'diagnosis.Beginning': 'Beginning',
    'diagnosis.Developing': 'Developing',
    'diagnosis.Established': 'Established',
    'diagnosis.Advanced': 'Advanced',

    // Admin
    'admin.title': 'Admin Dashboard',
    'admin.totalSubmissions': 'Total Submissions',
    'admin.avgScore': 'Average Score',
    'admin.distribution': 'Diagnosis Distribution',
    'admin.industry': 'Industry',
    'admin.companySize': 'Company Size',
    'admin.allIndustries': 'All Industries',
    'admin.allSizes': 'All Sizes',
    'admin.exportCsv': 'Export CSV',
    'admin.id': 'ID',
    'admin.score': 'Score',
    'admin.diagnosis': 'Diagnosis',
    'admin.date': 'Date',
    'admin.noAssessments': 'No assessments found.',
    'admin.company': 'Company',
    'admin.contactName': 'Contact',
    'admin.contactEmail': 'Contact Email',
    'admin.noDetail': 'No additional detail available.',
    'admin.subtitle': 'Assessment overview & management',
    'admin.tabQuiz': 'Assessments',
    'admin.tabUsers': 'Users',
    'admin.users': 'Users',
    'admin.email': 'Email',
    'admin.role': 'Role',
    'admin.registered': 'Registered',
    'admin.promoteAdmin': 'Promote to Admin',
    'admin.demoteUser': 'Demote to User',
    'admin.roleAdmin': 'Admin',
    'admin.roleOwner': 'Owner',
    'admin.roleSystemAdmin': 'System Admin',
    'admin.roleManager': 'Manager',
    'admin.roleUser': 'User',
    'admin.noUsers': 'No users found.',
    'admin.confirmPromote': 'Promote {name} to admin?',
    'admin.confirmDemote': 'Demote {name} to regular user?',
    'admin.editRole': 'Edit Role',
    'admin.saveRole': 'Save',
    'admin.roleUpdated': 'Role updated successfully',
    'admin.roleError': 'Failed to update role',
    'admin.cancel': 'Cancel',
    'admin.searchPlaceholder': 'Search name or email',
    'admin.manageUsersTitle': 'Manage Users',
    'admin.manageUsersSubtitle': 'View and manage user accounts',
    'admin.allUsers': 'All',
    'admin.allRoles': 'All Roles',
    'admin.filterAdmin': 'Admins Only',
    'admin.filterOwner': 'Owners Only',
    'admin.filterManager': 'Managers Only',
    'admin.filterUser': 'Users Only',
    'admin.userDetail': 'User Detail',
    'admin.regId': 'Registration ID',
    'admin.phone': 'Phone',
    'admin.lastUpdated': 'Last Updated',
    'admin.accountEmail': 'Account Email',
    'admin.inviteMember': 'Invite Member',
    'admin.inviteMemberTitle': 'Invite a New Member',
    'admin.inviteMemberDesc':
      'They will receive an email with a link to set their password and sign in.',
    'admin.inviteEmail': 'Email',
    'admin.inviteRole': 'Role',
    'admin.inviteSend': 'Send Invite',
    'admin.inviteSending': 'Sending...',
    'admin.inviteSent': 'Invitation sent',
    'admin.inviteError': 'Failed to send invite. Please try again.',
    'admin.inviteAlreadyExists': 'This email already has an account.',
    'admin.inviteForbidden': 'You do not have permission to invite members. Check your role.',
    'admin.pendingInvite': 'Pending',
    'admin.inviteEmailPlaceholder': 'name@company.com',
    'admin.inviteEmailRequired': 'Email is required',
    'admin.inviteEmailInvalid': 'Invalid email address',
    'admin.inviteResent': 'Invitation resent',
    'admin.cancelInvite': 'Cancel invitation',
    'admin.resendInvite': 'Resend invitation',

    // Permissions matrix
    'permissions.title': 'Permissions',
    'permissions.desc': 'Feature access by role: User < Manager < System Admin < Owner',
    'permissions.feature': 'Feature',
    'permissions.takeAssessment': 'Take assessment',
    'permissions.viewOwnResults': 'View own results',
    'permissions.viewCompanyResults': 'View team results',
    'permissions.manageUsers': 'Manage members',
    'permissions.inviteMembers': 'Invite new members',
    'permissions.editRoles': 'Edit member roles',
    'permissions.viewAllAssessments': 'View all assessments (all companies)',
    'permissions.exportCsv': 'Export CSV',

    // 404
    // Profile
    'profile.title': 'Profile',
    'profile.subtitle': 'Edit your personal and company information.',
    'profile.tabProfile': 'Profile',
    'profile.avatarUpload': 'Upload photo',
    'profile.avatarDelete': 'Remove photo',
    'profile.avatarError': 'Upload failed. Please try again.',
    'profile.avatarSizeError': 'Image must be under 2 MB.',
    'profile.avatarTypeError': 'Please select an image file (JPEG, PNG, WebP).',
    'profile.tabNotifications': 'Notifications',
    'profile.tabActivity': 'Activity',
    'profile.tabSecurity': 'Security',
    'profile.activityEmpty': 'No activity yet.',
    'profile.activity.user_login': 'Signed in',
    'profile.activity.user_registered': 'Registered account',
    'profile.activity.user_profile_updated': 'Updated profile',
    'profile.activity.user_role_changed': 'Role changed',
    'profile.activity.assessment_submitted': 'Submitted assessment',
    'profile.activity.admin_export': 'Exported data',
    'profile.userSection': 'Account',
    'profile.contactSection': 'Contact Person',
    'profile.companySection': 'Company',
    'profile.email': 'Account Email',
    'profile.regId': 'Registration ID',
    'profile.preferencesSection': 'Preferences',
    'profile.emailNotifications': 'Receive email notifications',
    'profile.emailNotificationsDesc': 'Receive assessment results and updates by email',
    'profile.save': 'Save Changes',
    'profile.saving': 'Saving...',
    'profile.saved': 'Changes saved successfully.',
    'profile.error': 'Failed to save. Please try again.',

    // Profile — security & linking
    'profile.securitySection': 'Security',
    'profile.changePassword': 'Change Password',
    'profile.passwordChanging': 'Changing...',
    'profile.passwordChanged': 'Password changed successfully',
    'profile.currentPassword': 'Current Password',
    'profile.newPassword': 'New Password',
    'profile.confirmNewPassword': 'Confirm New Password',
    'profile.errorWrongPassword': 'Current password is incorrect',
    'profile.errorRecentLogin': 'Please sign out and sign back in before changing your password',
    'profile.linkingSection': 'Sign-in Methods',
    'profile.linked': 'Linked',
    'profile.linkGoogle': 'Link Google',
    'profile.unlinkGoogle': 'Unlink Google',
    'profile.linkEmailPassword': 'Link Email & Password',
    'profile.unlinkEmailPassword': 'Unlink Email',
    'profile.linkEmailLabel': 'Email',
    'profile.linkPasswordLabel': 'Password',
    'profile.linkConfirmPasswordLabel': 'Confirm Password',
    'profile.linkSubmit': 'Link Account',
    'profile.linkSuccess': 'Account linked successfully',
    'profile.unlinkSuccess': 'Account unlinked',
    'profile.cannotUnlinkLast': 'You must keep at least one sign-in method',
    'profile.linking': 'Working...',
    'profile.googleProvider': 'Google',
    'profile.emailPasswordProvider': 'Email & Password',
    'profile.errorCredentialInUse': 'This account is already linked to another user',

    // Company Settings page
    'companySettings.title': 'Company settings',
    'companySettings.subtitle': 'Update your company profile and contact details',
    'companySettings.saved': 'Settings saved successfully',
    'companySettings.error': 'Something went wrong, please try again',
    'companySettings.save': 'Save',
    'companySettings.saving': 'Saving...',

    // Top bar
    'topbar.cta': 'Interested in a factory health check? Contact Line @factorysyncsolutions',

    // Theme
    'theme.label': 'Theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    // Company switcher
    'companySwitcher.label': 'Company',

    // Footer
    'footer.terms': 'Terms & Conditions',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Settings',
    'footer.cookiePolicy': 'Cookie Policy',
    'footer.marketing': 'Marketing Policy',
    'footer.contact': 'Contact Us',
    'footer.lineContact': 'Line @factorysyncsolutions',

    // Export
    'export.error': 'Export failed. Please try again.',

    // Locale
    'locale.label': 'Language',
    'locale.th': 'Thai',
    'locale.en': 'English',

    // Auth action (password reset / invite)
    'auth.setPassword.title': 'Set your password', // NOSONAR typescript:S2068
    'auth.setPassword.subtitle': 'Create a password to access FactorySync Solutions',
    'auth.setPassword.passwordLabel': 'New password', // NOSONAR typescript:S2068
    'auth.setPassword.confirmLabel': 'Confirm password', // NOSONAR typescript:S2068
    'auth.setPassword.submit': 'Save password', // NOSONAR typescript:S2068
    'auth.setPassword.minLength': 'Password must be at least 8 characters',
    'auth.setPassword.passwordMismatch': 'Passwords do not match', // NOSONAR typescript:S2068
    'auth.setPassword.success': 'Password set successfully. Please sign in.', // NOSONAR typescript:S2068
    'auth.setPassword.expiredLink': 'This link has expired. Please request a new invitation.',
    'auth.setPassword.invalidLink': 'Invalid link. Please check your email again.',
    'auth.setPassword.genericError': 'Something went wrong. Please try again.',
    'auth.setPassword.goSignIn': 'Go to sign in',

    // 404
    'notFound.title': 'Page not found',
    'notFound.desc': 'This page may have been removed, renamed, or never existed.',
    'notFound.goHome': 'Go Home',
    'notFound.goBack': 'Go Back',
    'notFound.quickLinks': 'Quick links',
  },
};
