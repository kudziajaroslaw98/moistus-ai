'use client';

import { cn } from '@/utils/cn';
import { Calendar, Check, Circle, Flag } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { PROGRESS_FILL } from './product/task-parts';
import type {
	NoteState,
	QuestionState,
	TasksState,
} from './quick-input-script';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

type ChipTone = 'pending' | 'date' | 'priority' | 'tag';

// Colours from the app's UniversalMetadataBar and NodeTags.
const CHIP_TONES: Record<ChipTone, string> = {
	pending:
		'border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24]',
	date: 'border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24]',
	priority:
		'border-[rgba(251,146,60,0.2)] bg-[rgba(251,146,60,0.1)] text-[#fb923c]',
	tag: 'border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.1)] text-[#a78bfa]',
};

interface MetaChipProps {
	tone: ChipTone;
	visible?: boolean;
	children: ReactNode;
}

/** Chips fade in place (they stay in the layout), so nothing shifts when one appears. */
function MetaChip({ tone, visible = true, children }: MetaChipProps) {
	return (
		<motion.span
			animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.9 }}
			initial={false}
			transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
			className={cn(
				'inline-flex h-[26px] items-center gap-1.5 rounded-lg border px-[9px] text-xs font-medium',
				CHIP_TONES[tone]
			)}
		>
			{children}
		</motion.span>
	);
}

function ChipRow({ children }: { children: ReactNode }) {
	return (
		<div className='mb-4 flex h-[26px] items-center gap-1.5'>{children}</div>
	);
}

/** Fixed-height node preview card, sized for the tallest scenario so tabs never reflow. */
function PreviewCard({ children }: { children: ReactNode }) {
	return (
		<div className='box-border h-[268px] overflow-hidden rounded-[10px] border border-white/6 bg-[#1e1e1e] bg-[url("/images/groovepaper.png")] bg-repeat bg-blend-color-burn p-[18px]'>
			{children}
		</div>
	);
}

function TaskPreviewRow({ text, done }: { text: string; done: boolean }) {
	return (
		<motion.li
			animate={{ opacity: 1, y: 0 }}
			className='flex items-center gap-3 text-[15px] leading-[22px]'
			initial={{ opacity: 0, y: 6 }}
			transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
		>
			<motion.span
				className='flex size-[18px] flex-none items-center justify-center rounded-[4px] border-[1.5px] text-[#34d399]'
				initial={false}
				transition={{ duration: 0.25 }}
				animate={{
					borderColor: done ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.3)',
				}}
			>
				<motion.span
					animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.5 }}
					className='flex'
					initial={false}
					transition={{ type: 'spring', stiffness: 400, damping: 26 }}
				>
					<Check aria-hidden='true' className='size-3' strokeWidth={3} />
				</motion.span>
			</motion.span>

			<motion.span
				className='relative min-w-0 truncate'
				initial={false}
				transition={{ duration: 0.3 }}
				animate={{
					color: done ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.87)',
				}}
			>
				{text}

				{/* Strike-through draws left to right instead of toggling instantly. */}
				<motion.span
					animate={{ width: done ? '100%' : '0%' }}
					aria-hidden='true'
					className='absolute left-0 top-1/2 h-px bg-white/40'
					initial={false}
					transition={{ duration: 0.35, ease: EASE_OUT_QUART }}
				/>
			</motion.span>
		</motion.li>
	);
}

export function TasksPreview({ state }: { state: TasksState }) {
	const percent = Math.round((state.done / state.total) * 100);

	return (
		<PreviewCard>
			<ChipRow>
				<MetaChip tone='pending'>
					<Circle aria-hidden='true' className='size-3' />
					pending
				</MetaChip>

				<MetaChip tone='date' visible={state.hasDate}>
					<Calendar aria-hidden='true' className='size-3' />
					Tomorrow
				</MetaChip>

				<MetaChip tone='tag' visible={state.hasTag}>
					#launch
				</MetaChip>
			</ChipRow>

			<div className='flex justify-between text-sm'>
				<span className='text-white/60'>Progress</span>

				<span className='tabular-nums text-white/87'>
					{`${state.done} / ${state.total}`}
				</span>
			</div>

			<div className='mt-2 h-1 rounded-full bg-white/6'>
				<motion.div
					animate={{ width: `${percent}%` }}
					className='h-1 rounded-full'
					initial={false}
					style={{ background: PROGRESS_FILL }}
					transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
				/>
			</div>

			<ul className='mt-4 flex h-[130px] flex-col gap-3 overflow-hidden'>
				{state.rows.map((row, index) => (
					<TaskPreviewRow done={row.done} key={index} text={row.text} />
				))}
			</ul>
		</PreviewCard>
	);
}

export function QuestionPreview({ state }: { state: QuestionState }) {
	return (
		<PreviewCard>
			<ChipRow>
				<MetaChip tone='tag' visible={state.hasTag}>
					#research
				</MetaChip>
			</ChipRow>

			<p className='mb-4 min-h-[48px] text-center text-base font-medium text-white/90'>
				{state.question}
			</p>

			<ul className='flex flex-col gap-2'>
				{state.options.map((option, index) => (
					<motion.li
						animate={{ opacity: 1, y: 0 }}
						className='rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/87'
						initial={{ opacity: 0, y: 6 }}
						key={option}
						transition={{
							duration: 0.3,
							ease: EASE_OUT_QUART,
							delay: index * 0.07,
						}}
					>
						{option}
					</motion.li>
				))}
			</ul>
		</PreviewCard>
	);
}

export function NotePreview({ state }: { state: NoteState }) {
	return (
		<PreviewCard>
			<ChipRow>
				<MetaChip tone='priority' visible={state.hasPriority}>
					<Flag aria-hidden='true' className='size-3' />
					High
				</MetaChip>

				<MetaChip tone='tag' visible={state.hasTag}>
					#research
				</MetaChip>
			</ChipRow>

			<p className='text-sm leading-6 text-white/87'>{state.text}</p>
		</PreviewCard>
	);
}
