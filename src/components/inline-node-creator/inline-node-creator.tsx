'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import {
	autoUpdate,
	useDismiss,
	useFloating,
	useInteractions,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { AnimateChangeInHeight } from '../animate-change-in-height';
import { CommandPalette } from './command-palette';
import { ModeToggle } from './mode-toggle';
import { nodeCommands } from './node-commands';
import { QuickInput } from './quick-input';
import { StructuredInput } from './structured-input';
import type { NodeCommand } from './types';

const animationVariants = {
	container: {
		initial: { opacity: 0, scale: 0.95, y: -10 },
		animate: {
			opacity: 1,
			scale: 1,
			y: 0,
			transition: { duration: 0.2, ease: 'easeOut' },
		},
		exit: {
			opacity: 0,
			scale: 0.95,
			y: -10,
			transition: { duration: 0.15 },
		},
	},
};

export const InlineNodeCreator = () => {
	const {
		inlineCreator,
		closeInlineCreator,
		setInlineCreatorCommand,
		setInlineCreatorMode,
		setInlineCreatorFilterQuery,
	} = useAppStore(
		useShallow((state) => ({
			inlineCreator: state.inlineCreator,
			closeInlineCreator: state.closeInlineCreator,
			setInlineCreatorCommand: state.setInlineCreatorCommand,
			setInlineCreatorMode: state.setInlineCreatorMode,
			setInlineCreatorFilterQuery: state.setInlineCreatorFilterQuery,
		}))
	);

	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const itemsRef = useRef<(HTMLElement | null)[]>([]);

	// Filter commands based on search query
	const filteredCommands = useMemo(() => {
		if (!inlineCreator.filterQuery) return nodeCommands;

		const query = inlineCreator.filterQuery.toLowerCase();
		return nodeCommands.filter(
			(cmd) =>
				cmd.command.toLowerCase().includes(query) ||
				cmd.label.toLowerCase().includes(query) ||
				cmd.description.toLowerCase().includes(query)
		);
	}, [inlineCreator.filterQuery]);

	const { refs, context } = useFloating({
		open: inlineCreator.isOpen,
		onOpenChange: (open) => {
			if (!open) closeInlineCreator();
		},

		whileElementsMounted: autoUpdate,
	});

	// Interactions
	const dismiss = useDismiss(context, {
		escapeKey: true,
		outsidePress: true,
	});

	const { getReferenceProps } = useInteractions([dismiss]);

	// Handle command selection
	const handleSelectCommand = useCallback(
		(command: NodeCommand) => {
			setInlineCreatorCommand(command.command);
			setActiveIndex(null);
		},
		[setInlineCreatorCommand]
	);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!inlineCreator.isOpen) return;

			// Tab to toggle between modes
			if (e.key === 'Tab' && !e.shiftKey) {
				e.preventDefault();
				setInlineCreatorMode(
					inlineCreator.mode === 'quick' ? 'structured' : 'quick'
				);
			}

			// Enter to select command
			if (
				e.key === 'Enter' &&
				activeIndex !== null &&
				!inlineCreator.selectedCommand
			) {
				e.preventDefault();
				const command = filteredCommands[activeIndex];

				if (command) {
					handleSelectCommand(command);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [
		inlineCreator.isOpen,
		inlineCreator.mode,
		inlineCreator.selectedCommand,
		activeIndex,
		filteredCommands,
		handleSelectCommand,
		setInlineCreatorMode,
	]);

	const selectedCommand = useMemo(
		() =>
			nodeCommands.find((cmd) => cmd.command === inlineCreator.selectedCommand),
		[inlineCreator.selectedCommand]
	);

	if (!inlineCreator.isOpen) return null;

	const theme = {
		container:
			'bg-zinc-950 border border-zinc-800 w-2xl rounded-md shadow-2xl h-auto overflow-hidden',
	};

	return (
		<div className='absolute flex flex-col items-center w-full h-full bg-zinc-950/50 z-[100] backdrop-blur-sm pt-32'>
			<AnimatePresence>
				{inlineCreator.isOpen && (
					// clicking outside this should close the inline node creator
					<motion.div
						ref={refs.setFloating}
						{...getReferenceProps()}
						className={cn(theme.container)}
						variants={animationVariants.container}
						initial='initial'
						animate='animate'
						exit='exit'
					>
						<AnimateChangeInHeight>
							{!selectedCommand ? (
								<motion.div
									variants={animationVariants.container}
									initial='initial'
									animate='animate'
									exit='exit'
								>
									<CommandPalette
										commands={filteredCommands}
										onSelectCommand={handleSelectCommand}
										filterQuery={inlineCreator.filterQuery}
										onFilterChange={setInlineCreatorFilterQuery}
										activeIndex={activeIndex}
										itemsRef={itemsRef}
									/>
								</motion.div>
							) : (
								<motion.div
									variants={animationVariants.container}
									initial='initial'
									animate='animate'
									exit='exit'
								>
									<ModeToggle
										mode={inlineCreator.mode}
										onToggle={(mode) => setInlineCreatorMode(mode)}
									/>

									{inlineCreator.mode === 'quick' ? (
										<QuickInput
											command={selectedCommand}
											parentNode={inlineCreator.parentNode}
											position={inlineCreator.position}
										/>
									) : (
										<StructuredInput
											command={selectedCommand}
											parentNode={inlineCreator.parentNode}
											position={inlineCreator.position}
										/>
									)}
								</motion.div>
							)}
						</AnimateChangeInHeight>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
