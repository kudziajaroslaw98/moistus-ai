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
import { CommandPalette } from './components/command-palette';
import { QuickInput } from './components/inputs/quick-input';
import { StructuredInput } from './components/inputs/structured-input';
import { ModeToggle } from './components/mode-toggle';
import type { Command } from './core/commands/command-types';
import { getCommandByType, nodeCommands } from './core/commands/node-commands';

const animationVariants = {
	container: {
		initial: { opacity: 0, scale: 0.95, y: -10 },
		animate: {
			opacity: 1,
			scale: 1,
			y: 0,
			transition: { duration: 0.2, ease: 'easeOut' as const },
		},
		exit: {
			opacity: 0,
			scale: 0.95,
			y: -10,
			transition: { duration: 0.15 },
		},
	},
};

export const NodeEditor = () => {
	const {
		nodeEditor,
		closeNodeEditor,
		setNodeEditorCommand,
		setNodeEditorMode,
		setNodeEditorFilterQuery,
		nodes,
		resetQuickInput,
	} = useAppStore(
		useShallow((state) => ({
			nodeEditor: state.nodeEditor,
			closeNodeEditor: state.closeNodeEditor,
			setNodeEditorCommand: state.setNodeEditorCommand,
			setNodeEditorMode: state.setNodeEditorMode,
			setNodeEditorFilterQuery: state.setNodeEditorFilterQuery,
			nodes: state.nodes,
			resetQuickInput: state.resetQuickInput,
		}))
	);

	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [showTypePicker, setShowTypePicker] = useState(false);
	const itemsRef = useRef<(HTMLElement | null)[]>([]);
	const initializedRef = useRef<string | null>(null);

	// Get mode and existing node data from store
	const mode = nodeEditor.mode;
	const existingNode = nodeEditor.existingNodeId
		? nodes.find((node) => node.id === nodeEditor.existingNodeId)
		: undefined;

	// Auto-select command for existing nodes in edit mode
	useEffect(() => {
		if (
			mode === 'edit' &&
			existingNode &&
			!nodeEditor.selectedCommand &&
			!showTypePicker
		) {
			const nodeType = existingNode.data?.node_type;

			if (nodeType) {
				const command = getCommandByType(nodeType);

				if (command) {
					setNodeEditorCommand(command); // Pass full command object

					// Only reset showTypePicker if this is a new node being opened
					if (initializedRef.current !== nodeEditor.existingNodeId) {
						setShowTypePicker(false);
					}
				}
			}
		}
	}, [
		mode,
		existingNode,
		nodeEditor.selectedCommand,
		nodeEditor.existingNodeId,
		setNodeEditorCommand,
		showTypePicker,
	]);

	// Reset showTypePicker only when NodeEditor first opens for a different node
	useEffect(() => {
		if (nodeEditor.isOpen && mode === 'edit' && nodeEditor.existingNodeId) {
			// Only reset if this is a different node than last time
			if (initializedRef.current !== nodeEditor.existingNodeId) {
				setShowTypePicker(false);
				initializedRef.current = nodeEditor.existingNodeId;
			}
		}

		// Clean up when editor closes
		if (!nodeEditor.isOpen) {
			initializedRef.current = null;
			// Reset QuickInput state when editor closes to prevent stale data
			resetQuickInput();
		}
	}, [nodeEditor.isOpen, mode, nodeEditor.existingNodeId, resetQuickInput]);

	// Filter commands based on search query
	const filteredCommands = useMemo(() => {
		if (!nodeEditor.filterQuery) return nodeCommands;

		const query = nodeEditor.filterQuery.toLowerCase();
		return nodeCommands.filter(
			(cmd) =>
				cmd.trigger.toLowerCase().includes(query) ||
				cmd.label.toLowerCase().includes(query) ||
				cmd.description.toLowerCase().includes(query)
		);
	}, [nodeEditor.filterQuery]);

	const { refs, context } = useFloating({
		open: nodeEditor.isOpen,
		onOpenChange: (open) => {
			if (!open) closeNodeEditor();
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
		(command: Command) => {
			setNodeEditorCommand(command); // Pass full command object
			setActiveIndex(null);
			setShowTypePicker(false);
		},
		[setNodeEditorCommand]
	);

	// Handle showing type picker
	const handleShowTypePicker = useCallback(() => {
		setShowTypePicker(true);
		setNodeEditorCommand(null); // Clear command
		setNodeEditorFilterQuery('');
	}, [setNodeEditorCommand, setNodeEditorFilterQuery]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!nodeEditor.isOpen) return;

			// Ctrl+T to show type picker (when in content editing mode)
			if (
				(e.ctrlKey || e.metaKey) &&
				e.key === 't' &&
				nodeEditor.selectedCommand
			) {
				e.preventDefault();
				handleShowTypePicker();
				return;
			}

			// Tab to toggle between modes (when in content editing mode)
			if (e.key === 'Tab' && !e.shiftKey && nodeEditor.selectedCommand) {
				e.preventDefault();
				setNodeEditorMode(
					nodeEditor.editorMode === 'quick' ? 'structured' : 'quick'
				);
			}

			// Enter to select command (when in type picker mode)
			if (
				e.key === 'Enter' &&
				activeIndex !== null &&
				(!nodeEditor.selectedCommand || showTypePicker)
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
		nodeEditor.isOpen,
		nodeEditor.editorMode,
		nodeEditor.selectedCommand,
		activeIndex,
		filteredCommands,
		handleSelectCommand,
		handleShowTypePicker,
		setNodeEditorMode,
		showTypePicker,
	]);

	// selectedCommand is now stored directly in state as NodeCommand object
	const selectedCommand = nodeEditor.selectedCommand;

	if (!nodeEditor.isOpen) return null;

	const theme = {
		container: 'bg-zinc-950 border border-zinc-800 w-2xl rounded-md shadow-2xl',
	};

	return (
		<div className='absolute flex flex-col items-center w-full h-full bg-zinc-950/50 z-[100] backdrop-blur-sm pt-32'>
			<AnimatePresence>
				{nodeEditor.isOpen && (
					// clicking outside this should close the node editor
					<motion.div
						ref={refs.setFloating}
						{...getReferenceProps()}
						animate='animate'
						className={cn(theme.container)}
						exit='exit'
						initial='initial'
						variants={animationVariants.container}
					>
						<AnimateChangeInHeight easingPreset='responsive'>
							{!selectedCommand || showTypePicker ? (
								<motion.div
									animate='animate'
									exit='exit'
									initial='initial'
									variants={animationVariants.container}
								>
									<CommandPalette onCommandExecute={handleSelectCommand} />
								</motion.div>
							) : (
								<motion.div
									animate='animate'
									exit='exit'
									initial='initial'
									variants={animationVariants.container}
								>
									{nodeEditor.editorMode === 'quick' ? (
										<QuickInput
											command={selectedCommand}
											existingNode={existingNode}
											mode={mode}
											parentNode={nodeEditor.parentNode}
											position={nodeEditor.position}
										/>
									) : (
										<StructuredInput
											command={selectedCommand}
											existingNode={existingNode}
											mode={mode}
											parentNode={nodeEditor.parentNode}
											position={nodeEditor.position}
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

export default NodeEditor;
