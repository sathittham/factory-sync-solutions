// Service detail body copy (overview / features / process), keyed by page id.
//
// Page id convention:
//   - single-page group (type "page")  → the group id           e.g. "free-health-check"
//   - nested child (under a hub group)  → "<groupId>:<childSlug>" e.g. "government-supported:in-house-training"
//
// Only pages with an entry here render full marketing copy. Everything else
// (the 13 nested detail pages, per the Phase 3 "scaffold + placeholder" decision)
// renders a clearly-marked "coming soon" notice so no unverified service claims
// ship to the live site. Titles + taglines come from i18n (`svc.*.title` / `.sub`);
// this module owns only the long-form body. See SDD §4.2 (TS data module adopted
// in place of the prescribed MDX content collection — recorded in doc history).

export interface ServiceBody {
	readonly overview: string;
	readonly featuresTitle: string;
	readonly features: readonly string[];
	readonly processTitle: string;
	readonly process: ReadonlyArray<{ step: string; detail: string }>;
	/**
	 * Mockup/draft copy pending marketing sign-off. Renders a clearly-marked
	 * draft banner so no fabricated service claims are presented as final
	 * (Phase 3 "scaffold + placeholder" decision — see status.md).
	 */
	readonly isDraft?: boolean;
	/** Optional marketing poster shown at the top of the detail body. */
	readonly poster?: { readonly src: string; readonly alt: string };
	/** Optional embedded 360° virtual tour (e.g. Matterport). */
	readonly virtualTour?: {
		readonly title: string;
		readonly caption: string;
		readonly embedUrl: string;
	};
}

export interface ServiceBodyI18n {
	readonly th: ServiceBody;
	readonly en: ServiceBody;
}

const SERVICE_BODIES: Record<string, ServiceBodyI18n> = {
	"free-health-check": {
		th: {
			overview:
				"บริการตรวจสุขภาพโรงงานช่วยให้คุณเห็นภาพรวมความพร้อมด้านการดำเนินงานอย่างเป็นระบบ ครอบคลุม 8 มิติหลัก ตั้งแต่การจัดการเบื้องต้น คุณภาพ การผลิต ไปจนถึงต้นทุน วิเคราะห์ด้วย AI และตรวจสอบโดยวุฒิวิศวกร เพื่อให้คุณได้แผนปรับปรุงที่ทำได้จริง",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ประเมินครบ 8 มิติ พร้อมคะแนนรายมิติ",
				"รายงานเชิงลึกพร้อมจุดแข็งและจุดที่ต้องปรับปรุง",
				"เปรียบเทียบกับเกณฑ์มาตรฐานอุตสาหกรรม",
				"แผนปรับปรุงที่จัดลำดับความสำคัญ",
				"ตรวจสอบและรับรองโดยวุฒิวิศวกร",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ลงทะเบียน", detail: "กรอกข้อมูลโรงงานเพื่อเริ่มประเมิน" },
				{ step: "ทำแบบประเมิน", detail: "ตอบ 43 ข้อ ใช้เวลาประมาณ 15 นาที" },
				{ step: "วิเคราะห์", detail: "AI วิเคราะห์ข้อมูลและตรวจสอบโดยวุฒิวิศวกร" },
				{ step: "รับรายงาน", detail: "รายงานเชิงลึกพร้อมแผนปรับปรุงที่ปฏิบัติได้จริง" },
			],
		},
		en: {
			overview:
				"The Factory Health Check gives you a systematic view of your operational readiness across 8 key dimensions — from basic management and quality to production and cost. Powered by AI and verified by licensed engineers, you receive an improvement plan you can actually act on.",
			featuresTitle: "What you get",
			features: [
				"Assessment across all 8 dimensions with per-dimension scoring",
				"In-depth report with strengths and improvement areas",
				"Benchmarking against industry standards",
				"A prioritized improvement roadmap",
				"Reviewed and certified by a licensed engineer",
			],
			processTitle: "How it works",
			process: [
				{ step: "Register", detail: "Fill in factory details to begin the assessment" },
				{ step: "Take assessment", detail: "Answer 43 questions in about 15 minutes" },
				{ step: "Analysis", detail: "AI analyses the data, reviewed by a licensed engineer" },
				{ step: "Receive report", detail: "An in-depth report with a practical improvement plan" },
			],
		},
	},
	"government-supported:digital-factory-layout-360": {
		th: {
			overview:
				"บริการจัดทำ LAYOUT โรงงาน 3 มิติ พร้อมฐานข้อมูลรายการเครื่องจักรและอุปกรณ์ เพื่อใช้ตรวจสอบ วิเคราะห์ วางแผน สื่อสารการตลาด และประกอบการยื่นขออนุญาตขยายหรือเปลี่ยนแปลงกิจการโรงงานต่อกรมโรงงานอุตสาหกรรม สำรวจจริง ทำผังจริง เห็นโรงงานจริงแบบ 360° พร้อมเอกสารรับรองโดยวุฒิวิศวกร",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"แผนผังติดตั้งเครื่องจักร (Machine Installation Layout) ตามมาตรฐานวิศวกรรม",
				"ชมโรงงานจริงแบบ 360° Virtual Walkthrough ได้ทุกมุมมอง",
				"ฐานข้อมูลรายการเครื่องจักร (Machine List Mapping) ครบถ้วน ตรวจสอบได้",
				"จำลองสถานการณ์และรายงาน KPI วิเคราะห์คอขวดและประสิทธิภาพการผลิต",
				"เอกสารรับรองโดยวุฒิวิศวกร สำหรับยื่นกรมโรงงานอุตสาหกรรม",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจจริง", detail: "ลงพื้นที่สำรวจหน้างานและถ่ายภาพโรงงานแบบ 360°" },
				{ step: "ทำผังจริง", detail: "จัดทำผังโรงงาน 3 มิติ พร้อมฐานข้อมูลเครื่องจักร" },
				{ step: "วิเคราะห์", detail: "จำลองสถานการณ์ วิเคราะห์คอขวดและ KPI การผลิต" },
				{ step: "รับรอง", detail: "วุฒิวิศวกรรับรองเอกสารสำหรับยื่นขออนุญาต" },
			],
			poster: {
				src: "/services/digital-factory-layout-360-poster.jpg",
				alt: "Digital Factory Layout 360° — บริการจัดทำผังโรงงาน 3 มิติ พร้อมวุฒิวิศวกรรับรอง",
			},
			virtualTour: {
				title: "ตัวอย่างโรงงานจริงแบบ 360°",
				caption:
					"ตัวอย่างผังโรงงาน 360° พร้อมรายการเครื่องจักรและการจำลอง 1 กระบวนการ — ลากเพื่อหมุนดูได้ทุกมุมมอง",
				embedUrl: "https://my.matterport.com/show/?m=uwumTddZfAY",
			},
		},
		en: {
			overview:
				"A 3D factory layout service with a complete machine and equipment database — used to inspect, analyse, plan, support marketing, and file expansion or modification permits with the Department of Industrial Works (DIW). We survey the real site, build a real layout, and let you see the real factory in 360°, complete with documentation certified by a licensed engineer.",
			featuresTitle: "What you get",
			features: [
				"An engineering-standard Machine Installation Layout",
				"A 360° virtual walkthrough of the real factory from every angle",
				"A complete, auditable Machine List Mapping database",
				"Simulation and KPI reporting to analyse bottlenecks and production efficiency",
				"Documentation certified by a licensed engineer for DIW permit filing",
			],
			processTitle: "How it works",
			process: [
				{ step: "Survey", detail: "On-site survey and 360° photography of the real factory" },
				{ step: "Layout", detail: "Build the 3D factory layout with a machine database" },
				{
					step: "Analyse",
					detail: "Simulate scenarios and analyse bottlenecks and production KPIs",
				},
				{ step: "Certify", detail: "A licensed engineer certifies documents for permit filing" },
			],
			poster: {
				src: "/services/digital-factory-layout-360-poster.jpg",
				alt: "Digital Factory Layout 360° — 3D factory layout service, certified by a licensed engineer",
			},
			virtualTour: {
				title: "See a real factory in 360°",
				caption:
					"A sample 360° factory layout with a machine list and a one-process simulation — drag to look around from any angle.",
				embedUrl: "https://my.matterport.com/show/?m=uwumTddZfAY",
			},
		},
	},
	"engineering-consulting": {
		th: {
			overview:
				"บริการที่ปรึกษางานวิศวกรรมแบบครบวงจร ตั้งแต่วิเคราะห์ต้นตอของปัญหา ออกแบบแนวทางปรับปรุง ไปจนถึงลงมือดำเนินการร่วมกับทีมของคุณ โดยทีมวุฒิวิศวกร ด้วยหลักการ Lean และการปรับปรุงอย่างต่อเนื่อง เพื่อผลลัพธ์ที่ยั่งยืน",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"วิเคราะห์ต้นตอของปัญหา (Root Cause Analysis)",
				"ออกแบบแนวทางปรับปรุงด้วยหลัก Lean",
				"ลงมือดำเนินการร่วมกับทีมหน้างาน",
				"ติดตามผลและปรับแผนอย่างต่อเนื่อง",
				"ถ่ายทอดความรู้ให้ทีมของคุณ",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ประเมินสถานการณ์", detail: "วิเคราะห์ปัญหาและตั้งเป้าหมายร่วมกัน" },
				{ step: "ออกแบบแผน", detail: "กำหนดแนวทางปรับปรุงที่เหมาะกับองค์กร" },
				{ step: "ดำเนินการ", detail: "ลงมือปรับปรุงและทดลองร่วมกับทีม" },
				{ step: "ขยายผล", detail: "วัดผลและขยายผลทั่วทั้งองค์กร" },
			],
		},
		en: {
			overview:
				"End-to-end engineering consulting — from root-cause analysis and designing the improvement approach to implementing it alongside your team, led by licensed engineers. Built on Lean and continuous-improvement principles for results that last.",
			featuresTitle: "What you get",
			features: [
				"Root-cause analysis of your problems",
				"An improvement approach designed with Lean principles",
				"Hands-on implementation with your floor team",
				"Ongoing tracking and plan adjustment",
				"Knowledge transfer to your team",
			],
			processTitle: "How it works",
			process: [
				{ step: "Assess", detail: "Analyze problems and set goals together" },
				{ step: "Design plan", detail: "Define an improvement approach that fits you" },
				{ step: "Implement", detail: "Drive and pilot improvements with the team" },
				{ step: "Scale", detail: "Measure results and roll out across the organization" },
			],
		},
	},

	// ---------------------------------------------------------------------------
	// Draft mockup copy (isDraft: true) — pending marketing sign-off. Renders a
	// full detail layout with a clearly-marked draft banner instead of the bare
	// "coming soon" placeholder. Replace with verified copy before final launch.
	// ---------------------------------------------------------------------------

	"government-supported:smart-preventive-maintenance": {
		th: {
			isDraft: true,
			overview:
				"วางระบบบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) ให้เครื่องจักรของคุณ ตั้งแต่จัดทำทะเบียนสินทรัพย์ กำหนดแผนตรวจเช็กตามรอบ ไปจนถึงการติดตามสถานะและแจ้งเตือนล่วงหน้า เพื่อลดการหยุดเดินเครื่องแบบฉุกเฉินและยืดอายุการใช้งานของเครื่องจักร",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ทะเบียนเครื่องจักรและอุปกรณ์พร้อมประวัติการบำรุงรักษา",
				"แผนบำรุงรักษาตามรอบเวลาและตามการใช้งานจริง",
				"ใบสั่งงาน (Work Order) และเช็กลิสต์มาตรฐานสำหรับทีมช่าง",
				"แดชบอร์ดติดตามสถานะและแจ้งเตือนงานที่ถึงกำหนด",
				"รายงานตัวชี้วัด เช่น อัตราการหยุดเดินเครื่องและต้นทุนบำรุงรักษา",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจสินทรัพย์", detail: "จัดทำทะเบียนเครื่องจักรและประเมินสภาพปัจจุบัน" },
				{ step: "ออกแบบแผน", detail: "กำหนดรอบการตรวจเช็กและเช็กลิสต์มาตรฐาน" },
				{ step: "ติดตั้งระบบ", detail: "วางระบบใบสั่งงานและแดชบอร์ดติดตามผล" },
				{ step: "ปรับปรุงต่อเนื่อง", detail: "วิเคราะห์ข้อมูลและปรับแผนให้เหมาะกับการใช้งานจริง" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Set up an intelligent preventive-maintenance program for your machines — from building an asset register and scheduling periodic checks to status tracking and early alerts. The goal is to cut emergency downtime and extend equipment life.",
			featuresTitle: "What you get",
			features: [
				"An asset register with full maintenance history",
				"Maintenance plans based on both time and actual usage",
				"Standard work orders and checklists for your technicians",
				"A dashboard for status tracking and due-task alerts",
				"Reporting on KPIs such as downtime rate and maintenance cost",
			],
			processTitle: "How it works",
			process: [
				{ step: "Asset survey", detail: "Build the machine register and assess current condition" },
				{ step: "Design plan", detail: "Define inspection cycles and standard checklists" },
				{ step: "Deploy system", detail: "Set up work orders and a tracking dashboard" },
				{ step: "Improve", detail: "Analyze data and tune the plan to real usage" },
			],
		},
	},

	"government-supported:shindan-lean-kaizen": {
		th: {
			isDraft: true,
			overview:
				"วินิจฉัยสถานประกอบการด้วยแนวทาง Shindan ของญี่ปุ่น ผสานหลัก Lean และ Kaizen เพื่อค้นหาความสูญเปล่าในกระบวนการผลิต แล้วปรับปรุงอย่างเป็นระบบร่วมกับทีมหน้างาน ให้เกิดการเปลี่ยนแปลงที่วัดผลได้และยั่งยืน",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"การวินิจฉัยกระบวนการผลิตโดยผู้เชี่ยวชาญ (Shindan)",
				"แผนที่สายธารคุณค่า (Value Stream Map) และจุดที่เกิดความสูญเปล่า",
				"กิจกรรม Kaizen ร่วมกับทีมหน้างาน",
				"ตัวชี้วัดก่อน–หลังการปรับปรุงที่ชัดเจน",
				"การถ่ายทอดวัฒนธรรมปรับปรุงต่อเนื่องให้ทีมของคุณ",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "วินิจฉัย", detail: "สำรวจหน้างานและระบุความสูญเปล่าในกระบวนการ" },
				{ step: "วางแผน", detail: "จัดลำดับความสำคัญและออกแบบกิจกรรม Kaizen" },
				{ step: "ลงมือปรับปรุง", detail: "ทดลองและปรับปรุงร่วมกับทีมหน้างาน" },
				{ step: "รักษามาตรฐาน", detail: "จัดทำมาตรฐานใหม่และติดตามผลต่อเนื่อง" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Diagnose your operation with the Japanese Shindan approach, combined with Lean and Kaizen, to uncover waste in your production process — then improve it systematically alongside your floor team for measurable, lasting change.",
			featuresTitle: "What you get",
			features: [
				"An expert Shindan diagnosis of your production process",
				"A value stream map highlighting where waste occurs",
				"Kaizen activities run together with your floor team",
				"Clear before-and-after improvement metrics",
				"A continuous-improvement culture transferred to your team",
			],
			processTitle: "How it works",
			process: [
				{ step: "Diagnose", detail: "Survey the floor and identify process waste" },
				{ step: "Plan", detail: "Prioritize and design Kaizen activities" },
				{ step: "Improve", detail: "Pilot and refine improvements with the team" },
				{ step: "Sustain", detail: "Standardize the new way and track results" },
			],
		},
	},

	"government-supported:online-marketing-smart-ops": {
		th: {
			isDraft: true,
			overview:
				"เสริมการเติบโตของธุรกิจด้วยการตลาดออนไลน์ที่วัดผลได้ ควบคู่กับการวางระบบปฏิบัติงานอัจฉริยะ (Smart Operations) เพื่อให้ทีมของคุณทำงานได้เร็วขึ้น เห็นข้อมูลชัดขึ้น และเชื่อมโยงงานขายกับงานผลิตเข้าด้วยกัน",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"กลยุทธ์การตลาดออนไลน์และแผนคอนเทนต์ที่วัดผลได้",
				"การตั้งค่าและดูแลช่องทางดิจิทัล (เว็บไซต์ / โซเชียล / LINE)",
				"ระบบจัดการลูกค้าสัมพันธ์ (CRM) เชื่อมกับงานขาย",
				"ระบบอัตโนมัติสำหรับงานประจำวัน (Workflow Automation)",
				"แดชบอร์ดตัวชี้วัดการตลาดและการดำเนินงาน",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ประเมิน", detail: "วิเคราะห์กลุ่มเป้าหมายและระบบงานปัจจุบัน" },
				{ step: "วางกลยุทธ์", detail: "ออกแบบแผนการตลาดและระบบปฏิบัติงาน" },
				{ step: "ดำเนินการ", detail: "ติดตั้งเครื่องมือและเริ่มแคมเปญ" },
				{ step: "วัดผล", detail: "ติดตามตัวชี้วัดและปรับปรุงต่อเนื่อง" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Grow your business with measurable online marketing paired with smart operations — so your team works faster, sees clearer data, and connects sales with production end to end.",
			featuresTitle: "What you get",
			features: [
				"An online-marketing strategy and a measurable content plan",
				"Setup and management of digital channels (web / social / LINE)",
				"A CRM connected to your sales workflow",
				"Workflow automation for day-to-day tasks",
				"A dashboard for marketing and operations KPIs",
			],
			processTitle: "How it works",
			process: [
				{ step: "Assess", detail: "Analyze your audience and current systems" },
				{ step: "Strategize", detail: "Design the marketing plan and operating system" },
				{ step: "Execute", detail: "Set up the tools and launch campaigns" },
				{ step: "Measure", detail: "Track KPIs and improve continuously" },
			],
		},
	},

	"government-supported:in-house-training": {
		th: {
			isDraft: true,
			overview:
				"หลักสูตรอบรมภายในองค์กรที่ออกแบบตามบริบทและปัญหาจริงของโรงงานคุณ ตั้งแต่พื้นฐาน Lean และการบำรุงรักษา ไปจนถึงความปลอดภัยและระบบมาตรฐาน สอนโดยวิทยากรที่มีประสบการณ์จริงในภาคอุตสาหกรรม พร้อมเวิร์กชอปลงมือปฏิบัติ",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"หลักสูตรที่ปรับให้ตรงกับบริบทและเป้าหมายขององค์กร",
				"เนื้อหาผสานทฤษฎีและเวิร์กชอปลงมือปฏิบัติจริง",
				"เอกสารประกอบและแบบประเมินผลการอบรม",
				"วิทยากรที่มีประสบการณ์ตรงในภาคอุตสาหกรรม",
				"ใบรับรองการเข้าอบรมสำหรับผู้เข้าร่วม",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจความต้องการ", detail: "ประเมินช่องว่างทักษะและเป้าหมายการอบรม" },
				{ step: "ออกแบบหลักสูตร", detail: "จัดทำเนื้อหาและเวิร์กชอปตามบริบทจริง" },
				{ step: "จัดอบรม", detail: "อบรมภายในองค์กรพร้อมกิจกรรมปฏิบัติ" },
				{ step: "ประเมินผล", detail: "วัดผลการเรียนรู้และให้คำแนะนำต่อยอด" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"In-house training courses designed around your factory's real context and challenges — from Lean and maintenance fundamentals to safety and standards. Delivered by instructors with genuine industry experience, with hands-on workshops.",
			featuresTitle: "What you get",
			features: [
				"Courses tailored to your organization's context and goals",
				"A mix of theory and hands-on workshop practice",
				"Course materials and post-training assessments",
				"Instructors with direct industry experience",
				"Certificates of attendance for participants",
			],
			processTitle: "How it works",
			process: [
				{ step: "Assess needs", detail: "Identify skill gaps and training goals" },
				{ step: "Design course", detail: "Build content and workshops for your context" },
				{ step: "Deliver", detail: "Run the in-house training with hands-on activities" },
				{ step: "Evaluate", detail: "Measure learning and recommend next steps" },
			],
		},
	},

	"engineering-design:factory-license": {
		th: {
			isDraft: true,
			overview:
				"บริการดำเนินการขอใบอนุญาตประกอบกิจการโรงงาน (รง.2 / รง.4) แบบครบวงจร ตั้งแต่ตรวจสอบข้อกำหนดที่เกี่ยวข้อง จัดเตรียมเอกสารและแบบทางวิศวกรรม ไปจนถึงประสานงานกับกรมโรงงานอุตสาหกรรม โดยทีมวุฒิวิศวกรรับรอง",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ตรวจสอบประเภทกิจการและข้อกำหนดที่เกี่ยวข้อง",
				"จัดเตรียมเอกสารและแบบทางวิศวกรรมครบถ้วน",
				"เอกสารรับรองโดยวุฒิวิศวกร",
				"ประสานงานยื่นเรื่องกับหน่วยงานราชการ",
				"ติดตามสถานะจนได้รับใบอนุญาต",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ประเมินเบื้องต้น", detail: "ตรวจสอบประเภทโรงงานและข้อกำหนด" },
				{ step: "เตรียมเอกสาร", detail: "จัดทำแบบและเอกสารประกอบการยื่น" },
				{ step: "ยื่นคำขอ", detail: "ประสานงานยื่นเรื่องต่อกรมโรงงานอุตสาหกรรม" },
				{ step: "ติดตามผล", detail: "ติดตามและแก้ไขจนได้รับใบอนุญาต" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"End-to-end handling of factory operating-license applications (รง.2 / รง.4) — from reviewing the applicable requirements and preparing engineering documents and drawings to coordinating with the Department of Industrial Works, certified by our licensed engineers.",
			featuresTitle: "What you get",
			features: [
				"Review of your business category and applicable requirements",
				"Complete preparation of documents and engineering drawings",
				"Documentation certified by a licensed engineer",
				"Coordination of the filing with government agencies",
				"Status tracking through to license issuance",
			],
			processTitle: "How it works",
			process: [
				{ step: "Pre-assess", detail: "Review factory category and requirements" },
				{ step: "Prepare docs", detail: "Produce drawings and supporting documents" },
				{ step: "File", detail: "Coordinate the filing with the DIW" },
				{ step: "Follow up", detail: "Track and resolve until the license is issued" },
			],
		},
	},

	"engineering-design:machine-automation-design": {
		th: {
			isDraft: true,
			overview:
				"ออกแบบเครื่องจักรและระบบอัตโนมัติ (System Architect / System Integrator) ตั้งแต่แนวคิดจนถึงแบบสั่งผลิต ครอบคลุมงานกลไก ระบบไฟฟ้า และระบบควบคุม เพื่อเพิ่มกำลังการผลิตและลดการพึ่งพาแรงงานในงานที่ซ้ำซาก",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ออกแบบแนวคิดและความเป็นไปได้ทางวิศวกรรม",
				"แบบเครื่องจักรและระบบควบคุม (Mechanical / Electrical / Control)",
				"การเลือกอุปกรณ์และการวางระบบอัตโนมัติ",
				"แบบสั่งผลิตและเอกสารประกอบการติดตั้ง",
				"เอกสารรับรองโดยวุฒิวิศวกร",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "เก็บความต้องการ", detail: "วิเคราะห์กระบวนการและเป้าหมายการผลิต" },
				{ step: "ออกแบบแนวคิด", detail: "จัดทำแนวคิดและประเมินความเป็นไปได้" },
				{ step: "ออกแบบรายละเอียด", detail: "เขียนแบบเครื่องจักรและระบบควบคุม" },
				{ step: "ส่งมอบแบบ", detail: "ส่งแบบสั่งผลิตพร้อมเอกสารรับรอง" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Machine and automation design (System Architect / System Integrator) — from concept to production drawings, covering mechanical, electrical, and control systems, to raise capacity and reduce reliance on manual, repetitive work.",
			featuresTitle: "What you get",
			features: [
				"Concept design and engineering feasibility",
				"Machine and control drawings (mechanical / electrical / control)",
				"Component selection and automation-system layout",
				"Production drawings and installation documentation",
				"Documentation certified by a licensed engineer",
			],
			processTitle: "How it works",
			process: [
				{ step: "Gather needs", detail: "Analyze the process and production goals" },
				{ step: "Concept design", detail: "Develop concepts and assess feasibility" },
				{ step: "Detailed design", detail: "Draw the machine and control systems" },
				{ step: "Handover", detail: "Deliver production drawings with certification" },
			],
		},
	},

	"engineering-design:engineering-consulting": {
		th: {
			isDraft: true,
			overview:
				"ที่ปรึกษาวิศวกรรมสำหรับโครงการที่ต้องการการออกแบบและการเซ็นรับรองโดยวุฒิวิศวกร ครอบคลุมการทบทวนแบบ การคำนวณทางวิศวกรรม และการรับรองเอกสารเพื่อใช้ยื่นต่อหน่วยงานที่เกี่ยวข้อง",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ทบทวนและตรวจสอบแบบทางวิศวกรรม",
				"การคำนวณและวิเคราะห์ทางวิศวกรรม",
				"การเซ็นรับรองแบบโดยวุฒิวิศวกร",
				"คำแนะนำด้านข้อกำหนดและมาตรฐานที่เกี่ยวข้อง",
				"เอกสารประกอบการยื่นต่อหน่วยงานราชการ",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "รับโจทย์", detail: "ทำความเข้าใจขอบเขตและข้อกำหนดของโครงการ" },
				{ step: "ทบทวนแบบ", detail: "ตรวจสอบแบบและคำนวณทางวิศวกรรม" },
				{ step: "รับรอง", detail: "วุฒิวิศวกรเซ็นรับรองแบบและเอกสาร" },
				{ step: "ส่งมอบ", detail: "ส่งมอบเอกสารพร้อมคำแนะนำการยื่น" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Engineering consulting for projects that require design and licensed-engineer sign-off — covering design review, engineering calculations, and document certification for filing with the relevant authorities.",
			featuresTitle: "What you get",
			features: [
				"Review and verification of engineering drawings",
				"Engineering calculations and analysis",
				"Design sign-off by a licensed engineer",
				"Guidance on applicable requirements and standards",
				"Documentation prepared for government filing",
			],
			processTitle: "How it works",
			process: [
				{ step: "Scope", detail: "Understand the project scope and requirements" },
				{ step: "Review", detail: "Check drawings and engineering calculations" },
				{ step: "Certify", detail: "A licensed engineer signs off drawings and docs" },
				{ step: "Deliver", detail: "Hand over documents with filing guidance" },
			],
		},
	},

	"engineering-design:construction-permits": {
		th: {
			isDraft: true,
			overview:
				"บริการดำเนินการขออนุญาตก่อสร้างและดัดแปลงอาคาร ตั้งแต่จัดทำแบบสถาปัตยกรรมและวิศวกรรม ตรวจสอบข้อกำหนดตามกฎหมายควบคุมอาคาร ไปจนถึงประสานงานกับหน่วยงานท้องถิ่นจนได้รับใบอนุญาต",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"จัดทำแบบสถาปัตยกรรมและวิศวกรรมสำหรับยื่นขออนุญาต",
				"ตรวจสอบข้อกำหนดตามกฎหมายควบคุมอาคาร",
				"เอกสารรับรองโดยวุฒิวิศวกร / สถาปนิก",
				"ประสานงานกับหน่วยงานท้องถิ่น",
				"ติดตามสถานะจนได้รับใบอนุญาต",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ประเมิน", detail: "ตรวจสอบพื้นที่และข้อกำหนดตามกฎหมาย" },
				{ step: "เขียนแบบ", detail: "จัดทำแบบสถาปัตยกรรมและวิศวกรรม" },
				{ step: "ยื่นขออนุญาต", detail: "ประสานงานยื่นเรื่องต่อหน่วยงานท้องถิ่น" },
				{ step: "ติดตามผล", detail: "ติดตามและแก้ไขจนได้รับใบอนุญาต" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Handling of construction and building-modification permits — from producing architectural and engineering drawings and checking building-control requirements to coordinating with local authorities through to permit issuance.",
			featuresTitle: "What you get",
			features: [
				"Architectural and engineering drawings for the permit filing",
				"A review against building-control law requirements",
				"Documentation certified by a licensed engineer / architect",
				"Coordination with the local authorities",
				"Status tracking through to permit issuance",
			],
			processTitle: "How it works",
			process: [
				{ step: "Assess", detail: "Review the site and legal requirements" },
				{ step: "Draw", detail: "Produce architectural and engineering drawings" },
				{ step: "File", detail: "Coordinate the filing with local authorities" },
				{ step: "Follow up", detail: "Track and resolve until the permit is issued" },
			],
		},
	},

	"engineering-design:special-systems": {
		th: {
			isDraft: true,
			overview:
				"งานออกแบบและติดตั้งระบบพิเศษสำหรับงานอุตสาหกรรม เช่น ระบบดับเพลิง ระบบระบายอากาศ ระบบลมอัด และระบบสาธารณูปโภคเฉพาะทาง ให้เป็นไปตามมาตรฐานความปลอดภัยและข้อกำหนดของแต่ละอุตสาหกรรม",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ออกแบบระบบพิเศษให้เหมาะกับกระบวนการผลิต",
				"เลือกอุปกรณ์ตามมาตรฐานความปลอดภัย",
				"ติดตั้งและทดสอบระบบโดยทีมงานที่มีประสบการณ์",
				"เอกสารรับรองและคู่มือการใช้งาน",
				"บริการตรวจสอบและบำรุงรักษาต่อเนื่อง",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจหน้างาน", detail: "ประเมินความต้องการและข้อจำกัดของพื้นที่" },
				{ step: "ออกแบบระบบ", detail: "จัดทำแบบและเลือกอุปกรณ์ที่เหมาะสม" },
				{ step: "ติดตั้ง", detail: "ติดตั้งและทดสอบระบบให้ได้มาตรฐาน" },
				{ step: "ส่งมอบ", detail: "ส่งมอบพร้อมเอกสารรับรองและคู่มือ" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Design and installation of special industrial systems — such as fire-protection, ventilation, compressed-air, and specialized utility systems — built to meet safety standards and each industry's requirements.",
			featuresTitle: "What you get",
			features: [
				"Special systems designed to suit your production process",
				"Equipment selected to safety standards",
				"Installation and testing by an experienced team",
				"Certification documents and operating manuals",
				"Ongoing inspection and maintenance service",
			],
			processTitle: "How it works",
			process: [
				{ step: "Site survey", detail: "Assess the needs and site constraints" },
				{ step: "Design", detail: "Produce drawings and select suitable equipment" },
				{ step: "Install", detail: "Install and test the system to standard" },
				{ step: "Handover", detail: "Hand over with certification and manuals" },
			],
		},
	},

	"engineering-design:environmental-systems": {
		th: {
			isDraft: true,
			overview:
				"ออกแบบและติดตั้งระบบบำบัดมลพิษและสิ่งแวดล้อม ทั้งระบบบำบัดน้ำเสีย ระบบบำบัดอากาศ และการจัดการของเสีย ให้เป็นไปตามข้อกำหนดด้านสิ่งแวดล้อมและพร้อมสำหรับการตรวจประเมินของหน่วยงานราชการ",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ออกแบบระบบบำบัดที่เหมาะกับลักษณะมลพิษ",
				"ตรวจสอบให้เป็นไปตามข้อกำหนดด้านสิ่งแวดล้อม",
				"เอกสารรับรองโดยวุฒิวิศวกรสิ่งแวดล้อม",
				"ติดตั้งและทดสอบประสิทธิภาพระบบ",
				"คำแนะนำด้านการดูแลและตรวจวัดต่อเนื่อง",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ตรวจวิเคราะห์", detail: "ตรวจวัดลักษณะมลพิษและปริมาณ" },
				{ step: "ออกแบบระบบ", detail: "ออกแบบระบบบำบัดตามข้อกำหนด" },
				{ step: "ติดตั้ง", detail: "ติดตั้งและทดสอบประสิทธิภาพระบบ" },
				{ step: "ส่งมอบ", detail: "ส่งมอบพร้อมเอกสารและแผนการดูแล" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Design and installation of pollution-treatment and environmental systems — wastewater treatment, air treatment, and waste management — built to meet environmental requirements and ready for government inspection.",
			featuresTitle: "What you get",
			features: [
				"Treatment systems designed for your pollution profile",
				"Verification against environmental requirements",
				"Documentation certified by a licensed environmental engineer",
				"Installation and performance testing",
				"Guidance on ongoing operation and monitoring",
			],
			processTitle: "How it works",
			process: [
				{ step: "Analyze", detail: "Measure the pollution profile and volumes" },
				{ step: "Design", detail: "Design the treatment system to requirements" },
				{ step: "Install", detail: "Install and test system performance" },
				{ step: "Handover", detail: "Hand over with documents and a care plan" },
			],
		},
	},

	"engineering-design:machine-registration": {
		th: {
			isDraft: true,
			overview:
				"บริการดำเนินการขึ้นทะเบียนเครื่องจักรตามกฎหมาย ตั้งแต่จัดทำรายการเครื่องจักร ประเมินมูลค่า จัดเตรียมเอกสาร ไปจนถึงประสานงานกับกรมโรงงานอุตสาหกรรม เพื่อใช้ประกอบการจดจำนองหรือขอสินเชื่อ",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"จัดทำรายการและรายละเอียดเครื่องจักร",
				"ประเมินมูลค่าเครื่องจักรตามหลักเกณฑ์",
				"จัดเตรียมเอกสารประกอบการขึ้นทะเบียน",
				"เอกสารรับรองโดยวุฒิวิศวกร",
				"ประสานงานกับกรมโรงงานอุตสาหกรรม",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "สำรวจเครื่องจักร", detail: "จัดทำรายการและตรวจสอบรายละเอียด" },
				{ step: "ประเมินมูลค่า", detail: "ประเมินมูลค่าตามหลักเกณฑ์ที่กำหนด" },
				{ step: "เตรียมเอกสาร", detail: "จัดทำเอกสารและแบบประกอบการยื่น" },
				{ step: "ขึ้นทะเบียน", detail: "ประสานงานยื่นและติดตามจนแล้วเสร็จ" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Statutory machine-registration handling — from building the machine inventory and valuation to preparing documents and coordinating with the Department of Industrial Works, for use in mortgaging machinery or securing financing.",
			featuresTitle: "What you get",
			features: [
				"A machine inventory with full details",
				"Machine valuation per the applicable criteria",
				"Preparation of the registration documents",
				"Documentation certified by a licensed engineer",
				"Coordination with the Department of Industrial Works",
			],
			processTitle: "How it works",
			process: [
				{ step: "Survey", detail: "Build the inventory and verify details" },
				{ step: "Value", detail: "Appraise machinery per the set criteria" },
				{ step: "Prepare docs", detail: "Produce documents and forms for filing" },
				{ step: "Register", detail: "Coordinate filing and track to completion" },
			],
		},
	},

	"engineering-design:certifications": {
		th: {
			isDraft: true,
			overview:
				"บริการให้คำปรึกษาและเตรียมความพร้อมเพื่อขอใบอนุญาตและการรับรองระบบมาตรฐาน เช่น ISO 9001, ISO 14001 และมาตรฐานเฉพาะอุตสาหกรรม ตั้งแต่ประเมินช่องว่าง จัดทำเอกสารระบบ ไปจนถึงเตรียมพร้อมสำหรับการตรวจประเมิน",
			featuresTitle: "สิ่งที่คุณจะได้รับ",
			features: [
				"ประเมินช่องว่างเทียบกับข้อกำหนดของมาตรฐาน",
				"จัดทำเอกสารและระบบการจัดการ",
				"อบรมให้ความรู้แก่ทีมงาน",
				"เตรียมความพร้อมสำหรับการตรวจประเมิน (Audit)",
				"คำแนะนำในการรักษาระบบให้ต่อเนื่อง",
			],
			processTitle: "ขั้นตอนการทำงาน",
			process: [
				{ step: "ประเมินช่องว่าง", detail: "เทียบระบบปัจจุบันกับข้อกำหนดมาตรฐาน" },
				{ step: "จัดทำระบบ", detail: "จัดทำเอกสารและกระบวนการที่จำเป็น" },
				{ step: "เตรียมตรวจประเมิน", detail: "ทดสอบระบบและอบรมทีมงาน" },
				{ step: "ขอการรับรอง", detail: "สนับสนุนระหว่างการตรวจประเมินจนได้รับรอง" },
			],
		},
		en: {
			isDraft: true,
			overview:
				"Consulting and readiness support for standards licensing and certification — such as ISO 9001, ISO 14001, and industry-specific standards — from gap assessment and building the management-system documentation to preparing for the audit.",
			featuresTitle: "What you get",
			features: [
				"A gap assessment against the standard's requirements",
				"Management-system documentation and processes",
				"Training for your team",
				"Audit-readiness preparation",
				"Guidance on sustaining the system over time",
			],
			processTitle: "How it works",
			process: [
				{ step: "Gap assessment", detail: "Compare current practice to the standard" },
				{ step: "Build system", detail: "Create the required documents and processes" },
				{ step: "Prepare for audit", detail: "Test the system and train the team" },
				{ step: "Certify", detail: "Support you through the audit to certification" },
			],
		},
	},
};

/** Page id for a single-page group, or a nested child. */
export function serviceBodyId(groupId: string, childSlug?: string): string {
	return childSlug ? `${groupId}:${childSlug}` : groupId;
}

/** Full body copy for a page, or `undefined` when it is a placeholder (scaffolded) page. */
export function getServiceBody(
	groupId: string,
	childSlug: string | undefined,
	locale: "th" | "en"
): ServiceBody | undefined {
	return SERVICE_BODIES[serviceBodyId(groupId, childSlug)]?.[locale];
}

/** A page is a placeholder when no marketing body has been authored yet. */
export function isPlaceholderService(groupId: string, childSlug?: string): boolean {
	return !(serviceBodyId(groupId, childSlug) in SERVICE_BODIES);
}
