'use client';

import {
	type HistoryFocusTarget,
	normalizeHistoryActionIntent,
} from '@/helpers/history/presentation';
import type { HistoryItem as HistoryMeta } from '@/types/history-state';
import { cn } from '@/utils/cn';
import {
	ChevronDown,
	Flag,
	Link2,
	LocateFixed,
	Lock,
	type LucideIcon,
	Move,
	Pencil,
	Plus,
	Save,
	Trash2,
	Undo2,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import {
	getHistoryFilterCategory,
	type HistoryRowSubject,
} from './model/history-timeline';

const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

interface RowIcon {
	Icon: LucideIcon;
	chipClass: string;
}

export function getHistoryRowIcon(meta: HistoryMeta): RowIcon {
	const category = getHistoryFilterCategory(meta);
	if (category === 'checkpoint') {
		return meta.isMajor
			? { Icon: Flag, chipClass: 'bg-primary-500/15 text-primary-200' }
			: { Icon: Save, chipClass: 'bg-white/[0.07] text-white/60' };
	}
	if (category === 'added') {
		return { Icon: Plus, chipClass: 'bg-violet-500/15 text-violet-300' };
	}
	if (category === 'removed') {
		return { Icon: Trash2, chipClass: 'bg-rose-500/15 text-rose-300' };
	}
	if (category === 'links') {
		return { Icon: Link2, chipClass: 'bg-amber-500/15 text-amber-300' };
	}
	const intent = normalizeHistoryActionIntent(meta.actionName);
	if (intent === 'node_move' || intent === 'layout_apply') {
		return { Icon: Move, chipClass: 'bg-emerald-500/15 text-emerald-300' };
	}
	return { Icon: Pencil, chipClass: 'bg-sky-500/15 text-sky-300' };
}

export interface HistoryRowRevert {
	hasPermission: boolean;
	disabled: boolean;
	onRequest: () => void;
}

interface HistoryRowProps {
	meta: HistoryMeta;
	/** `nested` rows sit inside an expanded group and use a dot, not an icon. */
	variant?: 'row' | 'nested';
	title: string;
	subject?: HistoryRowSubject | null;
	/** Shown when someone other than the viewer made the change. */
	author?: string | null;
	time: string;
	timeTooltip: string;
	isCurrent: boolean;
	count?: number;
	canExpand: boolean;
	isExpanded: boolean;
	onToggleExpand: () => void;
	focusTarget: HistoryFocusTarget | null;
	focusLabel: string;
	onFocusTarget: (target: HistoryFocusTarget) => void;
	/** Omit to hide the revert action (current entry, group summary rows). */
	revert?: HistoryRowRevert | null;
	/** Expanded content (diff or grouped children). */
	children?: ReactNode;
	/** Content under the row regardless of expansion (revert confirm). */
	footer?: ReactNode;
}

const iconButtonClass =
	'inline-flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:cursor-not-allowed disabled:opacity-40';

export function HistoryRow({
	meta,
	variant = 'row',
	title,
	subject,
	author,
	time,
	timeTooltip,
	isCurrent,
	count,
	canExpand,
	isExpanded,
	onToggleExpand,
	focusTarget,
	focusLabel,
	onFocusTarget,
	revert,
	children,
	footer,
}: HistoryRowProps) {
	const shouldReduceMotion = useReducedMotion();
	const { Icon, chipClass } = getHistoryRowIcon(meta);
	const hasActions = Boolean(focusTarget || revert);
	const isNested = variant === 'nested';

	return (
		<div
			data-current={isCurrent || undefined}
			data-testid='history-row'
			className={cn(
				'group/row relative rounded-lg transition-colors duration-200 ease',
				isCurrent
					? 'bg-primary-500/[0.08] ring-1 ring-inset ring-primary-400/45'
					: 'hover:bg-white/[0.035]'
			)}
		>
			<div className='flex items-start'>
				<button
					aria-expanded={canExpand ? isExpanded : undefined}
					onClick={canExpand ? onToggleExpand : undefined}
					type='button'
					className={cn(
						'flex min-w-0 flex-1 items-start gap-3 rounded-lg py-2 pl-2.5 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60',
						canExpand ? 'cursor-pointer' : 'cursor-default'
					)}
				>
					{isNested ? (
						<span
							aria-hidden
							className='relative mt-[6px] flex h-2 w-2 shrink-0 rounded-full bg-primary-400/80'
						/>
					) : (
						<span
							aria-hidden
							className={cn(
								'mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
								chipClass
							)}
						>
							<Icon className='h-3.5 w-3.5' />
						</span>
					)}

					<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
						<span className='flex min-w-0 items-center gap-1.5'>
							<span
								className={cn(
									'truncate text-[14px] leading-5',
									isNested ? 'text-white/80' : 'font-medium text-white/92'
								)}
							>
								{title}
							</span>

							{count && count > 1 ? (
								<span className='shrink-0 rounded-full bg-white/[0.08] px-1.5 text-[11px] font-medium leading-4 text-white/70'>
									×{count}
								</span>
							) : null}

							{isCurrent && (
								<span className='shrink-0 rounded bg-primary-500/20 px-1.5 text-[10px] font-semibold leading-4 tracking-[0.08em] text-primary-200'>
									CURRENT
								</span>
							)}

							{canExpand && (
								<ChevronDown
									aria-hidden
									className={cn(
										'h-3.5 w-3.5 shrink-0 text-white/40 transition-transform duration-200 ease-out',
										isExpanded && 'rotate-180'
									)}
								/>
							)}
						</span>

						{(subject || author) && (
							<HistoryRowSubjectLine author={author} subject={subject} />
						)}
					</span>
				</button>

				<div className='relative flex shrink-0 items-start py-2 pr-2.5'>
					<time
						dateTime={new Date(meta.timestamp).toISOString()}
						title={timeTooltip}
						className={cn(
							'whitespace-nowrap pt-0.5 text-[12px] leading-4 text-white/45 transition-opacity duration-200 ease',
							hasActions &&
								'group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0'
						)}
					>
						{time}
					</time>

					{hasActions && (
						<div className='pointer-events-none absolute right-1.5 top-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 ease group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-has-[:focus-visible]/row:pointer-events-auto group-has-[:focus-visible]/row:opacity-100 [@media(hover:none)]:hidden'>
							{focusTarget && (
								<button
									aria-label={`Focus ${focusLabel} on canvas`}
									onClick={() => onFocusTarget(focusTarget)}
									title='Focus on canvas'
									type='button'
									className={cn(
										iconButtonClass,
										'hover:bg-white/[0.08] hover:text-white/90'
									)}
								>
									<LocateFixed className='h-3.5 w-3.5' />
								</button>
							)}

							{revert && (
								<button
									aria-label='Restore map to this point'
									disabled={revert.disabled || !revert.hasPermission}
									onClick={revert.onRequest}
									type='button'
									className={cn(
										iconButtonClass,
										'hover:bg-amber-500/15 hover:text-amber-300'
									)}
									title={
										revert.hasPermission
											? 'Restore map to this point'
											: 'You do not have permission to revert this change'
									}
								>
									{revert.hasPermission ? (
										<Undo2 className='h-3.5 w-3.5' />
									) : (
										<Lock className='h-3.5 w-3.5' />
									)}
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			<AnimatePresence initial={false}>
				{isExpanded && children && (
					<motion.div
						animate={{ height: 'auto', opacity: 1 }}
						className='overflow-hidden'
						exit={{ height: 0, opacity: 0 }}
						initial={{ height: 0, opacity: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.2, ease: EASE_OUT_CUBIC }
						}
					>
						<div
							className={cn(
								'pb-2.5 pr-2.5',
								isNested ? 'pl-7' : 'pl-[3.25rem]'
							)}
						>
							{children}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{footer && (
				<div
					className={cn('pb-2.5 pr-2.5', isNested ? 'pl-7' : 'pl-[3.25rem]')}
				>
					{footer}
				</div>
			)}
		</div>
	);
}

function HistoryRowSubjectLine({
	subject,
	author,
}: {
	subject?: HistoryRowSubject | null;
	author?: string | null;
}) {
	return (
		<span className='flex min-w-0 items-baseline gap-1 text-[12.5px] leading-5 text-white/55'>
			<span className='truncate'>
				{subject && (
					<>
						<span className={subject.tone}>{subject.typeLabel}</span>{' '}

						{subject.names.length > 0 && (
							<span
								className={cn(
									subject.namesAreIds && 'font-mono text-[12px] text-white/60'
								)}
							>
								{subject.names.join(', ')}
							</span>
						)}

						{subject.moreCount > 0 && ` and ${subject.moreCount} more`}

						{subject.detail && (
							<span className='text-white/45'> · {subject.detail}</span>
						)}
					</>
				)}

				{author && (
					<span className='text-white/45'>
						{subject ? ' · ' : ''}

						{author}
					</span>
				)}
			</span>
		</span>
	);
}
