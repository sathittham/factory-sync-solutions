import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const DELAY_CLASS: Record<number, string> = {
	0: "",
	1: "fade-in-d1",
	2: "fade-in-d2",
	3: "fade-in-d3",
	4: "fade-in-d4",
	5: "fade-in-d5",
};

function delayClass(delay: number): string {
	const key = Math.round(delay / 0.08);
	return DELAY_CLASS[key] ?? "";
}

export function FadeIn({
	children,
	delay = 0,
	className,
}: {
	readonly children: ReactNode;
	readonly delay?: number;
	readonly className?: string;
}) {
	return <div className={cn("fade-in", delayClass(delay), className)}>{children}</div>;
}

export function StaggerChildren({
	children,
	className,
}: {
	readonly children: ReactNode;
	readonly className?: string;
}) {
	return <div className={className}>{children}</div>;
}

export function StaggerItem({
	children,
	className,
}: {
	readonly children: ReactNode;
	readonly className?: string;
}) {
	return <div className={cn("stagger-item", className)}>{children}</div>;
}
