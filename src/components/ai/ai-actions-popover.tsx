'use client';

import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Link2, Loader2, Merge, NotepadTextDashed, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback } from 'react';
import { toast } from 'sonner';
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
 * - Node selection (scope='node'): Shows all 4 actions scoped to that node
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
		generateCounterpointsForNode,
		isStreaming,
		setPopoverOpen,
	} = useAppStore(
		useShallow((state) => ({
			generateSuggestions: state.generateSuggestions,
			generateConnectionSuggestions: state.generateConnectionSuggestions,
			generateMergeSuggestions: state.generateMergeSuggestions,
			generateCounterpointsForNode: state.generateCounterpointsForNode,
			isStreaming: state.isStreaming,
			setPopoverOpen: state.setPopoverOpen,
		}))
	);

	const { isAtLimit } = useSubscriptionLimits();

	/** Check AI limit and show toast if at limit. Returns true if blocked. */
	const checkAILimit = useCallback(() => {
		if (isAtLimit('aiSuggestions')) {
			toast.error('AI feature limit reached', {
				description: 'Upgrade to Pro for unlimited AI features.',
				action: {
					label: 'Upgrade',
					onClick: () => setPopoverOpen({ upgradeUser: true }),
				},
				duration: 8000,
			});
			onClose();
			return true;
		}
		return false;
	}, [isAtLimit, setPopoverOpen, onClose]);

	const handleExpandIdeas = useCallback(() => {
		if (!sourceNodeId) return;
		if (checkAILimit()) return;
		generateSuggestions({
			sourceNodeId,
			trigger: 'magic-wand',
		});
		onClose();
	}, [sourceNodeId, checkAILimit, generateSuggestions, onClose]);

	const handleFindConnections = useCallback(() => {
		if (checkAILimit()) return;
		generateConnectionSuggestions(sourceNodeId);
		onClose();
	}, [checkAILimit, sourceNodeId, generateConnectionSuggestions, onClose]);

	const handleFindSimilar = useCallback(() => {
		if (checkAILimit()) return;
		generateMergeSuggestions(sourceNodeId);
		onClose();
	}, [checkAILimit, sourceNodeId, generateMergeSuggestions, onClose]);

	const handleGenerateCounterpoints = useCallback(() => {
		if (!sourceNodeId) return;
		if (checkAILimit()) return;
		generateCounterpointsForNode(sourceNodeId);
		onClose();
	}, [sourceNodeId, checkAILimit, generateCounterpointsForNode, onClose]);

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
			id: 'generate-counterpoints',
			label: 'Generate counterpoints',
			icon: <NotepadTextDashed className="size-4" />,
			description: 'Challenge this idea with opposing views',
			scopes: ['node'],
			action: handleGenerateCounterpoints,
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
				'bg-elevated border border-border-default rounded-lg shadow-lg overflow-hidden min-w-[200px]',
				className
			)}
		>
			<div className="py-1">
				{visibleActions.map((action, index) => (
					<button
						type="button"
						key={action.id}
						onClick={action.action}
						disabled={isStreaming}
						className={cn(
							'group w-full px-3 py-2.5 flex items-center gap-3 text-left',
							'bg-transparent hover:bg-white/10 active:bg-white/15',
							'transition-all duration-200 ease',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							'focus:outline-none focus:bg-white/10'
						)}
					>
						<span className={cn(
							'text-text-secondary transition-colors duration-200',
							'group-hover:text-primary-400'
						)}>
							{isStreaming ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								action.icon
							)}
						</span>
						<div className="flex flex-col">
							<span className={cn(
								'text-sm font-medium text-text-primary transition-colors duration-200',
								'group-hover:text-white'
							)}>
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
