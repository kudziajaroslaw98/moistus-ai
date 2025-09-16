'use client';

import { cn } from '@/lib/utils';
import type { AvailableNodeTypes } from '@/types/available-node-types';
import {
	Check,
	CheckSquare,
	Code,
	HelpCircle,
	Image,
	Link,
	MessageSquare,
	Settings,
	Sparkles,
	Type,
	X,
} from 'lucide-react';
import { motion } from 'motion/react';

import useAppStore from '@/store/mind-map-store';
import type { SuggestionContext } from '@/types/ghost-node';
import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';
import { 
	isGhostNode, 
	validateGhostMetadata, 
	type TypedNodeProps 
} from './core/types';

type GhostNodeProps = TypedNodeProps<'ghostNode'>;

const getNodeTypeColor = (nodeType: AvailableNodeTypes) => {
	// Use theme-consistent colors with glassmorphism approach
	const colorMap = {
		textNode: 'rgba(96, 165, 250, 0.1)', // Blue
		imageNode: 'rgba(168, 85, 247, 0.1)', // Purple  
		resourceNode: 'rgba(34, 197, 94, 0.1)', // Green
		questionNode: 'rgba(251, 191, 36, 0.1)', // Yellow
		annotationNode: 'rgba(249, 115, 22, 0.1)', // Orange
		codeNode: 'rgba(156, 163, 175, 0.1)', // Gray
		taskNode: 'rgba(239, 68, 68, 0.1)', // Red
		builderNode: 'rgba(99, 102, 241, 0.1)', // Indigo
		default: GlassmorphismTheme.ghost.background,
	};
	
	return colorMap[nodeType] || colorMap.default;
};

const getNodeTypeIcon = (nodeType: AvailableNodeTypes) => {
	switch (nodeType) {
		case 'textNode':
			return <Type className='h-3 w-3' />;
		case 'imageNode':
			return <Image className='h-3 w-3' />;
		case 'resourceNode':
			return <Link className='h-3 w-3' />;
		case 'questionNode':
			return <HelpCircle className='h-3 w-3' />;
		case 'annotationNode':
			return <MessageSquare className='h-3 w-3' />;
		case 'codeNode':
			return <Code className='h-3 w-3' />;
		case 'taskNode':
			return <CheckSquare className='h-3 w-3' />;
		case 'builderNode':
			return <Settings className='h-3 w-3' />;
		default:
			return <Sparkles className='h-3 w-3' />;
	}
};

function GhostNodeComponent(props: GhostNodeProps) {
	const { id, data } = props;
	const { acceptSuggestion, rejectSuggestion } = useAppStore(
		useShallow((state) => ({
			acceptSuggestion: state.acceptSuggestion,
			rejectSuggestion: state.rejectSuggestion,
		}))
	);

	const onAccept = useCallback(() => {
		acceptSuggestion(id);
	}, [id, acceptSuggestion]);

	const onReject = useCallback(() => {
		rejectSuggestion(id);
	}, [id, rejectSuggestion]);

	// Use centralized validation
	if (!validateGhostMetadata(data.metadata)) {
		return null;
	}

	const { suggestedContent, suggestedType, confidence, context } = data.metadata;

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
		minWidth: '200px',
		maxWidth: '300px',
		zIndex: 1000,
	};

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName="ghost-node"
			nodeType="AI Suggestion"
			nodeIcon={<Sparkles className="size-4" />}
			hideNodeType={true}
			elevation={2}
			includePadding={false}
		>
			<motion.div
				key={id}
				variants={GlassmorphismTheme.ghost.animation}
				initial="initial"
				animate="animate"
				exit="exit"
				className={cn(
					'rounded-lg p-3 cursor-pointer select-none shadow-lg'
				)}
				style={ghostStyles}
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
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={(e) => {
							e.stopPropagation();
							onAccept();
						}}
						className='flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors duration-200'
						style={{
							backgroundColor: GlassmorphismTheme.ghost.actions.accept.background,
							color: GlassmorphismTheme.ghost.actions.accept.text,
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = 
								GlassmorphismTheme.ghost.actions.accept.hover;
						}}
						onMouseLeave={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = 
								GlassmorphismTheme.ghost.actions.accept.background;
						}}
						aria-label={`Accept suggestion: ${suggestedContent.substring(0, 50)}...`}
					>
						<Check className='h-3 w-3' />
						Accept
					</motion.button>

					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={(e) => {
							e.stopPropagation();
							onReject();
						}}
						className='flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors duration-200'
						style={{
							backgroundColor: GlassmorphismTheme.ghost.actions.reject.background,
							color: GlassmorphismTheme.ghost.actions.reject.text,
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = 
								GlassmorphismTheme.ghost.actions.reject.hover;
						}}
						onMouseLeave={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = 
								GlassmorphismTheme.ghost.actions.reject.background;
						}}
						aria-label={`Reject suggestion: ${suggestedContent.substring(0, 50)}...`}
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
