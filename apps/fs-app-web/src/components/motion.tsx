import { motion, AnimatePresence, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

/** Fade-up on scroll into view */
function FadeIn({
	children,
	delay = 0,
	y = 24,
	className,
}: Readonly<{
	children: ReactNode;
	delay?: number;
	y?: number;
	className?: string;
}>) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-60px" });

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y }}
			animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
			transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/** Stagger children on mount */
function StaggerChildren({
	children,
	stagger = 0.08,
	className,
}: Readonly<{
	children: ReactNode;
	stagger?: number;
	className?: string;
}>) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-40px" });

	return (
		<motion.div
			ref={ref}
			initial="hidden"
			animate={inView ? "show" : "hidden"}
			variants={{
				hidden: {},
				show: { transition: { staggerChildren: stagger } },
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/** Child item for StaggerChildren */
function StaggerItem({
	children,
	className,
}: Readonly<{
	children: ReactNode;
	className?: string;
}>) {
	return (
		<motion.div
			variants={{
				hidden: { opacity: 0, y: 20 },
				show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] } },
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/** Scale in from slightly smaller */
function ScaleIn({
	children,
	delay = 0,
	className,
}: Readonly<{
	children: ReactNode;
	delay?: number;
	className?: string;
}>) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-40px" });

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, scale: 0.95 }}
			animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.4, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

export { motion, AnimatePresence, FadeIn, StaggerChildren, StaggerItem, ScaleIn };
