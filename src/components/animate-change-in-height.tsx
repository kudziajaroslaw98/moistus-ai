import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';

interface AnimateChangeInHeightProps {
	children: React.ReactNode;
	className?: string;
	easingPreset?: 'smooth' | 'spring' | 'apple' | 'responsive';
}

const easingPresets = {
	// Recommended for most UI elements
	smooth: {
		duration: 0.4,
		ease: 'easeOut' as const,
	},

	// Most premium feeling - physics-based
	spring: {
		type: 'spring' as const,
		bounce: 0.15,
		duration: 0.4,
	},

	// Apple/iOS inspired
	apple: {
		duration: 0.35,
		ease: [0.16, 1, 0.3, 1] as const,
	},

	// Ultra-responsive for interactions
	responsive: {
		duration: 0.25,
		ease: [0.25, 0.46, 0.45, 0.94] as const,
	},
} as const;

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
	children,
	className,
	easingPreset = 'smooth',
}) => {
	const [height, setHeight] = useState<number | 'auto'>('auto');
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

	const containerRef = useCallback((node: HTMLDivElement) => {
		if (node !== null) {
			resizeObserverRef.current = new ResizeObserver((entries) => {
				const observedHeight = entries?.[0]?.contentRect?.height;
				setHeight(observedHeight ?? 'auto');
			});
			resizeObserverRef.current.observe(node);
		} else if (resizeObserverRef.current) {
			resizeObserverRef.current.disconnect();
		}
	}, []);

	return (
		<motion.div
			animate={{ height }}
			className={cn('overflow', className)}
			transition={{
				type: 'spring',
				stiffness: 500,
				damping: 24,
			}}
		>
			<div ref={containerRef}>{children}</div>
		</motion.div>
	);
};
