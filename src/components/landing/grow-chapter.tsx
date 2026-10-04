import {
	ArrowRight,
	Check,
	GitBranchPlus,
	GitCommitVertical,
	GitPullRequestArrow,
} from 'lucide-react';
import { CanvasSurface, Stage } from './product/canvas-surface';
import { EDGE_AMBER, EDGE_GREY, EdgeLayer } from './product/edge-layer';
import { GhostCard } from './product/ghost-card';
import { TextNode } from './product/node-card';
import { BETA_TASKS, TaskNode } from './product/task-parts';

const SUGGESTION_TEXT = 'Prepare a press kit for early reviewers';

function SuggestedConnectionCard() {
	return (
		<div
			className='absolute w-[400px] -translate-x-1/2 -translate-y-1/2 text-xs'
			style={{ left: 730, top: 414 }}
		>
			<div className='ml-2 inline-flex items-center gap-2 rounded-t-md border border-b-0 border-amber-500/20 bg-[rgba(4,4,4,0.85)] px-4 py-1 text-[10px] text-amber-300'>
				<GitPullRequestArrow aria-hidden='true' className='size-3' />
				Suggested connection
			</div>

			<div className='rounded-md border border-amber-500/20 bg-[rgba(4,4,4,0.9)] p-6 shadow-2xl shadow-black/70'>
				<div className='flex items-center justify-between'>
					<span className='flex min-w-[150px] items-center gap-2 rounded-md border border-[#292929] bg-[rgba(34,34,34,0.4)] px-3 py-2 text-[#e5e5e5]'>
						<GitBranchPlus aria-hidden='true' className='size-4' />
						Landing page..
					</span>

					<span className='flex flex-1 justify-center'>
						<ArrowRight aria-hidden='true' className='size-4 text-amber-500' />
					</span>

					<span className='flex min-w-[150px] items-center gap-2 rounded-md border border-[#292929] bg-[rgba(34,34,34,0.4)] px-3 py-2 text-[#e5e5e5]'>
						<GitCommitVertical aria-hidden='true' className='size-4' />
						Waitlist &amp; em..
					</span>
				</div>

				<p className='mt-4 text-xs leading-normal text-[#7f7f7f]'>
					The landing page collects the sign-ups that the welcome email goes out
					to.
				</p>

				<span className='mt-5 flex h-9 items-center justify-center gap-2 rounded-md border border-[#009b28] text-sm font-medium text-[#46b250]'>
					Connect
					<Check aria-hidden='true' className='size-4' />
				</span>
			</div>
		</div>
	);
}

/** Desktop: the whole map with an AI suggestion and a suggested connection. */
function GrowDesktopFrame() {
	return (
		<CanvasSurface
			className='mt-10 hidden h-[600px] [background-size:12.8px_12.8px] md:block'
			label='The map at 80%: a root node with a checklist task node and two text nodes, an AI suggestion card with Accept and Reject buttons, and an amber suggested connection between Landing page and Waitlist and email with a Connect button'
		>
			<Stage className='origin-center scale-[0.8]' height={620} width={1260}>
				<EdgeLayer
					height={620}
					markerId='grow-arrow'
					suggestionMarkerId='grow-arrow-suggestion'
					width={1260}
				>
					<g
						markerEnd='url(#grow-arrow)'
						stroke={EDGE_GREY}
						strokeWidth={2}
					>
						<path d='M550 96 V140 H190 V176' />

						<path d='M550 96 V176' />

						<path d='M550 96 V140 H910 V176' />
					</g>

					<path
						d='M550 248 C550 470 910 470 910 252'
						markerEnd='url(#grow-arrow-suggestion)'
						stroke={EDGE_AMBER}
						strokeDasharray='8 4'
						strokeWidth={2}
					/>
				</EdgeLayer>

				<TextNode bold x={390} y={30}>
					Beta launch — March
				</TextNode>

				<TaskNode rows={BETA_TASKS} x={30} y={180} />

				<TextNode x={390} y={180}>
					Landing page
				</TextNode>

				<TextNode x={750} y={180}>
					Waitlist &amp; email
				</TextNode>

				<GhostCard
					confidence={86}
					from='Beta launch — March'
					text={SUGGESTION_TEXT}
					x={950}
					y={300}
				/>

				<SuggestedConnectionCard />
			</Stage>
		</CanvasSurface>
	);
}

/** Phone: the root with its AI suggestion; the full map is too wide to read. */
function GrowPhoneFrame() {
	return (
		<CanvasSurface
			className='mt-10 h-[340px] [background-size:14.4px_14.4px] md:hidden'
			label='On a phone: the root node with an AI suggestion card below it, offering Accept and Reject'
		>
			<Stage className='origin-center scale-90' height={290} width={320}>
				<TextNode bold x={0} y={0}>
					Beta launch — March
				</TextNode>

				<GhostCard
					confidence={86}
					from='Beta launch — March'
					text={SUGGESTION_TEXT}
					x={0}
					y={100}
				/>
			</Stage>
		</CanvasSurface>
	);
}

export function GrowChapter() {
	return (
		<>
			<div className='mt-12 flex flex-wrap items-end justify-between gap-x-14 gap-y-6'>
				<h3 className='max-w-[13ch] flex-[1_1_21rem] text-balance font-lora text-4xl font-semibold leading-[1.02] tracking-tight md:text-[3.5rem]'>
					Let the map ask what&apos;s missing.
				</h3>

				<p className='max-w-[30rem] flex-[1_1_21rem] text-[1.0625rem] leading-relaxed text-text-secondary'>
					Expand an idea into new branches or find links you haven&apos;t drawn.
					Suggestions land on the canvas, and nothing joins your map until you
					accept it.
				</p>
			</div>

			<GrowDesktopFrame />

			<GrowPhoneFrame />

			<p className='mt-5 text-sm text-text-tertiary'>
				AI comes with Pro: 100 suggestions a month. Your maps are never used to
				train AI.
			</p>
		</>
	);
}
