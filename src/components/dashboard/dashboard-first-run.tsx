'use client';

import { useTouchFirst } from '@/hooks/use-touch-first';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { MapCover } from './map-cover';
import { QuickCreateForm } from './quick-create-bar';
import { RoomCodeJoin } from './room-code-join';
import type { DashboardTemplate } from './use-dashboard-data';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface DashboardFirstRunProps {
	firstName: string | null;
	templates: DashboardTemplate[];
	isCreating: boolean;
	onCreate: (title: string) => Promise<void> | void;
	onOpenDialog: () => void;
	onPickTemplate: (template: DashboardTemplate) => void;
}

function Kbd({ children }: { children: string }) {
	return (
		<kbd className='rounded-[5px] border border-b-2 border-[#2a2c33] px-1.5 py-px font-mono text-[11px] text-zinc-300'>
			{children}
		</kbd>
	);
}

/** Dashboard for a signed-in user with no maps yet. */
export function DashboardFirstRun({
	firstName,
	templates,
	isCreating,
	onCreate,
	onOpenDialog,
	onPickTemplate,
}: DashboardFirstRunProps) {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const isTouchFirst = useTouchFirst();
	const featured = templates.slice(0, 3);

	const rise = (delay: number) =>
		({
			initial: shouldReduceMotion ? false : { opacity: 0, y: 10 },
			animate: { opacity: 1, y: 0 },
			transition: { duration: 0.35, ease: EASE_OUT_QUART, delay },
		}) as const;

	return (
		<div>
			<motion.div {...rise(0)}>
				<h1 className='text-3xl font-bold leading-tight tracking-[-0.02em]'>
					{firstName ? `Welcome to Shiko, ${firstName}.` : 'Welcome to Shiko.'}
				</h1>

				<p className='mt-2 text-[15px] text-zinc-400'>
					Every map starts with one node. Type yours and press Enter.
				</p>
			</motion.div>

			<motion.section
				{...rise(0.05)}
				aria-label='Create your first map'
				className='relative mt-7 overflow-hidden rounded-[22px] border border-[#1d1f24] bg-[#0c0d10] bg-[radial-gradient(rgba(255,255,255,0.075)_1px,transparent_1.3px)] bg-[size:22px_22px] px-6 pb-[72px] pt-[88px] text-center'
			>
				<span className='absolute left-4 top-4 rounded-full border border-[#1d1f24] bg-[#0e0f12] px-3 py-1.5 text-xs text-zinc-400'>
					New map
				</span>

				<div className='mx-auto max-w-[640px] text-left'>
					<QuickCreateForm
						autoFocus={!isTouchFirst}
						isCreating={isCreating}
						label='What is your first map about?'
						onCreate={onCreate}
						onOpenDialog={onOpenDialog}
						placeholder="What's your first map about?"
						size='lg'
					/>
				</div>

				{!isTouchFirst && (
					<ul className='mt-[22px] flex flex-wrap justify-center gap-x-[22px] gap-y-2 text-[13px] text-zinc-500'>
						<li className='flex items-center gap-2'>
							<Kbd>Enter</Kbd>
							create the map
						</li>

						<li className='flex items-center gap-2'>
							<Kbd>Ctrl + arrow</Kbd>
							then branch in any direction
						</li>

						<li className='flex items-center gap-2'>
							<Kbd>/</Kbd>
							quick-create a node
						</li>
					</ul>
				)}
			</motion.section>

			{featured.length > 0 && (
				<motion.section {...rise(0.1)} aria-labelledby='first-run-templates'>
					<div className='mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-2'>
						<h2 className='text-lg font-semibold' id='first-run-templates'>
							Or start from a template
						</h2>

						<Link
							className='group/all inline-flex items-center gap-1.5 rounded-sm py-2 text-[13px] text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
							href='/dashboard/templates'
						>
							All templates
							<ArrowRight
								aria-hidden='true'
								className='size-3 transition-transform duration-200 ease-out motion-safe:group-hover/all:translate-x-0.5'
							/>
						</Link>
					</div>

					<ul className='mt-4 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4'>
						{featured.map((template) => (
							<li key={template.id}>
								<button
									className='group/tpl block w-full overflow-hidden rounded-2xl border border-[#1d1f24] bg-[#0e0f12] text-left transition-[border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:border-[#34363e] motion-safe:[@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
									onClick={() => onPickTemplate(template)}
									type='button'
								>
									<MapCover
										className='h-[88px] border-b border-[#1d1f24]'
										seed={template.id}
										title={template.name}
									/>

									<span className='block px-4 pb-4 pt-3.5'>
										<span className='block text-[15px] font-semibold text-white'>
											{template.name}
										</span>

										{template.description && (
											<span className='mt-1 line-clamp-2 block text-[13px] text-zinc-400'>
												{template.description}
											</span>
										)}
									</span>
								</button>
							</li>
						))}
					</ul>
				</motion.section>
			)}

			<motion.div {...rise(0.15)}>
				<RoomCodeJoin />
			</motion.div>
		</div>
	);
}
