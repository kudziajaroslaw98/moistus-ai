'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import {
	FloatingPortal,
	autoPlacement,
	autoUpdate,
	flip,
	offset,
	shift,
	useDismiss,
	useFloating,
	useInteractions,
	useListNavigation,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
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

export const InlineNodeCreator: React.FC = () => {
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

	// Floating UI setup
	const { refs, floatingStyles, context } = useFloating({
		open: inlineCreator.isOpen,
		onOpenChange: (open) => {
			if (!open) closeInlineCreator();
		},
		placement: 'bottom-start',
		middleware: [
			offset(10),
			flip({
				fallbackPlacements: ['top-start', 'bottom-start'],
			}),
			shift({ padding: 20 }),
			autoPlacement({
				allowedPlacements: [
					'top-start',
					'bottom-start',
					'top-end',
					'bottom-end',
				],
			}),
		],
		whileElementsMounted: autoUpdate,
	});

	// Set reference element position
	useEffect(() => {
		if (inlineCreator.isOpen && refs.setReference) {
			// Create a virtual element at the cursor position
			const virtualElement = {
				getBoundingClientRect: () => ({
					width: 0,
					height: 0,
					x: inlineCreator.screenPosition.x,
					y: inlineCreator.screenPosition.y,
					top: inlineCreator.screenPosition.y,
					left: inlineCreator.screenPosition.x,
					right: inlineCreator.screenPosition.x,
					bottom: inlineCreator.screenPosition.y,
				}),
			};
			refs.setReference(virtualElement as any);
		}
	}, [inlineCreator.isOpen, inlineCreator.screenPosition, refs]);

	// Interactions
	const dismiss = useDismiss(context, {
		escapeKey: true,
		outsidePress: true,
	});

	const listNavigation = useListNavigation(context, {
		listRef: itemsRef,
		activeIndex,
		onNavigate: setActiveIndex,
		loop: true,
	});

	const { getReferenceProps, getFloatingProps } = useInteractions([
		dismiss,
		listNavigation,
	]);

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

	if (!inlineCreator.isOpen) return null;

	const selectedCommand = nodeCommands.find(
		(cmd) => cmd.command === inlineCreator.selectedCommand
	);

	const theme = {
		container: 'bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl',
		content: 'max-h-[480px] overflow-hidden',
	};

	return (
		<FloatingPortal>
			<AnimatePresence>
				{inlineCreator.isOpen && (
					<motion.div
						ref={refs.setFloating}
						style={floatingStyles}
						className={cn(theme.container, 'z-50')}
						variants={animationVariants.container}
						initial='initial'
						animate='animate'
						exit='exit'
						{...getFloatingProps()}
					>
						<div className={theme.content}>
							{!selectedCommand ? (
								<CommandPalette
									commands={filteredCommands}
									onSelectCommand={handleSelectCommand}
									filterQuery={inlineCreator.filterQuery}
									onFilterChange={setInlineCreatorFilterQuery}
									activeIndex={activeIndex}
									itemsRef={itemsRef}
								/>
							) : (
								<>
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

									<ModeToggle
										mode={inlineCreator.mode}
										onToggle={(mode) => setInlineCreatorMode(mode)}
									/>
								</>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	);
};
