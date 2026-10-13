import { CanvasSurface, Stage } from './product/canvas-surface';
import { EDGE_GREY, EdgeLayer } from './product/edge-layer';
import { TextNode } from './product/node-card';
import { BETA_TASKS, TaskNode } from './product/task-parts';

interface MapNode {
	label: string;
	x: number;
	y: number;
}

const BRANCHES: MapNode[] = [
	{ label: 'Landing page', x: 440, y: 324 },
	{ label: 'Waitlist & email', x: 440, y: 554 },
	{ label: 'Prepare a press kit for early reviewers', x: 440, y: 824 },
	{ label: 'Feedback form inside the beta', x: 440, y: 1000 },
];

const LEAVES: MapNode[] = [
	{ label: 'Hero copy', x: 880, y: 244 },
	{ label: 'Waitlist form', x: 880, y: 324 },
	{ label: 'Social preview image', x: 880, y: 404 },
	{ label: 'Welcome email', x: 880, y: 514 },
	{ label: 'Invite batches', x: 880, y: 594 },
	{ label: 'Batch 1 · 50 people', x: 1320, y: 554 },
	{ label: 'Batch 2 · 200 people', x: 1320, y: 634 },
	{ label: 'Screenshots', x: 880, y: 744 },
	{ label: 'Founder note', x: 880, y: 824 },
	{ label: 'Embargo date', x: 880, y: 904 },
];

const EDGES = [
	'M320 570 L436 107',
	'M320 570 L436 357',
	'M320 570 L436 587',
	'M320 570 L436 857',
	'M320 570 L436 1033',
	'M760 357 L876 277',
	'M760 357 L876 357',
	'M760 357 L876 437',
	'M760 587 L876 547',
	'M760 587 L876 627',
	'M1200 627 L1316 587',
	'M1200 627 L1316 667',
	'M760 857 L876 777',
	'M760 857 L876 857',
	'M760 857 L876 937',
];

export function ClarityChapter() {
	return (
		<>
			<div className='mt-12 flex flex-wrap items-end justify-between gap-x-14 gap-y-6'>
				<h3 className='max-w-[13ch] flex-[1_1_21rem] text-balance font-lora text-4xl font-semibold leading-[1.02] tracking-tight md:text-[3.5rem]'>
					Zoom out. It&apos;s a plan now.
				</h3>

				<p className='max-w-[30rem] flex-[1_1_21rem] text-[1.0625rem] leading-relaxed text-text-secondary'>
					Step back and the loose thoughts read as a plan: tidy, shared and
					ready to hand over.
				</p>
			</div>

			<CanvasSurface
				className='mt-10 h-[280px] [background-size:6px_6px] md:h-[660px] md:[background-size:8.8px_8.8px]'
				label='The full map at 55% after Auto Layout: the root Beta launch — March branches into a checklist, Landing page, Waitlist and email, a press kit and a feedback form, each with its own tasks or sub-nodes'
			>
				<Stage
					className='origin-center scale-[0.2] md:scale-[0.55]'
					height={1080}
					width={1640}
				>
					<EdgeLayer height={1080} markerId='clarity-arrow' width={1640}>
						<g
							markerEnd='url(#clarity-arrow)'
							stroke={EDGE_GREY}
							strokeWidth={2}
						>
							{EDGES.map((path) => (
								<path d={path} key={path} />
							))}
						</g>
					</EdgeLayer>

					<TextNode bold x={0} y={537}>
						Beta launch — March
					</TextNode>

					<p
						className='absolute hidden font-lora text-[30px] italic leading-tight text-brand-coral md:block'
						style={{ left: 4, top: 628 }}
					>
						↑ this was one
						<br />
						loose thought
					</p>

					<TaskNode rows={BETA_TASKS} x={440} y={0} />

					{BRANCHES.map((node) => (
						<TextNode key={node.label} x={node.x} y={node.y}>
							{node.label}
						</TextNode>
					))}

					{LEAVES.map((node) => (
						<TextNode key={node.label} x={node.x} y={node.y}>
							{node.label}
						</TextNode>
					))}
				</Stage>
			</CanvasSurface>

			<p className='mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-text-tertiary'>
				<kbd className='rounded-md border border-b-2 border-[#292929] px-[7px] py-px font-mono text-xs text-[#d4d4d8]'>
					⌘ L
				</kbd>
				tidies the whole map · export as image or PDF
			</p>
		</>
	);
}
