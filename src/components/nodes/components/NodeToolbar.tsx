/**
 * Shared Node Toolbar Component
 * 
 * Provides a consistent toolbar interface across all nodes that need editing controls.
 * Extracted from TextNode's toolbar pattern to ensure consistency.
 */

'use client';

import { NodeToolbar, Position } from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactNode } from 'react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface NodeToolbarProps {
	isVisible: boolean;
	position?: Position;
	offset?: number;
	children: ReactNode;
	className?: string;
}

export const SharedNodeToolbar = ({
	isVisible,
	position = Position.Top,
	offset = 10,
	children,
	className = '',
}: NodeToolbarProps) => {
	const theme = GlassmorphismTheme;

	return (
		<NodeToolbar
			isVisible={isVisible}
			position={position}
			offset={offset}
		>
			<AnimatePresence>
				{isVisible && (
					<motion.div
						className={`flex gap-1 p-2 rounded-lg ${className}`}
						style={{
							backgroundColor: theme.elevation[4], // App bar elevation
							border: `1px solid ${theme.borders.default}`,
							backdropFilter: theme.effects.glassmorphism,
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
						}}
						initial={{ opacity: 0, scale: 0.95, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 10 }}
						transition={{ 
							duration: 0.2, 
							type: 'spring', 
							stiffness: 300,
							damping: 25,
						}}
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</NodeToolbar>
	);
};

export default SharedNodeToolbar;