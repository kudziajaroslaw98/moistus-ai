'use client';

import { cn } from '@/lib/utils';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import { NodeRegistry } from '@/registry/node-registry';
import { Check, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';

import useAppStore from '@/store/mind-map-store';
import { memo, useCallback, useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { BaseNodeWrapper } from './base-node-wrapper';
import { validateGhostMetadata, type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';
import { MoveRight } from 'lucide-react';

type GhostNodeProps = TypedNodeProps<'ghostNode'>;

const getNodeTypeColor = (nodeType: AvailableNodeTypes) => {
	// Use theme-consistent colors with glassmorphism approach
	const colorMap: Record<AvailableNodeTypes, string> = {
		textNode: 'rgba(96, 165, 250, 0.1)', // Blue
		imageNode: 'rgba(168, 85, 247, 0.1)', // Purple
		resourceNode: 'rgba(34, 197, 94, 0.1)', // Green
		questionNode: 'rgba(251, 191, 36, 0.1)', // Yellow
		annotationNode: 'rgba(249, 115, 22, 0.1)', // Orange
		codeNode: 'rgba(156, 163, 175, 0.1)', // Gray
		taskNode: 'rgba(239, 68, 68, 0.1)', // Red
		commentNode: 'rgba(147, 197, 253, 0.1)', // Light Blue
		defaultNode: GlassmorphismTheme.ghost.background,
		referenceNode: GlassmorphismTheme.ghost.background,
		groupNode: GlassmorphismTheme.ghost.background,
		ghostNode: GlassmorphismTheme.ghost.background,
	} as const;

	return colorMap[nodeType] || colorMap.defaultNode;
};

const getNodeTypeIcon = (nodeType: AvailableNodeTypes) => {
	const Icon = NodeRegistry.getDisplayInfo(nodeType).icon;
	return <Icon className='h-3 w-3' />;
};

function GhostNodeComponent(props: GhostNodeProps) {
	const { id, data } = props;
	const [shouldAnimate, setShouldAnimate] = useState(false);

	const { acceptSuggestion, rejectSuggestion, suggestionConfig, reactFlowInstance, getNode } = useAppStore(
		useShallow((state) => ({
			acceptSuggestion: state.acceptSuggestion,
			rejectSuggestion: state.rejectSuggestion,
			suggestionConfig: state.suggestionConfig,
			reactFlowInstance: state.reactFlowInstance,
			getNode: state.getNode,
		}))
	);

	const onAccept = useCallback(() => {
		acceptSuggestion(id);
	}, [id, acceptSuggestion]);

	const onReject = useCallback(() => {
		rejectSuggestion(id);
	}, [id, rejectSuggestion]);

	const handlePanToSource = useCallback(() => {
		if (!data.metadata?.context?.sourceNodeId || !reactFlowInstance) return;

		const sourceNode = getNode(data.metadata.context.sourceNodeId);
		if (sourceNode) {
			reactFlowInstance.setCenter(
				sourceNode.position.x + (sourceNode.width ?? 200) / 2,
				sourceNode.position.y + (sourceNode.height ?? 100) / 2,
				{
					zoom: 1.2,
					duration: 400,
				}
			);
		}
	}, [data.metadata?.context?.sourceNodeId, reactFlowInstance, getNode]);

	// Staged animation: delay node reveal until after edge animation completes
	useEffect(() => {
		// Check for reduced motion preference
		const prefersReducedMotion =
			typeof window !== 'undefined'
				? window.matchMedia('(prefers-reduced-motion: reduce)').matches
				: false;

		const delay =
			prefersReducedMotion && suggestionConfig.animation.respectReducedMotion
				? 0 // No delay if reduced motion
				: suggestionConfig.animation.edgeDuration +
					suggestionConfig.animation.overlap;

		const timer = setTimeout(() => {
			setShouldAnimate(true);
		}, delay);

		return () => clearTimeout(timer);
	}, [suggestionConfig]);

	// Use centralized validation
	if (!validateGhostMetadata(data.metadata)) {
		return null;
	}

	const { suggestedContent, suggestedType, confidence, context, sourceNodeName } =
		data.metadata;

	const backgroundColor = getNodeTypeColor(suggestedType);
	const nodeIcon = getNodeTypeIcon(suggestedType);

	// Use theme-based confidence colors
	const confidenceColor =
		confidence >= 0.8
			? GlassmorphismTheme.ghost.confidence.high
			: confidence >= 0.6
				? GlassmorphismTheme.ghost.confidence.medium
				: GlassmorphismTheme.ghost.confidence.low;

	// Create custom ghost node styles
	const ghostStyles: React.CSSProperties = {
		backgroundColor,
		border: `${GlassmorphismTheme.ghost.borderWidth} ${GlassmorphismTheme.ghost.borderStyle} ${GlassmorphismTheme.ghost.border}`,
		minWidth: '288px',
		maxWidth: '320px',
		zIndex: 1000,
	};

	// Custom animation variants using config
	const animationVariants = {
		initial: {
			opacity: 0,
			scale: 0.8,
			y: 20,
		},
		animate: {
			opacity: 1,
			scale: 1,
			y: 0,
		},
		exit: {
			opacity: 0,
			scale: 0.8,
			y: 20,
		},
	};

	// Check for reduced motion
	const prefersReducedMotion =
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;

	const transition = {
		duration:
			prefersReducedMotion && suggestionConfig.animation.respectReducedMotion
				? 0.01
				: suggestionConfig.animation.nodeDuration / 1000, // Convert to seconds
		ease: suggestionConfig.animation.easing.node,
	};

	return (
		<BaseNodeWrapper
			{...props}
			elevation={2}
			hideNodeType={true}
			includePadding={false}
			nodeClassName='ghost-node'
			nodeIcon={<Sparkles className='size-4' />}
			nodeType='AI Suggestion'
		>
			<motion.div
				animate={shouldAnimate ? 'animate' : 'initial'}
				className={cn('rounded-lg p-3 cursor-pointer select-none shadow-lg')}
				exit='exit'
				initial='initial'
				key={id}
				style={ghostStyles}
				transition={transition}
				variants={animationVariants}
			>
				{/* Header with AI indicator and confidence */}
				<div className='mb-2 flex items-center justify-between'>
					<div className='flex items-center gap-1.5'>
						{nodeIcon}

						<span
							className='text-xs font-medium'
							style={{ color: GlassmorphismTheme.text.medium }}
						>
							AI Suggestion
						</span>
					</div>

					<div
						className='text-xs font-medium'
						style={{ color: confidenceColor }}
					>
						{Math.round(confidence * 100)}%
					</div>
				</div>

				{/* Suggested content */}
				<div
					className='mb-3 text-sm line-clamp-3 hover:line-clamp-none'
					style={{ color: GlassmorphismTheme.text.high }}
				>
					{suggestedContent}
				</div>

				{/* Node type indicator */}
				<div
					className='mb-3 text-xs'
					style={{ color: GlassmorphismTheme.text.disabled }}
				>
					Type: {suggestedType}
				</div>

				{/* Source node information */}
				{sourceNodeName && context?.sourceNodeId && (
					<div className='mb-3'>
						<motion.button
							className='flex items-center gap-1.5 text-xs rounded px-2 py-1 transition-colors duration-200 w-full text-left'
							style={{
								backgroundColor: 'rgba(168, 85, 247, 0.1)',
								color: GlassmorphismTheme.text.medium,
								border: `1px solid rgba(168, 85, 247, 0.2)`,
							}}
							title={`Pan to source node: ${sourceNodeName}`}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={(e) => {
								e.stopPropagation();
								handlePanToSource();
							}}
							onMouseEnter={(e) => {
								(e.target as HTMLButtonElement).style.backgroundColor =
									'rgba(168, 85, 247, 0.15)';
							}}
							onMouseLeave={(e) => {
								(e.target as HTMLButtonElement).style.backgroundColor =
									'rgba(168, 85, 247, 0.1)';
							}}
						>
							<Sparkles className='h-3 w-3' style={{ color: 'rgba(168, 85, 247, 0.8)' }} />
							<span className='flex-1 truncate'>Suggested from: {sourceNodeName}</span>
							<MoveRight className='h-3 w-3' style={{ color: 'rgba(168, 85, 247, 0.6)' }} />
						</motion.button>
					</div>
				)}

				{/* Context information */}
				{context && (
					<div
						className='mb-3 text-xs'
						style={{ color: GlassmorphismTheme.text.disabled }}
					>
						Trigger: {context.trigger}
						{context.relationshipType && (
							<span className='ml-2'>→ {context.relationshipType}</span>
						)}
					</div>
				)}

				{/* Action buttons */}
				<div className='flex gap-2'>
					<motion.button
						aria-label={`Accept suggestion: ${suggestedContent.substring(0, 50)}...`}
						className='flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors duration-200'
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						style={{
							backgroundColor:
								GlassmorphismTheme.ghost.actions.accept.background,
							color: GlassmorphismTheme.ghost.actions.accept.text,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onAccept();
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor =
								GlassmorphismTheme.ghost.actions.accept.hover;
						}}
						onMouseLeave={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor =
								GlassmorphismTheme.ghost.actions.accept.background;
						}}
					>
						<Check className='h-3 w-3' />
						Accept
					</motion.button>

					<motion.button
						aria-label={`Reject suggestion: ${suggestedContent.substring(0, 50)}...`}
						className='flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors duration-200'
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						style={{
							backgroundColor:
								GlassmorphismTheme.ghost.actions.reject.background,
							color: GlassmorphismTheme.ghost.actions.reject.text,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onReject();
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor =
								GlassmorphismTheme.ghost.actions.reject.hover;
						}}
						onMouseLeave={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor =
								GlassmorphismTheme.ghost.actions.reject.background;
						}}
					>
						<X className='h-3 w-3' />
						Reject
					</motion.button>
				</div>
			</motion.div>
		</BaseNodeWrapper>
	);
}

export const GhostNode = memo(GhostNodeComponent);
GhostNode.displayName = 'GhostNode';
