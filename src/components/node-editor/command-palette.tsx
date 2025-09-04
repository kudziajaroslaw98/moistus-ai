'use client';

import { cn } from '@/utils/cn';
import { Command } from 'cmdk';
import { memo, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Separator } from '../ui/separator';
import { commandRegistry } from './commands/command-registry';
import { Command as RegistryCommand } from './commands/types';
import useAppStore from '@/store/mind-map-store';
import { Hash, DollarSign, Zap, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

const theme = {
	input:
		'bg-zinc-950 text-zinc-100 placeholder-zinc-500 placeholder:font-medium border-0 focus:ring-0',
	item: 'h-auto hover:bg-zinc-800 py-1 cursor-pointer transition-all duration-200 aria-selected:bg-teal-800/30 hover:scale-[1.02] rounded-sm px-4',
	icon: 'text-zinc-400 group-hover:text-zinc-300 group-data-[selected=true]:text-teal-400',
	category:
		'text-xs text-zinc-500 uppercase tracking-wider font-semibold px-3 pb-1 flex items-center gap-2',
	triggerBadge: 'px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs font-mono',
	commandMeta: 'text-xs text-zinc-500 opacity-75',
};

// Category icons mapping
const categoryIcons = {
	'node-type': Hash,
	'pattern': Sparkles,
	'format': Zap,
	'template': DollarSign,
};

// Animation variants
const containerVariants = {
	hidden: { opacity: 0, scale: 0.95, y: -10 },
	visible: { 
		opacity: 1, 
		scale: 1, 
		y: 0,
		transition: {
			duration: 0.2,
			ease: [0.23, 1, 0.32, 1],
			staggerChildren: 0.02
		}
	},
	exit: { 
		opacity: 0, 
		scale: 0.95, 
		y: -10,
		transition: { duration: 0.15 }
	}
};

const itemVariants = {
	hidden: { opacity: 0, x: -8 },
	visible: { opacity: 1, x: 0 }
};

interface EnhancedCommandPaletteProps {
	onCommandExecute?: (command: RegistryCommand) => void;
	onClose?: () => void;
	className?: string;
}

const CommandPaletteComponent = ({
	onCommandExecute,
	onClose,
	className,
}: EnhancedCommandPaletteProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const itemsRef = useRef<(HTMLElement | null)[]>([]);

	// Get command palette state from store
	const {
		commandPalette,
		closeCommandPalette,
		setCommandPaletteSearch,
		setCommandPaletteSelection,
		navigateCommandPalette,
		executeCommand
	} = useAppStore(
		useShallow((state) => ({
			commandPalette: state.commandPalette,
			closeCommandPalette: state.closeCommandPalette,
			setCommandPaletteSearch: state.setCommandPaletteSearch,
			setCommandPaletteSelection: state.setCommandPaletteSelection,
			navigateCommandPalette: state.navigateCommandPalette,
			executeCommand: state.executeCommand,
		}))
	);

	// Get commands from registry based on trigger and search
	const registryCommands = useMemo(() => {
		const searchOptions: any = {
			query: commandPalette.searchQuery,
			limit: 50
		};

		// Filter by trigger type
		if (commandPalette.trigger === '$') {
			searchOptions.triggerType = 'node-type';
		} else if (commandPalette.trigger === '/') {
			searchOptions.triggerType = 'slash';
		}

		return commandRegistry.searchCommands(searchOptions);
	}, [commandPalette.searchQuery, commandPalette.trigger]);

	// Group commands by category
	const groupedCommands = useMemo(() => {
		const groups: Record<string, RegistryCommand[]> = {};

		registryCommands.forEach((cmd) => {
			const categoryLabel = cmd.category.charAt(0).toUpperCase() + cmd.category.slice(1).replace('-', ' ');

			if (!groups[categoryLabel]) {
				groups[categoryLabel] = [];
			}

			groups[categoryLabel].push(cmd);
		});

		return groups;
	}, [registryCommands]);

	// Focus input on mount or when opened
	useEffect(() => {
		if (commandPalette.isOpen) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	}, [commandPalette.isOpen]);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!commandPalette.isOpen) return;

			switch (event.key) {
				case 'ArrowUp':
					event.preventDefault();
					navigateCommandPalette('up');
					break;
				case 'ArrowDown':
					event.preventDefault();
					navigateCommandPalette('down');
					break;
				case 'Enter':
					event.preventDefault();
					handleExecuteCommand();
					break;
				case 'Escape':
					event.preventDefault();
					handleClose();
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [commandPalette.isOpen, navigateCommandPalette]);

	// Handle command execution
	const handleExecuteCommand = () => {
		const selectedCommand = registryCommands[commandPalette.selectedIndex];
		if (selectedCommand) {
			onCommandExecute?.(selectedCommand);
			executeCommand(selectedCommand as any); // Legacy support
		}
	};

	// Handle close
	const handleClose = () => {
		closeCommandPalette();
		onClose?.();
	};

	// Handle search input change
	const handleSearchChange = (value: string) => {
		setCommandPaletteSearch(value);
	};

	if (!commandPalette.isOpen) return null;

	return (
		<div className={cn(
			"fixed inset-0 z-50 bg-black/20 backdrop-blur-sm",
			className
		)}>
			<AnimatePresence>
				<motion.div
					variants={containerVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					className="absolute w-96 max-w-[90vw] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
					style={{
						left: Math.min(commandPalette.position.x, window.innerWidth - 400),
						top: Math.min(commandPalette.position.y + 20, window.innerHeight - 400),
					}}
				>
					{/* Header with trigger indication */}
					<div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
						<div className="flex items-center gap-3">
							{commandPalette.trigger && (
								<span className={theme.triggerBadge}>
									{commandPalette.trigger}
								</span>
							)}
							<span className="text-sm font-medium text-zinc-300">
								{commandPalette.trigger === '$' ? 'Node Types' : 
								 commandPalette.trigger === '/' ? 'Commands' : 'Command Palette'}
							</span>
							<span className={theme.commandMeta}>
								{registryCommands.length} commands
							</span>
						</div>
					</div>

					<Command>
						<Command.Input
							ref={inputRef}
							value={commandPalette.searchQuery}
							onValueChange={handleSearchChange}
							placeholder={commandPalette.trigger === '$' ? 'Search node types...' : 'Search commands...'}
							className={cn(theme.input, 'w-full px-4 py-3 text-sm outline-0 bg-zinc-950')}
						/>

						<Command.List className='max-h-64 overflow-y-auto p-2'>
							{registryCommands.length === 0 ? (
								<Command.Empty className='p-8 text-center'>
									<div className='text-zinc-600 mb-2'>
										<Sparkles className='w-8 h-8 mx-auto' />
									</div>
									<p className='text-sm text-zinc-500'>No commands found</p>
									<p className='text-xs text-zinc-600 mt-1'>
										Try a different search term
									</p>
								</Command.Empty>
							) : (
								Object.entries(groupedCommands).map((
									[category, categoryCommands]: [string, RegistryCommand[]],
									groupIndex
								) => {
									const CategoryIcon = categoryIcons[categoryCommands[0]?.category] || Hash;
									
									return (
										<Command.Group key={category}>
											{groupIndex > 0 && <div className='h-2' />}

											<div className={theme.category}>
												<CategoryIcon className='w-3 h-3' />
												{category}
											</div>

											<div className='flex flex-col px-2'>
												{categoryCommands.map((command, index) => {
													const Icon = command.icon;
													const globalIndex = registryCommands.findIndex(cmd => cmd.id === command.id);
													const isSelected = globalIndex === commandPalette.selectedIndex;
													
													return (
														<motion.div
															key={command.id}
															variants={itemVariants}
															whileHover={{ x: 4 }}
															whileTap={{ scale: 0.98 }}
														>
															<Command.Item
																value={command.trigger}
																onSelect={handleExecuteCommand}
																data-selected={isSelected}
																className={cn(
																	theme.item,
																	'group flex items-center gap-3 mb-1',
																	isSelected && 'bg-teal-800/30 ring-1 ring-teal-500/30'
																)}
																ref={(el) => {
																	if (globalIndex >= 0 && el) {
																		itemsRef.current[globalIndex] = el;
																	}
																}}
															>
																<Icon className={cn(theme.icon, 'w-4 h-4 flex-shrink-0')} />

																<div className='flex flex-col flex-1 min-w-0'>
																	<div className='font-medium text-sm text-zinc-100 truncate flex items-center gap-2'>
																		{command.label}
																		{command.shortcuts && command.shortcuts.length > 0 && (
																			<span className='text-xs text-zinc-500 font-mono bg-zinc-800 px-1 rounded'>
																				{command.shortcuts[0]}
																			</span>
																		)}
																	</div>

																	<div className='text-xs text-zinc-400 truncate'>
																		{command.description}
																	</div>

																	{command.examples && command.examples.length > 0 && (
																		<div className='text-xs text-zinc-600 mt-1 opacity-75'>
																			Example: {command.examples[0]}
																		</div>
																	)}
																</div>

																{command.isPro && (
																	<span className='text-xs text-teal-500 font-medium px-1.5 py-0.5 bg-teal-500/10 rounded'>
																		PRO
																	</span>
																)}
															</Command.Item>
														</motion.div>
													);
												})}
											</div>
										</Command.Group>
									);
								})
							)}
						</Command.List>
					</Command>

					{/* Enhanced Footer */}
					<div className='px-4 py-3 border-t border-zinc-800 bg-zinc-900/30'>
						<div className='flex items-center justify-between text-xs text-zinc-500'>
							<div className='flex items-center gap-4'>
								<span className='flex gap-1 items-center'>
									<kbd className='px-1.5 py-0.5 bg-zinc-800/75 rounded text-zinc-400 font-mono'>↑↓</kbd>
									navigate
								</span>
								<span className='flex gap-1 items-center'>
									<kbd className='px-1.5 py-0.5 bg-zinc-800/75 rounded text-zinc-400 font-mono'>↵</kbd>
									select
								</span>
								<span className='flex gap-1 items-center'>
									<kbd className='px-1.5 py-0.5 bg-zinc-800/75 rounded text-zinc-400 font-mono'>esc</kbd>
									close
								</span>
							</div>
							<div className='text-zinc-600'>
								Command Registry
							</div>
						</div>
					</div>
				</motion.div>
			</AnimatePresence>
		</div>
	);
};

export const CommandPalette = memo(CommandPaletteComponent);
CommandPalette.displayName = 'EnhancedCommandPalette';