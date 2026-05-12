'use client';

import {
	buildHistoryPresentation,
	type HistoryFocusTarget,
	type HistoryPresentation,
	type HistoryPresentationSubject,
	type HistoryReadableChange,
} from '@/helpers/history/presentation';
import { HistoryDelta } from '@/types/history-state';
import { cn } from '@/utils/cn';
import { AlertCircle, ChevronDown, Loader2, LocateFixed } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ReadableChangeRow } from './readable-change-row';

interface DiffViewProps {
	delta: HistoryDelta | null;
	isLoading?: boolean;
	error?: string | null;
	onFocusTarget?: (target: HistoryFocusTarget) => void;
	presentation?: HistoryPresentation | null;
}

interface ChangeRow {
	subject: HistoryPresentationSubject;
	change: HistoryReadableChange;
}

export function DiffView({
	delta,
	isLoading,
	error,
	onFocusTarget,
	presentation,
}: DiffViewProps) {
	const [showAllAffected, setShowAllAffected] = useState(false);
	const [showAllChanges, setShowAllChanges] = useState(false);

	const friendlyPresentation = useMemo(
		() =>
			delta
				? (presentation ??
					buildHistoryPresentation(delta, { actionName: undefined }))
				: null,
		[delta, presentation]
	);
	const subjects = friendlyPresentation?.subjects ?? [];
	const changeRows = useMemo<ChangeRow[]>(
		() =>
			subjects.flatMap((subject) =>
				subject.changes.map((change) => ({ subject, change }))
			),
		[subjects]
	);

	// Loading state
	if (isLoading) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='flex items-center justify-center gap-2 py-4'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				<Loader2 className='h-4 w-4 animate-spin text-white/60' />

				<span className='text-sm text-white/60'>Loading changes...</span>
			</motion.div>
		);
	}

	// Error state
	if (error) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-3'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				<AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-red-400' />

				<div className='flex flex-col gap-1'>
					<span className='text-sm font-medium text-red-400'>
						Failed to load changes
					</span>

					<span className='text-xs text-red-400/80'>{error}</span>
				</div>
			</motion.div>
		);
	}

	// No delta
	if (!delta) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='py-4 text-center text-sm text-white/38'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				No change details available
			</motion.div>
		);
	}

	if (!friendlyPresentation) {
		return null;
	}

	const showAffectedPills = subjects.length >= 2 && subjects.length <= 3;
	const showAffectedPanel = subjects.length >= 4;
	const affectedVisible = showAllAffected ? subjects : subjects.slice(0, 3);
	const affectedHiddenCount = Math.max(
		0,
		subjects.length - affectedVisible.length
	);

	const shouldCollapseChanges = changeRows.length >= 5;
	const shouldShowAllChanges =
		!shouldCollapseChanges || showAllChanges || changeRows.length <= 4;
	const visibleChangeRows = shouldShowAllChanges
		? changeRows
		: changeRows.slice(0, 2);
	const hiddenChangeCount = Math.max(
		0,
		changeRows.length - visibleChangeRows.length
	);

	return (
		<motion.div
			animate={{ opacity: 1, height: 'auto' }}
			className='flex max-h-[34rem] flex-col gap-3 overflow-y-auto pt-3'
			exit={{ opacity: 0, height: 0 }}
			initial={{ opacity: 0, height: 0 }}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
		>
			{showAffectedPills && (
				<div className='flex flex-wrap gap-2'>
					{subjects.map((subject) => (
						<button
							className='inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-white/[0.05] px-3 text-[12px] text-white/78 transition-colors hover:bg-white/[0.1]'
							key={`${subject.type}:${subject.id}`}
							onClick={(event) => {
								event.stopPropagation();
								if (subject.focusTarget && onFocusTarget) {
									onFocusTarget(subject.focusTarget);
								}
							}}
							type='button'
						>
							<span className='truncate'>{subject.label}</span>
							<LocateFixed className='h-3 w-3 shrink-0 text-white/55' />
						</button>
					))}
				</div>
			)}

			{showAffectedPanel && (
				<div className='rounded-lg border border-white/10 bg-[#171717] p-3'>
					<button
						className='flex w-full items-center justify-between gap-2 text-left'
						onClick={(event) => {
							event.stopPropagation();
							setShowAllAffected((current) => !current);
						}}
						type='button'
					>
						<span className='text-[12px] font-medium text-white/78'>
							Affected items
						</span>

						<span className='inline-flex items-center gap-1 text-[12px] text-white/58'>
							{showAllAffected
								? 'Collapse'
								: `Show all ${subjects.length} ${allNodes(subjects) ? 'nodes' : 'items'}`}
							<ChevronDown
								className={cn(
									'h-3.5 w-3.5 transition-transform',
									showAllAffected && 'rotate-180'
								)}
							/>
						</span>
					</button>

					<div className='mt-2 flex flex-col gap-1.5'>
						{affectedVisible.map((subject) => (
							<div
								className='flex items-center justify-between gap-2 rounded-md border border-white/[0.07] bg-black/20 px-2.5 py-2'
								key={`${subject.type}:${subject.id}`}
							>
								<div className='min-w-0'>
									<div className='truncate text-[12px] font-medium text-white/88'>
										{subject.label}
									</div>
									<div className='truncate text-[11px] text-white/50'>
										{subject.description}
									</div>
								</div>

								<Button
									aria-label={`Focus ${subject.label}`}
									className='h-6 shrink-0 gap-1 border-white/12 bg-white/6 px-2 text-[11px] text-white/74 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200'
									disabled={!subject.focusTarget || !onFocusTarget}
									onClick={(event) => {
										event.stopPropagation();
										if (subject.focusTarget)
											onFocusTarget?.(subject.focusTarget);
									}}
									size='sm'
									type='button'
									variant='outline'
								>
									<LocateFixed className='h-3 w-3' />
									Focus
								</Button>
							</div>
						))}

						{!showAllAffected && affectedHiddenCount > 0 && (
							<div className='px-1 text-[11px] text-white/52'>
								+{affectedHiddenCount} more
							</div>
						)}
					</div>
				</div>
			)}

			<div className='text-[12px] font-medium text-white/78'>Changes</div>

			<div className='flex flex-col gap-2'>
				{visibleChangeRows.map((row, index) => (
					<ReadableChangeRow
						change={row.change}
						isCompact={changeRows.length <= 2}
						key={`${row.subject.id}:${row.change.id}:${index}`}
						showSubjectPrefix={subjects.length > 1}
						subjectLabel={row.subject.label}
					/>
				))}
			</div>

			{shouldCollapseChanges && hiddenChangeCount > 0 && (
				<button
					className='mt-1 rounded px-1 py-1 text-[12px] text-white/54 transition-colors hover:bg-white/[0.04] hover:text-white/78'
					onClick={(event) => {
						event.stopPropagation();
						setShowAllChanges(true);
					}}
					type='button'
				>
					Show all {changeRows.length} changes
				</button>
			)}
		</motion.div>
	);
}

function allNodes(subjects: HistoryPresentationSubject[]): boolean {
	return subjects.every((subject) => subject.type === 'node');
}
