'use client';

import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
import { useIsMac } from '@/hooks/use-platform';

interface ActionBarProps {
	onCreate: () => void;
	canCreate: boolean;
	isCreating: boolean;
	isCheckingLimit?: boolean;
	mode?: 'create' | 'edit';
	className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
	onCreate,
	canCreate,
	isCreating,
	isCheckingLimit = false,
	mode = 'create',
	className,
}) => {
	const isBusy = isCreating || isCheckingLimit;
	const isMac = useIsMac();
	const modifierKey = isMac ? 'Cmd' : 'Ctrl';
	const suggestionShortcut = isMac ? 'Cmd+.' : 'Ctrl+Space';

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
				{isCheckingLimit ? (
					<span className='text-zinc-400'>Checking map limit...</span>
				) : (
					<>
						<span className='hidden sm:inline'>Press </span>{modifierKey}+Enter to {mode === 'edit' ? 'update' : 'create'}
						<span className='hidden sm:inline'> • Enter for new line</span>
						<span className='hidden sm:inline'> • {suggestionShortcut} for suggestions</span>
					</>
				)}
			</motion.span>

			<motion.button
				animate={{ opacity: 1 }}
				data-testid='create-button'
				disabled={!canCreate || isBusy}
				initial={{ opacity: 0 }}
				onClick={onCreate}
				transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' as const }}
				className={cn(
					'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
					'bg-primary-600 hover:bg-primary-700 text-white',
					'disabled:opacity-50 disabled:cursor-not-allowed'
				)}
				whileHover={{
					scale: !canCreate || isBusy ? 1 : 1.05,
					transition: { duration: 0.1 },
				}}
				whileTap={{
					scale: !canCreate || isBusy ? 1 : 0.95,
					transition: { duration: 0.1 },
				}}
			>
				<AnimatePresence mode='wait'>
					<motion.span
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						initial={{ opacity: 0, y: -5 }}
						key={isBusy ? 'busy' : mode}
						transition={{ duration: 0.15 }}
					>
						{isCheckingLimit
							? 'Checking...'
							: isCreating
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