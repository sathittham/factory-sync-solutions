import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/lib/i18n';

export type LegalType = 'terms' | 'privacy' | 'cookies' | 'marketing' | null;

// Bump when any policy text changes — stored on each profile as consentVersion.
export const CONSENT_VERSION = '1.0';

interface LegalModalProps {
  readonly open: LegalType;
  readonly onClose: () => void;
}

const titles: Record<string, Record<string, string>> = {
  terms: { th: 'ข้อกำหนดและเงื่อนไขการใช้งาน', en: 'Terms and Conditions' },
  privacy: { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy Policy' },
  cookies: { th: 'นโยบายคุกกี้', en: 'Cookie Policy' },
  marketing: { th: 'นโยบายทางการตลาด', en: 'Marketing Policy' },
};

function getTitle(type: LegalType, locale: string): string {
  return titles[type || 'privacy']?.[locale] || titles.privacy[locale];
}

export function LegalModal({ open, onClose }: LegalModalProps) {
  const { locale } = useLocale();

  return (
    <Dialog open={open !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle(open, locale)}</DialogTitle>
          <DialogDescription>
            {locale === 'th' ? 'แก้ไขล่าสุด: 7 มีนาคม 2568' : 'Last updated: March 7, 2025'}
          </DialogDescription>
        </DialogHeader>
        {open === 'terms' && (locale === 'th' ? <TermsTh /> : <TermsEn />)}
        {open === 'privacy' && (locale === 'th' ? <PrivacyTh /> : <PrivacyEn />)}
        {open === 'cookies' && (locale === 'th' ? <CookiesTh /> : <CookiesEn />)}
        {open === 'marketing' && (locale === 'th' ? <MarketingTh /> : <MarketingEn />)}
      </DialogContent>
    </Dialog>
  );
}

// --- Terms Content ---

function TermsTh() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <h2>1. การยอมรับข้อกำหนด</h2>
      <p>
        การเข้าใช้งานระบบ FactorySync Solutions ("บริการ") ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขเหล่านี้ทั้งหมด
        หากท่านไม่ยอมรับข้อกำหนดเหล่านี้ กรุณาอย่าใช้บริการ
      </p>

      <h2>2. คำอธิบายบริการ</h2>
      <p>
        FactorySync Solutions เป็นเครื่องมือประเมินความพร้อมด้านการดำเนินงานของโรงงานอุตสาหกรรม ครอบคลุม 7
        มิติหลัก ได้แก่ การจัดการคุณภาพ ความปลอดภัย เครื่องจักร บุคลากร ดิจิทัล ห่วงโซ่อุปทาน และสิ่งแวดล้อม
      </p>

      <h2>3. บัญชีผู้ใช้</h2>
      <ul>
        <li>ท่านต้องลงชื่อเข้าใช้ผ่านบัญชี Google เพื่อเข้าถึงบริการ</li>
        <li>ท่านต้องให้ข้อมูลบริษัทที่ถูกต้องและเป็นปัจจุบัน</li>
        <li>ท่านมีหน้าที่รักษาความปลอดภัยของบัญชี</li>
      </ul>

      <h2>4. การใช้งานที่ยอมรับได้</h2>
      <ul>
        <li>ใช้บริการเพื่อวัตถุประสงค์ในการประเมินโรงงานเท่านั้น</li>
        <li>ไม่ส่งข้อมูลเท็จหรือข้อมูลที่ทำให้เข้าใจผิด</li>
        <li>ไม่พยายามเข้าถึงข้อมูลของผู้ใช้อื่นโดยไม่ได้รับอนุญาต</li>
        <li>ไม่ใช้บริการในทางที่ผิดกฎหมายหรือขัดต่อข้อกำหนดนี้</li>
      </ul>

      <h2>5. ทรัพย์สินทางปัญญา</h2>
      <p>
        เนื้อหา คำถาม เกณฑ์การประเมิน และซอฟต์แวร์ของ FactorySync Solutions เป็นทรัพย์สินของผู้ให้บริการ
        ท่านไม่มีสิทธิ์ทำซ้ำ แจกจ่าย หรือสร้างผลงานดัดแปลงจากบริการนี้
      </p>

      <h2>6. ผลการประเมิน</h2>
      <ul>
        <li>ผลการประเมินเป็นเพียงข้อมูลอ้างอิงเท่านั้น ไม่ถือเป็นคำแนะนำจากผู้เชี่ยวชาญ</li>
        <li>ผู้ให้บริการไม่รับประกันความถูกต้องสมบูรณ์ของผลการประเมิน</li>
        <li>การตัดสินใจดำเนินการใดๆ ตามผลประเมิน เป็นความรับผิดชอบของท่านเอง</li>
      </ul>

      <h2>7. การจำกัดความรับผิด</h2>
      <p>
        บริการนี้ให้ "ตามสภาพ" (as is) โดยไม่มีการรับประกันใดๆ ทั้งโดยชัดแจ้งหรือโดยนัย
        ผู้ให้บริการจะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการใช้บริการ
      </p>

      <h2>8. การระงับหรือยกเลิกบริการ</h2>
      <p>ผู้ให้บริการสงวนสิทธิ์ในการระงับหรือยกเลิกการเข้าถึงบริการของท่านได้ทุกเมื่อ หากพบว่ามีการละเมิดข้อกำหนดเหล่านี้</p>

      <h2>9. การเปลี่ยนแปลงข้อกำหนด</h2>
      <p>
        ผู้ให้บริการสงวนสิทธิ์ในการแก้ไขข้อกำหนดเหล่านี้ได้ทุกเมื่อ โดยจะแจ้งการเปลี่ยนแปลงผ่านทางบริการ
        การใช้งานบริการต่อหลังจากมีการเปลี่ยนแปลง ถือว่าท่านยอมรับข้อกำหนดใหม่
      </p>

      <h2>10. กฎหมายที่ใช้บังคับ</h2>
      <p>ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย</p>

      <h2>11. ติดต่อเรา</h2>
      <p>
        หากท่านมีคำถามเกี่ยวกับข้อกำหนดเหล่านี้ กรุณาติดต่อ:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

function TermsEn() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using FactorySync Solutions ("Service"), you agree to be bound by these
        Terms and Conditions. If you do not agree, please do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        FactorySync Solutions is an online assessment tool that evaluates factory operational
        maturity across 7 key dimensions: Quality Management, Safety & Compliance, Equipment &
        Maintenance, Workforce & Training, Digital Transformation, Supply Chain Management, and
        Environmental Sustainability.
      </p>

      <h2>3. User Accounts</h2>
      <ul>
        <li>You must sign in with a Google account to access the Service.</li>
        <li>You must provide accurate and current company information.</li>
        <li>You are responsible for maintaining the security of your account.</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <ul>
        <li>Use the Service only for its intended purpose of factory assessment.</li>
        <li>Do not submit false or misleading information.</li>
        <li>Do not attempt to access other users' data without authorization.</li>
        <li>Do not use the Service for any unlawful purpose.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        All content, questions, assessment criteria, and software of FactorySync Solutions are the
        property of the Service provider. You may not reproduce, distribute, or create derivative
        works from this Service.
      </p>

      <h2>6. Assessment Results</h2>
      <ul>
        <li>
          Assessment results are for reference purposes only and do not constitute professional
          advice.
        </li>
        <li>The Service provider does not guarantee the completeness or accuracy of results.</li>
        <li>Any decisions made based on assessment results are your own responsibility.</li>
      </ul>

      <h2>7. Limitation of Liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind, express or implied. The
        Service provider shall not be liable for any damages arising from the use of the Service.
      </p>

      <h2>8. Suspension or Termination</h2>
      <p>
        The Service provider reserves the right to suspend or terminate your access at any time if
        these Terms are violated.
      </p>

      <h2>9. Changes to Terms</h2>
      <p>
        The Service provider reserves the right to modify these Terms at any time. Changes will be
        communicated through the Service. Continued use after changes constitutes acceptance of the
        new Terms.
      </p>

      <h2>10. Governing Law</h2>
      <p>These Terms are governed by the laws of the Kingdom of Thailand.</p>

      <h2>11. Contact</h2>
      <p>
        If you have questions about these Terms, please contact:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

// --- Privacy Content ---

function PrivacyTh() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <p>
        FactorySync Solutions ("บริการ") ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
        นโยบายนี้อธิบายวิธีการเก็บรวบรวม ใช้ และปกป้องข้อมูลของท่าน สอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.
        2562 (PDPA)
      </p>

      <h2>1. ข้อมูลที่เราเก็บรวบรวม</h2>
      <ul>
        <li>
          <strong>ข้อมูลบัญชี:</strong> ชื่อ อีเมล และรูปโปรไฟล์จากบัญชี Google ของท่าน
        </li>
        <li>
          <strong>ข้อมูลบริษัท:</strong> ชื่อบริษัท เลขทะเบียนนิติบุคคล ประเภทอุตสาหกรรม ขนาดบริษัท
        </li>
        <li>
          <strong>ข้อมูลผู้ติดต่อ:</strong> ชื่อผู้ติดต่อ อีเมล เบอร์โทรศัพท์
        </li>
        <li>
          <strong>ข้อมูลการประเมิน:</strong> คำตอบแบบประเมิน คะแนน และผลวิเคราะห์
        </li>
        <li>
          <strong>ข้อมูลการใช้งาน:</strong> หน้าที่เยี่ยมชม การกระทำต่างๆ บนเว็บไซต์ ผ่าน Google Analytics
        </li>
        <li>
          <strong>ข้อมูลทางเทคนิค:</strong> IP address ประเภทเบราว์เซอร์ ระบบปฏิบัติการ
          ผ่านคุกกี้และเทคโนโลยีที่คล้ายกัน
        </li>
      </ul>

      <h2>2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
      <ul>
        <li>ให้บริการประเมินสุขภาพโรงงานและแสดงผลลัพธ์</li>
        <li>ยืนยันตัวตนและจัดการบัญชีผู้ใช้</li>
        <li>ตรวจสอบข้อมูลบริษัทผ่านระบบ DBD (กรมพัฒนาธุรกิจการค้า)</li>
        <li>ป้องกันการใช้งานในทางที่ผิดผ่าน Cloudflare Turnstile</li>
        <li>วิเคราะห์และปรับปรุงบริการผ่าน Google Analytics และ Google Tag Manager</li>
        <li>ติดต่อสื่อสารเกี่ยวกับบริการ</li>
      </ul>

      <h2>3. ฐานทางกฎหมาย</h2>
      <ul>
        <li>
          <strong>ความยินยอม:</strong> การลงทะเบียนและทำแบบประเมิน
        </li>
        <li>
          <strong>สัญญา:</strong> การให้บริการประเมินตามที่ท่านร้องขอ
        </li>
        <li>
          <strong>ประโยชน์โดยชอบด้วยกฎหมาย:</strong> การวิเคราะห์และปรับปรุงบริการ
        </li>
      </ul>

      <h2>4. การแบ่งปันข้อมูล</h2>
      <p>เราอาจแบ่งปันข้อมูลกับบุคคลที่สามต่อไปนี้:</p>
      <ul>
        <li>
          <strong>Google (Firebase Authentication):</strong> สำหรับการยืนยันตัวตน
        </li>
        <li>
          <strong>Google (Analytics & Tag Manager):</strong> สำหรับวิเคราะห์การใช้งาน
        </li>
        <li>
          <strong>Cloudflare:</strong> สำหรับการรักษาความปลอดภัยและ CDN
        </li>
        <li>
          <strong>Google Cloud Platform:</strong> สำหรับจัดเก็บข้อมูลและประมวลผล
        </li>
      </ul>
      <p>เราจะไม่ขายข้อมูลส่วนบุคคลของท่านให้แก่บุคคลที่สาม</p>

      <h2>5. คุกกี้และเทคโนโลยีการติดตาม</h2>
      <ul>
        <li>
          <strong>คุกกี้ที่จำเป็น:</strong> การยืนยันตัวตน การตั้งค่าภาษา
        </li>
        <li>
          <strong>คุกกี้วิเคราะห์:</strong> Google Analytics เพื่อเข้าใจการใช้งานเว็บไซต์
        </li>
        <li>
          <strong>คุกกี้ความปลอดภัย:</strong> Cloudflare Turnstile เพื่อป้องกันบอท
        </li>
      </ul>
      <p>
        ท่านสามารถจัดการการตั้งค่าคุกกี้ผ่านแบนเนอร์คุกกี้ที่แสดงเมื่อเข้าใช้งานครั้งแรก หรือผ่านการตั้งค่าเบราว์เซอร์ของท่าน
      </p>

      <h2>6. การเก็บรักษาข้อมูล</h2>
      <p>เราจะเก็บรักษาข้อมูลของท่านตราบเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่ระบุไว้ หรือตามที่กฎหมายกำหนด</p>

      <h2>7. สิทธิของเจ้าของข้อมูล</h2>
      <p>ภายใต้ PDPA ท่านมีสิทธิ:</p>
      <ul>
        <li>เข้าถึงข้อมูลส่วนบุคคลของท่าน</li>
        <li>แก้ไขข้อมูลให้ถูกต้อง</li>
        <li>ลบข้อมูลส่วนบุคคลของท่าน</li>
        <li>คัดค้านการประมวลผลข้อมูล</li>
        <li>ขอให้โอนย้ายข้อมูล</li>
        <li>เพิกถอนความยินยอม</li>
      </ul>
      <p>
        หากต้องการใช้สิทธิเหล่านี้ กรุณาติดต่อ:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>

      <h2>8. ความปลอดภัยของข้อมูล</h2>
      <p>
        เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัส HTTPS การจัดเก็บข้อมูลบน Google Cloud Platform
        และการควบคุมการเข้าถึง
      </p>

      <h2>9. การเปลี่ยนแปลงนโยบาย</h2>
      <p>เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแจ้งการเปลี่ยนแปลงที่สำคัญผ่านทางบริการ</p>

      <h2>10. ติดต่อเรา</h2>
      <p>
        หากท่านมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ กรุณาติดต่อ:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

// --- Cookie Policy Content ---

function CookiesTh() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <p>
        FactorySync Solutions ("บริการ") ใช้คุกกี้และเทคโนโลยีที่คล้ายกันเพื่อให้บริการทำงานได้อย่างถูกต้อง
        ปรับปรุงประสบการณ์การใช้งาน และวิเคราะห์การเข้าชมเว็บไซต์
      </p>

      <h2>1. คุกกี้คืออะไร</h2>
      <p>
        คุกกี้คือไฟล์ข้อมูลขนาดเล็กที่จัดเก็บบนอุปกรณ์ของท่านเมื่อเข้าชมเว็บไซต์
        คุกกี้ช่วยให้เว็บไซต์จดจำข้อมูลเกี่ยวกับการเข้าชมของท่าน เช่น การตั้งค่าภาษา และข้อมูลอื่นๆ
        เพื่อให้การเข้าชมครั้งต่อไปสะดวกยิ่งขึ้น
      </p>

      <h2>2. ประเภทคุกกี้ที่เราใช้</h2>

      <h3 className="text-sm font-semibold mt-4">2.1 คุกกี้ที่จำเป็น (Essential Cookies)</h3>
      <p>คุกกี้เหล่านี้จำเป็นต่อการทำงานของเว็บไซต์ ไม่สามารถปิดได้</p>
      <ul>
        <li>
          <strong>Firebase Authentication:</strong> จัดเก็บสถานะการเข้าสู่ระบบและข้อมูลเซสชัน
        </li>
        <li>
          <strong>การตั้งค่าภาษา (fss-locale):</strong> จดจำภาษาที่ท่านเลือก (ไทย/อังกฤษ)
        </li>
        <li>
          <strong>การตั้งค่าคุกกี้ (fss-cookie-consent):</strong> จดจำการยินยอมคุกกี้ของท่าน
        </li>
      </ul>

      <h3 className="text-sm font-semibold mt-4">2.2 คุกกี้ความปลอดภัย (Security Cookies)</h3>
      <ul>
        <li>
          <strong>Cloudflare Turnstile:</strong> ใช้ตรวจสอบว่าท่านเป็นบุคคลจริง ไม่ใช่บอท ในหน้าลงทะเบียน
        </li>
        <li>
          <strong>Cloudflare CDN:</strong> คุกกี้ที่ใช้ในการส่งเนื้อหาอย่างปลอดภัยและป้องกันภัยคุกคาม
        </li>
      </ul>

      <h3 className="text-sm font-semibold mt-4">2.3 คุกกี้วิเคราะห์ (Analytics Cookies)</h3>
      <p>คุกกี้เหล่านี้ช่วยให้เราเข้าใจวิธีการใช้งานเว็บไซต์ของท่าน เพื่อปรับปรุงบริการ</p>
      <ul>
        <li>
          <strong>Google Analytics 4 (GA4):</strong> วิเคราะห์การเข้าชม พฤติกรรมการใช้งาน จำนวนผู้เข้าชม
          และประสิทธิภาพของหน้าเว็บ
        </li>
        <li>
          <strong>Google Tag Manager (GTM):</strong> จัดการแท็กวิเคราะห์ต่างๆ บนเว็บไซต์
        </li>
      </ul>

      <h3 className="text-sm font-semibold mt-4">2.4 คุกกี้ทางการตลาด (Marketing Cookies)</h3>
      <p>คุกกี้เหล่านี้จะทำงานเฉพาะเมื่อท่านให้ความยินยอม (opt-in) เท่านั้น</p>
      <ul>
        <li>ใช้เพื่อส่งข่าวสารและข้อมูลด้านการตลาดที่เกี่ยวข้องกับบริการของเรา</li>
        <li>ท่านสามารถเพิกถอนความยินยอมได้ทุกเมื่อผ่าน "ตั้งค่าคุกกี้" ที่ด้านล่างของเว็บไซต์</li>
      </ul>

      <h2>3. การจัดการคุกกี้</h2>
      <p>ท่านสามารถจัดการความยินยอมคุกกี้ได้ดังนี้:</p>
      <ul>
        <li>
          <strong>แบนเนอร์คุกกี้:</strong> แสดงเมื่อเข้าชมเว็บไซต์ครั้งแรก หรือเปิดใหม่ได้จาก "ตั้งค่าคุกกี้"
          ที่ส่วนท้ายเว็บไซต์
        </li>
        <li>
          <strong>การตั้งค่าเบราว์เซอร์:</strong> ท่านสามารถลบหรือบล็อกคุกกี้ผ่านเบราว์เซอร์ได้
          แต่อาจส่งผลต่อการทำงานของเว็บไซต์
        </li>
      </ul>

      <h2>4. ระยะเวลาการจัดเก็บ</h2>
      <ul>
        <li>
          <strong>คุกกี้เซสชัน:</strong> ลบเมื่อปิดเบราว์เซอร์
        </li>
        <li>
          <strong>คุกกี้ถาวร:</strong> จัดเก็บไว้จนกว่าจะหมดอายุหรือถูกลบ (สูงสุด 2 ปี)
        </li>
      </ul>

      <h2>5. การเปลี่ยนแปลงนโยบาย</h2>
      <p>เราอาจปรับปรุงนโยบายคุกกี้นี้เป็นครั้งคราว การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนเว็บไซต์</p>

      <h2>6. ติดต่อเรา</h2>
      <p>
        หากท่านมีคำถามเกี่ยวกับนโยบายคุกกี้นี้ กรุณาติดต่อ:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

function CookiesEn() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <p>
        FactorySync Solutions ("Service") uses cookies and similar technologies to ensure the
        Service functions correctly, improve your experience, and analyze website traffic.
      </p>

      <h2>1. What Are Cookies</h2>
      <p>
        Cookies are small data files stored on your device when you visit a website. They help the
        website remember your preferences, such as language settings, to make future visits more
        convenient.
      </p>

      <h2>2. Types of Cookies We Use</h2>

      <h3 className="text-sm font-semibold mt-4">2.1 Essential Cookies</h3>
      <p>These cookies are required for the website to function and cannot be disabled.</p>
      <ul>
        <li>
          <strong>Firebase Authentication:</strong> Stores login state and session data.
        </li>
        <li>
          <strong>Language preference (fss-locale):</strong> Remembers your chosen language
          (Thai/English).
        </li>
        <li>
          <strong>Cookie consent (fss-cookie-consent):</strong> Remembers your cookie preferences.
        </li>
      </ul>

      <h3 className="text-sm font-semibold mt-4">2.2 Security Cookies</h3>
      <ul>
        <li>
          <strong>Cloudflare Turnstile:</strong> Verifies you are a real person, not a bot, on the
          registration page.
        </li>
        <li>
          <strong>Cloudflare CDN:</strong> Cookies used for secure content delivery and threat
          protection.
        </li>
      </ul>

      <h3 className="text-sm font-semibold mt-4">2.3 Analytics Cookies</h3>
      <p>These cookies help us understand how you use the website so we can improve our Service.</p>
      <ul>
        <li>
          <strong>Google Analytics 4 (GA4):</strong> Analyzes traffic, user behavior, visitor
          counts, and page performance.
        </li>
        <li>
          <strong>Google Tag Manager (GTM):</strong> Manages analytics tags on the website.
        </li>
      </ul>

      <h3 className="text-sm font-semibold mt-4">2.4 Marketing Cookies</h3>
      <p>These cookies are only activated when you give explicit consent (opt-in).</p>
      <ul>
        <li>Used to send relevant marketing communications about our Service.</li>
        <li>
          You can withdraw consent at any time via "Cookie Settings" at the bottom of the website.
        </li>
      </ul>

      <h2>3. Managing Cookies</h2>
      <p>You can manage your cookie consent through:</p>
      <ul>
        <li>
          <strong>Cookie banner:</strong> Shown on your first visit, or reopened via "Cookie
          Settings" in the website footer.
        </li>
        <li>
          <strong>Browser settings:</strong> You can delete or block cookies through your browser,
          but this may affect website functionality.
        </li>
      </ul>

      <h2>4. Retention Period</h2>
      <ul>
        <li>
          <strong>Session cookies:</strong> Deleted when you close your browser.
        </li>
        <li>
          <strong>Persistent cookies:</strong> Stored until expiration or deletion (up to 2 years).
        </li>
      </ul>

      <h2>5. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Changes take effect immediately upon
        publication on the website.
      </p>

      <h2>6. Contact</h2>
      <p>
        If you have questions about this Cookie Policy, contact:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

function PrivacyEn() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <p>
        FactorySync Solutions ("Service") is committed to protecting your personal data. This policy
        explains how we collect, use, and protect your information, in compliance with Thailand's
        Personal Data Protection Act (PDPA).
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> Name, email, and profile picture from your Google account.
        </li>
        <li>
          <strong>Company data:</strong> Company name, registration ID, industry type, and company
          size.
        </li>
        <li>
          <strong>Contact data:</strong> Contact name, email, and phone number.
        </li>
        <li>
          <strong>Assessment data:</strong> Quiz answers, scores, and analysis results.
        </li>
        <li>
          <strong>Usage data:</strong> Pages visited, actions taken on the website, collected via
          Google Analytics.
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser type, operating system, collected via
          cookies and similar technologies.
        </li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>Provide factory health assessment services and display results.</li>
        <li>Authenticate and manage user accounts.</li>
        <li>Verify company information via the DBD (Department of Business Development) system.</li>
        <li>Prevent misuse through Cloudflare Turnstile.</li>
        <li>Analyze and improve our Service via Google Analytics and Google Tag Manager.</li>
        <li>Communicate with you about the Service.</li>
      </ul>

      <h2>3. Legal Basis</h2>
      <ul>
        <li>
          <strong>Consent:</strong> Registration and taking assessments.
        </li>
        <li>
          <strong>Contract:</strong> Providing assessment services as requested.
        </li>
        <li>
          <strong>Legitimate interest:</strong> Service analytics and improvement.
        </li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>We may share data with the following third parties:</p>
      <ul>
        <li>
          <strong>Google (Firebase Authentication):</strong> For user authentication.
        </li>
        <li>
          <strong>Google (Analytics & Tag Manager):</strong> For usage analytics.
        </li>
        <li>
          <strong>Cloudflare:</strong> For security and CDN services.
        </li>
        <li>
          <strong>Google Cloud Platform:</strong> For data storage and processing.
        </li>
      </ul>
      <p>We will never sell your personal data to third parties.</p>

      <h2>5. Cookies and Tracking Technologies</h2>
      <ul>
        <li>
          <strong>Essential cookies:</strong> Authentication, language preferences.
        </li>
        <li>
          <strong>Analytics cookies:</strong> Google Analytics to understand website usage.
        </li>
        <li>
          <strong>Security cookies:</strong> Cloudflare Turnstile for bot protection.
        </li>
      </ul>
      <p>
        You can manage cookie preferences via the cookie consent banner shown on your first visit,
        or through your browser settings.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your data for as long as necessary for the stated purposes, or as required by law.
      </p>

      <h2>7. Your Rights</h2>
      <p>Under the PDPA, you have the right to:</p>
      <ul>
        <li>Access your personal data.</li>
        <li>Rectify inaccurate data.</li>
        <li>Request deletion of your data.</li>
        <li>Object to data processing.</li>
        <li>Request data portability.</li>
        <li>Withdraw consent.</li>
      </ul>
      <p>
        To exercise these rights, contact:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>

      <h2>8. Data Security</h2>
      <p>
        We implement appropriate security measures including HTTPS encryption, data storage on
        Google Cloud Platform, and access controls.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Significant changes will be communicated
        through the Service.
      </p>

      <h2>10. Contact</h2>
      <p>
        If you have questions about this Privacy Policy, contact:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

// --- Marketing Policy Content ---

function MarketingTh() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <p>
        นโยบายฉบับนี้อธิบายวิธีการที่ FactorySync Solutions ("บริการ") เก็บรวบรวม ใช้
        และเปิดเผยข้อมูลส่วนบุคคลของท่านเพื่อวัตถุประสงค์ทางการตลาด โดยสอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล
        พ.ศ. 2562 (PDPA)
      </p>

      <h2>1. ข้อมูลที่ใช้เพื่อวัตถุประสงค์ทางการตลาด</h2>
      <p>เราอาจใช้ข้อมูลส่วนบุคคลต่อไปนี้เพื่อวัตถุประสงค์ทางการตลาด:</p>
      <ul>
        <li>
          <strong>ข้อมูลติดต่อ:</strong> ชื่อ อีเมล เบอร์โทรศัพท์
        </li>
        <li>
          <strong>ข้อมูลบริษัท:</strong> ชื่อบริษัท ประเภทอุตสาหกรรม ขนาดบริษัท
        </li>
        <li>
          <strong>ข้อมูลการใช้งาน:</strong> ผลการประเมิน คะแนน และพฤติกรรมการใช้งานเว็บไซต์
        </li>
      </ul>

      <h2>2. วัตถุประสงค์ทางการตลาด</h2>
      <p>เราอาจใช้ข้อมูลของท่านเพื่อ:</p>
      <ul>
        <li>ส่งข่าวสาร อัปเดต และข้อมูลเกี่ยวกับบริการของเรา</li>
        <li>แนะนำบริการหรือฟีเจอร์ใหม่ที่อาจเป็นประโยชน์ต่อท่าน</li>
        <li>ส่งข้อเสนอพิเศษ โปรโมชัน หรือกิจกรรมที่เกี่ยวข้อง</li>
        <li>วิเคราะห์และปรับปรุงประสิทธิภาพของแคมเปญการตลาด</li>
        <li>ทำแบบสำรวจความพึงพอใจหรือวิจัยตลาด</li>
      </ul>

      <h2>3. ฐานทางกฎหมาย</h2>
      <p>
        การประมวลผลข้อมูลส่วนบุคคลเพื่อวัตถุประสงค์ทางการตลาดจะดำเนินการบนฐาน{' '}
        <strong>ความยินยอม (Consent)</strong> ของท่านเท่านั้น ท่านสามารถให้หรือไม่ให้ความยินยอมได้อย่างอิสระ
        โดยไม่มีผลกระทบต่อการใช้บริการหลัก
      </p>

      <h2>4. ช่องทางการสื่อสารทางการตลาด</h2>
      <p>เราอาจส่งข้อความทางการตลาดผ่านช่องทางต่อไปนี้:</p>
      <ul>
        <li>
          <strong>อีเมล:</strong> จดหมายข่าว อัปเดตบริการ ข้อเสนอพิเศษ
        </li>
        <li>
          <strong>การแจ้งเตือนบนเว็บไซต์:</strong> ข้อมูลเกี่ยวกับฟีเจอร์ใหม่หรือการปรับปรุงบริการ
        </li>
      </ul>

      <h2>5. การให้และเพิกถอนความยินยอม</h2>
      <ul>
        <li>
          <strong>การให้ความยินยอม:</strong> ท่านสามารถให้ความยินยอมผ่านการตั้งค่าคุกกี้ (Cookie Settings)
          บนเว็บไซต์ โดยเปิดใช้งาน "คุกกี้ในส่วนการตลาด"
        </li>
        <li>
          <strong>การเพิกถอนความยินยอม:</strong> ท่านสามารถเพิกถอนความยินยอมได้ทุกเมื่อ โดย:
          <ul>
            <li>ปิดการใช้งาน "คุกกี้ในส่วนการตลาด" ผ่านตั้งค่าคุกกี้ที่ส่วนท้ายเว็บไซต์</li>
            <li>คลิกลิงก์ "ยกเลิกการรับข่าวสาร" ในอีเมลที่ได้รับ</li>
            <li>ติดต่อเราที่ info@factorysyncsolutions.com</li>
          </ul>
        </li>
      </ul>
      <p>การเพิกถอนความยินยอมจะไม่กระทบต่อความชอบด้วยกฎหมายของการประมวลผลที่ได้ทำไปก่อนหน้า</p>

      <h2>6. การแบ่งปันข้อมูลเพื่อการตลาด</h2>
      <ul>
        <li>
          เราจะ <strong>ไม่ขาย</strong> ข้อมูลส่วนบุคคลของท่านให้แก่บุคคลที่สาม
        </li>
        <li>
          เราอาจใช้บริการของ Google Analytics และ Google Tag Manager
          เพื่อวิเคราะห์ประสิทธิภาพของแคมเปญการตลาด
        </li>
        <li>เราจะไม่แบ่งปันข้อมูลของท่านกับบุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาดของบุคคลที่สามนั้น</li>
      </ul>

      <h2>7. ระยะเวลาการเก็บรักษา</h2>
      <p>
        เราจะเก็บรักษาข้อมูลที่ใช้เพื่อวัตถุประสงค์ทางการตลาดจนกว่าท่านจะเพิกถอนความยินยอม
        หรือจนกว่าจะไม่จำเป็นต่อวัตถุประสงค์ดังกล่าวอีกต่อไป
      </p>

      <h2>8. สิทธิของท่าน</h2>
      <p>ท่านมีสิทธิตาม PDPA ดังนี้:</p>
      <ul>
        <li>เพิกถอนความยินยอมได้ทุกเมื่อ</li>
        <li>เข้าถึงข้อมูลส่วนบุคคลที่ใช้เพื่อการตลาด</li>
        <li>ขอลบข้อมูลที่ใช้เพื่อวัตถุประสงค์ทางการตลาด</li>
        <li>คัดค้านการประมวลผลข้อมูลเพื่อการตลาดทางตรง</li>
      </ul>

      <h2>9. การเปลี่ยนแปลงนโยบาย</h2>
      <p>
        เราอาจปรับปรุงนโยบายทางการตลาดนี้เป็นครั้งคราว หากมีการเปลี่ยนแปลงที่สำคัญ
        เราจะแจ้งให้ท่านทราบและขอความยินยอมใหม่หากจำเป็น
      </p>

      <h2>10. ติดต่อเรา</h2>
      <p>
        หากท่านมีคำถามเกี่ยวกับนโยบายทางการตลาดนี้ หรือต้องการใช้สิทธิของท่าน กรุณาติดต่อ:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}

function MarketingEn() {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
      <p>
        This policy explains how FactorySync Solutions ("Service") collects, uses, and discloses
        your personal data for marketing purposes, in compliance with Thailand's Personal Data
        Protection Act (PDPA).
      </p>

      <h2>1. Data Used for Marketing</h2>
      <p>We may use the following personal data for marketing purposes:</p>
      <ul>
        <li>
          <strong>Contact data:</strong> Name, email, phone number.
        </li>
        <li>
          <strong>Company data:</strong> Company name, industry type, company size.
        </li>
        <li>
          <strong>Usage data:</strong> Assessment results, scores, and website usage behavior.
        </li>
      </ul>

      <h2>2. Marketing Purposes</h2>
      <p>We may use your data to:</p>
      <ul>
        <li>Send news, updates, and information about our Service.</li>
        <li>Recommend new services or features that may benefit you.</li>
        <li>Send special offers, promotions, or related events.</li>
        <li>Analyze and improve the effectiveness of marketing campaigns.</li>
        <li>Conduct satisfaction surveys or market research.</li>
      </ul>

      <h2>3. Legal Basis</h2>
      <p>
        Processing of personal data for marketing purposes is based solely on your{' '}
        <strong>Consent</strong>. You may freely give or withhold consent without affecting your
        ability to use the core Service.
      </p>

      <h2>4. Marketing Communication Channels</h2>
      <p>We may send marketing messages through:</p>
      <ul>
        <li>
          <strong>Email:</strong> Newsletters, service updates, special offers.
        </li>
        <li>
          <strong>Website notifications:</strong> Information about new features or service
          improvements.
        </li>
      </ul>

      <h2>5. Giving and Withdrawing Consent</h2>
      <ul>
        <li>
          <strong>Giving consent:</strong> You can give consent via Cookie Settings on the website
          by enabling "Marketing Cookies".
        </li>
        <li>
          <strong>Withdrawing consent:</strong> You can withdraw consent at any time by:
          <ul>
            <li>Disabling "Marketing Cookies" via Cookie Settings in the website footer.</li>
            <li>Clicking the "Unsubscribe" link in any marketing email.</li>
            <li>Contacting us at info@factorysyncsolutions.com.</li>
          </ul>
        </li>
      </ul>
      <p>
        Withdrawal of consent does not affect the lawfulness of processing carried out before the
        withdrawal.
      </p>

      <h2>6. Data Sharing for Marketing</h2>
      <ul>
        <li>
          We will <strong>never sell</strong> your personal data to third parties.
        </li>
        <li>
          We may use Google Analytics and Google Tag Manager to analyze marketing campaign
          effectiveness.
        </li>
        <li>We will not share your data with third parties for their own marketing purposes.</li>
      </ul>

      <h2>7. Retention Period</h2>
      <p>
        We retain data used for marketing purposes until you withdraw consent or until the data is
        no longer necessary for the stated purposes.
      </p>

      <h2>8. Your Rights</h2>
      <p>Under the PDPA, you have the right to:</p>
      <ul>
        <li>Withdraw consent at any time.</li>
        <li>Access personal data used for marketing.</li>
        <li>Request deletion of data used for marketing purposes.</li>
        <li>Object to processing for direct marketing.</li>
      </ul>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Marketing Policy from time to time. If significant changes are made, we
        will notify you and request new consent if necessary.
      </p>

      <h2>10. Contact</h2>
      <p>
        If you have questions about this Marketing Policy or wish to exercise your rights, contact:{' '}
        <a href="mailto:info@factorysyncsolutions.com" className="text-primary">
          info@factorysyncsolutions.com
        </a>
      </p>
    </div>
  );
}
