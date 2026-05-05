'use client';

import { formatDelta } from '@/helpers/history/diff-formatter';
import {
	buildHistoryPresentation,
	type HistoryFocusTarget,
	type HistoryPresentation,
	type HistoryPresentationSubject,
	type HistoryReadableChange,
} from '@/helpers/history/presentation';
import { HistoryDelta } from '@/types/history-state';
import { cn } from '@/utils/cn';
import {
	AlertCircle,
	ChevronDown,
	Code2,
	Loader2,
	LocateFixed,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ChangeItem } from './change-item';

interface DiffViewProps {
	delta: HistoryDelta | null;
	isLoading?: boolean;
	error?: string | null;
	onFocusTarget?: (target: HistoryFocusTarget) => void;
	presentation?: HistoryPresentation | null;
}

export function DiffView({
	delta,
	isLoading,
	error,
	onFocusTarget,
	presentation,
}: DiffViewProps) {
	const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
	const friendlyPresentation = useMemo(
		() =>
			delta
				? (presentation ??
					buildHistoryPresentation(delta, { actionName: undefined }))
				: null,
		[delta, presentation]
	);
	const formatted = useMemo(() => (delta ? formatDelta(delta) : null), [delta]);
	const groupedSubjects = useMemo(
		() =>
			friendlyPresentation
				? groupReadableSubjects(friendlyPresentation.subjects)
				: { moved: [], rerouted: [], other: [] },
		[friendlyPresentation]
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
				className='flex items-start gap-2 rounded p-3 bg-red-500/10 border border-red-500/30'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				<AlertCircle className='h-4 w-4 text-red-400 shrink-0 mt-0.5' />

				<div className='flex flex-col gap-1'>
					<span className='text-sm text-red-400 font-medium'>
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

	if (!friendlyPresentation || !formatted) {
		return null;
	}

	return (
		<motion.div
			animate={{ opacity: 1, height: 'auto' }}
			className='flex flex-col gap-3 pt-3 max-h-96 overflow-y-auto'
			exit={{ opacity: 0, height: 0 }}
			initial={{ opacity: 0, height: 0 }}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
		>
			<div className='rounded-md border border-white/6 bg-white/[0.03] px-3 py-2'>
				<p className='text-sm leading-5 text-white/87'>
					{friendlyPresentation.summary}
				</p>
			</div>

			<div className='flex flex-col gap-2 pb-1'>
				{groupedSubjects.moved.length > 0 && (
					<ReadableGroup
						description='Positions changed on the canvas'
						onFocusTarget={onFocusTarget}
						subjects={groupedSubjects.moved}
						title={`Moved ${groupedSubjects.moved.length} node${groupedSubjects.moved.length === 1 ? '' : 's'}`}
					/>
				)}

				{groupedSubjects.rerouted.length > 0 && (
					<ReadableGroup
						collapsedByDefault
						description='Connection lines were redrawn by layout'
						onFocusTarget={onFocusTarget}
						subjects={groupedSubjects.rerouted}
						title={`Rerouted ${groupedSubjects.rerouted.length} connection${groupedSubjects.rerouted.length === 1 ? '' : 's'}`}
					/>
				)}

				{groupedSubjects.other.map((subject) => (
					<ReadableSubject
						key={`${subject.type}-${subject.id}`}
						onFocusTarget={onFocusTarget}
						subject={subject}
					/>
				))}
			</div>

			<div className='border-t border-white/6 pt-2'>
				<button
					className='flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white/87'
					onClick={(event) => {
						event.stopPropagation();
						setShowTechnicalDetails((current) => !current);
					}}
					type='button'
				>
					<span className='inline-flex items-center gap-1.5'>
						<Code2 className='h-3.5 w-3.5' />
						Technical details
					</span>

					<ChevronDown
						className={cn(
							'h-3.5 w-3.5 transition-transform',
							showTechnicalDetails && 'rotate-180'
						)}
					/>
				</button>

				<AnimatePresence>
					{showTechnicalDetails && (
						<motion.div
							animate={{ opacity: 1, height: 'auto' }}
							className='mt-2 flex flex-col gap-2 overflow-hidden'
							exit={{ opacity: 0, height: 0 }}
							initial={{ opacity: 0, height: 0 }}
							transition={{
								ease: [0.215, 0.61, 0.355, 1],
								duration: 0.25,
							}}
						>
							<AnimatePresence mode='sync'>
								{formatted.changes.map((change, index) => (
									<ChangeItem
										details={change.details}
										entityType={change.entityType}
										index={index}
										key={`${change.operation}-${change.entityType}-${index}`}
										label={change.label}
										operation={change.operation}
										patches={change.patches}
									/>
								))}
							</AnimatePresence>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

function groupReadableSubjects(subjects: HistoryPresentationSubject[]) {
	const moved: HistoryPresentationSubject[] = [];
	const rerouted: HistoryPresentationSubject[] = [];
	const other: HistoryPresentationSubject[] = [];

	for (const subject of subjects) {
		const hasMove = subject.changes.some((change) => change.kind === 'move');
		const isRouteOnly =
			subject.changes.length > 0 &&
			subject.changes.every((change) => change.kind === 'route');

		if (subject.type === 'node' && hasMove) {
			moved.push(subject);
		} else if (subject.type === 'edge' && isRouteOnly) {
			rerouted.push(subject);
		} else {
			other.push(subject);
		}
	}

	return { moved, rerouted, other };
}

function ReadableGroup({
	title,
	description,
	subjects,
	onFocusTarget,
	collapsedByDefault = false,
}: {
	title: string;
	description: string;
	subjects: HistoryPresentationSubject[];
	onFocusTarget?: (target: HistoryFocusTarget) => void;
	collapsedByDefault?: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(!collapsedByDefault);
	const visibleSubjects = isExpanded ? subjects : subjects.slice(0, 3);
	const hiddenCount = Math.max(0, subjects.length - visibleSubjects.length);

	return (
		<div className='rounded-md border border-white/6 bg-[#141414] p-2.5'>
			<button
				className='flex w-full items-start justify-between gap-3 text-left'
				onClick={(event) => {
					event.stopPropagation();
					setIsExpanded((current) => !current);
				}}
				type='button'
			>
				<div className='min-w-0'>
					<div className='text-sm font-semibold text-white/87'>{title}</div>

					<div className='mt-0.5 text-xs text-white/45'>{description}</div>
				</div>

				<ChevronDown
					className={cn(
						'mt-0.5 h-4 w-4 shrink-0 text-white/38 transition-transform',
						isExpanded && 'rotate-180'
					)}
				/>
			</button>

			<div className='mt-2 flex flex-col gap-1.5'>
				{visibleSubjects.map((subject) => (
					<ReadableSubjectRow
						key={`${subject.type}-${subject.id}`}
						onFocusTarget={onFocusTarget}
						subject={subject}
					/>
				))}
			</div>

			{hiddenCount > 0 && (
				<button
					className='mt-2 rounded px-2 py-1 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white/72'
					onClick={(event) => {
						event.stopPropagation();
						setIsExpanded(true);
					}}
					type='button'
				>
					Show {hiddenCount} more
				</button>
			)}
		</div>
	);
}

function ReadableSubject({
	subject,
	onFocusTarget,
}: {
	subject: HistoryPresentationSubject;
	onFocusTarget?: (target: HistoryFocusTarget) => void;
}) {
	return (
		<div className='rounded-md border border-white/6 bg-[#141414] p-2.5'>
			<div className='flex items-start justify-between gap-2'>
				<div className='min-w-0'>
					<div className='truncate text-sm font-medium text-white/87'>
						{subject.label}
					</div>

					<div className='mt-0.5 text-xs text-white/45'>
						{subject.description}
					</div>
				</div>

				<Button
					aria-label={`Focus ${subject.label}`}
					className='h-6 shrink-0 gap-1 border-white/10 bg-white/5 px-2 text-xs text-white/70 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200'
					disabled={!subject.focusTarget || !onFocusTarget}
					onClick={(event) => {
						event.stopPropagation();
						if (subject.focusTarget) onFocusTarget?.(subject.focusTarget);
					}}
					size='sm'
					title='Focus on canvas'
					type='button'
					variant='outline'
				>
					<LocateFixed className='h-3 w-3' />
					Focus
				</Button>
			</div>

			<div className='mt-2 flex flex-col gap-1.5'>
				{subject.changes.map((change) => (
					<ReadableChange key={change.id} change={change} />
				))}
			</div>
		</div>
	);
}

function ReadableSubjectRow({
	subject,
	onFocusTarget,
}: {
	subject: HistoryPresentationSubject;
	onFocusTarget?: (target: HistoryFocusTarget) => void;
}) {
	const primaryChange = subject.changes[0];

	return (
		<div className='flex items-center justify-between gap-2 rounded border border-white/[0.04] bg-black/20 px-2 py-1.5'>
			<div className='min-w-0'>
				<div className='truncate text-xs font-medium text-white/78'>
					{subject.label}
				</div>

				{primaryChange && (
					<div className='mt-0.5 truncate text-[11px] text-white/45'>
						{primaryChange.summary}
					</div>
				)}
			</div>

			<Button
				aria-label={`Focus ${subject.label}`}
				className='h-6 shrink-0 gap-1 border-white/10 bg-white/5 px-2 text-xs text-white/70 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200'
				disabled={!subject.focusTarget || !onFocusTarget}
				onClick={(event) => {
					event.stopPropagation();
					if (subject.focusTarget) onFocusTarget?.(subject.focusTarget);
				}}
				size='sm'
				title='Focus on canvas'
				type='button'
				variant='outline'
			>
				<LocateFixed className='h-3 w-3' />
				Focus
			</Button>
		</div>
	);
}

function ReadableChange({ change }: { change: HistoryReadableChange }) {
	const showBeforeAfter =
		change.oldValue !== undefined &&
		change.newValue !== undefined &&
		change.kind !== 'route';

	return (
		<div className='rounded border border-white/[0.04] bg-black/20 px-2 py-1.5'>
			<div className='text-xs font-medium text-white/72'>{change.summary}</div>

			{showBeforeAfter && (
				<div className='mt-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2'>
					<div className='rounded bg-red-500/[0.08] px-2 py-1 text-red-200/90'>
						<div className='mb-0.5 text-[10px] font-medium uppercase text-red-300/70'>
							Before
						</div>
						<div className='break-words'>{change.oldValue}</div>
					</div>

					<div className='rounded bg-emerald-500/[0.08] px-2 py-1 text-emerald-200/90'>
						<div className='mb-0.5 text-[10px] font-medium uppercase text-emerald-300/70'>
							After
						</div>
						<div className='break-words'>{change.newValue}</div>
					</div>
				</div>
			)}
		</div>
	);
}
