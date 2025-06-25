'use client';

import { cn } from '@/lib/utils';
import type { AvailableNodeTypes } from '@/types/available-node-types';
import { type Node, type NodeProps } from '@xyflow/react';
import { Check, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';

export interface SuggestionContext {
	sourceNodeId?: string;
	targetNodeId?: string;
	relationshipType?: string;
	trigger: 'magic-wand' | 'dangling-edge' | 'auto';
}

import useAppStore from '@/store/mind-map-store';
import type { NodeData } from '@/types/node-data';
import { useShallow } from 'zustand/shallow';

interface GhostNodeMetadata {
	suggestedContent: string;
	suggestedType: AvailableNodeTypes;
	confidence: number;
	context?: SuggestionContext;
}

type GhostNodeProps = NodeProps<Node<NodeData>>;

const ghostNodeVariants = {
	initial: {
		opacity: 0,
		scale: 0.8,
		y: 10,
	},
	animate: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: {
			type: 'spring',
			stiffness: 300,
			damping: 25,
			duration: 0.3,
		},
	},
	exit: {
		opacity: 0,
		scale: 0.9,
		transition: {
			duration: 0.2,
		},
	},
};

const getNodeTypeColor = (nodeType: AvailableNodeTypes) => {
	switch (nodeType) {
		case 'textNode':
			return 'border-blue-400/50 bg-blue-950';
		case 'imageNode':
			return 'border-purple-400/50 bg-purple-950';
		case 'resourceNode':
			return 'border-green-400/50 bg-green-950';
		case 'questionNode':
			return 'border-yellow-400/50 bg-yellow-950';
		case 'annotationNode':
			return 'border-orange-400/50 bg-orange-950';
		case 'codeNode':
			return 'border-gray-400/50 bg-gray-950';
		case 'taskNode':
			return 'border-red-400/50 bg-red-950';
		case 'builderNode':
			return 'border-indigo-400/50 bg-indigo-950';
		default:
			return 'border-zinc-400/50 bg-zinc-950';
	}
};

const getNodeTypeIcon = (nodeType: AvailableNodeTypes) => {
	// Return appropriate icon based on node type
	// For now, using Sparkles as default AI suggestion icon
	return <Sparkles className='h-3 w-3' />;
};

export function GhostNode({ id, data }: GhostNodeProps) {
	const ghostData = data.metadata as GhostNodeMetadata;

	const { suggestedContent, suggestedType, confidence, context } = ghostData;
	const { acceptSuggestion, rejectSuggestion } = useAppStore(
		useShallow((state) => ({
			acceptSuggestion: state.acceptSuggestion,
			rejectSuggestion: state.rejectSuggestion,
		}))
	);

	if (!ghostData) {
		return null;
	}

	const nodeColorClasses = getNodeTypeColor(suggestedType);
	const nodeIcon = getNodeTypeIcon(suggestedType);

	const confidenceColor =
		confidence >= 0.8
			? 'text-green-400'
			: confidence >= 0.6
				? 'text-yellow-400'
				: 'text-red-400';

	const onAccept = () => {
		acceptSuggestion(id);
	};

	const onReject = () => {
		rejectSuggestion(id);
	};

	return (
		<motion.div
			variants={ghostNodeVariants}
			initial='initial'
			animate={['animate']}
			exit='exit'
			className={cn(
				'z-[1000] min-w-[200px] max-w-[300px] rounded-lg border-2 border-dashed p-3',
				'shadow-lg ',
				'cursor-pointer select-none',
				nodeColorClasses
			)}
		>
			{/* Header with AI indicator and confidence */}
			<div className='mb-2 flex items-center justify-between'>
				<div className='flex items-center gap-1.5'>
					{nodeIcon}
					<span className='text-xs font-medium text-zinc-300'>
						AI Suggestion
					</span>
				</div>
				<div className={cn('text-xs font-medium', confidenceColor)}>
					{Math.round(confidence * 100)}%
				</div>
			</div>

			{/* Suggested content */}
			<div className='mb-3 text-sm text-zinc-200'>
				{suggestedContent.length > 100
					? `${suggestedContent.substring(0, 100)}...`
					: suggestedContent}
			</div>

			{/* Node type indicator */}
			<div className='mb-3 text-xs text-zinc-400'>Type: {suggestedType}</div>

			{/* Context information */}
			{context && (
				<div className='mb-3 text-xs text-zinc-500'>
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
					className={cn(
						'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
						'bg-green-600/80 text-green-100 hover:bg-green-600',
						'transition-colors duration-200'
					)}
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
					className={cn(
						'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
						'bg-red-600/80 text-red-100 hover:bg-red-600',
						'transition-colors duration-200'
					)}
				>
					<X className='h-3 w-3' />
					Reject
				</motion.button>
			</div>

			{/* Subtle glow effect */}
			<div className='absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-sm' />
		</motion.div>
	);
}
