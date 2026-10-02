'use client';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getBranchIndex, type BranchSide } from '@/helpers/collapse/branch-index';
import { useCoarsePointer } from '@/hooks/use-coarse-pointer';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { memo, useCallback, useState, type MouseEvent } from 'react';
import { useShallow } from 'zustand/shallow';
import { BranchPeek } from './branch-peek';
import { BRANCH_SIDE_POSITION } from './branch-toggle';

const PILL_POSITION: Record<BranchSide, string> = {
	...BRANCH_SIDE_POSITION,
	// Clear the stacked card edges that peek out below the node.
	bottom: 'left-1/2 top-full -translate-x-1/2 mt-5',
};

const POPUP_SIDE: Record<BranchSide, 'top' | 'right' | 'bottom' | 'left'> = {
	bottom: 'bottom',
	top: 'top',
	right: 'right',
	left: 'left',
};

interface CollapsedIndicatorProps {
	nodeId: string;
}

/**
 * Collapsed branch visuals: two card edges peek out under the node (a stack,
 * recognisable at any zoom) and a "N nodes hidden" pill on the outgoing side.
 *
 * Pointer devices: hover the pill to peek, click to expand one level,
 * Shift+click to expand everything. Touch devices: tap opens the peek, which
 * carries explicit Expand / Expand all actions.
 */
const CollapsedIndicatorComponent = ({ nodeId }: CollapsedIndicatorProps) => {
	const summary = useAppStore(
		(state) => getBranchIndex(state.nodes, state.edges).summaries.get(nodeId)
	);
	const side = useAppStore(
		(state) =>
			getBranchIndex(state.nodes, state.edges).childSideById.get(nodeId) ?? 'bottom'
	);
	const { expandBranch, expandPathTo, centerOnNode } = useAppStore(
		useShallow((state) => ({
			expandBranch: state.expandBranch,
			expandPathTo: state.expandPathTo,
			centerOnNode: state.centerOnNode,
		}))
	);
	const isCoarsePointer = useCoarsePointer();
	const reduceMotion = useReducedMotion();
	const [isPeekOpen, setIsPeekOpen] = useState(false);

	const handleExpandPath = useCallback(
		(targetId: string) => {
			setIsPeekOpen(false);
			expandPathTo(targetId);
			// Let React Flow mount the revealed node before centering on it.
			requestAnimationFrame(() => centerOnNode(targetId));
		},
		[centerOnNode, expandPathTo]
	);

	const handleExpand = useCallback(
		(options: { all: boolean }) => {
			setIsPeekOpen(false);
			expandBranch(nodeId, options);
		},
		[expandBranch, nodeId]
	);

	if (!summary) return null;

	const count = summary.hiddenIds.length;
	const label = `${count} ${count === 1 ? 'node' : 'nodes'} hidden`;

	const pill = (
		<span className='flex items-center gap-1.5'>
			<ChevronDown className='size-3.5' />

			<span className='tabular-nums'>{label}</span>
		</span>
	);
	const pillClassName = cn(
		'nodrag nopan absolute z-20 flex h-7 items-center whitespace-nowrap rounded-full px-3',
		'border border-border-strong bg-elevated text-xs font-medium text-text-primary shadow-md',
		'transition-[transform,border-color,background-color] duration-200 ease-out',
		'hover:border-interactive-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary',
		PILL_POSITION[side]
	);
	const peek = (
		<BranchPeek
			onExpand={isCoarsePointer ? handleExpand : undefined}
			onExpandPath={handleExpandPath}
			summary={summary}
		/>
	);

	return (
		<>
			{/* Stacked card edges peeking out underneath */}
			<motion.div
				aria-hidden
				animate={{ opacity: 1, y: 0 }}
				className='pointer-events-none absolute inset-x-2 top-full -z-10 h-2 -translate-y-1 rounded-b-lg border border-t-0 border-border-default bg-elevated/90'
				initial={reduceMotion ? false : { opacity: 0, y: -6 }}
				transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
			/>

			<motion.div
				aria-hidden
				animate={{ opacity: 1, y: 0 }}
				className='pointer-events-none absolute inset-x-4 top-full -z-20 h-2 translate-y-0.5 rounded-b-lg border border-t-0 border-border-subtle bg-surface/90'
				initial={reduceMotion ? false : { opacity: 0, y: -10 }}
				transition={{ type: 'spring', duration: 0.3, bounce: 0, delay: 0.03 }}
			/>

			{isCoarsePointer ? (
				<Popover onOpenChange={setIsPeekOpen} open={isPeekOpen}>
					<PopoverTrigger
						aria-label={`${label}. Show hidden nodes`}
						className={pillClassName}
						data-testid='collapsed-branch-pill'
					>
						{pill}
					</PopoverTrigger>

					<PopoverContent className='w-auto p-0' side={POPUP_SIDE[side]} sideOffset={8}>
						{peek}
					</PopoverContent>
				</Popover>
			) : (
				<HoverCard onOpenChange={setIsPeekOpen} open={isPeekOpen}>
					<HoverCardTrigger
						aria-label={`${label}. Click to expand, Shift+click to expand all`}
						className={pillClassName}
						closeDelay={150}
						data-testid='collapsed-branch-pill'
						delay={350}
						render={<button type='button' />}
						onClick={(event: MouseEvent) => {
							event.stopPropagation();
							handleExpand({ all: event.shiftKey });
						}}
					>
						{pill}
					</HoverCardTrigger>

					<HoverCardContent className='w-auto' side={POPUP_SIDE[side]} sideOffset={8}>
						{peek}
					</HoverCardContent>
				</HoverCard>
			)}
		</>
	);
};

const CollapsedIndicator = memo(CollapsedIndicatorComponent);
CollapsedIndicator.displayName = 'CollapsedIndicator';
export default CollapsedIndicator;
