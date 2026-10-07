import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	Plus,
	Sparkles,
} from 'lucide-react';
import { CanvasSurface, Stage } from './canvas-surface';
import { MockToolbar, MockTopBar } from './editor-chrome';
import { TextNode } from './node-card';

function FormatButton({
	children,
	active = false,
}: {
	children: React.ReactNode;
	active?: boolean;
}) {
	return (
		<span
			className={
				active
					? 'flex size-[30px] items-center justify-center rounded-lg border border-[rgba(96,165,250,0.4)] bg-[rgba(59,130,246,0.22)] text-white'
					: 'flex size-[30px] items-center justify-center rounded-lg border border-[#2a2a2a]'
			}
		>
			{children}
		</span>
	);
}

/**
 * Hero product frame: one selected node on an otherwise empty canvas, zoomed in.
 * Mirrors the app's selected-node chrome: format bar above, "+" below, AI button
 * to the right. The only frame that keeps the top bar and toolbar.
 */
export function HeroFrame() {
	return (
		<CanvasSurface
			className='mx-auto h-[420px] max-w-[1200px] [background-size:14px_14px] md:h-[520px] md:[background-size:28px_28px]'
			label="The Shiko editor zoomed in on one selected node reading 'launch the beta in march?', with its formatting bar, add-node button and AI button"
		>
			<MockTopBar mapName='Beta launch' />

			<Stage
				className='origin-center scale-[0.7] md:scale-[1.75]'
				height={520}
				width={1200}
			>
				<div
					className='absolute flex items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[rgba(28,28,28,0.95)] p-1.5 text-[#d4d4d4]'
					style={{ left: 503, top: 171 }}
				>
					<FormatButton>
						<Bold aria-hidden='true' className='size-3.5' />
					</FormatButton>

					<FormatButton>
						<Italic aria-hidden='true' className='size-3.5' />
					</FormatButton>

					<span className='h-5 w-px bg-[#2a2a2a]' />

					<FormatButton>
						<AlignLeft aria-hidden='true' className='size-3.5' />
					</FormatButton>

					<FormatButton active>
						<AlignCenter aria-hidden='true' className='size-3.5' />
					</FormatButton>

					<FormatButton>
						<AlignRight aria-hidden='true' className='size-3.5' />
					</FormatButton>
				</div>

				<TextNode selected x={440} y={227}>
					launch the beta in march?
				</TextNode>

				<div
					className='absolute w-px bg-white/14'
					style={{ left: 600, top: 293, height: 40 }}
				/>

				<span
					className='absolute flex size-10 items-center justify-center rounded-full border border-[#292929] bg-[#121212] text-white'
					style={{ left: 580, top: 313 }}
				>
					<Plus aria-hidden='true' className='size-5' />
				</span>

				<div
					className='absolute h-px bg-white/14'
					style={{ left: 760, top: 260, width: 24 }}
				/>

				<span
					className='absolute flex size-10 items-center justify-center rounded-full border border-[#292929] bg-[#121212] text-white'
					style={{ left: 780, top: 240 }}
				>
					<Sparkles aria-hidden='true' className='size-4' />
				</span>
			</Stage>

			<MockToolbar className='hidden md:flex' />
		</CanvasSurface>
	);
}
