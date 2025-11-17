'use client';

import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ArrowIndicatorProps {
	isVisible: boolean;
}

export const ArrowIndicator: React.FC<ArrowIndicatorProps> = ({
	isVisible,
}) => {
	return (
		<div className='flex items-center justify-center pt-12'>
			<AnimatePresence>
				{isVisible && (
					<motion.div
						animate={{ opacity: 1, scale: 1, x: 0 }}
						className='p-2 rounded-full bg-teal-500/10 border border-teal-500/20'
						exit={{ opacity: 0, scale: 0, x: -10 }}
						initial={{ opacity: 0, scale: 0, x: -10 }}
						transition={{ duration: 0.2, ease: 'easeOut' as const }}
					>
						<motion.div
							animate={{
								x: [0, 3, 0],
							}}
							transition={{
								duration: 6,
								repeat: Infinity,
								ease: 'easeInOut' as const,
							}}
						>
							<ArrowRight className='w-4 h-4 text-teal-500' />
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};