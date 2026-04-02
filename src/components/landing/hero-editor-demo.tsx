'use client';

import { PreviewNodeRenderer } from '@/components/node-editor/components/preview/preview-node-renderer';
import type { ParsedPreview } from '@/components/node-editor/components/preview/transform-preview-data';
import { parseInput } from '@/components/node-editor/core/parsers/pattern-extractor';
import { cn } from '@/utils/cn';
import { CheckSquare, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;
const FRAME_DURATION_MS = 3400;

type EditorLineTone = 'command' | 'tag' | 'task' | 'hint';

interface DemoFrame {
	id: string;
	input: string;
	preview: ParsedPreview;
}

const frameInputs = [
	{
		id: 'draft',
		input:
			'$task\n[ ] Tighten mobile hero trust\n:pending !high #landing #mobile',
	},
	{
		id: 'structure',
		input:
			'$task\n[ ] Tighten mobile hero trust\n[ ] Align pricing and FAQ rhythm\n:in-progress !high #landing #mobile',
	},
	{
		id: 'resolved',
		input:
			'$task\n[x] Tighten mobile hero trust\n[ ] Align pricing and FAQ rhythm\n[ ] Restore clear screenshot hierarchy\n:in-progress !high #landing #mobile',
	},
];

const editorFrames: DemoFrame[] = frameInputs.map((frame) => {
	const cleanInput = frame.input.replace(/\$\w+\s*/, '').trim();

	return {
		id: frame.id,
		input: frame.input,
		preview: parseInput(cleanInput) as ParsedPreview,
	};
});

const lineToneClasses: Record<EditorLineTone, string> = {
	command: 'text-primary-200',
	tag: 'text-brand-coral/90',
	task: 'text-white/82',
	hint: 'text-white/38',
};

function getLineTone(line: string): EditorLineTone {
	if (line.startsWith('$')) return 'command';
	if (line.startsWith('[')) return 'task';
	if (line.startsWith(':') || line.startsWith('!') || line.startsWith('#')) {
		return 'tag';
	}
	return 'hint';
}

export function HeroEditorDemo() {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const finalFrameIndex = editorFrames.length - 1;
	const [frameIndex, setFrameIndex] = useState(
		shouldReduceMotion ? finalFrameIndex : 0
	);

	useEffect(() => {
		if (shouldReduceMotion) {
			setFrameIndex(finalFrameIndex);
			return;
		}

		setFrameIndex(0);
		const intervalId = window.setInterval(() => {
			setFrameIndex((current) => (current + 1) % editorFrames.length);
		}, FRAME_DURATION_MS);

		return () => window.clearInterval(intervalId);
	}, [finalFrameIndex, shouldReduceMotion]);

	const activeFrame = editorFrames[frameIndex];

	return (
		<motion.div
			layout
			transition={{ duration: 0.36, ease: EASE_OUT_QUART }}
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
				transition={{ duration: 0.36, ease: EASE_OUT_QUART }}
				className='relative grid gap-3 p-3 md:grid-cols-[minmax(18rem,0.82fr)_minmax(24rem,1.18fr)] md:items-stretch md:gap-0 md:p-6 lg:grid-cols-[minmax(22rem,0.88fr)_minmax(30rem,1.12fr)] lg:p-7'
			>
				<motion.div
					layout
					transition={{ duration: 0.36, ease: EASE_OUT_QUART }}
					className='rounded-[1rem] border border-white/8 bg-black/22 px-3 py-3.5 md:min-h-[20.5rem] md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:pr-6 lg:min-h-[24rem] lg:pr-8'
				>
					<p className='text-[9px] font-medium uppercase tracking-[0.26em] text-white/36'>
						Input
					</p>

					<motion.div
						layout
						transition={{ duration: 0.36, ease: EASE_OUT_QUART }}
						className='mt-3 flex flex-col justify-start space-y-2 font-mono text-[12px] leading-5 min-h-[9rem] md:text-[13px] lg:min-h-[17rem] lg:text-[14px] lg:leading-6'
					>
						{activeFrame.input.split('\n').map((line, index) => (
							<motion.div
								key={`${index}-${line}`}
								layout='position'
								initial={
									shouldReduceMotion
										? { opacity: 1, y: 0 }
										: { opacity: 0, y: 8 }
								}
								animate={{ opacity: 1, y: 0 }}
								transition={
									shouldReduceMotion
										? { duration: 0 }
										: { duration: 0.22, ease: EASE_OUT_QUART }
								}
							>
								<span className={cn(lineToneClasses[getLineTone(line)])}>
									{line}
								</span>
							</motion.div>
						))}
					</motion.div>
				</motion.div>

				<motion.div
					layout
					transition={{ duration: 0.36, ease: EASE_OUT_QUART }}
					className='rounded-[1rem] border border-white/8 bg-black/22 px-3 py-3 min-h-[20rem] md:rounded-none md:border-0 md:border-l md:border-white/8 md:bg-transparent md:px-0 md:py-0 md:pl-6 lg:min-h-[24rem] lg:pl-8'
				>
					<p className='text-[9px] font-medium uppercase tracking-[0.26em] text-white/36'>
						Preview
					</p>

					<motion.div
						layout
						transition={{ duration: 0.36, ease: EASE_OUT_QUART }}
						className='mt-3 min-h-[12.5rem] overflow-hidden md:min-h-[17.25rem] lg:min-h-[20.5rem]'
					>
						<PreviewNodeRenderer
							nodeType='taskNode'
							preview={activeFrame.preview}
						/>
					</motion.div>
				</motion.div>
			</motion.div>
		</motion.div>
	);
}
