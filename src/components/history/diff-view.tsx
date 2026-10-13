'use client';

import {
	buildHistoryPresentation,
	type HistoryFocusTarget,
	type HistoryPresentation,
} from '@/helpers/history/presentation';
import type { HistoryDelta } from '@/types/history-state';
import { AlertCircle, Loader2, LocateFixed } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { ReadableChangeRow } from './readable-change-row';

interface DiffViewProps {
	delta: HistoryDelta | null;
	isLoading?: boolean;
	error?: string | null;
	onFocusTarget?: (target: HistoryFocusTarget) => void;
	presentation?: HistoryPresentation | null;
	/** Actions shown under the changes (focus / revert). */
	footer?: ReactNode;
}

const COLLAPSED_ROW_LIMIT = 6;

export function DiffView({
	delta,
	isLoading,
	error,
	onFocusTarget,
	presentation,
	footer,
}: DiffViewProps) {
	const [showAll, setShowAll] = useState(false);

	const friendlyPresentation = useMemo(
		() =>
			delta
				? (presentation ??
					buildHistoryPresentation(delta, { actionName: undefined }))
				: null,
		[delta, presentation]
	);

	let body: ReactNode;

	if (isLoading) {
		body = (
			<div className='flex items-center gap-2 px-3 py-3 text-[13px] text-white/55'>
				<Loader2 className='h-3.5 w-3.5 animate-spin' />
				Loading changes…
			</div>
		);
	} else if (error) {
		body = (
			<div className='flex items-start gap-2 px-3 py-3 text-[13px] text-rose-300'>
				<AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />

				<span>Couldn’t load changes. {error}</span>
			</div>
		);
	} else if (!friendlyPresentation) {
		body = (
			<div className='px-3 py-3 text-[13px] text-white/45'>
				No change details available
			</div>
		);
	} else {
		const subjects = friendlyPresentation.subjects.filter(
			(subject) => subject.changes.length > 0
		);
		const showSubjectHeaders = subjects.length > 1;
		const totalRows = subjects.reduce(
			(sum, subject) => sum + subject.changes.length,
			0
		);
		// Cap rows across subjects until "Show all" is pressed.
		let remaining = showAll ? Infinity : COLLAPSED_ROW_LIMIT;
		const visibleSubjects: Array<{
			subject: (typeof subjects)[number];
			visible: (typeof subjects)[number]['changes'];
		}> = [];
		for (const subject of subjects) {
			if (remaining <= 0) break;
			const visible = subject.changes.slice(0, remaining);
			remaining -= visible.length;
			visibleSubjects.push({ subject, visible });
		}

		body = (
			<>
				<div className='divide-y divide-white/[0.06]'>
					{visibleSubjects.map(({ subject, visible }) => {
						return (
							<div key={`${subject.type}:${subject.id}`}>
								{showSubjectHeaders && (
									<div className='flex items-center justify-between gap-2 bg-white/[0.02] px-3 py-1.5'>
										<span className='truncate text-[12px] font-medium text-white/70'>
											{subject.label}
										</span>

										{subject.focusTarget && onFocusTarget && (
											<button
												aria-label={`Focus ${subject.label}`}
												className='rounded p-1 text-white/45 transition-colors duration-200 ease hover:bg-white/[0.06] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
												type='button'
												onClick={() =>
													subject.focusTarget &&
													onFocusTarget(subject.focusTarget)
												}
											>
												<LocateFixed className='h-3.5 w-3.5' />
											</button>
										)}
									</div>
								)}

								<div className='divide-y divide-white/[0.04]'>
									{visible.map((change) => (
										<ReadableChangeRow change={change} key={change.id} />
									))}
								</div>
							</div>
						);
					})}
				</div>

				{!showAll && totalRows > COLLAPSED_ROW_LIMIT && (
					<button
						className='w-full border-t border-white/[0.06] px-3 py-2 text-left text-[12px] text-white/55 transition-colors duration-200 ease hover:bg-white/[0.03] hover:text-white/85'
						onClick={() => setShowAll(true)}
						type='button'
					>
						Show all {totalRows} changes
					</button>
				)}
			</>
		);
	}

	return (
		<div className='overflow-hidden rounded-lg border border-white/[0.08] bg-black/25'>
			{body}

			{footer && (
				<div className='flex items-center justify-between gap-2 border-t border-white/[0.06] px-2 py-2'>
					{footer}
				</div>
			)}
		</div>
	);
}
