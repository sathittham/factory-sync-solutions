import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { LegalType } from "@/components/LegalModal";

export const CONSENT_KEY = "fhc-cookie-consent";
const MARKETING_KEY = "fhc-marketing-consent";
const ANALYTICS_KEY = "fhc-analytics-consent";

function getStored(key: string, fallback: boolean): boolean {
	try {
		const v = localStorage.getItem(key);
		if (v === "true") return true;
		if (v === "false") return false;
	} catch { /* ignore */ }
	return fallback;
}

interface CookieConsentProps {
	readonly open: boolean;
	readonly openSettings?: boolean;
	readonly onClose: () => void;
	readonly onOpenLegal: (type: LegalType) => void;
}

function saveConsent(analytics: boolean, marketing: boolean) {
	const consent = analytics || marketing ? "partial" : "essential";
	try {
		localStorage.setItem(CONSENT_KEY, analytics && marketing ? "all" : consent);
		localStorage.setItem(ANALYTICS_KEY, String(analytics));
		localStorage.setItem(MARKETING_KEY, String(marketing));
	} catch { /* ignore */ }
}

// --- Toggle Switch ---

function Toggle({ checked, onChange }: { readonly checked: boolean; readonly onChange: () => void }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={onChange}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
				checked ? "bg-primary" : "bg-muted"
			}`}
		>
			<span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
				checked ? "translate-x-6" : "translate-x-1"
			}`} />
		</button>
	);
}

// --- Category Row ---

function CategoryRow({ title, description, detailLabel, onDetail, control }: {
	readonly title: string;
	readonly description: string;
	readonly detailLabel: string;
	readonly onDetail: () => void;
	readonly control: React.ReactNode;
}) {
	return (
		<div className="px-6 py-4">
			<div className="flex items-center justify-between mb-2">
				<h3 className="text-sm font-semibold">{title}</h3>
				{control}
			</div>
			<p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
			<button type="button" onClick={onDetail} className="text-xs text-primary hover:underline mt-1.5 font-medium">
				{detailLabel}
			</button>
		</div>
	);
}

// --- Banner ---

function CookieBanner({ isTh, onSettings, onAcceptAll, onOpenLegal }: {
	readonly isTh: boolean;
	readonly onSettings: () => void;
	readonly onAcceptAll: () => void;
	readonly onOpenLegal: (type: LegalType) => void;
}) {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-up">
			<div className="container max-w-3xl">
				<div className="bg-card rounded-lg border shadow-lg p-4 sm:p-5 space-y-3">
					<p className="font-semibold text-sm">
						{isTh ? "เว็บไซต์นี้ใช้คุกกี้" : "This website uses cookies"}
					</p>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{isTh
							? "เราใช้คุกกี้เพื่อเพิ่มประสบการณ์ที่ดีในการใช้เว็บไซต์ แสดงเนื้อหาและโฆษณาให้ตรงกับความสนใจ รวมถึงเพื่อวิเคราะห์การเข้าชมเว็บไซต์และทำความเข้าใจผู้ใช้งาน คุณสามารถเลือกตั้งค่าความยินยอมการใช้คุกกี้ได้ โดยคลิก \"การตั้งค่าคุกกี้\" "
							: "We use cookies to improve your experience, display relevant content, and analyze website traffic. You can manage your cookie preferences by clicking \"Cookie Settings\". "}
						<button type="button" onClick={() => onOpenLegal("privacy")} className="text-primary hover:underline font-medium">
							{isTh ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
						</button>
					</p>
					<div className="flex items-center justify-end gap-2">
						<Button variant="outline" size="sm" onClick={onSettings} className="text-xs">
							{isTh ? "การตั้งค่าคุกกี้" : "Cookie Settings"}
						</Button>
						<Button size="sm" onClick={onAcceptAll} className="text-xs">
							{isTh ? "ยอมรับทั้งหมด" : "Accept All"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

// --- Settings Modal ---

function CookieSettings({ isTh, analytics, marketing, onAnalyticsChange, onMarketingChange, onAcceptAll, onConfirm, onOpenLegal }: {
	readonly isTh: boolean;
	readonly analytics: boolean;
	readonly marketing: boolean;
	readonly onAnalyticsChange: () => void;
	readonly onMarketingChange: () => void;
	readonly onAcceptAll: () => void;
	readonly onConfirm: () => void;
	readonly onOpenLegal: (type: LegalType) => void;
}) {
	const detailLabel = isTh ? "รายละเอียดคุกกี้" : "Cookie Details";
	const onDetail = () => onOpenLegal("cookies");

	return (
		<>
			<DialogHeader className="px-6 pt-6 pb-4">
				<div className="flex items-center justify-between">
					<DialogTitle className="text-lg">
						{isTh ? "การตั้งค่าความเป็นส่วนตัว" : "Privacy Settings"}
					</DialogTitle>
					<Button size="sm" onClick={onAcceptAll} className="text-xs">
						{isTh ? "ยอมรับทั้งหมด" : "Accept All"}
					</Button>
				</div>
			</DialogHeader>

			<div className="divide-y">
				<CategoryRow
					title={isTh ? "คุกกี้พื้นฐานที่จำเป็น" : "Essential Cookies"}
					description={isTh
						? "คุกกี้พื้นฐานที่จำเป็น เพื่อช่วยให้การทำงานหลักของเว็บไซต์ใช้งานได้ รวมถึงการเข้าถึงพื้นที่ปลอดภัยต่างๆ หากไม่มีคุกกี้นี้เว็บไซต์จะไม่สามารถทำงานได้อย่างเหมาะสม"
						: "Essential cookies are required for the website to function properly, including access to secure areas. Without these cookies, the website cannot operate correctly."}
					detailLabel={detailLabel}
					onDetail={onDetail}
					control={
						<span className="text-xs text-primary font-medium">
							{isTh ? "เปิดใช้งานตลอดเวลา" : "Always Active"}
						</span>
					}
				/>
				<CategoryRow
					title={isTh ? "คุกกี้ในส่วนวิเคราะห์" : "Analytics Cookies"}
					description={isTh
						? "คุกกี้ในส่วนวิเคราะห์ จะช่วยให้เว็บไซต์เข้าใจรูปแบบการใช้งานของผู้เข้าชมและจะช่วยปรับปรุงประสบการณ์การใช้งาน โดยการเก็บรวบรวมข้อมูลและรายงานผลการใช้งานของผู้ใช้งาน"
						: "Analytics cookies help us understand how visitors use the website and improve the user experience by collecting and reporting usage data."}
					detailLabel={detailLabel}
					onDetail={onDetail}
					control={<Toggle checked={analytics} onChange={onAnalyticsChange} />}
				/>
				<CategoryRow
					title={isTh ? "คุกกี้ในส่วนการตลาด" : "Marketing Cookies"}
					description={isTh
						? "คุกกี้ในส่วนการตลาด ใช้เพื่อติดตามพฤติกรรมผู้เข้าชมเว็บไซต์เพื่อแสดงโฆษณาที่เหมาะสมสำหรับผู้ใช้งานแต่ละรายและเพื่อเพิ่มประสิทธิผลการโฆษณาสำหรับผู้เผยแพร่และผู้โฆษณาสำหรับบุคคลที่สาม"
						: "Marketing cookies are used to track visitor behavior to display relevant advertisements for each user and to increase advertising effectiveness for publishers and third-party advertisers."}
					detailLabel={detailLabel}
					onDetail={onDetail}
					control={<Toggle checked={marketing} onChange={onMarketingChange} />}
				/>
			</div>

			<div className="px-6 py-4 border-t">
				<Button onClick={onConfirm} className="w-full">
					{isTh ? "ยืนยันตัวเลือกของฉัน" : "Confirm My Selection"}
				</Button>
			</div>
		</>
	);
}

// --- Main Component ---

export function CookieConsent({ open, openSettings, onClose, onOpenLegal }: CookieConsentProps) {
	const { locale } = useLocale();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const showSettings = settingsOpen || openSettings;
	const [analytics, setAnalytics] = useState(() => getStored(ANALYTICS_KEY, false));
	const [marketing, setMarketing] = useState(() => getStored(MARKETING_KEY, false));
	const isTh = locale === "th";

	const handleAcceptAll = () => {
		setAnalytics(true);
		setMarketing(true);
		saveConsent(true, true);
		setSettingsOpen(false);
		onClose();
	};

	const handleConfirm = () => {
		saveConsent(analytics, marketing);
		setSettingsOpen(false);
		onClose();
	};

	if (showSettings) {
		return (
			<Dialog open onOpenChange={(v) => { if (!v) { setSettingsOpen(false); onClose(); } }}>
				<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
					<CookieSettings
						isTh={isTh}
						analytics={analytics}
						marketing={marketing}
						onAnalyticsChange={() => setAnalytics(!analytics)}
						onMarketingChange={() => setMarketing(!marketing)}
						onAcceptAll={handleAcceptAll}
						onConfirm={handleConfirm}
						onOpenLegal={onOpenLegal}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	if (!open) return null;

	return (
		<CookieBanner
			isTh={isTh}
			onSettings={() => setSettingsOpen(true)}
			onAcceptAll={handleAcceptAll}
			onOpenLegal={onOpenLegal}
		/>
	);
}
