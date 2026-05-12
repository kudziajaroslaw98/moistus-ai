'use client';

import { cn } from '@/utils/cn';
import { Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ComponentType } from 'react';

interface ComponentHeaderProps {
	icon: ComponentType<{ className?: string }>;
	label: string;
	className?: string;
	showSparkles?: boolean;
}

export const ComponentHeader = ({
	icon: Icon,
	label,
	className,
	showSparkles = true,
}: ComponentHeaderProps) => {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const headerMotionProps = shouldReduceMotion
		? {}
		: {
				animate: { opacity: 1, x: 0 },
				initial: { opacity: 0, x: -20 },
				transition: { delay: 0.1, duration: 0.3, ease: 'easeOut' as const },
			};
	const iconMotionProps = shouldReduceMotion
		? {}
		: {
				animate: { scale: 1 },
				initial: { scale: 0 },
				transition: { delay: 0.2, duration: 0.2, ease: 'easeOut' as const },
			};
	const sparkleMotionProps = shouldReduceMotion
		? {}
		: {
				animate: { scale: 1, rotate: 0 },
				initial: { scale: 0, rotate: -180 },
				transition: {
					delay: 0.25,
					duration: 0.3,
					ease: 'easeOut' as const,
				},
			};

	return (
		<motion.div
			className={cn('flex items-center gap-2 mb-3', className)}
			{...headerMotionProps}
		>
			<motion.div {...iconMotionProps}>
				<Icon className='w-4 h-4 text-zinc-400' />
			</motion.div>

			<h3 className='text-sm font-medium text-zinc-100'>{label}</h3>

			{showSparkles && (
				<motion.div className='ml-auto' {...sparkleMotionProps}>
					<Sparkles className='w-3 h-3 text-primary-500' />
				</motion.div>
			)}
		</motion.div>
	);
};
