import type { ReactNode } from 'react';
import { CaptureChapter } from './capture-chapter';
import { ClarityChapter } from './clarity-chapter';
import { GrowChapter } from './grow-chapter';
import { Reveal } from './reveal';
import { ShareChapter } from './share-chapter';

interface ChapterProps {
	id: string;
	number: string;
	label: string;
	meta: string;
	dotClassName?: string;
	topPadding: string;
	children: ReactNode;
}

function Chapter({
	id,
	number,
	label,
	meta,
	dotClassName = 'bg-white',
	topPadding,
	children,
}: ChapterProps) {
	return (
		<section
			aria-labelledby={`chapter-${id}`}
			className={`relative ${topPadding}`}
		>
			{/* Rail dot: marks the chapter on the vertical line (desktop only). */}
			<div
				aria-hidden='true'
				className='absolute -left-[72px] top-[110px] hidden size-10 items-center justify-center rounded-full border border-[#292929] bg-zinc-950 md:flex'
			>
				<span className={`size-2 rounded-full ${dotClassName}`} />
			</div>

			<div
				className='flex items-center justify-between gap-4 border-b border-white/8 pb-4 font-mono text-xs uppercase tracking-[0.12em] text-text-tertiary'
				id={`chapter-${id}`}
			>
				<span>
					<span className='text-white'>{number}</span>

					{` / ${label}`}
				</span>

				<span>{meta}</span>
			</div>

			<Reveal>{children}</Reveal>
		</section>
	);
}

/** The scroll story: one map grows from a loose thought into a shared plan. */
export function StorySection() {
	return (
		<div className='mx-auto w-full max-w-[1200px] px-6 lg:px-8' id='story'>
			<div className='relative md:pl-[72px]'>
				<div
					aria-hidden='true'
					className='absolute bottom-10 left-[19.5px] top-[132px] hidden w-px bg-white/8 md:block'
				/>

				<div className='pt-40'>
					<p className='font-mono text-xs uppercase tracking-[0.14em] text-text-tertiary'>
						How a map grows
					</p>

					<h2 className='mt-4 max-w-[24ch] text-balance font-lora text-3xl font-medium leading-[1.15] tracking-tight text-white md:text-[2.75rem]'>
						Follow one map from a single thought to a plan your team can run.
					</h2>

					<p className='mt-4 text-sm text-text-tertiary'>
						Every screen below is the real Shiko editor.
					</p>
				</div>

				<Chapter
					id='capture'
					label='Capture'
					meta='1 node · 4 tasks'
					number='01'
					topPadding='pt-[120px]'
				>
					<CaptureChapter />
				</Chapter>

				<Chapter
					id='grow'
					label='Grow'
					meta='4 nodes + 2 suggestions'
					number='02'
					topPadding='pt-[140px]'
				>
					<GrowChapter />
				</Chapter>

				<Chapter
					id='share'
					label='Share'
					meta='3 people, 1 map'
					number='03'
					topPadding='pt-[140px]'
				>
					<ShareChapter />
				</Chapter>

				<Chapter
					dotClassName='bg-zinc-950'
					id='clarity'
					label='Clarity'
					meta='16 nodes'
					number='04'
					topPadding='pt-[140px]'
				>
					<ClarityChapter />
				</Chapter>
			</div>
		</div>
	);
}
