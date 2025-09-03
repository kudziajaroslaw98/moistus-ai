'use client';

import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface ComponentHeaderProps {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	className?: string;
}

export const ComponentHeader: React.FC<ComponentHeaderProps> = ({
	icon: Icon,
	label,
	className,
}) => {
	return (
		<motion.div
			className={`flex items-center gap-2 mb-3 ${className || ''}`}
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
		>
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ delay: 0.2, duration: 0.2, ease: 'easeOut' }}
			>
				<Icon className='w-4 h-4 text-zinc-400' />
			</motion.div>

			<h3 className='text-sm font-medium text-zinc-100'>{label}</h3>

			<motion.div
				initial={{ scale: 0, rotate: -180 }}
				animate={{ scale: 1, rotate: 0 }}
				transition={{ delay: 0.25, duration: 0.3, ease: 'easeOut' }}
				className='ml-auto'
			>
				<Sparkles className='w-3 h-3 text-teal-500' />
			</motion.div>
		</motion.div>
	);
};