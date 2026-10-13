'use client';

import { getBranchIndex } from '@/helpers/collapse/branch-index';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { memo } from 'react';

interface BranchSummaryProps {
	nodeId: string;
	/** Add inner padding when the card itself has none (p-0 node layouts). */
	inset?: boolean;
}

/**
 * Roll-up shown only while a node is collapsed: header nodes become a summary of
 * everything below them.
 * - Bar: tasks done across the whole branch (not just this node)
 * - Chip: nodes inside whose status is not done (draft / in-progress / on-hold)
 * - Dot: something critical (red) or a warning (amber) inside
 */
const BranchSummaryComponent = ({ nodeId, inset = false }: BranchSummaryProps) => {
	const summary = useAppStore(
		(state) => getBranchIndex(state.nodes, state.edges).summaries.get(nodeId)
	);
	if (!summary) return null;

	const { tasks, pendingStatusCount, severity } = summary;
	const percent = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
	const isDone = tasks.total > 0 && tasks.done === tasks.total;

	if (tasks.total === 0 && pendingStatusCount === 0 && !severity) return null;

	return (
		<>
			{severity && (
				<span
					aria-label={severity === 'critical' ? 'Something critical inside' : 'Warning inside'}
					data-testid='branch-severity-dot'
					role='img'
					title={severity === 'critical' ? 'Something critical inside' : 'Warning inside'}
					className={cn(
						'absolute right-3 top-3 z-10 size-2 rounded-full',
						severity === 'critical'
							? 'bg-error-400 shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-error-400)_25%,transparent)]'
							: 'bg-warning-400 shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-warning-400)_25%,transparent)]'
					)}
				/>
			)}

			{(tasks.total > 0 || pendingStatusCount > 0) && (
				<div
					className={cn('flex flex-col gap-2 pt-3', inset && 'px-4 pb-3')}
					data-testid='branch-summary'
				>
					{tasks.total > 0 && (
						<div className='flex items-center gap-3'>
							<div
								aria-label={`Branch tasks ${tasks.done} of ${tasks.total} done`}
								aria-valuemax={tasks.total}
								aria-valuemin={0}
								aria-valuenow={tasks.done}
								className='h-1 flex-1 overflow-hidden rounded-full bg-white/10'
								role='progressbar'
							>
								<div
									style={{ width: `${percent}%` }}
									className={cn(
										'h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none',
										isDone ? 'bg-success-400' : 'bg-interactive-primary'
									)}
								/>
							</div>

							<span
								className={cn(
									'text-xs tabular-nums',
									isDone ? 'text-success-400' : 'text-text-secondary'
								)}
							>
								{`${tasks.done} / ${tasks.total}`}
							</span>
						</div>
					)}

					{pendingStatusCount > 0 && (
						<span className='w-fit rounded-full border border-warning-500/40 bg-warning-500/10 px-2 py-0.5 text-[11px] font-medium text-warning-300'>
							{pendingStatusCount} pending
						</span>
					)}
				</div>
			)}
		</>
	);
};

const BranchSummary = memo(BranchSummaryComponent);
BranchSummary.displayName = 'BranchSummary';
export default BranchSummary;
