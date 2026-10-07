import { Copy, Lock, MousePointer2, Users } from 'lucide-react';
import { CanvasSurface, Stage } from './product/canvas-surface';
import { EdgeLayer, EDGE_GREY } from './product/edge-layer';
import { MockCursor } from './product/mock-cursor';
import { TextNode } from './product/node-card';

function RoomCodeCard() {
	return (
		<div className='absolute right-4 top-4 z-10 w-60 rounded-[10px] border border-[#1f1f1f] bg-[#0a0a0a] p-3.5 text-[13px] text-[#e5e5e5] shadow-2xl shadow-black/70'>
			<div className='flex items-center gap-2'>
				<span className='font-mono text-[15px] font-bold text-[#4d8eff]'>
					K7Q-4ZP
				</span>

				<span className='rounded-[4px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.15)] px-1.5 py-px text-[11px] text-[#4ade80]'>
					editor
				</span>

				<Copy aria-hidden='true' className='ml-auto size-3.5 text-[#8b8b8b]' />
			</div>

			<div className='mt-2.5 flex items-center gap-2 text-xs text-[#acacac]'>
				<Users aria-hidden='true' className='size-3.5' />
				2/5

				<span className='h-1 w-[60px] rounded-full bg-[#262626]'>
					<span className='block h-1 w-[40%] rounded-full bg-[#22c55e]' />
				</span>
			</div>
		</div>
	);
}

const shareHighlights = [
	{ icon: MousePointer2, label: 'Live cursors and presence' },
	{ icon: Lock, label: 'Viewer or editor, per room code' },
] as const;

export function ShareChapter() {
	return (
		<>
			<div className='mt-12 flex flex-wrap items-end justify-between gap-x-14 gap-y-6'>
				<h3 className='max-w-[13ch] flex-[1_1_21rem] text-balance font-lora text-4xl font-semibold leading-[1.02] tracking-tight md:text-[3.5rem]'>
					Think out loud, together.
				</h3>

				<p className='max-w-[30rem] flex-[1_1_21rem] text-[1.0625rem] leading-relaxed text-text-secondary'>
					Share a room code and your team is in the same map, live. Viewers
					don&apos;t need an account.
				</p>
			</div>

			<CanvasSurface
				className='mt-10 h-[520px] [background-size:12.8px_12.8px]'
				label='The map at 80% with two collaborators, Maya and Jonas, shown by live cursors, and a room code card for editors'
			>
				<RoomCodeCard />

				<Stage className='origin-center scale-[0.8]' height={440} width={700}>
					<EdgeLayer height={440} markerId='share-arrow' width={700}>
						<g
							markerEnd='url(#share-arrow)'
							stroke={EDGE_GREY}
							strokeWidth={2}
						>
							<path d='M350 106 V150 H170 V196' />

							<path d='M350 106 V150 H530 V196' />

							<path d='M350 106 V326' />
						</g>
					</EdgeLayer>

					<TextNode bold x={190} y={40}>
						Beta launch — March
					</TextNode>

					<TextNode x={10} y={200}>
						Landing page
					</TextNode>

					<TextNode x={370} y={200}>
						Waitlist &amp; email
					</TextNode>

					<TextNode x={190} y={330}>
						Prepare a press kit for early reviewers
					</TextNode>

					<MockCursor color='#16a34a' name='Jonas' x={236} y={232} />

					<MockCursor color='#ec4899' name='Maya' x={520} y={368} />
				</Stage>
			</CanvasSurface>

			<ul className='mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-[#d4d4d8]'>
				{shareHighlights.map((item) => (
					<li className='flex items-center gap-2.5' key={item.label}>
						<item.icon aria-hidden='true' className='size-4 text-text-tertiary' />

						{item.label}
					</li>
				))}
			</ul>
		</>
	);
}
