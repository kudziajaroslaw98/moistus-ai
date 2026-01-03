'use client';

import { UniversalMetadataBar } from '@/components/nodes/shared/universal-metadata-bar';
import {
	getElevationColor,
	GlassmorphismTheme,
} from '@/components/nodes/themes/glassmorphism-theme';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { CSSProperties, memo, ReactNode } from 'react';

interface PreviewNodeFrameProps {
	children: ReactNode;
	nodeType: string;
	nodeData: NodeData;
	className?: string;
	includePadding?: boolean;
	elevation?: number;
	accentColor?: string;
}

/**
 * Preview Node Frame
 *
 * Mirrors the visual appearance of BaseNodeWrapper without:
 * - React Flow dependencies (Handle, NodeResizer, useConnection)
 * - Zustand store dependencies
 * - Interactive elements (collapse, group, add, suggestions buttons)
 * - Avatar stack for collaboration
 *
 * This provides a pixel-perfect preview of how the node will look on canvas.
 */
const PreviewNodeFrameComponent = ({
	children,
	nodeType,
	nodeData,
	className,
	includePadding = true,
	elevation = 1,
	accentColor,
}: PreviewNodeFrameProps) => {
	const theme = GlassmorphismTheme;

	// User-defined accent color takes precedence
	const userAccentColor = nodeData.metadata?.accentColor as string | undefined;
	const finalAccentColor = userAccentColor || accentColor;

	// Dynamic styles matching BaseNodeWrapper (lines 155-162)
	const nodeStyles: CSSProperties = {
		backgroundColor: getElevationColor(elevation),
		border: `1px solid ${theme.borders.default}`,
	};

	// Accent color system - subtle and sophisticated
	const accentStyles: CSSProperties = finalAccentColor
		? {
				borderTop: `2px solid ${finalAccentColor}`,
				borderTopLeftRadius: '8px',
				borderTopRightRadius: '8px',
			}
		: {};

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.2, ease: 'easeOut' as const }}
		>
			<motion.div
				className={cn(
					'flex-col rounded-lg gap-4 w-full',
					// Match BaseNodeWrapper styling (line 176-180)
					'bg-base bg-[url("/images/groovepaper.png")] bg-repeat bg-blend-color-burn',
					includePadding ? 'p-4' : 'p-0',
					className
				)}
				style={{
					...nodeStyles,
					...accentStyles,
				}}
			>
				{/* Metadata bar - exactly like canvas */}
				{nodeData.metadata &&
					Object.values(nodeData.metadata).some(
						(value) => value !== undefined && value !== null && value !== ''
					) && (
						<UniversalMetadataBar
							className={cn([includePadding ? 'p-0 pb-4' : 'p-4'])}
							metadata={nodeData.metadata}
							nodeType={nodeType}
							selected={false}
						/>
					)}

				{/* Main content */}
				<div className={cn('flex flex-col h-auto relative z-[1]')}>
					{children}
				</div>
			</motion.div>
		</motion.div>
	);
};

export const PreviewNodeFrame = memo(PreviewNodeFrameComponent);
PreviewNodeFrame.displayName = 'PreviewNodeFrame';
