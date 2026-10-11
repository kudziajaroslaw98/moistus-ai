'use client';

import useAppStore from '@/store/mind-map-store';
import { ViewportPortal } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';

const NO_NODES: string[] = [];

/**
 * Numbers the nodes picked so far (1, 2, 3 …) and rings them while a plugin is waiting
 * for clicks. Drawn in the canvas's own coordinates, so it follows pan and zoom.
 */
export function PluginPickMarks() {
	const { marked, nodes } = useAppStore(
		useShallow((state) => ({
			marked: state.pluginPick?.marked ?? NO_NODES,
			nodes: state.pluginPick ? state.nodes : [],
		}))
	);
	if (marked.length === 0) return null;

	return (
		<ViewportPortal>
			{marked.map((id, index) => {
				const node = nodes.find((candidate) => candidate.id === id);
				if (!node) return null;
				const { x, y } = node.position;
				const width = node.measured?.width ?? node.width;
				const height = node.measured?.height ?? node.height;
				return (
					<div key={id}>
						{width && height ? (
							<div
								aria-hidden
								className='pointer-events-none absolute top-0 left-0 z-[1100] rounded-[10px] border border-blue-400/50 shadow-[0_0_0_6px_rgba(96,165,250,0.12)]'
								style={{ transform: `translate(${x}px, ${y}px)`, width, height }}
							/>
						) : null}

						<span
							aria-hidden
							className='pointer-events-none absolute top-0 left-0 z-[1101] flex size-[22px] items-center justify-center rounded-full bg-blue-400 text-[11px] font-bold text-zinc-950 shadow-[0_0_0_3px_#040404]'
							style={{ transform: `translate(${x - 10}px, ${y - 10}px)` }}
						>
							{index + 1}
						</span>
					</div>
				);
			})}
		</ViewportPortal>
	);
}
