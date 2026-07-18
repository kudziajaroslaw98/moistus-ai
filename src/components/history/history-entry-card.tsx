'use client';

import {
	type HistoryFocusTarget,
	type HistoryPresentation,
	type HistoryPresentationSubject,
	normalizeHistoryActionIntent,
} from '@/helpers/history/presentation';
import type {
	AttributedHistoryDelta,
	HistoryItem as HistoryMeta,
} from '@/types/history-state';
import { cn } from '@/utils/cn';
import {
	ArrowRightLeft,
	ChevronDown,
	Clock,
	GitCommit,
	Link2,
	Loader2,
	Lock,
	Milestone,
	Pencil,
	Plus,
	Scissors,
	Trash,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../ui/button';
import { DiffView } from './diff-view';

type HistoryActionIntent = ReturnType<typeof normalizeHistoryActionIntent>;

interface HistoryEntryCardProps {
	meta: HistoryMeta;
	isCurrent: boolean;
	canShowDiff: boolean;
	isExpanded: boolean;
	isLoading?: boolean;
	isReverting: boolean;
	isThisReverting: boolean;
	hasPermission: boolean;
	headline: string;
	headlineDetail?: string;
	subjectPreview: string;
	inlineSubject: HistoryPresentationSubject | null;
	mobileFocusTarget: HistoryFocusTarget | null;
	mobileFocusLabel: string;
	hasAttribution: boolean;
	userDisplay: string;
	timestamp: {
		display: string;
		tooltip: string;
	};
	actionIntent: HistoryActionIntent;
	delta: AttributedHistoryDelta | null;
	deltaError: string | null;
	isFetchingDelta: boolean;
	presentation: HistoryPresentation | null;
	onToggleExpand: () => void;
	onRevert: () => void;
	onFocusTarget: (target: HistoryFocusTarget) => void;
}

export function HistoryEntryCard({
	meta,
	isCurrent,
	canShowDiff,
	isExpanded,
	isLoading,
	isReverting,
	isThisReverting,
	hasPermission,
	headline,
	headlineDetail,
	subjectPreview,
	inlineSubject,
	mobileFocusTarget,
	mobileFocusLabel,
	hasAttribution,
	userDisplay,
	timestamp,
	actionIntent,
	delta,
	deltaError,
	isFetchingDelta,
	presentation,
	onToggleExpand,
	onRevert,
	onFocusTarget,
}: HistoryEntryCardProps) {
	const actionVisual = getActionVisual(actionIntent, meta);
	const smallActionIcon = getSmallActionIcon(actionIntent, meta);

	return (
		<motion.div
			onClick={canShowDiff ? onToggleExpand : undefined}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
			className={cn(
				'flex flex-col gap-2.5 border-y border-white/10 bg-[#1f1f1f] px-3 py-3 sm:rounded-sm sm:border sm:px-4 sm:py-3.5',
				canShowDiff && 'cursor-pointer',
				isCurrent
					? 'border-primary-500/45 bg-primary-500/[0.12] sm:shadow-[0_0_0_1px_rgba(96,165,250,0.24)]'
					: 'hover:border-white/20 hover:bg-[#272727]'
			)}
		>
			<div className='flex items-start gap-2.5'>
				<div
					className={cn(
						'mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full sm:flex',
						actionVisual.chipClass
					)}
				>
					{actionVisual.icon}
				</div>

				<div className='min-w-0 flex-grow'>
					<div className='flex items-start justify-between gap-2'>
						<div className='min-w-0 flex-grow space-y-1'>
							<div className='w-full flex justify-between'>
								<div className='flex min-w-0 items-start gap-1.5'>
									<span
										className={cn(
											'mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-white/75 sm:hidden',
											isCurrent && 'text-primary-200'
										)}
									>
										{smallActionIcon}
									</span>

									<h4
										className={cn(
											'min-w-0 text-[15px] font-semibold leading-5 text-white/92',
											isCurrent && 'text-primary-200'
										)}
									>
										{headline}
									</h4>
								</div>

								<div className='mt-2 flex items-center justify-between gap-2 sm:hidden'>
									{canShowDiff && (
										<motion.div
											animate={{ rotate: isExpanded ? 180 : 0 }}
											className='text-white/42'
											transition={{
												ease: [0.215, 0.61, 0.355, 1],
												duration: 0.2,
											}}
										>
											<ChevronDown className='h-4 w-4' />
										</motion.div>
									)}
								</div>
							</div>

							{headlineDetail && (
								<p className='text-[12px] leading-4 text-white/72 sm:text-[13px] sm:leading-5'>
									{headlineDetail}
								</p>
							)}

							{inlineSubject && (
								<p className='truncate text-[12px] text-white/62 sm:text-[13px]'>
									{inlineSubject.label}
								</p>
							)}

							{!inlineSubject && subjectPreview && (
								<p className='truncate text-[12px] text-white/62 sm:text-[13px]'>
									{subjectPreview}
								</p>
							)}

							{hasAttribution && (
								<div className='flex items-center gap-1.5 text-[11px] text-white/60 sm:text-[12px]'>
									<span>{userDisplay}</span>

									<span className='text-white/38'>•</span>

									<span className='cursor-help' title={timestamp.tooltip}>
										{timestamp.display}
									</span>
								</div>
							)}

							{!hasAttribution && (
								<p
									className='text-[11px] text-white/60 cursor-help sm:text-[12px]'
									title={timestamp.tooltip}
								>
									{timestamp.display}
								</p>
							)}
						</div>

						<div className='hidden items-center gap-1.5 sm:flex'>
							{canShowDiff && (
								<motion.div
									animate={{ rotate: isExpanded ? 180 : 0 }}
									className='text-white/42'
									transition={{
										ease: [0.215, 0.61, 0.355, 1],
										duration: 0.2,
									}}
								>
									<ChevronDown className='h-4 w-4' />
								</motion.div>
							)}

							{inlineSubject && (
								<Button
									aria-label={`Focus ${inlineSubject.label}`}
									className='h-7 border-white/12 bg-white/[0.05] px-2.5 text-[11px] text-white/74 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200'
									disabled={!inlineSubject.focusTarget}
									onClick={(event) => {
										event.stopPropagation();
										if (inlineSubject.focusTarget) {
											onFocusTarget(inlineSubject.focusTarget);
										}
									}}
									size='sm'
									type='button'
									variant='outline'
								>
									Focus
								</Button>
							)}

							{!isCurrent && (
								<Button
									disabled={isLoading || isReverting || !hasPermission}
									size='sm'
									variant='outline'
									className={cn(
										'h-7 px-2.5 text-xs gap-1',
										'border-amber-400/35 bg-amber-500/14 text-amber-100',
										'hover:border-amber-300/55 hover:bg-amber-500/24',
										(!hasPermission || isReverting) &&
											'cursor-not-allowed opacity-50'
									)}
									onClick={(event) => {
										event.stopPropagation();
										onRevert();
									}}
									title={
										!hasPermission
											? 'You do not have permission to revert this change'
											: isReverting
												? 'Revert in progress...'
												: 'Revert to this state'
									}
								>
									{isThisReverting ? (
										<Loader2 className='h-3 w-3 animate-spin' />
									) : (
										!hasPermission && <Lock className='h-3 w-3' />
									)}
									{isThisReverting ? 'Reverting...' : 'Revert'}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>

			{!isCurrent && (
				<div className='grid grid-cols-2 gap-2 sm:hidden'>
					<Button
						aria-label={`Focus ${mobileFocusLabel}`}
						className='h-10 w-full border-white/15 bg-white/[0.05] text-[12px] text-white/80 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200 disabled:opacity-45'
						disabled={!mobileFocusTarget}
						onClick={(event) => {
							event.stopPropagation();
							if (mobileFocusTarget) onFocusTarget(mobileFocusTarget);
						}}
						size='sm'
						type='button'
						variant='outline'
					>
						Focus
					</Button>

					<Button
						disabled={isLoading || isReverting || !hasPermission}
						size='sm'
						type='button'
						variant='outline'
						className={cn(
							'h-10 w-full text-[12px]',
							'border-amber-400/35 bg-amber-500/14 text-amber-100',
							'hover:border-amber-300/55 hover:bg-amber-500/24',
							(!hasPermission || isReverting) && 'cursor-not-allowed opacity-50'
						)}
						onClick={(event) => {
							event.stopPropagation();
							onRevert();
						}}
					>
						{isThisReverting ? (
							<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
						) : (
							!hasPermission && <Lock className='mr-1 h-3.5 w-3.5' />
						)}
						{isThisReverting ? 'Reverting...' : 'Revert'}
					</Button>
				</div>
			)}

			<AnimatePresence mode='popLayout'>
				{isExpanded && (
					<DiffView
						delta={delta}
						error={deltaError}
						isLoading={isFetchingDelta}
						onFocusTarget={onFocusTarget}
						presentation={presentation}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

function getActionVisual(actionIntent: HistoryActionIntent, meta: HistoryMeta) {
	if (meta.isMajor) {
		return {
			icon: <Milestone className='h-4 w-4' />,
			chipClass: 'bg-sky-500/18 text-sky-300 border border-sky-400/30',
		};
	}

	if (meta.type === 'snapshot') {
		return {
			icon: <GitCommit className='h-4 w-4' />,
			chipClass:
				'bg-violet-500/16 text-violet-200 border border-violet-400/28',
		};
	}

	if (actionIntent === 'node_add') {
		return {
			icon: <Plus className='h-4 w-4' />,
			chipClass:
				'bg-violet-500/16 text-violet-200 border border-violet-400/28',
		};
	}

	if (actionIntent === 'node_delete' || actionIntent === 'connection_remove') {
		return {
			icon: <Trash className='h-4 w-4' />,
			chipClass: 'bg-rose-500/16 text-rose-200 border border-rose-400/32',
		};
	}

	if (
		actionIntent === 'node_move' ||
		actionIntent === 'layout_apply' ||
		actionIntent === 'node_detach_or_reparent'
	) {
		return {
			icon: <ArrowRightLeft className='h-4 w-4' />,
			chipClass:
				'bg-emerald-500/16 text-emerald-200 border border-emerald-400/30',
		};
	}

	if (actionIntent === 'connection_add' || actionIntent === 'connection_update') {
		return {
			icon: <Link2 className='h-4 w-4' />,
			chipClass: 'bg-amber-500/16 text-amber-200 border border-amber-400/30',
		};
	}

	if (actionIntent === 'node_resize') {
		return {
			icon: <Scissors className='h-4 w-4' />,
			chipClass: 'bg-sky-500/16 text-sky-200 border border-sky-400/28',
		};
	}

	if (meta.operationType === 'delete') {
		return {
			icon: <Trash className='h-4 w-4' />,
			chipClass: 'bg-rose-500/16 text-rose-200 border border-rose-400/32',
		};
	}
	if (meta.operationType === 'add') {
		return {
			icon: <Plus className='h-4 w-4' />,
			chipClass:
				'bg-violet-500/16 text-violet-200 border border-violet-400/28',
		};
	}
	if (meta.operationType === 'update') {
		return {
			icon: <Pencil className='h-4 w-4' />,
			chipClass: 'bg-sky-500/16 text-sky-200 border border-sky-400/28',
		};
	}
	return {
		icon: <Clock className='h-4 w-4' />,
		chipClass: 'bg-white/10 text-white/70 border border-white/14',
	};
}

function getSmallActionIcon(actionIntent: HistoryActionIntent, meta: HistoryMeta) {
	if (meta.isMajor) return <Milestone className='h-3.5 w-3.5' />;
	if (meta.type === 'snapshot') return <GitCommit className='h-3.5 w-3.5' />;
	if (actionIntent === 'node_add') return <Plus className='h-3.5 w-3.5' />;
	if (actionIntent === 'node_delete' || actionIntent === 'connection_remove') {
		return <Trash className='h-3.5 w-3.5' />;
	}
	if (
		actionIntent === 'node_move' ||
		actionIntent === 'layout_apply' ||
		actionIntent === 'node_detach_or_reparent'
	) {
		return <ArrowRightLeft className='h-3.5 w-3.5' />;
	}
	if (actionIntent === 'connection_add' || actionIntent === 'connection_update') {
		return <Link2 className='h-3.5 w-3.5' />;
	}
	if (actionIntent === 'node_resize')
		return <Scissors className='h-3.5 w-3.5' />;
	if (meta.operationType === 'delete') return <Trash className='h-3.5 w-3.5' />;
	if (meta.operationType === 'add') return <Plus className='h-3.5 w-3.5' />;
	if (meta.operationType === 'update')
		return <Pencil className='h-3.5 w-3.5' />;
	return <Clock className='h-3.5 w-3.5' />;
}
