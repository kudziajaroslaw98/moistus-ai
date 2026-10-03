'use client';

import { getCanvasSearchMatches } from '@/helpers/canvas-search';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { ChevronDown, ChevronUp, CornerDownLeft, Search, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useShallow } from 'zustand/shallow';

/**
 * Canvas find (Ctrl/Cmd+F). Searches every node, including ones hidden inside
 * collapsed branches. Moving to a hidden match opens the collapsed nodes above
 * it, then centers it.
 */
export function CanvasSearchBar() {
	const {
		isOpen,
		query,
		activeIndex,
		nodes,
		closeCanvasSearch,
		setCanvasSearchQuery,
		setCanvasSearchActiveIndex,
		expandPathTo,
		centerOnNode,
		getVisibleNodes,
	} = useAppStore(
		useShallow((state) => ({
			isOpen: state.canvasSearch.isOpen,
			query: state.canvasSearch.query,
			activeIndex: state.canvasSearch.activeIndex,
			nodes: state.nodes,
			closeCanvasSearch: state.closeCanvasSearch,
			setCanvasSearchQuery: state.setCanvasSearchQuery,
			setCanvasSearchActiveIndex: state.setCanvasSearchActiveIndex,
			expandPathTo: state.expandPathTo,
			centerOnNode: state.centerOnNode,
			getVisibleNodes: state.getVisibleNodes,
		}))
	);
	const inputRef = useRef<HTMLInputElement>(null);
	// First Enter jumps to the current match; later presses advance.
	const hasJumpedRef = useRef(false);
	const reduceMotion = useReducedMotion();
	const matchIds = getCanvasSearchMatches(nodes, query).ids;
	const total = matchIds.length;

	useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isOpen]);

	const goTo = useCallback(
		(index: number) => {
			if (total === 0) return;
			const nextIndex = ((index % total) + total) % total;
			const targetId = matchIds[nextIndex];
			hasJumpedRef.current = true;
			setCanvasSearchActiveIndex(nextIndex);

			const isVisible = getVisibleNodes().some((node) => node.id === targetId);
			if (!isVisible) expandPathTo(targetId);
			// Let React Flow mount a freshly revealed node before centering.
			requestAnimationFrame(() => centerOnNode(targetId));
		},
		[centerOnNode, expandPathTo, getVisibleNodes, matchIds, setCanvasSearchActiveIndex, total]
	);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeCanvasSearch();
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			if (event.shiftKey) goTo(activeIndex - 1);
			else goTo(hasJumpedRef.current ? activeIndex + 1 : activeIndex);
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			inputRef.current?.select();
		}
	};

	const status =
		query.trim().length === 0
			? null
			: total === 0
				? 'No matches'
				: `${activeIndex + 1} of ${total}`;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					animate={{ opacity: 1, y: 0, scale: 1 }}
					className='nodrag nopan pointer-events-auto flex w-[min(420px,calc(100vw-2rem))] flex-col gap-1'
					data-testid='canvas-search-bar'
					exit={{ opacity: 0, y: -8, scale: 0.98 }}
					initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
					role='search'
					style={{ transformOrigin: 'top center' }}
					transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
				>
					<div className='flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-elevated/95 px-3 shadow-lg shadow-black/30 backdrop-blur-sm'>
						<Search aria-hidden className='size-4 shrink-0 text-text-tertiary' />

						<input
							aria-label='Search nodes'
							className='min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary'
							onKeyDown={handleKeyDown}
							placeholder='Find in map…'
							ref={inputRef}
							spellCheck={false}
							type='text'
							value={query}
							onChange={(event) => {
								hasJumpedRef.current = false;
								setCanvasSearchQuery(event.target.value);
							}}
						/>

						{status && (
							<span
								aria-live='polite'
								className={cn(
									'shrink-0 text-xs tabular-nums',
									total === 0 ? 'text-text-tertiary' : 'text-text-secondary'
								)}
							>
								{status}
							</span>
						)}

						<div className='flex items-center'>
							<button
								aria-label='Previous match'
								className='rounded-md p-1 text-text-secondary transition-colors duration-200 hover:bg-white/5 hover:text-text-primary disabled:opacity-40'
								disabled={total === 0}
								onClick={() => goTo(activeIndex - 1)}
								type='button'
							>
								<ChevronUp className='size-4' />
							</button>

							<button
								aria-label='Next match'
								className='rounded-md p-1 text-text-secondary transition-colors duration-200 hover:bg-white/5 hover:text-text-primary disabled:opacity-40'
								disabled={total === 0}
								onClick={() => goTo(activeIndex + 1)}
								type='button'
							>
								<ChevronDown className='size-4' />
							</button>

							<button
								aria-label='Close search'
								className='rounded-md p-1 text-text-secondary transition-colors duration-200 hover:bg-white/5 hover:text-text-primary'
								onClick={closeCanvasSearch}
								type='button'
							>
								<X className='size-4' />
							</button>
						</div>
					</div>

					{total > 0 && (
						<p className='flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary'>
							<CornerDownLeft aria-hidden className='size-3' />
							opens the branch containing the match · Shift+Enter goes back
						</p>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
