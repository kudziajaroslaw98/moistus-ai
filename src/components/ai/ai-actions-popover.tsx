'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Link2, Loader2, Merge, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

export interface AIActionsPopoverProps {
	/** Whether actions are scoped to a single node or the entire map */
	scope: 'node' | 'map';
	/** The source node ID when scope is 'node' */
	sourceNodeId?: string;
	/** Callback when the popover should close */
	onClose: () => void;
	/** Optional className for the container */
	className?: string;
}

interface ActionItem {
	id: string;
	label: string;
	icon: React.ReactNode;
	description: string;
	/** Only show this action for certain scopes */
	scopes: ('node' | 'map')[];
	action: () => void;
}

/**
 * AIActionsPopover - Shared popover menu for AI actions
 *
 * Used on:
 * - Node selection (scope='node'): Shows all 3 actions scoped to that node
 * - Toolbar (scope='map'): Shows only Find connections and Find similar for entire map
 */
export function AIActionsPopover({
	scope,
	sourceNodeId,
	onClose,
	className,
}: AIActionsPopoverProps) {
	const {
		generateSuggestions,
		generateConnectionSuggestions,
		generateMergeSuggestions,
		isStreaming,
	} = useAppStore(
		useShallow((state) => ({
			generateSuggestions: state.generateSuggestions,
			generateConnectionSuggestions: state.generateConnectionSuggestions,
			generateMergeSuggestions: state.generateMergeSuggestions,
			isStreaming: state.isStreaming,
		}))
	);

	const handleExpandIdeas = useCallback(() => {
		if (!sourceNodeId) return;
		generateSuggestions({
			sourceNodeId,
			trigger: 'magic-wand',
		});
		onClose();
	}, [sourceNodeId, generateSuggestions, onClose]);

	const handleFindConnections = useCallback(() => {
		generateConnectionSuggestions(sourceNodeId);
		onClose();
	}, [sourceNodeId, generateConnectionSuggestions, onClose]);

	const handleFindSimilar = useCallback(() => {
		generateMergeSuggestions(sourceNodeId);
		onClose();
	}, [sourceNodeId, generateMergeSuggestions, onClose]);

	const actions: ActionItem[] = [
		{
			id: 'expand-ideas',
			label: 'Expand ideas',
			icon: <Sparkles className="size-4" />,
			description: 'Generate child nodes from this idea',
			scopes: ['node'],
			action: handleExpandIdeas,
		},
		{
			id: 'find-connections',
			label: 'Find connections',
			icon: <Link2 className="size-4" />,
			description: scope === 'node' ? 'Find relationships for this node' : 'Discover connections across the map',
			scopes: ['node', 'map'],
			action: handleFindConnections,
		},
		{
			id: 'find-similar',
			label: 'Find similar',
			icon: <Merge className="size-4" />,
			description: scope === 'node' ? 'Find duplicates or overlapping nodes' : 'Find mergeable nodes across the map',
			scopes: ['node', 'map'],
			action: handleFindSimilar,
		},
	];

	// Filter actions based on scope
	const visibleActions = actions.filter((action) => action.scopes.includes(scope));

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.15, type: 'spring', stiffness: 500, damping: 30 }}
			className={cn(
				'bg-overlay border border-border-default rounded-lg shadow-lg overflow-hidden min-w-[200px]',
				className
			)}
		>
			<div className="py-1">
				{visibleActions.map((action, index) => (
					<button
						key={action.id}
						onClick={action.action}
						disabled={isStreaming}
						className={cn(
							'w-full px-3 py-2 flex items-center gap-3 text-left',
							'hover:bg-surface-hover transition-colors duration-150',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							'focus:outline-none focus:bg-surface-hover'
						)}
					>
						<span className="text-text-secondary">
							{isStreaming ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								action.icon
							)}
						</span>
						<div className="flex flex-col">
							<span className="text-sm font-medium text-text-primary">
								{action.label}
							</span>
							<span className="text-xs text-text-tertiary">
								{action.description}
							</span>
						</div>
					</button>
				))}
			</div>
		</motion.div>
	);
}
