'use client';

import { AnimatePresence, motion } from 'motion/react';

interface ErrorDisplayProps {
	error: string | null;
	className?: string;
}

const theme = {
	error: 'text-xs text-red-400 mt-2',
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
	error,
	className,
}) => {
	return (
		<AnimatePresence>
			{error && (
				<motion.div
					animate={{ opacity: 1, y: 0, scale: 1 }}
					className={`${theme.error} ${className || ''}`}
					exit={{ opacity: 0, y: -10, scale: 0.95 }}
					initial={{ opacity: 0, y: -10, scale: 0.95 }}
					transition={{ duration: 0.2, ease: 'easeOut' as const }}
				>
					{error}
				</motion.div>
			)}
		</AnimatePresence>
	);
};