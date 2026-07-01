/**
 * Knowledge Hub mockup articles — single source of truth shared by the local
 * seeder (seed-knowledge.ts) and the remote seeder (seed-knowledge-remote.mjs).
 *
 * 8 articles, one per Knowledge Hub category
 * (apps/web-official/src/lib/knowledge.ts). Each is BILINGUAL in a single
 * document: a Thai section, an "— English version —" divider, then the English
 * section — matching the locale-blind build-time fetch in
 * apps/web-official/src/lib/cms.ts.
 *
 * Content is authored as a minimal Lexical editor state limited to the node
 * types the site renderer supports (apps/web-official/src/lib/lexical.ts):
 * heading / paragraph / list / quote / bold text.
 */

// --- Minimal Lexical builders -------------------------------------------------

const FORMAT_BOLD = 1

function text(value, format = 0) {
  return { detail: 0, format, mode: 'normal', style: '', text: value, type: 'text', version: 1 }
}

/** Bold text span. */
function b(value) {
  return text(value, FORMAT_BOLD)
}

function paragraph(...spans) {
  return { children: spans, direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1 }
}

function heading(tag, value) {
  return { children: [text(value)], direction: 'ltr', format: '', indent: 0, type: 'heading', tag, version: 1 }
}

function listItem(value) {
  return { children: [text(value)], direction: 'ltr', format: '', indent: 0, type: 'listitem', value: 1, version: 1 }
}

function bulletList(items) {
  return {
    children: items.map(listItem),
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'list',
    listType: 'bullet',
    tag: 'ul',
    start: 1,
    version: 1,
  }
}

function quote(value) {
  return { children: [text(value)], direction: 'ltr', format: '', indent: 0, type: 'quote', version: 1 }
}

/** Wrap TH + EN blocks into a full bilingual Lexical editor state. */
function bilingualState(th, en) {
  const children = [...th, heading('h2', '— English version —'), ...en]
  return { root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 } }
}

// --- Article definitions ------------------------------------------------------

// Stable, distinct cover images. Lorem Picsum serves Unsplash-sourced photos and
// is reliable to hotlink for mockups (swap for owned assets before launch —
// Phase 5). Seeded per-slug so each card gets a consistent, unique image.
function coverImage(slug) {
  return `https://picsum.photos/seed/fs-${slug}/1200/675`
}

/**
 * Lighter "filler" articles — enough breadth to demo pagination, the featured
 * carousel (multiple pinned), and category/tag filtering. Shorter bilingual
 * bodies built from a lead paragraph + a 3-item checklist per language.
 */
function filler(cfg) {
  const [thTitle, enTitle] = cfg.title.split(' / ')
  return {
    slug: cfg.slug,
    category: cfg.category,
    title: cfg.title,
    excerpt: cfg.excerpt,
    tags: cfg.tags,
    isPinned: cfg.isPinned ?? false,
    publishedAt: cfg.publishedAt,
    th: [heading('h2', thTitle), paragraph(text(cfg.thLead)), bulletList(cfg.thPoints)],
    en: [heading('h2', enTitle ?? thTitle), paragraph(text(cfg.enLead)), bulletList(cfg.enPoints)],
  }
}

const EXTRAS = [
  filler({
    slug: 'ror-ngor-2-vs-4-differences',
    category: 'law-licensing',
    title: 'รง.2 กับ รง.4 ต่างกันอย่างไร / Ror.Ngor.2 vs Ror.Ngor.4 Explained',
    excerpt: 'สรุปความต่างของการแจ้งประกอบกิจการ (รง.2) กับการขอใบอนุญาต (รง.4) แบบเข้าใจง่าย. A quick guide to notification vs licensing.',
    tags: 'รง.4, รง.2, ใบอนุญาต',
    publishedAt: '2026-06-22T02:00:00.000Z',
    thLead: 'จำพวกที่ 2 เพียงแจ้ง แต่จำพวกที่ 3 ต้องได้ใบอนุญาตก่อนผลิต ความต่างนี้กำหนดภาระเอกสารและเวลาเตรียมงาน',
    thPoints: ['รง.2 — แจ้งต่อเจ้าหน้าที่ก่อนเริ่ม', 'รง.4 — ต้องได้รับอนุญาตก่อนผลิต', 'ตรวจกำลังเครื่องจักรและแรงงานเพื่อจัดจำพวก'],
    enLead: 'Class 2 only notifies; class 3 must be licensed before producing. This drives your paperwork and lead time.',
    enPoints: ['Ror.Ngor.2 — notify before starting', 'Ror.Ngor.4 — licence required first', 'Check machine power and headcount to classify'],
  }),
  filler({
    slug: 'annual-fire-drill-guide',
    category: 'factory-safety',
    title: 'จัดซ้อมดับเพลิงประจำปีให้ได้ผลจริง / Running an Effective Annual Fire Drill',
    excerpt: 'ซ้อมดับเพลิงและอพยพหนีไฟอย่างน้อยปีละครั้งตามกฎหมาย พร้อมเช็กลิสต์เตรียมงาน. Plan a compliant, useful fire and evacuation drill.',
    tags: 'ความปลอดภัย, ดับเพลิง, อพยพ',
    publishedAt: '2026-06-20T02:00:00.000Z',
    thLead: 'การซ้อมที่ดีไม่ใช่แค่ทำให้ครบ แต่ต้องวัดเวลาอพยพและหาจุดที่ติดขัดเพื่อปรับปรุง',
    thPoints: ['กำหนดเส้นทางและจุดรวมพลชัดเจน', 'จับเวลาอพยพและบันทึกผล', 'ทบทวนหลังซ้อมเพื่อแก้จุดอ่อน'],
    enLead: 'A good drill is not a checkbox — time the evacuation and find the bottlenecks to fix.',
    enPoints: ['Define routes and assembly points', 'Time the evacuation and log it', 'Debrief afterwards to fix weak points'],
  }),
  filler({
    slug: 'do-you-need-a-safety-officer',
    category: 'factory-safety',
    title: 'โรงงานต้องมี จป. กี่คน / How Many Safety Officers Does Your Factory Need?',
    excerpt: 'จำนวนเจ้าหน้าที่ความปลอดภัย (จป.) ขึ้นกับขนาดและประเภทกิจการ ตรวจก่อนถูกสั่งปรับ. Safety-officer requirements scale with size and risk.',
    tags: 'ความปลอดภัย, จป., กฎหมายแรงงาน',
    publishedAt: '2026-06-18T02:00:00.000Z',
    thLead: 'กิจการยิ่งเสี่ยงและแรงงานยิ่งมาก ยิ่งต้องมี จป. ระดับสูงขึ้น ควรตรวจเกณฑ์ให้ตรงประเภทกิจการ',
    thPoints: ['จป. ระดับหัวหน้างาน/บริหารตามโครงสร้าง', 'จำนวนขึ้นกับจำนวนลูกจ้าง', 'ยืนยันกับกฎกระทรวงล่าสุด'],
    enLead: 'Higher risk and more workers mean more senior safety officers. Check the rule for your activity type.',
    enPoints: ['Supervisor/management-level officers by structure', 'Count scales with headcount', 'Confirm against the current ministerial rule'],
  }),
  filler({
    slug: 'choosing-mes-erp-for-sme',
    category: 'digital-factory',
    title: 'เลือก MES / ERP ให้เหมาะกับโรงงาน SME / Choosing MES/ERP for an SME Factory',
    excerpt: 'อย่าซื้อระบบใหญ่เกินตัว เริ่มจากปัญหาจริงและการใช้งานที่ทีมทำได้จริง. Do not over-buy — start from the real problem your team will use.',
    tags: 'Digital Factory, MES, ERP',
    isPinned: true,
    publishedAt: '2026-06-16T02:00:00.000Z',
    thLead: 'ระบบที่ดีที่สุดคือระบบที่พนักงานใช้จริงทุกวัน เริ่มจากโมดูลที่แก้ปัญหาเฉพาะหน้าก่อนขยาย',
    thPoints: ['ระบุกระบวนการที่เจ็บปวดที่สุดก่อน', 'ทดลองนำร่องหนึ่งสายการผลิต', 'ประเมินค่าใช้จ่ายรวมระยะยาว ไม่ใช่แค่ค่าลิขสิทธิ์'],
    enLead: 'The best system is the one your staff actually use daily. Start with the module that solves today’s pain.',
    enPoints: ['Name the most painful process first', 'Pilot on a single line', 'Weigh total cost of ownership, not just licences'],
  }),
  filler({
    slug: 'cheap-iot-sensors-to-start',
    category: 'digital-factory',
    title: 'เริ่มเก็บข้อมูลด้วยเซนเซอร์ IoT ราคาประหยัด / Start With Low-Cost IoT Sensors',
    excerpt: 'เซนเซอร์ราคาไม่แพงช่วยเห็นเวลาเครื่องหยุดและอุณหภูมิได้ทันที. Affordable sensors reveal downtime and temperature fast.',
    tags: 'Digital Factory, IoT, เซนเซอร์',
    publishedAt: '2026-06-14T02:00:00.000Z',
    thLead: 'ไม่ต้องลงทุนหนักตั้งแต่แรก เซนเซอร์วัดการสั่น อุณหภูมิ และสถานะเครื่อง ช่วยเริ่มเก็บข้อมูลได้จริง',
    thPoints: ['เลือกจุดวัดที่ให้ข้อมูลคุ้มค่าที่สุด', 'ส่งข้อมูลขึ้นแดชบอร์ดกลาง', 'ตั้งการแจ้งเตือนเมื่อค่าผิดปกติ'],
    enLead: 'No heavy upfront spend — vibration, temperature, and status sensors get you collecting data now.',
    enPoints: ['Pick the highest-value measurement points', 'Stream to one dashboard', 'Alert on anomalies'],
  }),
  filler({
    slug: 'plc-basics-for-owners',
    category: 'machinery-automation',
    title: 'PLC เบื้องต้นสำหรับเจ้าของโรงงาน / PLC Basics for Factory Owners',
    excerpt: 'เข้าใจ PLC พอให้คุยกับช่างและซัพพลายเออร์รู้เรื่อง โดยไม่ต้องเป็นวิศวกร. Understand PLCs enough to talk to your team and vendors.',
    tags: 'ระบบอัตโนมัติ, PLC, ควบคุมเครื่องจักร',
    publishedAt: '2026-06-13T02:00:00.000Z',
    thLead: 'PLC คือสมองควบคุมเครื่องจักร รู้พื้นฐานช่วยให้ตัดสินใจซ่อมหรืออัปเกรดได้อย่างมั่นใจ',
    thPoints: ['อินพุต–ประมวลผล–เอาต์พุตทำงานอย่างไร', 'ความต่างของยี่ห้อหลักในตลาด', 'สำรองโปรแกรมไว้เสมอ'],
    enLead: 'A PLC is the machine’s control brain. Basics help you decide on repairs or upgrades with confidence.',
    enPoints: ['How input–process–output works', 'Differences between major brands', 'Always back up the program'],
  }),
  filler({
    slug: 'cobot-vs-industrial-robot',
    category: 'machinery-automation',
    title: 'Cobot กับหุ่นยนต์อุตสาหกรรม เลือกแบบไหน / Cobot vs Industrial Robot',
    excerpt: 'หุ่นยนต์ร่วมงาน (cobot) ปลอดภัยและยืดหยุ่นกว่า แต่หุ่นยนต์อุตสาหกรรมเร็วและแรงกว่า. Cobots are safer and flexible; industrial robots are faster.',
    tags: 'ระบบอัตโนมัติ, Cobot, หุ่นยนต์',
    publishedAt: '2026-06-11T02:00:00.000Z',
    thLead: 'เลือกตามงาน หากงานหลากหลายและทำงานใกล้คน cobot เหมาะกว่า หากงานซ้ำหนักและเร็ว หุ่นยนต์อุตสาหกรรมคุ้มกว่า',
    thPoints: ['ประเมินความเร็วและน้ำหนักชิ้นงาน', 'พิจารณาความปลอดภัยเมื่อทำงานใกล้คน', 'คำนวณความคุ้มค่าต่อรอบการผลิต'],
    enLead: 'Choose by task: varied work near people suits cobots; heavy, fast, repetitive work favours industrial robots.',
    enPoints: ['Assess speed and payload', 'Consider safety around people', 'Compute value per cycle'],
  }),
  filler({
    slug: 'iso-14001-getting-started',
    category: 'environment',
    title: 'เริ่มต้น ISO 14001 ระบบจัดการสิ่งแวดล้อม / Getting Started With ISO 14001',
    excerpt: 'ระบบจัดการสิ่งแวดล้อมช่วยลดของเสียและสร้างความน่าเชื่อถือกับลูกค้า. An EMS cuts waste and builds customer trust.',
    tags: 'สิ่งแวดล้อม, ISO 14001, EMS',
    publishedAt: '2026-06-19T02:00:00.000Z',
    thLead: 'ISO 14001 ไม่ใช่แค่ใบรับรอง แต่เป็นระบบที่ทำให้การจัดการสิ่งแวดล้อมเป็นกิจวัตร',
    thPoints: ['ระบุประเด็นสิ่งแวดล้อมที่สำคัญ', 'ตั้งเป้าหมายและตัวชี้วัด', 'ทบทวนและปรับปรุงต่อเนื่อง'],
    enLead: 'ISO 14001 is not just a certificate — it makes environmental management a routine.',
    enPoints: ['Identify significant aspects', 'Set targets and indicators', 'Review and improve continuously'],
  }),
  filler({
    slug: 'seven-wastes-muda',
    category: 'lean-kaizen',
    title: 'รู้จัก 7 ความสูญเปล่า (Muda) / The 7 Wastes (Muda) Every Factory Should Spot',
    excerpt: 'มองเห็นความสูญเปล่า 7 ประเภทคือก้าวแรกของการเพิ่มผลผลิตแบบ Lean. Seeing the 7 wastes is the first step to Lean productivity.',
    tags: 'Lean, Kaizen, Muda',
    isPinned: true,
    publishedAt: '2026-06-17T02:00:00.000Z',
    thLead: 'ความสูญเปล่าซ่อนอยู่ทุกที่ — ผลิตเกิน รอคอย ขนย้าย สต๊อก เคลื่อนไหว ของเสีย และกระบวนการเกินจำเป็น',
    thPoints: ['เดินสำรวจหน้างานเพื่อหา Muda', 'จัดลำดับแก้จากผลกระทบสูงสุด', 'วัดผลก่อน–หลังเพื่อยืนยัน'],
    enLead: 'Waste hides everywhere — overproduction, waiting, transport, inventory, motion, defects, and over-processing.',
    enPoints: ['Walk the floor to spot Muda', 'Fix highest-impact first', 'Measure before/after to confirm'],
  }),
  filler({
    slug: 'what-is-value-stream-mapping',
    category: 'lean-kaizen',
    title: 'Value Stream Mapping คืออะไร / What Is Value Stream Mapping?',
    excerpt: 'VSM ช่วยเห็นภาพรวมการไหลของงานและจุดที่เกิดคอขวด. VSM reveals the whole flow and where bottlenecks form.',
    tags: 'Lean, VSM, กระบวนการ',
    publishedAt: '2026-06-12T02:00:00.000Z',
    thLead: 'การเขียนแผนผังสายธารคุณค่าทำให้เห็นทั้งกระบวนการในหน้าเดียว และชี้จุดที่ควรปรับปรุงก่อน',
    thPoints: ['วาดสถานะปัจจุบันก่อน', 'ระบุเวลาเพิ่มค่าและไม่เพิ่มค่า', 'ออกแบบสถานะอนาคตที่ดีกว่า'],
    enLead: 'Mapping the value stream shows the whole process on one page and points to what to fix first.',
    enPoints: ['Draw the current state first', 'Separate value-add from non-value time', 'Design a better future state'],
  }),
  filler({
    slug: 'is-b2b-paid-ads-worth-it',
    category: 'digital-marketing',
    title: 'ยิงแอดออนไลน์สำหรับโรงงาน B2B คุ้มไหม / Are Paid Ads Worth It for B2B Factories?',
    excerpt: 'โฆษณาออนไลน์อาจคุ้มถ้าตั้งเป้าหมายและวัดผลชัด ไม่ใช่ยิงเพื่อยอดไลก์. Paid ads can pay off with clear goals and measurement.',
    tags: 'การตลาด, โฆษณา, B2B',
    publishedAt: '2026-06-15T02:00:00.000Z',
    thLead: 'ลูกค้าโรงงานมีจำนวนจำกัดและวงจรขายยาว การยิงแอดต้องเน้นคุณภาพลีดมากกว่าปริมาณ',
    thPoints: ['ตั้งเป้าหมายเป็นลีดที่ติดต่อได้จริง', 'ทดสอบข้อความและกลุ่มเป้าหมาย', 'วัดต้นทุนต่อลีดและปิดการขาย'],
    enLead: 'Factory buyers are few with long cycles — ads must chase lead quality, not volume.',
    enPoints: ['Target real, contactable leads', 'Test messaging and audiences', 'Measure cost per lead and close rate'],
  }),
  filler({
    slug: 'iso-certification-via-gov-programs',
    category: 'gov-benefits',
    title: 'ขอ ISO ผ่านโครงการสนับสนุนภาครัฐ / Getting ISO Certified via Government Programs',
    excerpt: 'หลายหน่วยงานรัฐช่วยออกค่าใช้จ่ายการขอ ISO ให้ SME บางส่วน. State programs can subsidise part of your ISO certification.',
    tags: 'สิทธิประโยชน์, ISO, เงินสนับสนุน',
    publishedAt: '2026-06-10T02:00:00.000Z',
    thLead: 'การขอ ISO มีต้นทุน แต่โครงการรัฐหลายโครงการช่วยสนับสนุนค่าที่ปรึกษาและค่าตรวจประเมินบางส่วน',
    thPoints: ['ตรวจคุณสมบัติเข้าร่วมโครงการ', 'เตรียมเอกสารระบบให้พร้อม', 'ปรึกษาหน่วยงานส่งเสริมก่อนยื่น'],
    enLead: 'Certification costs money, but several state programs subsidise part of the consulting and audit fees.',
    enPoints: ['Check program eligibility', 'Prepare your system documents', 'Consult the promoting agency first'],
  }),
]

const DEFS = [
  {
    slug: 'factory-license-ror-ngor-4-basics',
    category: 'law-licensing',
    title: 'ใบอนุญาต รง.4 ครบทุกเรื่องที่ต้องรู้ก่อนเปิดโรงงาน / Factory Licence (Ror.Ngor.4): The SME Starter Guide',
    excerpt:
      'จำแนกประเภทโรงงาน 1-2-3, ตรวจว่ากิจการต้องขอ รง.4 หรือไม่ และเตรียมเอกสารให้พร้อมก่อนยื่นกรมโรงงาน — A plain-language guide to Thai factory classes and when the Ror.Ngor.4 licence applies.',
    tags: 'รง.4, ใบอนุญาต, SME, ผังเมือง',
    isPinned: true,
    publishedAt: '2026-06-24T02:00:00.000Z',
    th: [
      heading('h2', 'โรงงานของคุณต้องขอใบอนุญาตหรือไม่?'),
      paragraph(
        text('ตาม พ.ร.บ. โรงงาน กิจการถูกแบ่งเป็น 3 จำพวกตามกำลังเครื่องจักรและจำนวนแรงงาน ก่อนเริ่มผลิตควรตรวจให้ชัดว่ากิจการอยู่จำพวกใด เพราะภาระด้านเอกสารต่างกันมาก'),
      ),
      bulletList([
        'จำพวกที่ 1 — ขนาดเล็ก เริ่มดำเนินการได้ทันที ไม่ต้องขออนุญาต',
        'จำพวกที่ 2 — ต้องแจ้งต่อพนักงานเจ้าหน้าที่ก่อนประกอบกิจการ',
        'จำพวกที่ 3 — ต้องได้รับใบอนุญาต (รง.4) ก่อนจึงจะเริ่มผลิตได้',
      ]),
      heading('h3', 'เอกสารหลักที่ต้องเตรียม'),
      bulletList(['แบบคำขอและแผนผังที่ตั้งโรงงาน', 'รายละเอียดเครื่องจักรและกำลังการผลิต', 'มาตรการด้านสิ่งแวดล้อมและความปลอดภัย']),
      quote('เคล็ดลับ: ตรวจสอบผังเมืองของพื้นที่ก่อนเช่าหรือซื้อที่ดิน หลายกิจการติดปัญหาเพราะทำเลอยู่นอกโซนอุตสาหกรรม'),
      paragraph(text('ข้อกำหนดและเกณฑ์ตัวเลขอาจปรับปรุงได้ ควรยืนยันกับสำนักงานอุตสาหกรรมจังหวัดหรือกรมโรงงานอุตสาหกรรมก่อนยื่นจริงเสมอ')),
    ],
    en: [
      heading('h2', 'Does your operation need a licence?'),
      paragraph(
        text('Under the Factory Act, operations fall into three classes based on machine power and headcount. Confirm your class before you start producing — the paperwork burden differs sharply between them.'),
      ),
      bulletList([
        'Class 1 — small; may operate immediately, no permit required',
        'Class 2 — must notify the authorities before operating',
        'Class 3 — must hold a Ror.Ngor.4 licence before production begins',
      ]),
      heading('h3', 'Core documents to prepare'),
      bulletList(['Application form and site layout plan', 'Machinery details and production capacity', 'Environmental and safety measures']),
      quote('Tip: Check the area zoning before you lease or buy land — many operations stall because the site sits outside an industrial zone.'),
      paragraph(text('Thresholds and numeric criteria can change. Always confirm with the Provincial Industry Office or the Department of Industrial Works before filing.')),
    ],
  },
  {
    slug: 'five-common-factory-hazards',
    category: 'factory-safety',
    title: '5 จุดเสี่ยงในโรงงานที่แก้ได้ทันทีเพื่อลดอุบัติเหตุ / 5 Common Factory Hazards You Can Fix This Week',
    excerpt:
      'เดินตรวจหน้างานด้วยเช็กลิสต์ 5 ข้อ — ทางเดิน เครื่องจักร ไฟฟ้า สารเคมี และ PPE — ลดอุบัติเหตุได้โดยไม่ต้องลงทุนสูง. A 5-point walk-through checklist to cut incidents without heavy spend.',
    tags: 'ความปลอดภัย, PPE, เช็กลิสต์, อุบัติเหตุ',
    publishedAt: '2026-06-25T02:00:00.000Z',
    th: [
      heading('h2', 'ความปลอดภัยเริ่มที่การเดินตรวจหน้างาน'),
      paragraph(text('อุบัติเหตุส่วนใหญ่เกิดจากจุดเสี่ยงเดิม ๆ ที่มองข้าม ลองใช้เช็กลิสต์ 5 ข้อนี้เดินตรวจสัปดาห์ละครั้ง')),
      bulletList([
        'ทางเดินและทางหนีไฟ — โล่ง ไม่มีของวางกีดขวาง มีป้ายชัดเจน',
        'การ์ดครอบเครื่องจักร — จุดหมุนและใบมีดต้องมีการ์ดป้องกันครบ',
        'ระบบไฟฟ้า — ไม่มีสายเปลือย ปลั๊กพ่วงเกินพิกัด หรือความชื้นใกล้แผงไฟ',
        'สารเคมี — จัดเก็บแยกประเภท มี SDS และภาชนะติดฉลากชัด',
        'อุปกรณ์คุ้มครองส่วนบุคคล (PPE) — เพียงพอ สภาพดี และพนักงานสวมใส่จริง',
      ]),
      quote('บันทึกสิ่งที่พบทุกครั้งและกำหนดผู้รับผิดชอบพร้อมกำหนดเวลาแก้ไข การตรวจที่ไม่มีการติดตามผลไม่ช่วยลดอุบัติเหตุ'),
    ],
    en: [
      heading('h2', 'Safety starts with a floor walk'),
      paragraph(text('Most incidents trace back to the same overlooked hazards. Use this 5-point checklist for a weekly walk-through.')),
      bulletList([
        'Walkways and fire exits — clear, unobstructed, clearly signed',
        'Machine guards — every rotating part and blade properly guarded',
        'Electrical — no exposed wiring, overloaded power strips, or moisture near panels',
        'Chemicals — segregated storage, SDS on hand, containers clearly labelled',
        'PPE — sufficient, in good condition, and actually worn',
      ]),
      quote('Log every finding with an owner and a due date. An inspection with no follow-up does not reduce accidents.'),
    ],
  },
  {
    slug: 'starting-a-digital-factory-on-a-budget',
    category: 'digital-factory',
    title: 'เริ่มต้น Digital Factory ด้วยงบจำกัด / Starting a Digital Factory on a Budget',
    excerpt:
      'ไม่ต้องรื้อทั้งโรงงาน เริ่มจากเก็บข้อมูลจุดเดียวที่ปวดหัวที่สุด แล้วค่อยขยาย. You do not need to rip everything out — start by digitising your single biggest pain point.',
    tags: 'Digital Factory, IoT, ข้อมูล, KPI',
    publishedAt: '2026-06-26T02:00:00.000Z',
    th: [
      heading('h2', 'เริ่มเล็ก วัดผลได้ แล้วค่อยขยาย'),
      paragraph(text('“Digital Factory” ไม่ได้แปลว่าต้องลงทุนหลักล้านตั้งแต่วันแรก จุดเริ่มที่คุ้มที่สุดคือการทำให้ข้อมูลที่วันนี้จดในกระดาษกลายเป็นดิจิทัล')),
      heading('h3', 'สามก้าวแรกที่ลงทุนต่ำ'),
      bulletList([
        'เลือกปัญหาเดียว เช่น ยอดของเสีย หรือเวลาเครื่องหยุด ที่วัดแล้วเห็นผลชัด',
        'เก็บข้อมูลด้วยเครื่องมือที่มีอยู่ เช่น ฟอร์มออนไลน์หรือสเปรดชีต ก่อนซื้อระบบใหญ่',
        'ตั้งตัวชี้วัด (KPI) และทบทวนทุกสัปดาห์เพื่อพิสูจน์ว่าคุ้มก่อนขยาย',
      ]),
      paragraph(b('หัวใจสำคัญ: '), text('ข้อมูลที่เชื่อถือได้เพียงเรื่องเดียวมีค่ามากกว่าระบบราคาแพงที่ไม่มีใครกรอกข้อมูล')),
    ],
    en: [
      heading('h2', 'Start small, measure, then scale'),
      paragraph(text('"Digital Factory" does not mean a seven-figure investment on day one. The best-value starting point is turning data you write on paper today into digital records.')),
      heading('h3', 'Three low-cost first steps'),
      bulletList([
        'Pick one problem — scrap rate or machine downtime — where measurement shows clear results',
        'Capture data with tools you already have (online forms or a spreadsheet) before buying a big system',
        'Set KPIs and review weekly to prove the value before you scale',
      ]),
      paragraph(b('The key: '), text('one trustworthy data stream beats an expensive system nobody keeps up to date.')),
    ],
  },
  {
    slug: 'when-does-automation-pay-off',
    category: 'machinery-automation',
    title: 'ควรลงทุนระบบอัตโนมัติเมื่อไหร่ถึงคุ้ม / When Does Automation Actually Pay Off?',
    excerpt:
      'คำนวณจุดคุ้มทุนแบบง่าย ๆ ก่อนตัดสินใจซื้อหุ่นยนต์หรือสายพานอัตโนมัติ. A simple payback framework before you buy that robot or conveyor line.',
    tags: 'ระบบอัตโนมัติ, หุ่นยนต์, ROI, คอขวด',
    publishedAt: '2026-06-27T02:00:00.000Z',
    th: [
      heading('h2', 'อย่าเริ่มที่เทคโนโลยี ให้เริ่มที่ตัวเลข'),
      paragraph(text('ระบบอัตโนมัติคุ้มค่าเมื่อช่วยแก้คอขวดจริง ไม่ใช่เพราะเป็นของใหม่ ลองประเมินด้วยคำถามสามข้อ')),
      bulletList([
        'งานนี้ทำซ้ำ ปริมาณมาก และรูปแบบคงที่หรือไม่ — ยิ่งซ้ำ ยิ่งคุ้ม',
        'ต้นทุนแรงงานและของเสียต่อปีที่ประหยัดได้คือเท่าไร',
        'ระยะเวลาคืนทุน (Payback) กี่ปี — โดยทั่วไป SME ควรมองที่ 2-3 ปี',
      ]),
      quote('เริ่มจากกึ่งอัตโนมัติ (semi-automation) ในจุดคอขวดเดียวก่อน มักได้ผลตอบแทนเร็วกว่าการเปลี่ยนทั้งสายการผลิต'),
    ],
    en: [
      heading('h2', 'Start with the numbers, not the technology'),
      paragraph(text('Automation pays off when it removes a real bottleneck — not because it is new. Test the case with three questions.')),
      bulletList([
        'Is the task repetitive, high-volume, and consistent? The more repetitive, the better the return',
        'How much annual labour and scrap cost would it actually save?',
        'What is the payback period? SMEs should typically target 2-3 years',
      ]),
      quote('Start with semi-automation at a single bottleneck. It usually returns value faster than replacing a whole line.'),
    ],
  },
  {
    slug: 'meeting-wastewater-standards',
    category: 'environment',
    title: 'จัดการน้ำเสียให้ผ่านมาตรฐานกรมโรงงาน / Meeting Factory Wastewater Standards',
    excerpt:
      'เข้าใจค่าพื้นฐาน pH, BOD, COD และแนวทางบำบัดที่เหมาะกับโรงงาน SME. Understand the basic pH/BOD/COD limits and treatment options that fit an SME budget.',
    tags: 'น้ำเสีย, สิ่งแวดล้อม, BOD, กรมโรงงาน',
    publishedAt: '2026-06-28T02:00:00.000Z',
    th: [
      heading('h2', 'รู้ค่าน้ำทิ้งก่อน จึงเลือกวิธีบำบัดได้ถูก'),
      paragraph(text('ก่อนลงทุนระบบบำบัด ควรเข้าใจค่ามาตรฐานน้ำทิ้งที่กรมโรงงานกำหนด และวัดค่าน้ำเสียของโรงงานตนเองก่อน')),
      bulletList([
        'pH — ความเป็นกรด-ด่างของน้ำทิ้ง',
        'BOD — ปริมาณออกซิเจนที่จุลินทรีย์ใช้ย่อยสารอินทรีย์',
        'COD — ปริมาณออกซิเจนที่ใช้ออกซิไดซ์สารเคมีทั้งหมด',
        'ของแข็งแขวนลอย (SS) และไขมัน-น้ำมัน',
      ]),
      heading('h3', 'แนวทางที่เหมาะกับ SME'),
      bulletList([
        'บ่อดักไขมันและบ่อตกตะกอนเป็นด่านแรกที่ลงทุนต่ำ',
        'ระบบบำบัดชีวภาพสำหรับน้ำเสียอินทรีย์',
        'ทำสัญญากับผู้รับกำจัดที่ได้รับอนุญาตสำหรับกากอันตราย',
      ]),
      paragraph(text('ค่ามาตรฐานอ้างอิงตามประกาศกรมโรงงานอุตสาหกรรม ควรตรวจฉบับล่าสุดก่อนออกแบบระบบ')),
    ],
    en: [
      heading('h2', 'Measure your effluent before choosing treatment'),
      paragraph(text('Before investing in a treatment system, understand the discharge limits set by the Department of Industrial Works and test your own effluent first.')),
      bulletList([
        'pH — how acidic or alkaline the discharge is',
        'BOD — oxygen microbes use to break down organic matter',
        'COD — oxygen needed to oxidise all chemical content',
        'Suspended solids (SS) and fats/oils',
      ]),
      heading('h3', 'Approaches that suit an SME'),
      bulletList([
        'Grease traps and settling ponds are a low-cost first stage',
        'Biological treatment for organic wastewater',
        'Contract a licensed handler for hazardous sludge',
      ]),
      paragraph(text('Limits follow the Department of Industrial Works notifications — check the current edition before designing a system.')),
    ],
  },
  {
    slug: 'your-first-kaizen-start-with-5s',
    category: 'lean-kaizen',
    title: 'เริ่ม Kaizen วันแรกด้วย 5ส / Your First Kaizen: Start With 5S',
    excerpt:
      '5ส คือประตูสู่การปรับปรุงอย่างต่อเนื่อง เริ่มที่พื้นที่ทำงานเดียวแล้วขยายทั้งโรงงาน. 5S is the gateway to continuous improvement — start with one workstation.',
    tags: 'Lean, Kaizen, 5ส, เพิ่มผลผลิต',
    publishedAt: '2026-06-29T02:00:00.000Z',
    th: [
      heading('h2', '5ส ไม่ใช่แค่การทำความสะอาด'),
      paragraph(text('5ส เป็นรากฐานของ Lean ที่ทำให้เห็นความสูญเปล่าและสร้างวินัยในการปรับปรุงต่อเนื่อง')),
      bulletList([
        'สะสาง (Seiri) — แยกของที่จำเป็นออกจากของที่ไม่จำเป็น',
        'สะดวก (Seiton) — จัดวางให้หยิบใช้ง่าย มีที่อยู่ของทุกสิ่ง',
        'สะอาด (Seiso) — ทำความสะอาดพร้อมตรวจหาความผิดปกติ',
        'สุขลักษณะ (Seiketsu) — ตั้งมาตรฐานให้ทำซ้ำได้',
        'สร้างนิสัย (Shitsuke) — ปฏิบัติจนเป็นวินัยประจำวัน',
      ]),
      quote('เลือกพื้นที่นำร่องเพียงจุดเดียว ถ่ายรูปก่อน-หลัง แล้วใช้เป็นตัวอย่างขยายไปทั้งโรงงาน'),
    ],
    en: [
      heading('h2', '5S is more than cleaning'),
      paragraph(text('5S is the foundation of Lean — it makes waste visible and builds the discipline for continuous improvement.')),
      bulletList([
        'Sort (Seiri) — separate what is needed from what is not',
        'Set in order (Seiton) — a place for everything, easy to reach',
        'Shine (Seiso) — clean while inspecting for abnormalities',
        'Standardise (Seiketsu) — set repeatable standards',
        'Sustain (Shitsuke) — practise it until it becomes a daily habit',
      ]),
      quote('Pick one pilot area, take before/after photos, and use it as the example to roll out across the plant.'),
    ],
  },
  {
    slug: 'b2b-factory-lead-generation-online',
    category: 'digital-marketing',
    title: 'โรงงาน B2B หาลูกค้าใหม่ผ่านออนไลน์ / Online Lead Generation for B2B Factories',
    excerpt:
      'ลูกค้าอุตสาหกรรมค้นหาซัพพลายเออร์ออนไลน์มากขึ้น สร้างการมองเห็นด้วยเว็บ โปรไฟล์ และคอนเทนต์ที่ตรงกลุ่ม. Industrial buyers search online — get found with the right site, profiles, and content.',
    tags: 'การตลาด, B2B, SEO, LINE OA',
    publishedAt: '2026-06-30T02:00:00.000Z',
    th: [
      heading('h2', 'ลูกค้าโรงงานก็เริ่มต้นที่การค้นหาออนไลน์'),
      paragraph(text('แม้เป็นงาน B2B ผู้ซื้อส่วนใหญ่ค้นหาและคัดกรองซัพพลายเออร์ทางออนไลน์ก่อนติดต่อ การถูกค้นเจอจึงสำคัญ')),
      bulletList([
        'เว็บไซต์ที่บอกความสามารถการผลิต มาตรฐาน และกรณีศึกษาชัดเจน',
        'โปรไฟล์บนแพลตฟอร์มจัดหา (sourcing) และ Google Business',
        'คอนเทนต์ที่ตอบคำถามทางเทคนิคของลูกค้าเป้าหมาย',
        'ช่องทางติดต่อที่ตอบไว เช่น LINE Official Account',
      ]),
      paragraph(b('วัดผลเสมอ: '), text('ติดตามว่าลูกค้ามาจากช่องทางใด เพื่อลงทุนเพิ่มในช่องทางที่ให้ผลจริง')),
    ],
    en: [
      heading('h2', 'Factory buyers start with a search too'),
      paragraph(text('Even in B2B, most buyers research and shortlist suppliers online before reaching out — being findable matters.')),
      bulletList([
        'A website that states production capabilities, standards, and case studies clearly',
        'Profiles on sourcing platforms and Google Business',
        'Content that answers your target buyers technical questions',
        'A fast-response channel such as a LINE Official Account',
      ]),
      paragraph(b('Always measure: '), text('track which channel each lead came from, then reinvest in the ones that actually convert.')),
    ],
  },
  {
    slug: 'boi-incentives-and-grants-for-sme-factories',
    category: 'gov-benefits',
    title: 'สิทธิประโยชน์ BOI และเงินสนับสนุนที่โรงงาน SME ควรรู้ / BOI Incentives & Grants Every SME Factory Should Know',
    excerpt:
      'ภาพรวมสิทธิประโยชน์ภาครัฐ ตั้งแต่ BOI ไปจนถึงเงินสนับสนุนยกระดับเทคโนโลยีและมาตรฐานสากล. An overview of state incentives — from BOI privileges to tech-upgrade grants and standards support.',
    tags: 'BOI, สิทธิประโยชน์, ISO, เงินสนับสนุน',
    publishedAt: '2026-07-01T02:00:00.000Z',
    th: [
      heading('h2', 'สิทธิประโยชน์ที่หลายโรงงานมองข้าม'),
      paragraph(text('ภาครัฐมีมาตรการสนับสนุน SME ภาคการผลิตหลายรูปแบบ แต่จำนวนมากเข้าไม่ถึงเพราะไม่ทราบว่ามีอยู่')),
      bulletList([
        'สิทธิประโยชน์ BOI — ยกเว้น/ลดหย่อนภาษีสำหรับกิจการที่ได้รับส่งเสริม',
        'เงินสนับสนุนยกระดับเทคโนโลยีและระบบอัตโนมัติ',
        'การสนับสนุนการขอมาตรฐานสากล เช่น ISO',
        'สินเชื่อดอกเบี้ยต่ำผ่านสถาบันการเงินของรัฐ',
      ]),
      heading('h3', 'เริ่มอย่างไร'),
      bulletList([
        'ประเมินว่ากิจการเข้าเงื่อนไขประเภทใด',
        'เตรียมงบการเงินและแผนการลงทุนให้พร้อม',
        'ปรึกษาหน่วยงานส่งเสริมก่อนยื่นเพื่อลดการตีกลับ',
      ]),
      paragraph(text('เงื่อนไขและวงเงินเปลี่ยนแปลงตามนโยบาย ควรตรวจสอบกับ BOI หรือหน่วยงานที่เกี่ยวข้องล่าสุดก่อนยื่น')),
    ],
    en: [
      heading('h2', 'Incentives many factories overlook'),
      paragraph(text('The government offers several support schemes for manufacturing SMEs — many go unused simply because owners do not know they exist.')),
      bulletList([
        'BOI privileges — tax exemptions/reductions for promoted activities',
        'Grants to upgrade technology and automation',
        'Support for obtaining international standards such as ISO',
        'Low-interest loans through state financial institutions',
      ]),
      heading('h3', 'How to start'),
      bulletList([
        'Assess which scheme category your operation qualifies for',
        'Prepare financial statements and an investment plan',
        'Consult the promoting agency before filing to reduce rejections',
      ]),
      paragraph(text('Conditions and funding change with policy — check with the BOI or the relevant agency for the latest terms before applying.')),
    ],
  },
]

/**
 * The 8 seed articles with fully-composed bilingual Lexical `content`.
 * Shape: { slug, category, title, excerpt, featuredImage, tags, isPinned,
 * publishedAt, content }.
 */
export const KNOWLEDGE_ARTICLES = [...DEFS, ...EXTRAS].map((d) => ({
  slug: d.slug,
  category: d.category,
  title: d.title,
  excerpt: d.excerpt,
  featuredImage: coverImage(d.slug),
  tags: d.tags ?? '',
  isPinned: d.isPinned ?? false,
  publishedAt: d.publishedAt,
  content: bilingualState(d.th, d.en),
}))
