'use client';

import { cn } from '@/utils/cn';
import { Check, CircleHelp, Eye, ListChecks, RotateCcw } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROGRESS_FILL } from './product/task-parts';
import {
	QUICK_INPUT_LINES,
	TOTAL_CHARACTERS,
	TYPE_STEP_MS,
	buildTypingFrames,
	deriveQuickInputState,
} from './quick-input-script';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;
const TICK_AT_MS = [600, 1300] as const;
const DONE_AT_MS = 1900;

type PlayState = 'idle' | 'playing' | 'done';

const syntaxLegend = [
	{ token: '[ ]', description: 'a task to tick off', className: 'text-[#d4d4d4]' },
	{ token: '#tag', description: 'group related work', className: 'text-[#c4b5fd]' },
	{ token: '^date', description: 'set a deadline', className: 'text-[#6ee7b7]' },
] as const;

/** Colour typed text the way the editor does; partial tokens colour as they type. */
function tokenizeLine(line: string): Array<{ text: string; className: string }> {
	return line
		.split(/(\[[ x]?\]?|#\w*|\^[\w-]*)/)
		.filter((part) => part.length > 0)
		.map((part) => {
			if (part.startsWith('[')) {
				const isDone = part.includes('x');

				return {
					text: part,
					className: cn(
						'rounded-[4px] bg-white/6 px-1 py-0.5 font-mono',
						isDone ? 'text-[#4ade80]' : 'text-[#8b8b8b]'
					),
				};
			}

			if (part.startsWith('#')) {
				return {
					text: part,
					className: 'rounded-[4px] bg-[rgba(139,92,246,0.16)] px-[5px] py-0.5 text-[#c4b5fd]',
				};
			}

			if (part.startsWith('^')) {
				return {
					text: part,
					className: 'rounded-[4px] bg-[rgba(16,185,129,0.14)] px-[5px] py-0.5 text-[#6ee7b7]',
				};
			}

			return { text: part, className: 'text-[#e5e5e5]' };
		});
}

function PreviewRow({ text, done }: { text: string; done: boolean }) {
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
				animate={{ color: done ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.87)' }}
				className='relative min-w-0 truncate'
				initial={false}
				transition={{ duration: 0.3 }}
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

function QuickInputDemo() {
	const frames = useMemo(() => buildTypingFrames(), []);
	const containerRef = useRef<HTMLDivElement>(null);
	const timersRef = useRef<number[]>([]);
	const intervalRef = useRef<number | null>(null);
	const isInView = useInView(containerRef, { once: true, margin: '-25% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	const [frameIndex, setFrameIndex] = useState(0);
	const [doneCount, setDoneCount] = useState(0);
	const [playState, setPlayState] = useState<PlayState>('idle');

	const clearTimers = useCallback(() => {
		timersRef.current.forEach((id) => window.clearTimeout(id));
		timersRef.current = [];

		if (intervalRef.current !== null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const play = useCallback(() => {
		clearTimers();
		setFrameIndex(0);
		setDoneCount(0);
		setPlayState('playing');

		// Frame is derived from elapsed time, not tick count, so a throttled or
		// backgrounded tab catches up instead of stretching the animation.
		const startedAt = Date.now();
		let lastIndex = 0;

		intervalRef.current = window.setInterval(() => {
			const index = Math.min(
				frames.length - 1,
				Math.floor((Date.now() - startedAt) / TYPE_STEP_MS)
			);

			if (index !== lastIndex) {
				lastIndex = index;
				setFrameIndex(index);
			}

			if (index < frames.length - 1) {
				return;
			}

			if (intervalRef.current !== null) {
				window.clearInterval(intervalRef.current);
				intervalRef.current = null;
			}

			TICK_AT_MS.forEach((delay, tickIndex) => {
				timersRef.current.push(
					window.setTimeout(() => setDoneCount(tickIndex + 1), delay)
				);
			});
			timersRef.current.push(
				window.setTimeout(() => setPlayState('done'), DONE_AT_MS)
			);
		}, TYPE_STEP_MS);
	}, [clearTimers, frames.length]);

	// Reduced motion skips the timeline entirely; the final state is derived below.
	useEffect(() => {
		if (!isInView || shouldReduceMotion) {
			return undefined;
		}

		// Start from a timer callback so state is set outside the effect body.
		const startId = window.setTimeout(play, 0);

		return () => {
			window.clearTimeout(startId);
			clearTimers();
		};
	}, [isInView, shouldReduceMotion, play, clearTimers]);

	const cursor = shouldReduceMotion ? TOTAL_CHARACTERS : frames[frameIndex];
	const ticked = shouldReduceMotion ? TICK_AT_MS.length : doneCount;
	const status: PlayState = shouldReduceMotion ? 'done' : playState;

	const state = deriveQuickInputState(cursor, ticked);
	const percent = Math.round((state.done / state.total) * 100);

	return (
		<div ref={containerRef}>
			<div
				aria-label='The Shiko node editor: typed task lines, a tag and a date become a task node with chips and progress'
				className='overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#050505] shadow-[0_30px_80px_rgba(0,0,0,0.5)]'
				role='img'
			>
				<div className='grid grid-cols-2 border-b border-[#1a1a1a]'>
					<div className='flex h-[52px] items-center gap-2.5 border-r border-[#1a1a1a] px-[18px] text-[15px] font-semibold'>
						<ListChecks aria-hidden='true' className='size-4 text-[#d4d4d4]' />
						Task List
					</div>

					<div className='flex items-stretch text-[13px] font-medium'>
						<span className='flex items-center gap-[7px] px-4 text-white shadow-[inset_0_-2px_0_#fafafa]'>
							<Eye aria-hidden='true' className='size-3.5' />
							Preview
						</span>

						<span className='flex items-center gap-[7px] px-4 text-[#8b8b8b]'>
							<CircleHelp aria-hidden='true' className='size-3.5' />

							<span className='hidden sm:inline'>Syntax Help</span>
						</span>
					</div>
				</div>

				<div className='grid md:grid-cols-2'>
					{/* Editor pane: fixed height so typing never reflows the page. */}
					<div className='h-[204px] overflow-hidden border-b border-[#1a1a1a] py-3.5 pr-3 text-[15px] leading-[34px] md:h-[236px] md:border-b-0 md:border-r'>
						{QUICK_INPUT_LINES.map((_, index) => {
							const line = state.lines[index];
							const isCaretLine = index === state.caretLine && status !== 'idle';

							return (
								<div
									key={index}
									className={cn(
										'flex transition-colors duration-200',
										isCaretLine ? 'bg-white/4' : 'bg-transparent'
									)}
								>
									<span
										className={cn(
											'w-9 flex-none text-center text-xs transition-colors duration-200',
											isCaretLine ? 'text-[#e5e5e5]' : 'text-[#4a4a4a]'
										)}
									>
										{index + 1}
									</span>

									<span className='flex min-w-0 flex-wrap items-center gap-x-1'>
										{tokenizeLine(line).map((token, tokenIndex) => (
											<span className={token.className} key={tokenIndex}>
												{token.text}
											</span>
										))}

										{isCaretLine && status === 'playing' ? (
											<span className='inline-block h-[18px] w-0.5 bg-white' />
										) : null}
									</span>
								</div>
							);
						})}
					</div>

					<div className='p-5'>
						<div className='box-border min-h-[196px] rounded-[10px] border border-white/6 bg-[#1e1e1e] bg-[url("/images/groovepaper.png")] bg-repeat bg-blend-color-burn p-[18px] md:min-h-[196px]'>
							<div className='mb-4 flex h-[26px] items-center gap-1.5 text-xs font-medium'>
								<motion.span
									animate={{ opacity: state.hasDate ? 1 : 0, scale: state.hasDate ? 1 : 0.9 }}
									className='inline-flex h-[26px] items-center rounded-lg border border-white/20 bg-white/10 px-[9px] text-[#d4d4d4]'
									initial={false}
									transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
								>
									12.03.2026
								</motion.span>

								<motion.span
									animate={{ opacity: state.hasTag ? 1 : 0, scale: state.hasTag ? 1 : 0.9 }}
									className='inline-flex h-[26px] items-center rounded-lg border border-[rgba(168,85,247,0.35)] bg-[rgba(168,85,247,0.12)] px-[9px] text-[#c4b5fd]'
									initial={false}
									transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
								>
									#launch
								</motion.span>
							</div>

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
									<PreviewRow done={row.done} key={index} text={row.text} />
								))}
							</ul>
						</div>
					</div>
				</div>

				<div className='flex items-center justify-end border-t border-[#1a1a1a] px-[18px] py-3'>
					<span className='inline-flex h-9 items-center rounded-lg bg-[#005bc7] px-4 text-sm font-semibold text-white'>
						Update
					</span>
				</div>
			</div>

			<div className='mt-2 flex min-h-11 items-center'>
				<button
					onClick={play}
					tabIndex={status === 'done' && !shouldReduceMotion ? 0 : -1}
					type='button'
					className={cn(
						'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-[13px] text-[#d4d4d8] transition-opacity duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
						status === 'done' && !shouldReduceMotion
							? 'opacity-100'
							: 'pointer-events-none opacity-0'
					)}
				>
					<RotateCcw aria-hidden='true' className='size-3.5' />
					Replay
				</button>
			</div>
		</div>
	);
}

export function CaptureChapter() {
	return (
		<div className='mt-12 flex flex-wrap items-start gap-14'>
			<div className='min-w-[18rem] max-w-[24rem] flex-[1_1_18rem]'>
				<h3 className='text-balance font-lora text-4xl font-semibold leading-[1.02] tracking-tight md:text-[3.5rem]'>
					Type it the way you think it.
				</h3>

				<p className='mt-5 text-[1.0625rem] leading-relaxed text-text-secondary'>
					Quick input reads plain text as structure. Checkboxes become tasks,
					tags group work, dates set deadlines. The preview updates as you type.
				</p>

				<dl className='mt-8 grid grid-cols-[max-content_1fr] gap-x-5 gap-y-3 text-sm text-text-secondary'>
					{syntaxLegend.map((item) => (
						<div className='contents' key={item.token}>
							<dt className={cn('font-mono', item.className)}>{item.token}</dt>

							<dd>{item.description}</dd>
						</div>
					))}
				</dl>
			</div>

			<div className='min-w-0 flex-[999_1_35rem]'>
				<QuickInputDemo />
			</div>
		</div>
	);
}
