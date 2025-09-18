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
		'bg-zinc-950/90 text-zinc-100 placeholder-zinc-500 placeholder:font-medium border-0 focus:ring-0 backdrop-blur-sm',
	item: 'h-auto hover:bg-zinc-800/60 py-2.5 px-4 cursor-pointer transition-all duration-300 ease-out aria-selected:bg-teal-900/20 aria-selected:ring-1 aria-selected:ring-teal-500/30 hover:scale-[1.01] rounded-md',
	icon: 'text-zinc-400 group-hover:text-zinc-300 group-data-[selected=true]:text-teal-400 transition-colors duration-200',
	category:
		'text-xs text-zinc-400 uppercase tracking-wider font-semibold px-4 pb-2 pt-1 flex items-center gap-2 border-b border-zinc-800/50',
	triggerBadge: 'px-2.5 py-1 bg-zinc-800/80 text-zinc-400 rounded-md text-xs font-mono shadow-sm',
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
	hidden: { opacity: 0, scale: 0.96, y: -12 },
	visible: { 
		opacity: 1, 
		scale: 1, 
		y: 0,
		transition: {
			duration: 0.25,
			ease: [0.23, 1, 0.32, 1],
			staggerChildren: 0.03
		}
	},
	exit: { 
		opacity: 0, 
		scale: 0.96, 
		y: -8,
		transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
	}
};

const itemVariants = {
	hidden: { opacity: 0, x: -12 },
	visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } }
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
			"fixed inset-0 z-50 bg-black/30 backdrop-blur-sm",
			className
		)}>
			<AnimatePresence>
				<motion.div
					variants={containerVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					className="absolute w-[420px] max-w-[90vw] bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl shadow-2xl ring-1 ring-teal-500/10 overflow-hidden"
					style={{
						left: Math.min(commandPalette.position.x, window.innerWidth - 440),
						top: Math.min(commandPalette.position.y + 20, window.innerHeight - 500),
					}}
				>
					{/* Header with trigger indication */}
					<div className="px-4 py-3 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900/60 to-zinc-800/40">
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
							className={cn(theme.input, 'w-full px-4 py-3.5 text-sm outline-0 bg-zinc-950/80')}
						/>

						<Command.List className='max-h-[400px] overflow-y-auto p-1'>
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
											{groupIndex > 0 && <div className='h-3' />}

											<div className={theme.category}>
												<CategoryIcon className='w-3.5 h-3.5 text-teal-500/70' />

												{category}
											</div>

											<div className='flex flex-col px-1 pb-2'>
												{categoryCommands.map((command, index) => {
													const Icon = command.icon;
													const globalIndex = registryCommands.findIndex(cmd => cmd.id === command.id);
													const isSelected = globalIndex === commandPalette.selectedIndex;
													
													return (
														<motion.div
															key={command.id}
															variants={itemVariants}
															whileHover={{ x: 2, scale: 1.005 }}
															whileTap={{ scale: 0.995 }}
														>
															<Command.Item
																value={command.trigger}
																onSelect={handleExecuteCommand}
																data-selected={isSelected}
																className={cn(
																	theme.item,
																	'group flex items-center gap-3 mb-1.5 shadow-sm',
																	isSelected && 'bg-teal-900/25 ring-1 ring-teal-500/40 shadow-teal-500/10'
																)}
																ref={(el) => {
																	if (globalIndex >= 0 && el) {
																		itemsRef.current[globalIndex] = el;
																	}
																}}
															>
																<Icon className={cn(theme.icon, 'w-4.5 h-4.5 flex-shrink-0')} />

																<div className='flex flex-col flex-1 min-w-0'>
																	<div className='font-medium text-sm text-zinc-100 truncate flex items-center gap-2'>
																		{command.label}

																		{command.shortcuts && command.shortcuts.length > 0 && (
																			<span className='text-xs text-zinc-500 font-mono bg-zinc-800 px-1 rounded'>
																				{command.shortcuts[0]}
																			</span>
																		)}
																	</div>

																	<div className='text-xs text-zinc-500 truncate leading-relaxed'>
																		{command.description}
																	</div>

																	{command.examples && command.examples.length > 0 && (
																		<div className='text-xs text-zinc-600 mt-1.5 opacity-80 font-mono'>
																			Example: {command.examples[0]}
																		</div>
																	)}
																</div>

																{command.isPro && (
																	<span className='text-xs text-teal-400 font-semibold px-2 py-1 bg-teal-500/15 border border-teal-500/20 rounded-md shadow-sm'>
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
					<div className='px-4 py-3 border-t border-zinc-800/60 bg-gradient-to-r from-zinc-900/40 to-zinc-800/30 backdrop-blur-sm'>
						<div className='flex items-center justify-between text-xs text-zinc-500'>
							<div className='flex items-center gap-4'>
								<span className='flex gap-1.5 items-center'>
									<kbd className='px-2 py-1 bg-zinc-800/90 border border-zinc-700/50 rounded-md text-zinc-400 font-mono text-xs shadow-sm'>↑↓</kbd>

									<span className='text-zinc-400'>navigate</span>
								</span>

								<span className='flex gap-1.5 items-center'>
									<kbd className='px-2 py-1 bg-zinc-800/90 border border-zinc-700/50 rounded-md text-zinc-400 font-mono text-xs shadow-sm'>↵</kbd>

									<span className='text-zinc-400'>select</span>
								</span>

								<span className='flex gap-1.5 items-center'>
									<kbd className='px-2 py-1 bg-zinc-800/90 border border-zinc-700/50 rounded-md text-zinc-400 font-mono text-xs shadow-sm'>esc</kbd>

									<span className='text-zinc-400'>close</span>
								</span>
							</div>

							<div className='text-zinc-600 font-medium'>
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