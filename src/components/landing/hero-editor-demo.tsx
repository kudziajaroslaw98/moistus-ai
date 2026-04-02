'use client';

import { PreviewNodeRenderer } from '@/components/node-editor/components/preview/preview-node-renderer';
import type { ParsedPreview } from '@/components/node-editor/components/preview/transform-preview-data';
import { parseInput } from '@/components/node-editor/core/parsers/pattern-extractor';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckSquare, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const SEAMLESS_SPRING = {
	type: 'spring',
	stiffness: 240,
	damping: 32,
	mass: 0.72,
	bounce: 0,
} as const;

type EditorLineTone = 'command' | 'tag' | 'task' | 'hint';
type HeroPreviewNodeType =
	| 'textNode'
	| 'defaultNode'
	| 'questionNode'
	| 'taskNode';
type PreviewWidth = 'text' | 'note' | 'question' | 'task';

interface FrameInput {
	id: string;
	nodeType: HeroPreviewNodeType;
	input: string;
	durationMs: number;
	previewWidth: PreviewWidth;
}

interface DemoFrame extends FrameInput {
	preview: ParsedPreview;
}

const frameInputs: FrameInput[] = [
	{
		id: 'text-seed',
		nodeType: 'textNode',
		input:
			'$text\nWe leave the call aligned, then lose it an hour later.',
		durationMs: 3400,
		previewWidth: 'text',
	},
	{
		id: 'note-clarified',
		nodeType: 'defaultNode',
		input:
			'$note\nAfter the call, decisions, owners, and next steps end up split across chat, docs, and memory. #handoff !high',
		durationMs: 5000,
		previewWidth: 'note',
	},
	{
		id: 'question',
		nodeType: 'questionNode',
		input:
			'$question\nWhat should the map lock before the team leaves the call? question:multiple options:[Decision, Owner, Next step] #handoff',
		durationMs: 6200,
		previewWidth: 'question',
	},
	{
		id: 'task',
		nodeType: 'taskNode',
		input:
			'$task\n[ ] Capture decisions\n[ ] Assign owners\n[ ] Share next steps\n:in-progress !high #handoff',
		durationMs: 8200,
		previewWidth: 'task',
	},
];

const editorFrames: DemoFrame[] = frameInputs.map((frame) => {
	const cleanInput = frame.input.replace(/^\$\w+\s*/u, '').trim();

	return {
		...frame,
		preview: parseInput(cleanInput) as ParsedPreview,
	};
});

const lineToneClasses: Record<EditorLineTone, string> = {
	command: 'text-primary-200/68',
	tag: 'text-brand-coral/90',
	task: 'text-white/82',
	hint: 'text-white/74',
};

function getLineTone(line: string): EditorLineTone {
	if (line.startsWith('$')) return 'command';
	if (line.startsWith('[')) return 'task';
	if (line.startsWith(':') || line.startsWith('!') || line.startsWith('#')) {
		return 'tag';
	}
	return 'hint';
}

function getPreviewWidthClasses(previewWidth: PreviewWidth): string {
	switch (previewWidth) {
		case 'text':
			return 'w-full md:mx-auto md:max-w-[19rem] lg:max-w-[21rem]';
		case 'note':
			return 'w-full md:mx-auto md:max-w-[23rem] lg:max-w-[25rem]';
		case 'question':
			return 'w-full md:mx-auto md:max-w-[24rem] lg:max-w-[27rem]';
		case 'task':
		default:
			return 'w-full';
	}
}

export function HeroEditorDemo() {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const finalFrameIndex = editorFrames.length - 1;
	const [frameIndex, setFrameIndex] = useState(
		shouldReduceMotion ? finalFrameIndex : 0
	);

	const activeFrame = editorFrames[frameIndex];
	const activeLines = useMemo(
		() => activeFrame.input.split('\n'),
		[activeFrame.input]
	);

	useEffect(() => {
		if (shouldReduceMotion) {
			setFrameIndex(finalFrameIndex);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setFrameIndex((current) => (current + 1) % editorFrames.length);
		}, activeFrame.durationMs);

		return () => window.clearTimeout(timeoutId);
	}, [activeFrame.durationMs, finalFrameIndex, shouldReduceMotion]);

	return (
		<motion.div
			layout
			transition={SEAMLESS_SPRING}
			className='relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,16,22,0.96),rgba(9,11,16,0.9))] shadow-[0_24px_70px_rgba(0,0,0,0.34)] md:rounded-[2rem] md:shadow-[0_28px_90px_rgba(0,0,0,0.36)] lg:rounded-[2.15rem]'
		>
			<div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(96,165,250,0.08),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(96,165,250,0.16),transparent_32%),radial-gradient(circle_at_52%_75%,rgba(224,133,106,0.08),transparent_22%)]' />
			<div className='absolute inset-0 bg-[url("/grid.svg")] bg-[length:64px_64px] opacity-[0.06] [mask-image:linear-gradient(180deg,black,rgba(0,0,0,0.32))]' />

			<div className='relative flex items-center justify-between border-b border-white/8 px-4 py-3 md:px-6 md:py-4 lg:px-7 lg:py-5'>
				<span className='inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-text-secondary'>
					<CheckSquare className='h-3.5 w-3.5 text-primary-300' />
					Node editor
				</span>
				<span className='inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/42'>
					<Sparkles className='h-3 w-3 text-primary-300' />
					Live preview
				</span>
			</div>

			<motion.div
				layout
				transition={SEAMLESS_SPRING}
				className='relative grid gap-3 p-3 md:grid-cols-[minmax(18rem,0.82fr)_minmax(24rem,1.18fr)] md:items-stretch md:gap-0 md:p-6 lg:grid-cols-[minmax(22rem,0.88fr)_minmax(30rem,1.12fr)] lg:p-7'
			>
				<div className='rounded-[1rem] border border-white/8 bg-black/22 px-3 py-3.5 md:h-[20.5rem] md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:pr-6 lg:h-[24rem] lg:pr-8'>
					<p className='text-[9px] font-medium uppercase tracking-[0.26em] text-white/36'>
						Input
					</p>

					<div className='mt-3 flex h-[9.5rem] flex-col justify-start space-y-2 font-mono text-[12px] leading-5 md:h-[17rem] md:text-[13px] lg:h-[19.25rem] lg:text-[14px] lg:leading-6'>
						<AnimatePresence initial={false} mode='popLayout'>
							{activeLines.map((line, index) => (
								<motion.div
									key={`${activeFrame.id}-${index}-${line}`}
									layout='position'
									initial={
										shouldReduceMotion
											? { opacity: 1, y: 0 }
											: { opacity: 0, y: 12 }
									}
									animate={{ opacity: 1, y: 0 }}
									exit={
										shouldReduceMotion
											? { opacity: 1, y: 0 }
											: { opacity: 0, y: -10 }
									}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: {
													...SEAMLESS_SPRING,
													delay: index * 0.05,
											  }
									}
									className='will-change-transform'
								>
									<span
										className={cn(
											'block text-pretty',
											lineToneClasses[getLineTone(line)]
										)}
									>
										{line}
									</span>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</div>

				<div className='rounded-[1rem] border border-white/8 bg-black/22 px-3 py-3 md:h-[20.5rem] md:rounded-none md:border-0 md:border-l md:border-white/8 md:bg-transparent md:px-0 md:py-0 md:pl-6 lg:h-[24rem] lg:pl-8'>
					<p className='text-[9px] font-medium uppercase tracking-[0.26em] text-white/36'>
						Preview
					</p>

					<div className='mt-3 h-[12.5rem] overflow-hidden md:h-[17.25rem] lg:h-[20.5rem]'>
						<div className='flex h-full items-start justify-center'>
							<motion.div
								layout
								transition={SEAMLESS_SPRING}
								className={cn(
									'h-full',
									getPreviewWidthClasses(activeFrame.previewWidth)
								)}
							>
								<AnimatePresence initial={false} mode='popLayout'>
									<motion.div
										key={activeFrame.id}
										layout
										initial={
											shouldReduceMotion
												? { opacity: 1, y: 0 }
												: { opacity: 0, y: 14 }
										}
										animate={{ opacity: 1, y: 0 }}
										exit={
											shouldReduceMotion
												? { opacity: 1, y: 0 }
												: { opacity: 0, y: -14 }
										}
										transition={
											shouldReduceMotion
												? { duration: 0 }
												: SEAMLESS_SPRING
										}
										className='h-full will-change-transform'
									>
										<PreviewNodeRenderer
											nodeType={activeFrame.nodeType}
											preview={activeFrame.preview}
										/>
									</motion.div>
								</AnimatePresence>
							</motion.div>
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}
