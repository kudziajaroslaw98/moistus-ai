'use client';

import type { BranchSummary } from '@/helpers/collapse/branch-index';
import { cn } from '@/utils/cn';
import { ChevronRight } from 'lucide-react';

interface BranchPeekProps {
	summary: BranchSummary;
	onExpandPath: (nodeId: string) => void;
	/** Touch devices: explicit expand actions (no click-through on the pill). */
	onExpand?: (options: { all: boolean }) => void;
	matchIds?: ReadonlySet<string>;
}

/**
 * Overlay outline of a collapsed branch. Nothing on the canvas moves; clicking
 * a row opens the collapsed nodes on the way to it (their other children appear
 * too, since a node shows all or none of its children) and centers it.
 */
export function BranchPeek({ summary, onExpandPath, onExpand, matchIds }: BranchPeekProps) {
	const total = summary.hiddenIds.length;
	const remaining = total - summary.outline.length;

	return (
		<div className='flex max-h-[min(420px,60vh)] w-80 flex-col' data-testid='branch-peek'>
			<div className='flex items-center justify-between border-b border-border-subtle px-3 py-2'>
				<span className='text-xs font-medium text-text-primary'>
					{`${total} hidden ${total === 1 ? 'node' : 'nodes'}`}
				</span>

				{summary.tasks.total > 0 && (
					<span className='text-xs tabular-nums text-text-tertiary'>
						{`${summary.tasks.done} / ${summary.tasks.total}`}
					</span>
				)}
			</div>

			<ul className='min-h-0 flex-1 overflow-y-auto py-1' role='list'>
				{summary.outline.map((row) => (
					<li key={row.id}>
						<button
							onClick={() => onExpandPath(row.id)}
							style={{ paddingLeft: 12 + Math.min(row.depth, 6) * 14 }}
							type='button'
							className={cn(
								'group/row flex w-full items-start gap-2 py-1.5 pr-3 text-left',
								'transition-colors duration-200 ease-out hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none',
								matchIds?.has(row.id) && 'bg-warning-500/10'
							)}
						>
							<span className='mt-0.5 h-full w-px shrink-0 self-stretch bg-border-default' />

							<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
								{row.edgeLabel && (
									<span className='truncate text-[11px] text-text-tertiary'>
										{row.edgeLabel}
									</span>
								)}

								<span className='line-clamp-2 text-[13px] leading-snug text-text-primary'>
									{row.text}
								</span>

								{row.status && row.status !== 'completed' && (
									<span className='w-fit rounded-full bg-warning-500/15 px-1.5 py-px text-[10px] font-medium text-warning-300'>
										{row.status}
									</span>
								)}
							</span>

							<span className='flex shrink-0 items-center gap-1 pt-0.5 text-[11px] tabular-nums text-text-tertiary'>
								{row.tasks && `${row.tasks.done} / ${row.tasks.total}`}

								{row.isCollapsed && (
									<span className='rounded bg-white/5 px-1 text-[10px]'>collapsed</span>
								)}

								<ChevronRight className='size-3 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100' />
							</span>
						</button>
					</li>
				))}

				{remaining > 0 && (
					<li className='px-3 py-1.5 text-[11px] text-text-tertiary'>
						+{remaining} more
					</li>
				)}
			</ul>

			{onExpand ? (
				<div className='flex gap-2 border-t border-border-subtle p-2'>
					<button
						className='flex-1 rounded-md bg-interactive-primary px-3 py-2 text-xs font-medium text-primary-foreground'
						onClick={() => onExpand({ all: false })}
						type='button'
					>
						Expand
					</button>

					<button
						className='flex-1 rounded-md border border-border-default px-3 py-2 text-xs font-medium text-text-primary'
						onClick={() => onExpand({ all: true })}
						type='button'
					>
						Expand all
					</button>
				</div>
			) : (
				<div className='border-t border-border-subtle px-3 py-1.5 text-[11px] text-text-tertiary'>
					Click a row to open its branch and jump to it · Shift+click the pill to expand all
				</div>
			)}
		</div>
	);
}
