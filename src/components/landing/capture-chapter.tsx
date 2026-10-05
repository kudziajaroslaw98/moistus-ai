'use client';

import { cn } from '@/utils/cn';
import {
	CheckSquare,
	CircleHelp,
	Eye,
	FileQuestion,
	RotateCcw,
	StickyNote,
	type LucideIcon,
} from 'lucide-react';
import {
	AnimatePresence,
	motion,
	useInView,
	useReducedMotion,
} from 'motion/react';
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import {
	NotePreview,
	QuestionPreview,
	TasksPreview,
} from './quick-input-previews';
import {
	QUICK_INPUT_SCENARIOS,
	TYPE_STEP_MS,
	buildTypingFrames,
	deriveQuickInputState,
	totalCharacters,
	type PreviewKind,
	type QuickInputScenario,
	type QuickInputState,
} from './quick-input-script';

const TICK_AT_MS = [600, 1300] as const;
const TASKS_DONE_AT_MS = 1900;
/** Short settle after typing for scenarios with no ticking. */
const SETTLE_MS = 600;
/** Hold on a finished example before the next one starts. */
const HOLD_MS = 2500;
/** Lets the outgoing example fade before the next one starts typing. */
const SWAP_DELAY_MS = 320;

const SCENARIO_FRAMES = QUICK_INPUT_SCENARIOS.map(buildTypingFrames);

const HEADER_ICONS: Record<PreviewKind, LucideIcon> = {
	tasks: CheckSquare,
	question: FileQuestion,
	note: StickyNote,
};

type PlayState = 'idle' | 'playing' | 'done';

const syntaxLegend = [
	{ token: '[ ]', description: 'a task to tick off', className: 'text-[#d4d4d4]' },
	{ token: '#tag', description: 'group related work', className: 'text-[#c4b5fd]' },
	{ token: '^date', description: 'set a deadline', className: 'text-[#6ee7b7]' },
] as const;

/** Colour typed text the way the editor does; partial tokens colour as they type. */
function tokenizeLine(line: string): Array<{ text: string; className: string }> {
	return line
		.split(/(\[[ x]?\]?|#\w*|\^[\w-]*|!\w*|question:\w*|options:\[[^\]]*\]?)/)
		.filter((part) => part.length > 0)
		.map((part) => {
			if (part.startsWith('[')) {
				return {
					text: part,
					className: cn(
						'rounded-[4px] bg-white/6 px-1 py-0.5 font-mono',
						part.includes('x') ? 'text-[#4ade80]' : 'text-[#8b8b8b]'
					),
				};
			}

			if (part.startsWith('#')) {
				return {
					text: part,
					className:
						'rounded-[4px] bg-[rgba(139,92,246,0.16)] px-[5px] py-0.5 text-[#c4b5fd]',
				};
			}

			if (part.startsWith('^')) {
				return {
					text: part,
					className:
						'rounded-[4px] bg-[rgba(16,185,129,0.14)] px-[5px] py-0.5 text-[#6ee7b7]',
				};
			}

			if (part.startsWith('!')) {
				return {
					text: part,
					className:
						'rounded-[4px] bg-[rgba(239,68,68,0.16)] px-[5px] py-0.5 text-[#f87171]',
				};
			}

			if (part.startsWith('question:') || part.startsWith('options:')) {
				return {
					text: part,
					className:
						'rounded-[4px] bg-[rgba(59,130,246,0.16)] px-[5px] py-0.5 text-[#93c5fd]',
				};
			}

			return { text: part, className: 'text-[#e5e5e5]' };
		});
}

/** Fades the outgoing content out, then the incoming content in; reserves no extra space. */
function Crossfade({
	id,
	className,
	children,
}: {
	id: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<AnimatePresence initial={false} mode='wait'>
			<motion.div
				animate={{ opacity: 1 }}
				className={className}
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key={id}
				transition={{ duration: 0.15 }}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}

function EditorLines({
	state,
	typing,
}: {
	state: QuickInputState;
	typing: boolean;
}) {
	return (
		<>
			{state.lines.map((line, index) => {
				const isCaretLine = typing && index === state.caretLine;

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

							{isCaretLine ? (
								<span className='inline-block h-[18px] w-0.5 bg-white' />
							) : null}
						</span>
					</div>
				);
			})}
		</>
	);
}

function Preview({ state }: { state: QuickInputState }) {
	switch (state.kind) {
		case 'tasks':
			return <TasksPreview state={state} />;
		case 'question':
			return <QuestionPreview state={state} />;
		case 'note':
			return <NotePreview state={state} />;
	}
}

function QuickInputDemo() {
	const containerRef = useRef<HTMLDivElement>(null);
	const timersRef = useRef<number[]>([]);
	const intervalRef = useRef<number | null>(null);
	// Lets a finished scenario chain the next one without `start` referencing itself.
	const startRef = useRef<(index: number, auto: boolean, swap: boolean) => void>(
		() => undefined
	);
	const isInView = useInView(containerRef, { once: true, margin: '-25% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	const [scenarioIndex, setScenarioIndex] = useState(0);
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

	/**
	 * Plays one scenario. With `auto`, the next scenario follows after a hold, once
	 * through the list; a manual tab click plays just that scenario.
	 */
	const start = useCallback(
		(index: number, auto: boolean, swap: boolean) => {
			clearTimers();
			setScenarioIndex(index);
			setFrameIndex(0);
			setDoneCount(0);
			setPlayState('playing');

			const scenario = QUICK_INPUT_SCENARIOS[index];
			const frames = SCENARIO_FRAMES[index];
			// Frame is derived from elapsed time, not tick count, so a throttled or
			// backgrounded tab catches up instead of stretching the animation.
			const startedAt = Date.now() + (swap ? SWAP_DELAY_MS : 0);
			let lastIndex = 0;

			const finish = () => {
				setPlayState('done');

				if (auto && index < QUICK_INPUT_SCENARIOS.length - 1) {
					timersRef.current.push(
						window.setTimeout(
							() => startRef.current(index + 1, true, true),
							HOLD_MS
						)
					);
				}
			};

			intervalRef.current = window.setInterval(() => {
				const elapsed = Date.now() - startedAt;

				if (elapsed < 0) {
					return;
				}

				const next = Math.min(
					frames.length - 1,
					Math.floor(elapsed / TYPE_STEP_MS)
				);

				if (next !== lastIndex) {
					lastIndex = next;
					setFrameIndex(next);
				}

				if (next < frames.length - 1) {
					return;
				}

				if (intervalRef.current !== null) {
					window.clearInterval(intervalRef.current);
					intervalRef.current = null;
				}

				if (scenario.previewKind === 'tasks') {
					TICK_AT_MS.forEach((delay, tickIndex) => {
						timersRef.current.push(
							window.setTimeout(() => setDoneCount(tickIndex + 1), delay)
						);
					});
					timersRef.current.push(window.setTimeout(finish, TASKS_DONE_AT_MS));
				} else {
					timersRef.current.push(window.setTimeout(finish, SETTLE_MS));
				}
			}, TYPE_STEP_MS);
		},
		[clearTimers]
	);

	useEffect(() => {
		startRef.current = start;
	}, [start]);

	// Reduced motion skips the timeline entirely; final states are derived below.
	useEffect(() => {
		if (!isInView || shouldReduceMotion) {
			return undefined;
		}

		// Start from a timer callback so state is set outside the effect body.
		const startId = window.setTimeout(() => start(0, true, false), 0);

		return () => {
			window.clearTimeout(startId);
			clearTimers();
		};
	}, [isInView, shouldReduceMotion, start, clearTimers]);

	const scenario: QuickInputScenario = QUICK_INPUT_SCENARIOS[scenarioIndex];
	const cursor = shouldReduceMotion
		? totalCharacters(scenario)
		: SCENARIO_FRAMES[scenarioIndex][frameIndex];
	const ticked = shouldReduceMotion ? TICK_AT_MS.length : doneCount;
	const status: PlayState = shouldReduceMotion ? 'done' : playState;
	const state = deriveQuickInputState(scenario, cursor, ticked);
	const HeaderIcon = HEADER_ICONS[scenario.previewKind];

	const selectScenario = (index: number) => {
		if (shouldReduceMotion) {
			setScenarioIndex(index);

			return;
		}

		start(index, false, index !== scenarioIndex);
	};

	return (
		<div ref={containerRef}>
			<div
				aria-label='The Shiko node editor: typed quick input becomes a task list, a question or a note, with chips and progress'
				className='overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#050505] shadow-[0_30px_80px_rgba(0,0,0,0.5)]'
				role='img'
			>
				<div className='grid grid-cols-2 border-b border-[#1a1a1a]'>
					<div className='flex h-[52px] items-center border-r border-[#1a1a1a] px-[18px]'>
						<Crossfade
							className='flex items-center gap-2.5 text-[15px] font-semibold'
							id={scenario.id}
						>
							<HeaderIcon aria-hidden='true' className='size-4 text-[#d4d4d4]' />

							{scenario.headerLabel}
						</Crossfade>
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
					{/* Fixed heights: typing and switching examples never reflow the page. */}
					<div className='h-[236px] overflow-hidden border-b border-[#1a1a1a] py-3.5 pr-3 text-[15px] leading-[34px] md:h-[308px] md:border-b-0 md:border-r'>
						<Crossfade id={scenario.id}>
							<EditorLines state={state} typing={status === 'playing'} />
						</Crossfade>
					</div>

					<div className='p-5'>
						<Crossfade id={scenario.id}>
							<Preview state={state} />
						</Crossfade>
					</div>
				</div>

				<div className='flex items-center justify-end border-t border-[#1a1a1a] px-[18px] py-3'>
					<span className='inline-flex h-9 items-center rounded-lg bg-[#005bc7] px-4 text-sm font-semibold text-white'>
						Update
					</span>
				</div>
			</div>

			<div className='mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4'>
				<div
					aria-label='Quick input examples'
					className='flex items-center gap-1'
					role='group'
				>
					{QUICK_INPUT_SCENARIOS.map((item, index) => (
						<button
							aria-pressed={index === scenarioIndex}
							key={item.id}
							onClick={() => selectScenario(index)}
							type='button'
							className={cn(
								'min-h-11 cursor-pointer rounded-lg px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
								index === scenarioIndex
									? 'bg-white/6 text-white'
									: 'text-[#8b8b8b] hover:text-white'
							)}
						>
							{item.tabLabel}
						</button>
					))}
				</div>

				<button
					onClick={() => start(0, true, scenarioIndex !== 0)}
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
