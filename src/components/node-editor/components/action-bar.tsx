'use client';

import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'motion/react';

interface ActionBarProps {
	onCreate: () => void;
	canCreate: boolean;
	isCreating: boolean;
	mode?: 'create' | 'edit';
	className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
	onCreate,
	canCreate,
	isCreating,
	mode = 'create',
	className,
}) => {
	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className={cn('flex items-center justify-between mt-4', className)}
			initial={{ opacity: 0, y: -15 }}
			transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' as const }}
		>
			<motion.span
				animate={{ opacity: 1 }}
				className='text-xs text-zinc-500'
				initial={{ opacity: 0 }}
				transition={{ delay: 0.15, duration: 0.3 }}
			>
				Press Ctrl+Enter to {mode === 'edit' ? 'update' : 'create'} • Enter for
				new line
			</motion.span>

			<motion.button
				animate={{ opacity: 1 }}
				data-testid='create-button'
				disabled={!canCreate || isCreating}
				initial={{ opacity: 0 }}
				onClick={onCreate}
				transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' as const }}
				className={cn(
					'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
					'bg-primary-600 hover:bg-primary-700 text-white',
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
			>
				<AnimatePresence mode='wait'>
					<motion.span
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						initial={{ opacity: 0, y: -5 }}
						key={isCreating ? 'saving' : mode}
						transition={{ duration: 0.15 }}
					>
						{isCreating
							? `${mode === 'edit' ? 'Updating' : 'Creating'}...`
							: mode === 'edit'
								? 'Update'
								: 'Create'}
					</motion.span>
				</AnimatePresence>
			</motion.button>
		</motion.div>
	);
};
