/**
 * Shared Node Toolbar Component
 * 
 * Provides a consistent toolbar interface across all nodes that need editing controls.
 * Extracted from TextNode's toolbar pattern to ensure consistency.
 */

'use client';

import { NodeToolbar, Position } from '@xyflow/react';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactNode } from 'react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface NodeToolbarProps {
	isVisible: boolean;
	position?: Position;
	offset?: number;
	children: ReactNode;
	className?: string;
	/** When true, shows a lock icon indicating read-only mode */
	readOnly?: boolean;
}

export const SharedNodeToolbar = ({
	isVisible,
	position = Position.Top,
	offset = 10,
	children,
	className = '',
	readOnly = false,
}: NodeToolbarProps) => {
	const theme = GlassmorphismTheme;

	return (
		<NodeToolbar
			isVisible={isVisible}
			offset={offset}
			position={position}
		>
			<AnimatePresence>
				{isVisible && (
					<motion.div
						animate={{ opacity: 1, scale: 1, y: 0 }}
						className={`flex gap-1 p-2 rounded-lg nodrag nopan ${className}`}
						exit={{ opacity: 0, scale: 0.95, y: 10 }}
						initial={{ opacity: 0, scale: 0.95, y: 10 }}
						onPointerDown={(e) => e.stopPropagation()}
						style={{
							backgroundColor: theme.elevation[4], // App bar elevation
							border: `1px solid ${theme.borders.default}`,
							backdropFilter: theme.effects.glassmorphism,
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
						}}
						transition={{ 
							duration: 0.2, 
							type: 'spring', 
							stiffness: 300,
							damping: 25,
						}}
					>
						{children}
						{readOnly && (
							<>
								<div
									className="w-[1px] h-8 mx-1"
									style={{ backgroundColor: theme.borders.default }}
								/>
								<div
									className="flex items-center justify-center h-8 w-8"
									title="View only"
								>
									<Lock
										className="w-3.5 h-3.5"
										style={{ color: theme.text.disabled }}
									/>
								</div>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</NodeToolbar>
	);
};

export default SharedNodeToolbar;