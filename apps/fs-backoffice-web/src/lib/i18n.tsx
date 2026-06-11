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

const STORAGE_KEY = 'fsb-locale';

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

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

const translations: Record<Locale, Record<string, string>> = {
  th: {
    'nav.appName': 'FactorySync Backoffice',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.projects': 'โปรเจกต์',
    'nav.users': 'ผู้ใช้',
    'nav.results': 'ผลการประเมิน',
    'nav.staff': 'จัดการทีมงาน',
    'nav.signOut': 'ออกจากระบบ',

    'auth.signIn': 'เข้าสู่ระบบ',
    'auth.signInWithGoogle': 'เข้าสู่ระบบด้วย Google',
    'auth.backofficeOnly': 'สำหรับทีมงาน FactorySync เท่านั้น',

    'unauthorized.title': 'ไม่มีสิทธิ์เข้าถึง',
    'unauthorized.message': 'บัญชีของคุณไม่มีสิทธิ์เข้าถึง Backoffice',
    'unauthorized.signOut': 'ออกจากระบบ',

    'dashboard.title': 'แดชบอร์ด',
    'projects.title': 'โปรเจกต์',
    'users.title': 'ผู้ใช้',
    'results.title': 'ผลการประเมิน',
    'staff.title': 'จัดการทีมงาน',

    'common.loading': 'กำลังโหลด...',
    'common.search': 'ค้นหา',
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.confirm': 'ยืนยัน',
    'common.delete': 'ลบ',
    'common.remove': 'ลบออก',
    'common.view': 'ดู',
    'common.edit': 'แก้ไข',
    'common.actions': 'การดำเนินการ',
    'common.status': 'สถานะ',
    'common.active': 'เปิดใช้งาน',
    'common.inactive': 'ปิดใช้งาน',
    'common.all': 'ทั้งหมด',
    'common.error': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    'common.noData': 'ไม่มีข้อมูล',
    'common.export': 'ส่งออก CSV',
    'common.add': 'เพิ่ม',

    'signin.errorInvalidEmail': 'รูปแบบอีเมลไม่ถูกต้อง',
    'signin.errorInvalidCredential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'signin.errorEmailInUse': 'อีเมลนี้มีบัญชีอยู่แล้ว',
    'signin.errorWeakPassword': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'signin.errorAccountExistsOtherProvider': 'อีเมลนี้ใช้วิธีการเข้าสู่ระบบอื่น',
    'signin.errorTooManyRequests': 'ลองผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง',
    'signin.errorNetwork': 'เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ',
    'signin.errorGeneric': 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',

    'dashboard.totalProjects': 'โปรเจกต์ทั้งหมด',
    'dashboard.totalUsers': 'ผู้ใช้ทั้งหมด',
    'dashboard.avgScore': 'คะแนนเฉลี่ย',
    'dashboard.staffCount': 'จำนวนทีมงาน',
    'dashboard.recentResults': 'ผลการประเมินล่าสุด',

    'projects.regId': 'เลขทะเบียน',
    'projects.industry': 'อุตสาหกรรม',
    'projects.size': 'ขนาดบริษัท',
    'projects.members': 'สมาชิก',
    'projects.viewDetail': 'ดูรายละเอียด',
    'projects.filterAll': 'ทั้งหมด',
    'projects.filterActive': 'เปิดใช้งาน',
    'projects.filterInactive': 'ปิดใช้งาน',
    'projects.deactivate': 'ปิดการใช้งาน',
    'projects.reactivate': 'เปิดการใช้งานอีกครั้ง',
    'projects.settingsTab': 'ตั้งค่า',
    'projects.membersTab': 'สมาชิก',
    'projects.companyName': 'ชื่อบริษัท',
    'projects.industryType': 'ประเภทอุตสาหกรรม',
    'projects.companySize': 'ขนาดบริษัท',
    'projects.small': 'เล็ก',
    'projects.medium': 'กลาง',
    'projects.large': 'ใหญ่',
    'projects.changeRole': 'เปลี่ยนบทบาท',
    'projects.removeConfirm': 'ยืนยันการลบสมาชิก',
    'projects.removeConfirmDesc': 'คุณต้องการลบสมาชิกนี้ออกจากโปรเจกต์หรือไม่?',
    'projects.role': 'บทบาท',
    'projects.joined': 'เข้าร่วม',
    'projects.name': 'ชื่อ',
    'projects.email': 'อีเมล',
    'projects.saveSettings': 'บันทึกการตั้งค่า',

    'users.name': 'ชื่อ',
    'users.email': 'อีเมล',
    'users.company': 'บริษัท',
    'users.role': 'บทบาท',
    'users.registered': 'วันที่ลงทะเบียน',
    'users.deleteConfirm': 'ยืนยันการลบผู้ใช้',
    'users.deleteConfirmDesc': 'คุณต้องการลบผู้ใช้นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
    'users.profileDetail': 'รายละเอียดผู้ใช้',
    'users.contactName': 'ชื่อผู้ติดต่อ',
    'users.contactEmail': 'อีเมลผู้ติดต่อ',
    'users.contactPhone': 'เบอร์โทรผู้ติดต่อ',
    'users.regId': 'เลขทะเบียนบริษัท',
    'users.industry': 'อุตสาหกรรม',
    'users.size': 'ขนาดบริษัท',
    'users.emailNotifications': 'รับการแจ้งเตือนทางอีเมล',

    'results.company': 'บริษัท',
    'results.quizId': 'แบบประเมิน',
    'results.score': 'คะแนน',
    'results.diagnosis': 'การวินิจฉัย',
    'results.date': 'วันที่',
    'results.filterAll': 'ทั้งหมด',
    'results.strengths': 'จุดแข็ง',
    'results.weaknesses': 'จุดที่ต้องพัฒนา',
    'results.dimensions': 'คะแนนรายด้าน',

    'staff.name': 'ชื่อ',
    'staff.email': 'อีเมล',
    'staff.role': 'บทบาท',
    'staff.changeRole': 'เปลี่ยนบทบาท',
    'staff.revokeConfirm': 'ยืนยันการลบสิทธิ์',
    'staff.revokeConfirmDesc': 'คุณต้องการลบสิทธิ์ทีมงานของผู้ใช้นี้หรือไม่?',
    'staff.addStaff': 'เพิ่มทีมงาน',
    'staff.uid': 'UID ผู้ใช้',
    'staff.selectRole': 'เลือกบทบาท',
  },
  en: {
    'nav.appName': 'FactorySync Backoffice',
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.users': 'Users',
    'nav.results': 'Results',
    'nav.staff': 'Staff',
    'nav.signOut': 'Sign Out',

    'auth.signIn': 'Sign In',
    'auth.signInWithGoogle': 'Sign in with Google',
    'auth.backofficeOnly': 'FactorySync staff only',

    'unauthorized.title': 'Unauthorized',
    'unauthorized.message': 'Your account does not have backoffice access',
    'unauthorized.signOut': 'Sign Out',

    'dashboard.title': 'Dashboard',
    'projects.title': 'Projects',
    'users.title': 'Users',
    'results.title': 'Results',
    'staff.title': 'Staff',

    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.remove': 'Remove',
    'common.view': 'View',
    'common.edit': 'Edit',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.all': 'All',
    'common.error': 'Something went wrong. Please try again.',
    'common.noData': 'No data',
    'common.export': 'Export CSV',
    'common.add': 'Add',

    'signin.errorInvalidEmail': 'Invalid email address',
    'signin.errorInvalidCredential': 'Incorrect email or password',
    'signin.errorEmailInUse': 'This email is already registered',
    'signin.errorWeakPassword': 'Password must be at least 6 characters',
    'signin.errorAccountExistsOtherProvider': 'This email uses a different sign-in method',
    'signin.errorTooManyRequests': 'Too many failed attempts. Try again later.',
    'signin.errorNetwork': 'Network error. Check your connection.',
    'signin.errorGeneric': 'Something went wrong. Please try again.',

    'dashboard.totalProjects': 'Total Projects',
    'dashboard.totalUsers': 'Total Users',
    'dashboard.avgScore': 'Avg Score',
    'dashboard.staffCount': 'Staff Count',
    'dashboard.recentResults': 'Recent Results',

    'projects.regId': 'Reg ID',
    'projects.industry': 'Industry',
    'projects.size': 'Size',
    'projects.members': 'Members',
    'projects.viewDetail': 'View',
    'projects.filterAll': 'All',
    'projects.filterActive': 'Active',
    'projects.filterInactive': 'Inactive',
    'projects.deactivate': 'Deactivate',
    'projects.reactivate': 'Reactivate',
    'projects.settingsTab': 'Settings',
    'projects.membersTab': 'Members',
    'projects.companyName': 'Company Name',
    'projects.industryType': 'Industry Type',
    'projects.companySize': 'Company Size',
    'projects.small': 'Small',
    'projects.medium': 'Medium',
    'projects.large': 'Large',
    'projects.changeRole': 'Change Role',
    'projects.removeConfirm': 'Confirm Remove Member',
    'projects.removeConfirmDesc': 'Are you sure you want to remove this member from the project?',
    'projects.role': 'Role',
    'projects.joined': 'Joined',
    'projects.name': 'Name',
    'projects.email': 'Email',
    'projects.saveSettings': 'Save Settings',

    'users.name': 'Name',
    'users.email': 'Email',
    'users.company': 'Company',
    'users.role': 'Role',
    'users.registered': 'Registered',
    'users.deleteConfirm': 'Confirm Delete User',
    'users.deleteConfirmDesc': 'Are you sure you want to delete this user? This action cannot be undone.',
    'users.profileDetail': 'User Profile',
    'users.contactName': 'Contact Name',
    'users.contactEmail': 'Contact Email',
    'users.contactPhone': 'Contact Phone',
    'users.regId': 'Company Reg ID',
    'users.industry': 'Industry',
    'users.size': 'Company Size',
    'users.emailNotifications': 'Email Notifications',

    'results.company': 'Company',
    'results.quizId': 'Quiz',
    'results.score': 'Score',
    'results.diagnosis': 'Diagnosis',
    'results.date': 'Date',
    'results.filterAll': 'All',
    'results.strengths': 'Strengths',
    'results.weaknesses': 'Weaknesses',
    'results.dimensions': 'Dimension Scores',

    'staff.name': 'Name',
    'staff.email': 'Email',
    'staff.role': 'Role',
    'staff.changeRole': 'Change Role',
    'staff.revokeConfirm': 'Confirm Revoke Access',
    'staff.revokeConfirmDesc': 'Are you sure you want to revoke this staff member\'s access?',
    'staff.addStaff': 'Add Staff',
    'staff.uid': 'User UID',
    'staff.selectRole': 'Select Role',
  },
};
