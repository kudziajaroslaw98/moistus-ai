'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useContributions } from '@/hooks/extensions/use-contributions';
import {
	matchesPaletteQuery,
	resolvePaletteDescription,
	selectPaletteEntries,
	type PaletteEntry,
} from '@/lib/extensions/select-contributions';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Loader2, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';

const LIST_ID = 'command-palette-list';
const optionId = (id: string) => `command-palette-option-${id}`;

/**
 * Ctrl/Cmd+K command palette. Lists every contribution placed in 'commandPalette'
 * (built-in AI actions and commands today, plugin commands later).
 */
export function CommandPalette() {
	const isOpen = useAppStore((state) => state.popoverOpen.commandPalette);
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
	const selectedNodes = useAppStore((state) => state.selectedNodes);
	const { contributions, createContext, runContribution } = useContributions();

	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);

	const selectedNodeId = selectedNodes.length === 1 ? selectedNodes[0].id : null;
	const entries = useMemo(
		() => selectPaletteEntries(contributions, createContext, selectedNodeId),
		[contributions, createContext, selectedNodeId]
	);
	const visibleEntries = useMemo(
		() => entries.filter((entry) => matchesPaletteQuery(entry, query)),
		[entries, query]
	);
	const safeActiveIndex = Math.min(
		activeIndex,
		Math.max(0, visibleEntries.length - 1)
	);
	const activeEntry = visibleEntries[safeActiveIndex];

	const close = () => {
		setPopoverOpen({ commandPalette: false });
		setQuery('');
		setActiveIndex(0);
	};

	const runEntry = (entry: PaletteEntry) => {
		if (entry.contribution.isBusy?.(entry.ctx)) return;
		// Close first so commands that open other UI (e.g. canvas search) get focus.
		close();
		runContribution(entry.contribution, entry.ctx);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (visibleEntries.length === 0) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex((safeActiveIndex + 1) % visibleEntries.length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(
				(safeActiveIndex - 1 + visibleEntries.length) % visibleEntries.length
			);
		} else if (event.key === 'Enter' && activeEntry) {
			event.preventDefault();
			runEntry(activeEntry);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent
				aria-label='Command palette'
				className='top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl'
				showCloseButton={false}
			>
				<div className='flex items-center gap-3 border-b border-border-default px-4'>
					<Search aria-hidden className='size-4 shrink-0 text-text-tertiary' />

					<input
						aria-expanded
						aria-autocomplete='list'
						aria-controls={LIST_ID}
						aria-label='Search commands'
						autoComplete='off'
						className='h-12 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary'
						placeholder='Type a command…'
						role='combobox'
						spellCheck={false}
						value={query}
						onKeyDown={handleKeyDown}
						aria-activedescendant={
							activeEntry ? optionId(activeEntry.contribution.id) : undefined
						}
						onChange={(event) => {
							setQuery(event.target.value);
							setActiveIndex(0);
						}}
					/>
				</div>

				{visibleEntries.length === 0 ? (
					<p className='px-4 py-6 text-center text-sm text-text-tertiary'>
						No matching commands
					</p>
				) : (
					<ul
						className='max-h-80 overflow-y-auto py-1'
						id={LIST_ID}
						role='listbox'
					>
						{visibleEntries.map((entry, index) => {
							const { contribution, ctx } = entry;
							const EntryIcon = contribution.icon;
							const isBusy = contribution.isBusy?.(ctx) ?? false;
							const isActive = index === safeActiveIndex;

							return (
								<li
									aria-disabled={isBusy}
									aria-selected={isActive}
									id={optionId(contribution.id)}
									key={contribution.id}
									role='option'
									onClick={() => runEntry(entry)}
									onMouseMove={() => setActiveIndex(index)}
									className={cn(
										'mx-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5',
										'transition-colors duration-200 ease',
										isActive && 'bg-elevated',
										isBusy && 'cursor-not-allowed opacity-50'
									)}
								>
									<span
										className={cn(
											'text-text-secondary',
											isActive && 'text-primary-400'
										)}
									>
										{isBusy ? (
											<Loader2 className='size-4 animate-spin' />
										) : (
											<EntryIcon className='size-4' />
										)}
									</span>

									<span className='flex min-w-0 flex-col'>
										<span className='text-sm font-medium text-text-primary'>
											{contribution.title}
										</span>

										<span className='truncate text-xs text-text-tertiary'>
											{resolvePaletteDescription(contribution, ctx)}
										</span>
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	);
}
