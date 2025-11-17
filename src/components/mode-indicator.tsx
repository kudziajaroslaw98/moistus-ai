'use client';

import useAppStore from '@/store/mind-map-store';
import { MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useShallow } from 'zustand/shallow';
import { Badge } from './ui/badge';

/**
 * ModeIndicator Component
 *
 * Displays a floating badge when comment mode is active.
 * Provides visual feedback to the user about the current canvas interaction mode.
 *
 * Features:
 * - Only visible in comment mode
 * - Smooth fade-in/scale animation (200ms ease-out-quad)
 * - Glassmorphism styling matching toolbar
 * - Teal accent color for active state
 */
export const ModeIndicator = () => {
	const { isCommentMode } = useAppStore(
		useShallow((state) => ({
			isCommentMode: state.isCommentMode,
		}))
	);

	return (
		<AnimatePresence>
			{isCommentMode && (
				<motion.div
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: -10 }}
					initial={{ opacity: 0, scale: 0.95, y: -10 }}
					transition={{
						duration: 0.2,
						ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
					}}
				>
					<Badge
						className='px-3 py-1.5 text-sm gap-2 font-medium'
						variant='outline'
						style={{
							backgroundColor: 'rgba(20, 184, 166, 0.15)',
							borderColor: 'rgba(20, 184, 166, 0.3)',
							color: 'rgba(20, 184, 166, 1)',
							boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
						}}
					>
						<MessageSquare className='size-4' />

						<span>Comment Mode</span>
					</Badge>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
