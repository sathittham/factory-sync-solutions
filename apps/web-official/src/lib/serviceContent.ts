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
