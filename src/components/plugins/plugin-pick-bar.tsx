'use client';

import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { Circle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

/**
 * Shown while a plugin waits for the person to click nodes on the canvas ("Add a stop").
 * The plugin says what it's for (`title`) and how it's going (`hint`); Esc or Done ends it.
 * Clicks on nodes are handled by the canvas, which hands them to `pickPluginNode`.
 */
export function PluginPickBar() {
	const reduceMotion = useReducedMotion();
	const { pick, stop, hasNode } = useAppStore(
		useShallow((state) => ({
			pick: state.pluginPick,
			stop: state.stopPluginPick,
			hasNode: state.pluginPick
				? state.nodes.some((node) => node.id === state.pluginPick?.nodeId)
				: false,
		}))
	);
	const picking = pick !== null;

	useEffect(() => {
		if (!picking) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			stop();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [picking, stop]);

	// The plugin node was deleted (or the map changed) while picking.
	useEffect(() => {
		if (picking && !hasNode) stop();
	}, [picking, hasNode, stop]);

	if (!pick) return null;

	return (
		<div className='pointer-events-none absolute inset-x-0 bottom-6 z-[37] flex justify-center px-4'>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				aria-label={pick.title}
				className='pointer-events-auto flex w-full max-w-[700px] items-center gap-3.5 rounded-xl border border-blue-400/35 bg-[#0f0f10] py-2.5 pr-2.5 pl-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
				initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
				role='status'
				transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
			>
				<Circle aria-hidden className='size-4 shrink-0 text-blue-400/90' />

				<div className='min-w-0 flex-1'>
					<p className='truncate text-[13px] font-semibold text-zinc-50'>
						{pick.title}
					</p>

					{pick.hint && (
						<p className='mt-0.5 truncate text-xs text-text-secondary'>
							{pick.hint}
						</p>
					)}
				</div>

				<span className='hidden shrink-0 text-xs text-text-secondary sm:block'>
					<kbd className='rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-200'>
						Esc
					</kbd>{' '}
					to finish
				</span>

				<Button onClick={stop} size='sm'>
					Done
				</Button>
			</motion.div>
		</div>
	);
}
