import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Reveal } from './reveal';

const NODE_FILL = '#1e1e1e';
const NODE_STROKE = 'rgba(255,255,255,0.14)';
const EDGE = '#6c757d';

function Diagram({ children }: { children: ReactNode }) {
	return (
		<svg
			aria-hidden='true'
			fill='none'
			height={48}
			viewBox='0 0 132 48'
			width={132}
		>
			{children}
		</svg>
	);
}

function Node({
	x,
	y,
	width,
	height,
	rx = 3,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	rx?: number;
}) {
	return (
		<rect
			fill={NODE_FILL}
			height={height}
			rx={rx}
			stroke={NODE_STROKE}
			width={width}
			x={x}
			y={y}
		/>
	);
}

const useCases: Array<{ title: string; description: string; diagram: ReactNode }> = [
	{
		title: 'Product launches',
		description: 'Scope, tasks and dates on one map the whole team can see.',
		diagram: (
			<Diagram>
				<g stroke={EDGE} strokeWidth={1.2}>
					<path d='M34 24 L62 9' />

					<path d='M34 24 H62' />

					<path d='M34 24 L62 39' />

					<path d='M94 9 H106' />

					<path d='M94 39 H106' />
				</g>

				<Node height={14} rx={3} width={32} x={2} y={17} />

				<Node height={10} width={32} x={62} y={4} />

				<Node height={10} width={32} x={62} y={19} />

				<Node height={10} width={32} x={62} y={34} />

				<Node height={10} width={24} x={106} y={4} />

				<Node height={10} width={24} x={106} y={34} />
			</Diagram>
		),
	},
	{
		title: 'Research synthesis',
		description: 'Group interview notes into themes, then link the evidence.',
		diagram: (
			<Diagram>
				<g stroke={NODE_STROKE} strokeDasharray='3 3'>
					<rect height={44} rx={6} width={56} x={2} y={2} />

					<rect height={44} rx={6} width={56} x={74} y={2} />
				</g>

				<Node height={9} width={42} x={9} y={9} />

				<Node height={9} width={34} x={9} y={22} />

				<Node height={9} width={40} x={81} y={9} />

				<Node height={9} width={30} x={81} y={22} />

				<Node height={7} width={36} x={81} y={34} />

				<path d='M58 24 H74' stroke={EDGE} strokeWidth={1.2} />
			</Diagram>
		),
	},
	{
		title: 'Study notes & theses',
		description: 'Chapters, sources and open questions in one navigable outline.',
		diagram: (
			<Diagram>
				<g stroke={EDGE} strokeWidth={1.2}>
					<path d='M66 14 V22 H22 V30' />

					<path d='M66 14 V30' />

					<path d='M66 22 H110 V30' />
				</g>

				<Node height={12} width={36} x={48} y={2} />

				<Node height={10} width={36} x={4} y={30} />

				<Node height={10} width={36} x={48} y={30} />

				<Node height={10} width={36} x={92} y={30} />
			</Diagram>
		),
	},
	{
		title: 'Workshops & brainstorms',
		description: 'Run the session live and let AI suggest the angles nobody raised.',
		diagram: (
			<Diagram>
				<g stroke={EDGE} strokeWidth={1.2}>
					<path d='M66 24 L28 8' />

					<path d='M66 24 L104 8' />

					<path d='M66 24 L24 40' />

					<path d='M66 24 L108 40' strokeDasharray='3 3' />
				</g>

				<Node height={12} width={32} x={50} y={18} />

				<Node height={10} width={30} x={8} y={3} />

				<Node height={10} width={30} x={94} y={3} />

				<Node height={10} width={30} x={6} y={35} />

				<rect
					fill='rgba(113,113,122,0.15)'
					height={10}
					rx={3}
					stroke='rgba(255,255,255,0.2)'
					strokeDasharray='3 2'
					width={30}
					x={96}
					y={35}
				/>
			</Diagram>
		),
	},
	{
		title: 'Architecture sketches',
		description: 'Code nodes, decisions and trade-offs, side by side.',
		diagram: (
			<Diagram>
				<Node height={32} rx={4} width={38} x={2} y={8} />

				<Node height={32} rx={4} width={38} x={92} y={8} />

				<Node height={14} width={20} x={56} y={17} />

				<g stroke={EDGE} strokeLinecap='round' strokeWidth={1.5}>
					<path d='M8 17 H28' />

					<path d='M12 24 H34' />

					<path d='M12 31 H24' />

					<path d='M98 17 H118' />

					<path d='M102 24 H124' />

					<path d='M40 24 H56' />

					<path d='M76 24 H92' />
				</g>
			</Diagram>
		),
	},
	{
		title: 'Personal planning',
		description: 'Goals broken down into tasks you can actually tick off.',
		diagram: (
			<Diagram>
				<g stroke={EDGE} strokeWidth={1.2}>
					<path d='M30 24 H44' />

					<path d='M72 24 H86' />
				</g>

				<Node height={12} width={28} x={2} y={18} />

				<Node height={12} width={28} x={44} y={18} />

				<Node height={12} width={44} x={86} y={18} />

				<path
					d='m51 24 3 3 5-6'
					stroke='#34d399'
					strokeLinecap='round'
					strokeLinejoin='round'
					strokeWidth={2}
				/>
			</Diagram>
		),
	},
];

export function UseCasesSection() {
	return (
		<section
			aria-labelledby='use-cases-title'
			className='px-6 pt-40 lg:px-8'
			id='use-cases'
		>
			<div className='mx-auto max-w-[1200px]'>
				<div className='flex flex-wrap items-end justify-between gap-x-14 gap-y-6'>
					<div>
						<p className='font-mono text-xs uppercase tracking-[0.14em] text-text-tertiary'>
							Same canvas, any kind of thinking
						</p>

						<h2
							className='mt-4 font-lora text-4xl font-semibold leading-[1.02] tracking-tight md:text-[3.5rem]'
							id='use-cases-title'
						>
							What will you map first?
						</h2>
					</div>

					<Link
						className='inline-flex min-h-11 items-center gap-2 text-[15px] text-[#d4d4d8] transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
						href='/dashboard/templates'
					>
						Browse templates
						<ArrowRight aria-hidden='true' className='size-3.5' />
					</Link>
				</div>

				<Reveal className='mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{useCases.map((useCase) => (
						<article
							className='rounded-[18px] border border-white/8 bg-[#0c0c0e] p-6'
							key={useCase.title}
						>
							{useCase.diagram}

							<h3 className='mt-5 text-lg font-semibold'>{useCase.title}</h3>

							<p className='mt-2 text-[15px] leading-relaxed text-text-secondary'>
								{useCase.description}
							</p>
						</article>
					))}
				</Reveal>
			</div>
		</section>
	);
}
