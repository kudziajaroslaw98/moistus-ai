'use client';

import { getBranchIndex, type BranchSide } from '@/helpers/collapse/branch-index';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { ChevronUp } from 'lucide-react';
import { memo } from 'react';

/** Where a round control sits on the node border, just outside the card. */
const BRANCH_SIDE_POSITION: Record<BranchSide, string> = {
	bottom: 'left-1/2 top-full -translate-x-1/2 mt-3',
	top: 'left-1/2 bottom-full -translate-x-1/2 mb-3',
	right: 'top-1/2 left-full -translate-y-1/2 ml-3',
	left: 'top-1/2 right-full -translate-y-1/2 mr-3',
};

/** Rotation that makes an "up" chevron point back into the node. */
const COLLAPSE_ROTATION: Record<BranchSide, string> = {
	bottom: 'rotate-0',
	top: 'rotate-180',
	right: '-rotate-90',
	left: 'rotate-90',
};

interface BranchToggleProps {
	nodeId: string;
	isSelected: boolean;
}

/**
 * Collapse control sitting on the outgoing side of the node, where its children
 * leave. Visible on hover (pointer devices) or when the node is selected.
 * Expanded nodes only — a collapsed node shows the "N nodes hidden" pill instead.
 */
const BranchToggleComponent = ({ nodeId, isSelected }: BranchToggleProps) => {
	const childCount = useAppStore(
		(state) => getBranchIndex(state.nodes, state.edges).childIdsById.get(nodeId)?.length ?? 0
	);
	const side = useAppStore(
		(state) =>
			getBranchIndex(state.nodes, state.edges).childSideById.get(nodeId) ?? 'bottom'
	);
	const isCollapsed = useAppStore((state) =>
		Boolean(
			state.nodes.find((node) => node.id === nodeId)?.data.metadata?.isCollapsed
		)
	);
	const setNodesCollapsed = useAppStore((state) => state.setNodesCollapsed);

	if (childCount === 0 || isCollapsed) return null;

	const label = `Collapse branch (${childCount} ${childCount === 1 ? 'child' : 'children'})`;

	return (
		<button
			aria-label={label}
			data-testid='branch-toggle'
			title={label}
			type='button'
			onClick={(event) => {
				event.stopPropagation();
				setNodesCollapsed([nodeId], true);
			}}
			className={cn(
				'nodrag nopan absolute z-20 flex size-6 items-center justify-center rounded-full',
				'border border-border-strong bg-elevated text-text-secondary shadow-sm',
				'transition-[opacity,transform,color,border-color] duration-200 ease-out',
				'hover:scale-110 hover:border-interactive-primary hover:text-text-primary',
				'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary',
				'motion-reduce:transition-none motion-reduce:hover:scale-100',
				BRANCH_SIDE_POSITION[side],
				isSelected
					? 'opacity-100'
					: 'pointer-events-none opacity-0 group-hover/node:pointer-events-auto group-hover/node:opacity-100'
			)}
		>
			<ChevronUp className={cn('size-3.5', COLLAPSE_ROTATION[side])} />
		</button>
	);
};

const BranchToggle = memo(BranchToggleComponent);
BranchToggle.displayName = 'BranchToggle';
export default BranchToggle;
