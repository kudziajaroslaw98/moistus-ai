'use client';

import type { OnboardingTaskId } from '@/constants/onboarding';
import { Check, Circle, Minimize2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '../ui/button';
import {
	ONBOARDING_DESKTOP_TOP_OFFSET,
	ONBOARDING_MOBILE_TOP_OFFSET,
} from './onboarding-layout';

const TASK_ITEMS: ReadonlyArray<{
	id: OnboardingTaskId;
	label: string;
	description: string;
}> = [
	{
		id: 'create-node',
		label: 'Create a node',
		description: 'Place your first node on the canvas.',
	},
	{
		id: 'try-pattern',
		label: 'Try a pattern',
		description: 'Turn one line into structure with tags, dates, or tasks.',
	},
	{
		id: 'know-controls',
		label: 'Know the controls',
		description: 'See the tools you will use most often.',
	},
] as const;

const getNextTask = (tasks: Record<OnboardingTaskId, boolean>) =>
	TASK_ITEMS.find((task) => !tasks[task.id]) ?? TASK_ITEMS[TASK_ITEMS.length - 1];

function ChecklistItem({
	completed,
	description,
	label,
	onClick,
}: {
	completed: boolean;
	description: string;
	label: string;
	onClick: () => void;
}) {
	return (
		<div className='rounded-2xl border border-white/8 bg-white/3 p-3'>
			<div className='flex items-start gap-3'>
				<div className='pt-0.5 text-primary-300'>
					{completed ? (
						<span className='inline-flex size-5 items-center justify-center rounded-full bg-primary-500/15'>
							<Check className='size-3.5' />
						</span>
					) : (
						<Circle className='size-5 text-text-tertiary' />
					)}
				</div>

				<div className='min-w-0 flex-1'>
					<div className='flex items-center justify-between gap-3'>
						<h4 className='text-sm font-medium text-text-primary'>{label}</h4>
						<Button
							onClick={onClick}
							size='sm'
							variant={completed ? 'secondary' : 'default'}
						>
							{completed ? 'Done' : 'Start'}
						</Button>
					</div>
					<p className='mt-1 text-xs leading-5 text-text-secondary'>
						{description}
					</p>
				</div>
			</div>
		</div>
	);
}

function ChecklistContent({
	completedCount,
	onMinimize,
	onSkip,
	onTaskAction,
	tasks,
}: {
	completedCount: number;
	onMinimize: () => void;
	onSkip: () => void;
	onTaskAction: (taskId: OnboardingTaskId) => void;
	tasks: Record<OnboardingTaskId, boolean>;
}) {
	return (
		<div>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<p className='text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary'>
						Getting Started
					</p>
					<h3 className='mt-1 text-lg font-semibold text-text-primary'>
						{completedCount}/3 complete
					</h3>
				</div>

				<div className='flex items-center gap-2'>
					<button
						className='rounded-lg p-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'
						onClick={onSkip}
						type='button'
					>
						Skip walkthrough
					</button>
					<button
						className='rounded-lg p-2 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text-primary'
						onClick={onMinimize}
						type='button'
					>
						<Minimize2 className='size-4' />
						<span className='sr-only'>Minimize walkthrough</span>
					</button>
				</div>
			</div>

			<div className='mt-4 space-y-3'>
				{TASK_ITEMS.map((task) => (
					<ChecklistItem
						key={task.id}
						completed={tasks[task.id]}
						description={task.description}
						label={task.label}
						onClick={() => onTaskAction(task.id)}
					/>
				))}
			</div>
		</div>
	);
}

function MinimizedPillContent({
	completedCount,
	onResume,
	onTaskAction,
	tasks,
}: {
	completedCount: number;
	onResume: () => void;
	onTaskAction: (taskId: OnboardingTaskId) => void;
	tasks: Record<OnboardingTaskId, boolean>;
}) {
	const nextTask = getNextTask(tasks);

	return (
		<div className='flex items-center gap-3'>
			<button
				aria-label='Expand walkthrough'
				className='flex min-w-0 flex-1 items-center gap-3 rounded-full text-left transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
				onClick={onResume}
				type='button'
			>
				<span className='inline-flex size-7 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-300'>
					{completedCount}/3
				</span>
				<div className='min-w-0 flex-1'>
					<p className='truncate text-sm font-medium text-text-primary'>
						{nextTask.label}
					</p>
				</div>
			</button>
			<Button onClick={() => onTaskAction(nextTask.id)} size='sm' variant='default'>
				Start
			</Button>
		</div>
	);
}

const surfaceBaseClassName =
	'border border-white/10 bg-base/95 text-text-primary shadow-xl shadow-black/30 backdrop-blur-md overflow-hidden';
const checklistWidth = {
	mobile: 'calc(100vw - 2rem)',
	desktop: 'min(360px, calc(100vw - 2rem))',
};
const pillMaxWidth = {
	mobile: 'calc(100vw - 2rem)',
	desktop: 'min(360px, calc(100vw - 2rem))',
};

export function WalkthroughSurface({
	completedCount,
	isMobile,
	mode,
	onMinimize,
	onResume,
	onSkip,
	onTaskAction,
	tasks,
}: {
	completedCount: number;
	isMobile: boolean;
	mode: 'checklist' | 'pill';
	onMinimize: () => void;
	onResume: () => void;
	onSkip: () => void;
	onTaskAction: (taskId: OnboardingTaskId) => void;
	tasks: Record<OnboardingTaskId, boolean>;
}) {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const isChecklist = mode === 'checklist';
	const wrapperClassName = isMobile
		? 'fixed inset-x-4 z-[60] flex justify-start'
		: 'fixed right-4 z-[60] flex justify-end';
	const shellTransition = shouldReduceMotion
		? { duration: 0.12, ease: 'easeOut' as const }
		: {
				duration: 0.3,
				ease: 'easeOut' as const,
				transition: {
					borderRadius: {
						duration: 0.1,
						ease: 'easeOut' as const,
					},
					filter: {
						duration: 0.1,
						ease: 'easeOut' as const,
					},
					opacity: {
						duration: 0.1,
						ease: 'easeOut' as const,
					},
				},
			};
	const contentTransition = shouldReduceMotion
		? { duration: 0.02, ease: 'easeOut' as const }
		: {
				duration: 0.3,
				ease: 'easeOut' as const,
				transition: {
					borderRadius: {
						duration: 0.1,
						ease: 'easeOut' as const,
					},
					filter: {
						duration: 0.1,
						ease: 'easeOut' as const,
					},
					opacity: {
						duration: 0.1,
						ease: 'easeOut' as const,
					},
				},
			};
	const surfaceStyle = isChecklist
		? {
				width: 'calc(100vw - 2rem)',
				minWidth: 320,
				maxWidth: 400,
				borderRadius: isMobile ? 28 : 24,
				paddingTop: 16,
				paddingRight: 16,
				paddingBottom: 16,
				paddingLeft: 16,
			}
		: {
				width: 'calc(100vw - 2rem)',
				maxWidth: 400,
				borderRadius: 64,
				paddingTop: isMobile ? 10 : 12,
				paddingRight: 16,
				paddingBottom: isMobile ? 10 : 12,
				paddingLeft: 16,
			};

	return (
		<div
			className={wrapperClassName}
			data-testid={
				isChecklist ? 'onboarding-checklist' : 'onboarding-minimized-pill'
			}
			style={{
				top: isMobile
					? ONBOARDING_MOBILE_TOP_OFFSET
					: ONBOARDING_DESKTOP_TOP_OFFSET,
			}}
		>
			<motion.div
				animate={{
					...surfaceStyle,
					opacity: 1,
				}}
				className={surfaceBaseClassName}
				exit={{ opacity: 0 }}
				initial={false}
				layout
				layoutId='onboarding-walkthrough-surface'
				transition={shellTransition}
				whileTap={isChecklist ? undefined : { scale: 0.98 }}
			>
				<AnimatePresence initial={false} mode='popLayout'>
					{isChecklist ? (
						<motion.div
							key='checklist'
							layoutId='onboarding-walkthrough-content'
							animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
							exit={{
								opacity: 0,
								filter: 'blur(4px)',
								scale: 0,
								y: shouldReduceMotion ? 0 : -6,
							}}
							initial={{
								opacity: 0,
								filter: 'blur(4px)',
								scale: 0,
								y: shouldReduceMotion ? 0 : 6,
							}}
							transition={contentTransition}
						>
							<ChecklistContent
								completedCount={completedCount}
								onMinimize={onMinimize}
								onSkip={onSkip}
								onTaskAction={onTaskAction}
								tasks={tasks}
							/>
						</motion.div>
					) : (
						<motion.div
							key='pill'
							layoutId='onboarding-walkthrough-content'
							animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
							exit={{
								opacity: 0,
								filter: 'blur(4px)',
								scale: 0,
								y: shouldReduceMotion ? 0 : -4,
							}}
							initial={{
								opacity: 0,
								filter: 'blur(4px)',
								scale: 0,
								y: shouldReduceMotion ? 0 : 4,
							}}
							transition={contentTransition}
						>
							<MinimizedPillContent
								completedCount={completedCount}
								onResume={onResume}
								onTaskAction={onTaskAction}
								tasks={tasks}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}
