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
import { nodeCommands, getCommandByType } from './node-commands';
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

export const NodeEditor = () => {
	const {
		nodeEditor,
		closeNodeEditor,
		setNodeEditorCommand,
		setNodeEditorMode,
		setNodeEditorFilterQuery,
		nodes,
	} = useAppStore(
		useShallow((state) => ({
			nodeEditor: state.nodeEditor,
			closeNodeEditor: state.closeNodeEditor,
			setNodeEditorCommand: state.setNodeEditorCommand,
			setNodeEditorMode: state.setNodeEditorMode,
			setNodeEditorFilterQuery: state.setNodeEditorFilterQuery,
			nodes: state.nodes,
		}))
	);

	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [showTypePicker, setShowTypePicker] = useState(false);
	const itemsRef = useRef<(HTMLElement | null)[]>([]);
	const initializedRef = useRef<string | null>(null);

	// Get mode and existing node data from store
	const mode = nodeEditor.mode;
	const existingNode = nodeEditor.existingNodeId 
		? nodes.find(node => node.id === nodeEditor.existingNodeId)
		: undefined;

	// Auto-select command for existing nodes in edit mode
	useEffect(() => {
		if (mode === 'edit' && existingNode && !nodeEditor.selectedCommand && !showTypePicker) {
			const nodeType = existingNode.data?.node_type;
			if (nodeType) {
				const command = getCommandByType(nodeType);
				if (command) {
					setNodeEditorCommand(command.command);
					// Only reset showTypePicker if this is a new node being opened
					if (initializedRef.current !== nodeEditor.existingNodeId) {
						setShowTypePicker(false);
					}
				}
			}
		}
	}, [mode, existingNode, nodeEditor.selectedCommand, nodeEditor.existingNodeId, setNodeEditorCommand, showTypePicker]);

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
		}
	}, [nodeEditor.isOpen, mode, nodeEditor.existingNodeId]);

	// Filter commands based on search query
	const filteredCommands = useMemo(() => {
		if (!nodeEditor.filterQuery) return nodeCommands;

		const query = nodeEditor.filterQuery.toLowerCase();
		return nodeCommands.filter(
			(cmd) =>
				cmd.command.toLowerCase().includes(query) ||
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
		(command: NodeCommand) => {
			setNodeEditorCommand(command.command);
			setActiveIndex(null);
			setShowTypePicker(false);
		},
		[setNodeEditorCommand]
	);

	// Handle showing type picker
	const handleShowTypePicker = useCallback(() => {
		setShowTypePicker(true);
		setNodeEditorCommand(null);
		setNodeEditorFilterQuery('');
	}, [setNodeEditorCommand, setNodeEditorFilterQuery]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!nodeEditor.isOpen) return;

			// Ctrl+T to show type picker (when in content editing mode)
			if ((e.ctrlKey || e.metaKey) && e.key === 't' && nodeEditor.selectedCommand) {
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

	const selectedCommand = useMemo(
		() =>
			nodeCommands.find((cmd) => cmd.command === nodeEditor.selectedCommand),
		[nodeEditor.selectedCommand]
	);

	if (!nodeEditor.isOpen) return null;

	const theme = {
		container:
			'bg-zinc-950 border border-zinc-800 w-2xl rounded-md shadow-2xl h-auto overflow-hidden',
	};

	return (
		<div className='absolute flex flex-col items-center w-full h-full bg-zinc-950/50 z-[100] backdrop-blur-sm pt-32'>
			<AnimatePresence>
				{nodeEditor.isOpen && (
					// clicking outside this should close the node editor
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
							{!selectedCommand || showTypePicker ? (
								<motion.div
									variants={animationVariants.container}
									initial='initial'
									animate='animate'
									exit='exit'
								>
									<CommandPalette
										commands={filteredCommands}
										onSelectCommand={handleSelectCommand}
										filterQuery={nodeEditor.filterQuery}
										onFilterChange={setNodeEditorFilterQuery}
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
										mode={nodeEditor.editorMode}
										onToggle={(mode) => setNodeEditorMode(mode)}
										onShowTypePicker={handleShowTypePicker}
										selectedCommand={selectedCommand}
									/>

									{nodeEditor.editorMode === 'quick' ? (
										<QuickInput
											command={selectedCommand}
											parentNode={nodeEditor.parentNode}
											position={nodeEditor.position}
											mode={mode}
											existingNode={existingNode}
										/>
									) : (
										<StructuredInput
											command={selectedCommand}
											parentNode={nodeEditor.parentNode}
											position={nodeEditor.position}
											mode={mode}
											existingNode={existingNode}
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
