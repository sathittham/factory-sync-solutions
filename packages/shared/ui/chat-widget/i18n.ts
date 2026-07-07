import type { Locale } from './types';

/**
 * Widget-local strings (TH/EN). The widget is host-agnostic — it does not use
 * either app's `useLocale()` — so it carries its own small dictionary keyed
 * off the `locale` prop. No user-visible text in `ChatWidget.tsx` is
 * hardcoded; everything routes through `t()`.
 */

const dictionaries: Record<Locale, Record<string, string>> = {
  th: {
    'fab.open': 'เปิดแชทกับฝ่ายบริการลูกค้า',
    'fab.close': 'ปิดหน้าต่างแชท',
    'fab.unread': 'มีข้อความใหม่',
    title: 'ฝ่ายบริการลูกค้า FactorySync',
    'header.statusBot': 'ผู้ช่วย AI',
    'header.statusHuman': 'คุณกำลังคุยกับทีมงานของเรา',
    'banner.escalated': 'คุณกำลังคุยกับทีมงานของเรา',
    'empty.title': 'สอบถามได้เลย เรายินดีช่วยเหลือ',
    'empty.desc': 'ถามเกี่ยวกับบริการ แบบประเมินสุขภาพโรงงาน หรือวิธีใช้งานได้เลย',
    'typing.indicator': 'กำลังพิมพ์...',
    'input.placeholder': 'พิมพ์ข้อความ...',
    'input.send': 'ส่ง',
    'input.tooLong': 'ข้อความยาวเกินไป (สูงสุด 4,000 ตัวอักษร)',
    'error.notice': 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    'error.retry': 'ลองอีกครั้ง',
    'state.offline': 'คุณออฟไลน์อยู่ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง',
    'state.loading': 'กำลังโหลด...',
    'role.customer': 'คุณ',
    'role.bot': 'ผู้ช่วย AI',
    'role.agent': 'เจ้าหน้าที่',
  },
  en: {
    'fab.open': 'Open chat with customer support',
    'fab.close': 'Close chat panel',
    'fab.unread': 'New message',
    title: 'FactorySync Support',
    'header.statusBot': 'AI assistant',
    'header.statusHuman': "You're chatting with our team",
    'banner.escalated': "You're chatting with our team",
    'empty.title': 'Ask us anything',
    'empty.desc': 'Ask about our services, the factory health check, or how to get started.',
    'typing.indicator': 'Typing…',
    'input.placeholder': 'Type your message…',
    'input.send': 'Send',
    'input.tooLong': 'Message is too long (4,000 characters max)',
    'error.notice': 'Something went wrong. Please try again.',
    'error.retry': 'Retry',
    'state.offline': "You're offline. Check your connection and try again.",
    'state.loading': 'Loading…',
    'role.customer': 'You',
    'role.bot': 'AI assistant',
    'role.agent': 'Support agent',
  },
};

export function createChatTranslator(locale: Locale) {
  const dict = dictionaries[locale] ?? dictionaries.en;
  return (key: string): string => dict[key] ?? key;
}

export type ChatTranslator = ReturnType<typeof createChatTranslator>;
