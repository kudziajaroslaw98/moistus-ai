'use client';

import { cn } from '@/utils/cn';
import { Command } from 'cmdk';
import { useCallback, useEffect, useRef } from 'react';
import { AnimateChangeInHeight } from '../animate-change-in-height';
import { Separator } from '../ui/separator';
import { commandCategories } from './node-commands';
import type { CommandPaletteProps, NodeCommand } from './types';

const theme = {
	input:
		'bg-zinc-950 text-zinc-100 placeholder-zinc-500 placeholder:font-medium border-0 focus:ring-0',
	item: 'h-auto hover:bg-zinc-800 py-1 cursor-pointer transition-colors aria-selected:bg-teal-800/10 rounded-sm px-4',
	icon: 'text-zinc-400 group-hover:text-zinc-300',
	category:
		'text-xs text-zinc-500 uppercase tracking-wider font-semibold px-3 pb-1',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
	commands,
	onSelectCommand,
	filterQuery,
	onFilterChange,
	activeIndex,
	itemsRef,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Group commands by category
	const groupedCommands = useCallback(() => {
		const groups: Record<string, NodeCommand[]> = {};

		commands.forEach((cmd) => {
			const category =
				commandCategories.find((cat) => cat.id === cmd.category)?.label ||
				'Other';

			if (!groups[category]) {
				groups[category] = [];
			}

			groups[category].push(cmd);
		});

		return groups;
	}, [commands]);

	const groups = groupedCommands();

	return (
		<Command>
			<Command.Input
				ref={inputRef}
				value={filterQuery}
				onValueChange={onFilterChange}
				placeholder='Type to command...'
				className={cn(theme.input, 'w-full p-6 text-sm rounded-t-md outline-0')}
			/>

			<Separator />

			<Command.List className='p-2 py-4'>
				<AnimateChangeInHeight
					easingPreset='apple'
					className='gap-4 flex flex-col'
				>
					{commands.length === 0 ? (
						<Command.Empty className='p-8 text-center'>
							<p className='text-sm text-zinc-500'>No commands found</p>

							<p className='text-xs text-zinc-600 mt-1'>
								Try a different search term
							</p>
						</Command.Empty>
					) : (
						Object.entries(groups).map(
							([category, categoryCommands], groupIndex) => (
								<Command.Group key={category} className=''>
									{groupIndex > 0 && <div className='h-2' />}

									<div className={theme.category}>{category}</div>

									<div className='flex flex-col px-4'>
										{categoryCommands.map((command, index) => {
											const Icon = command.icon;
											return (
												<Command.Item
													key={command.command}
													value={command.command}
													onSelect={() => onSelectCommand(command)}
													className={cn(
														theme.item,
														'group flex items-center gap-3'
													)}
													ref={(el) => {
														// Store refs for keyboard navigation
														const idx = commands.findIndex(
															(cmd) => cmd.command === command.command
														);

														if (idx >= 0 && el) {
															itemsRef.current[idx] = el;
														}
													}}
												>
													<Icon
														className={cn(theme.icon, 'w-4 h-4 flex-shrink-0')}
													/>

													<div className='flex flex-col h-auto p-1 min-w-0'>
														<div className='font-medium text-sm text-zinc-100 truncate'>
															{command.label}
														</div>

														<div className='text-xs text-zinc-400 truncate'>
															{command.description}
														</div>
													</div>

													{command.isPro && (
														<span className='text-xs text-teal-500 font-medium px-1.5 py-0.5 bg-teal-500/10 rounded'>
															PRO
														</span>
													)}
												</Command.Item>
											);
										})}
									</div>
								</Command.Group>
							)
						)
					)}
				</AnimateChangeInHeight>
			</Command.List>

			<div className='px-4 py-4 border-t border-zinc-800 text-xs text-zinc-500'>
				<div className='flex items-center gap-6'>
					<span className='flex gap-2 items-center'>
						<span className='px-2 py-1 bg-zinc-900/75 rounded-sm text-zinc-400 font-medium'>
							esc
						</span>

						<span>to close</span>
					</span>

					<span className='flex gap-2 items-center'>
						<span className='px-2 py-1 bg-zinc-900/75 rounded-sm text-zinc-400 font-medium'>
							↑↓
						</span>

						<span>to navigate</span>
					</span>

					<span className='flex gap-2 items-center'>
						<span className='px-2 py-1 bg-zinc-900/75 rounded-sm text-zinc-400 font-medium'>
							↵
						</span>

						<span>to select</span>
					</span>
				</div>
			</div>
		</Command>
	);
};
