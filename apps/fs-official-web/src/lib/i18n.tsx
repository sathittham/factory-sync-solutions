import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type Locale = "th" | "en";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "fss-locale";

function getInitialLocale(): Locale {
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
    "landing.title": "FactorySync Solutions",
    "landing.subtitle":
      "ประเมินความพร้อมด้านการจัดการการผลิตของโรงงานใน 8 มิติหลัก รับข้อมูลเชิงลึกและคำแนะนำเฉพาะทาง",
    "landing.badge": "แบบประเมินออนไลน์ ฟรี",
    "landing.cta": "เริ่มตรวจสุขภาพโรงงานฟรี!",
    "landing.ctaBottom": "เริ่มประเมินฟรีเลย",
    "landing.howItWorks": "ขั้นตอนง่ายๆ 3 ขั้นตอน",
    "landing.dims.title": "8 มิติหลักที่ประเมิน",
    "landing.dims.subtitle":
      "ครอบคลุมทุกด้านที่สำคัญต่อการจัดการด้านการผลิตของโรงงาน",
    "landing.testimonials.title": "เสียงจากผู้ใช้งานจริง",
    "landing.contact.title": "ติดต่อเรา",
    "landing.contact.subtitle":
      "สนใจตรวจสุขภาพโรงงาน หรือต้องการข้อมูลเพิ่มเติม ติดต่อทีมงานของเราได้เลย",
    "landing.contact.line": "แอดไลน์ @STM23",
    "landing.contact.or": "หรือ Email: ",
    "landing.bottomCta.title": "พร้อมประเมินโรงงานของคุณแล้วหรือยัง?",
    "landing.bottomCta.subtitle": "เริ่มต้นฟรี ใช้เวลาเพียง 15 นาที",
    "landing.free": "ฟรี ไม่มีค่าใช้จ่าย",
    "landing.dim.basic": "การจัดการงานเบื้องต้น",
    "landing.dim.improvement": "การปรับปรุงการทำงาน",
    "landing.dim.coordination": "การประสานงาน",
    "landing.dim.maintenance": "การบำรุงรักษา",
    "landing.dim.quality": "การควบคุมคุณภาพ/การประกันคุณภาพ",
    "landing.dim.production": "การผลิต การควบคุม การส่งมอบ",
    "landing.dim.material": "การควบคุมวัสดุ",
    "landing.dim.cost": "การควบคุมต้นทุน",
    "nav.signIn": "เข้าสู่ระบบ",
    "footer.contact": "ติดต่อ",
    "footer.copyright": "FactorySync Solutions · STM23",
    "footer.terms": "ข้อกำหนดการใช้งาน",
    "footer.privacy": "นโยบายความเป็นส่วนตัว",
    "footer.cookiePolicy": "นโยบายคุกกี้",
    "footer.marketing": "นโยบายการตลาด",
    "footer.cookies": "ตั้งค่าคุกกี้",
  },
  en: {
    "landing.title": "FactorySync Solutions",
    "landing.subtitle":
      "Assess your factory's production management readiness across 8 key dimensions. Get actionable insights and targeted recommendations.",
    "landing.badge": "Free Online Assessment",
    "landing.cta": "Start Free Factory Health Check!",
    "landing.ctaBottom": "Start Free Assessment",
    "landing.howItWorks": "How It Works",
    "landing.dims.title": "8 Key Dimensions",
    "landing.dims.subtitle":
      "Comprehensive coverage of every aspect critical to production management",
    "landing.testimonials.title": "What Users Say",
    "landing.contact.title": "Contact Us",
    "landing.contact.subtitle":
      "Interested in a factory health check or need more information? Reach out to our team.",
    "landing.contact.line": "Add Line @STM23",
    "landing.contact.or": "Or Email: ",
    "landing.bottomCta.title": "Ready to assess your factory?",
    "landing.bottomCta.subtitle": "Get started for free in about 15 minutes",
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
    "footer.copyright": "FactorySync Solutions · STM23",
    "footer.terms": "Terms of Use",
    "footer.privacy": "Privacy Policy",
    "footer.cookiePolicy": "Cookie Policy",
    "footer.marketing": "Marketing Policy",
    "footer.cookies": "Cookie Settings",
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
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
