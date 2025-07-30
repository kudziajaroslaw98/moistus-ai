'use client';

import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'motion/react';

interface ActionBarProps {
	onCreate: () => void;
	canCreate: boolean;
	isCreating: boolean;
	className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
	onCreate,
	canCreate,
	isCreating,
	className,
}) => {
	return (
		<motion.div
			className={cn('flex items-center justify-between mt-4', className)}
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4, duration: 0.3, ease: 'easeOut' }}
		>
			<motion.span
				className='text-xs text-zinc-500'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.5, duration: 0.3 }}
			>
				Press Ctrl+Enter to create • Enter for new line
			</motion.span>

			<motion.button
				onClick={onCreate}
				disabled={!canCreate || isCreating}
				className={cn(
					'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
					'bg-teal-600 hover:bg-teal-700 text-white',
					'disabled:opacity-50 disabled:cursor-not-allowed'
				)}
				whileHover={{
					scale: !canCreate || isCreating ? 1 : 1.05,
					transition: { duration: 0.1 },
				}}
				whileTap={{
					scale: !canCreate || isCreating ? 1 : 0.95,
					transition: { duration: 0.1 },
				}}
				initial={{ opacity: 0, x: 10 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ delay: 0.45, duration: 0.3, ease: 'easeOut' }}
			>
				<AnimatePresence mode='wait'>
					<motion.span
						key={isCreating ? 'creating' : 'create'}
						initial={{ opacity: 0, y: -5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						transition={{ duration: 0.15 }}
					>
						{isCreating ? 'Creating...' : 'Create'}
					</motion.span>
				</AnimatePresence>
			</motion.button>
		</motion.div>
	);
};
