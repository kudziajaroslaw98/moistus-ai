'use client';

import useAppStore from '@/store/mind-map-store';
import type { AvailableNodeTypes } from '@/types/available-node-types';
import { AnimatePresence, motion } from 'motion/react';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FC,
	type KeyboardEvent,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { CommandPalette } from './command-palette';
import {
	commandRegistry,
	processNodeTypeSwitch,
	shouldAutoProcessSwitch,
} from './commands';
import { ActionBar } from './components/action-bar';
import { ArrowIndicator } from './components/arrow-indicator';
import { ComponentHeader } from './components/component-header';
import { ErrorDisplay } from './components/error-display';
import { ExamplesSection } from './components/examples-section';
import { InputSection } from './components/input-section';
import { ParsingLegend } from './components/parsing-legend';
import { PreviewSection } from './components/preview-section';
import { nodeCommands } from './node-commands';
import {
	createOrUpdateNodeFromCommand,
	transformNodeToQuickInputString,
} from './node-updater';
import type { QuickInputProps } from './types';
import { announceToScreenReader } from './utils/text-utils';

const theme = {
	container: 'p-4',
	hint: 'text-xs text-zinc-500 mt-2',
};

export const QuickInput: FC<QuickInputProps> = ({
	command,
	parentNode,
	position,
	mode = 'create',
	existingNode,
}) => {
	// Local UI state
	const [preview, setPreview] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [commandPalettePosition, setCommandPalettePosition] = useState({
		x: 0,
		y: 0,
	});
	const [referenceMetadata, setReferenceMetadata] = useState<{
		targetNodeId?: string;
		targetMapId?: string;
		targetMapTitle?: string;
		contentSnippet?: string;
	} | null>(null);
	const lastProcessedText = useRef('');

	const [legendCollapsed, setLegendCollapsed] = useState(
		() => localStorage.getItem('parsingLegendCollapsed') === 'true'
	);

	// Zustand state for persistence across remounts
	const {
		quickInputValue: value,
		quickInputNodeType: currentNodeType,
		quickInputCursorPosition: cursorPosition,
		setQuickInputValue: setValue,
		setQuickInputNodeType: setCurrentNodeType,
		setQuickInputCursorPosition: setCursorPosition,
		initializeQuickInput,
		resetQuickInput,
	} = useAppStore(
		useShallow((state) => ({
			quickInputValue: state.quickInputValue,
			quickInputNodeType: state.quickInputNodeType,
			quickInputCursorPosition: state.quickInputCursorPosition,
			setQuickInputValue: state.setQuickInputValue,
			setQuickInputNodeType: state.setQuickInputNodeType,
			setQuickInputCursorPosition: state.setQuickInputCursorPosition,
			initializeQuickInput: state.initializeQuickInput,
			resetQuickInput: state.resetQuickInput,
		}))
	);

	const { closeInlineCreator, closeNodeEditor, addNode, updateNode } =
		useAppStore(
			useShallow((state) => ({
				closeInlineCreator: state.closeInlineCreator,
				closeNodeEditor: state.closeNodeEditor,
				addNode: state.addNode,
				updateNode: state.updateNode,
			}))
		);

	// Initialize QuickInput state when component mounts or mode changes
	useEffect(() => {
		console.log('🔧 QuickInput useEffect initialization:', JSON.stringify({
			mode,
			hasExistingNode: !!existingNode,
			existingNodeId: existingNode?.id,
			commandNodeType: command.nodeType,
			currentNodeType
		}));

		if (mode === 'edit' && existingNode) {
			// Edit mode: initialize with existing node content (only once)
			console.log('✅ Edit mode detected, calling initializeQuickInput');
			const initialContent = transformNodeToQuickInputString(
				existingNode,
				command.nodeType
			);
			console.log('📝 Initial content for edit mode:', JSON.stringify(initialContent));
			initializeQuickInput(initialContent, command.nodeType);
		} else if (mode === 'create') {
			// Create mode: only set initial node type if none exists
			// Don't override user-selected node types from $nodeType switching
			console.log('🔧 QuickInput create mode initialization:', JSON.stringify({
				currentNodeType,
				commandNodeType: command.nodeType,
				shouldSetNodeType: !currentNodeType
			}));
			if (!currentNodeType) {
				console.log('✅ Setting node type to:', JSON.stringify(command.nodeType));
				setCurrentNodeType(command.nodeType);
			} else {
				console.log('⚠️ Node type already set, not overriding:', JSON.stringify(currentNodeType));
			}
			// Don't reset value in create mode to preserve user input across remounts
		}
	}, [
		mode,
		existingNode?.id,
		command.nodeType,
		initializeQuickInput,
		setCurrentNodeType,
	]);

	// Save legend preference
	useEffect(() => {
		localStorage.setItem('parsingLegendCollapsed', String(legendCollapsed));
	}, [legendCollapsed]);

	// Handle keyboard shortcut for legend toggle
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === '/') {
				e.preventDefault();
				setLegendCollapsed(!legendCollapsed);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [legendCollapsed]);

	// Process node type switches automatically (legacy fallback only)
	useEffect(() => {
		if (!value || !currentNodeType || lastProcessedText.current === value) {
			return;
		}

		// Only use legacy processing if commands are disabled or as fallback
		// The primary processing should happen via CodeMirror events
		if (shouldAutoProcessSwitch(value, currentNodeType)) {
			const processed = processNodeTypeSwitch(
				value,
				cursorPosition,
				currentNodeType
			);

			if (
				processed.hasSwitch &&
				processed.nodeType &&
				processed.nodeType !== currentNodeType
			) {
				console.log('Legacy node type switch detected:', processed.nodeType);

				// Update node type and clean text
				setCurrentNodeType(processed.nodeType as AvailableNodeTypes);
				setValue(processed.processedText);
				lastProcessedText.current = processed.processedText;

				// Announce the change
				const nodeTypeName = processed.nodeType
					.replace('Node', '')
					.toLowerCase();
				announceToScreenReader(`Switched to ${nodeTypeName} node type`);

				// Update cursor position if needed
				setCursorPosition(processed.cursorPosition);
				return;
			}
		}

		lastProcessedText.current = value;
	}, [
		value,
		cursorPosition,
		currentNodeType,
		setCurrentNodeType,
		setValue,
		setCursorPosition,
	]);

	// Parse input in real-time for preview using current node type
	useEffect(() => {
		// Get the current command configuration based on node type
		const effectiveNodeType = currentNodeType || command.nodeType;
		const currentCommand =
			nodeCommands.find((cmd) => cmd.nodeType === effectiveNodeType) || command;

		// Clean the input by removing any $nodeType prefix (e.g., $task, $note)
		const cleanValue = value.replace(/^\$\w+\s*/, '').trim();

		if (!cleanValue || !currentCommand.quickParse) {
			setPreview(null);
			setError(null);
			return;
		}

		try {
			const parsed = currentCommand.quickParse(cleanValue);

			// Enhance preview with reference metadata for reference nodes
			if (effectiveNodeType === 'referenceNode' && referenceMetadata) {
				const enhancedPreview = {
					...parsed,
					referencePreview: {
						targetMapTitle: referenceMetadata.targetMapTitle,
						contentSnippet: referenceMetadata.contentSnippet,
					},
				};
				setPreview(enhancedPreview);
			} else {
				setPreview(parsed);
			}

			setError(null);
		} catch (err) {
			setPreview(null);
			setError('Invalid input format');
		}
	}, [value, command, currentNodeType, referenceMetadata]);

	// Handle node creation with current node type
	const handleCreate = useCallback(async () => {
		if (!value.trim() || isCreating) return;

		try {
			setIsCreating(true);

			// Use current node type for command configuration
			const effectiveNodeType = currentNodeType || command.nodeType;
			const currentCommand =
				nodeCommands.find((cmd) => cmd.nodeType === effectiveNodeType) ||
				command;

			// Clean the input by removing any $nodeType prefix
			const cleanValue = value.replace(/^\$\w+\s*/, '').trim() || value;

			const nodeData = currentCommand.quickParse
				? currentCommand.quickParse(cleanValue)
				: { content: cleanValue };

			// Merge reference metadata for reference nodes
			if (effectiveNodeType === 'referenceNode' && referenceMetadata) {
				Object.assign(nodeData, {
					targetNodeId: referenceMetadata.targetNodeId,
					targetMapId: referenceMetadata.targetMapId,
					targetMapTitle: referenceMetadata.targetMapTitle,
					contentSnippet: referenceMetadata.contentSnippet,
				});
			}

			const result = await createOrUpdateNodeFromCommand({
				command: currentCommand,
				data: nodeData,
				mode,
				position,
				parentNode,
				existingNode,
				addNode,
				updateNode,
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to save node');
			}

			// Close the appropriate editor based on context
			if (mode === 'edit') {
				closeNodeEditor();
			} else {
				closeInlineCreator();
			}
		} catch (err) {
			setError(
				`An error occurred while ${mode === 'edit' ? 'updating' : 'creating'} the node`
			);
		} finally {
			setIsCreating(false);
		}
	}, [
		value,
		command,
		currentNodeType,
		position,
		parentNode,
		addNode,
		updateNode,
		closeInlineCreator,
		closeNodeEditor,
		isCreating,
		mode,
		existingNode,
	]);

	// Handle pattern insertion from legend
	const handlePatternInsert = useCallback(
		(pattern: string, insertText?: string) => {
			const textToInsert = insertText || pattern;
			// This would need access to the textarea ref from InputSection
			// For now, we'll append to the end of the value
			const newValue = value + textToInsert;
			setValue(newValue);

			// Announce insertion to screen readers
			announceToScreenReader(`Pattern ${pattern} inserted at cursor position`);
		},
		[value]
	);

	// Handle selection change
	const handleSelectionChange = useCallback(() => {
		// This would need access to the textarea ref from InputSection
		// For now, we'll track cursor position differently
		setCursorPosition(value.length);
	}, [value, setCursorPosition]);

	// Handle command palette trigger
	const handleCommandPaletteTrigger = useCallback(
		(position: { x: number; y: number }) => {
			setCommandPalettePosition(position);
			setCommandPaletteOpen(true);
			// Note: openCommandPalette from store not available yet
		},
		[]
	);

	// Handle command execution from palette or enhanced input
	const handleCommandExecute = useCallback(
		async (command: EnhancedCommand) => {
			try {
				const context = {
					currentText: value,
					cursorPosition,
					selection: null,
					timestamp: Date.now(),
				};

				// Use the registry executeCommand method
				const result = await commandRegistry.executeCommand(
					command.id,
					context
				);

				if (result) {
					// Apply command result
					if (result.replacement !== undefined) {
						setValue(result.replacement);
						lastProcessedText.current = result.replacement;
					}

					if (result.nodeType && result.nodeType !== currentNodeType) {
						setCurrentNodeType(result.nodeType as AvailableNodeTypes);
					}

					if (result.cursorPosition !== undefined) {
						setCursorPosition(result.cursorPosition);
					}

					if (result.closePanel) {
						setCommandPaletteOpen(false);
						// Note: closeCommandPalette from store not available yet
					}

					if (result.message) {
						announceToScreenReader(result.message);
					}
				}
			} catch (error) {
				console.error('Error executing command:', error);
				setError(
					`Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		},
		[value, cursorPosition, currentNodeType]
	);

	// Handle node type change from enhanced input (CodeMirror events)
	const handleNodeTypeChange = useCallback(
		(nodeType: AvailableNodeTypes) => {
			if (nodeType !== currentNodeType) {
				console.log('CodeMirror node type change:', nodeType);

				setCurrentNodeType(nodeType);

				// Update lastProcessedText to prevent legacy processing from interfering
				lastProcessedText.current = value;

				// Announce the change
				const nodeTypeName = nodeType.replace('Node', '').toLowerCase();
				announceToScreenReader(`Switched to ${nodeTypeName} node type`);
			}
		},
		[currentNodeType, value]
	);

	// Handle command execution from enhanced input
	const handleCommandExecuted = useCallback(
		(commandData: any) => {
			if (commandData.commandId === 'reference-selected') {
				// Handle reference selection
				const referenceData = commandData.result;
				setReferenceMetadata({
					targetNodeId: referenceData.targetNodeId,
					targetMapId: referenceData.targetMapId,
					targetMapTitle: referenceData.targetMapTitle,
					contentSnippet: referenceData.contentSnippet,
				});
				announceToScreenReader(
					`Selected reference: ${referenceData.contentSnippet?.slice(0, 50) || 'Unknown content'}`
				);
			} else if (commandData.command) {
				handleCommandExecute(commandData.command);
			}
		},
		[handleCommandExecute]
	);

	// Handle command palette close
	const handlePaletteClose = useCallback(() => {
		setCommandPaletteOpen(false);
		// Note: closeCommandPalette from store not available yet
	}, []);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleCreate();
				return;
			}

			// Handle command palette trigger with '/'
			if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
				// Let the input handle the character first, then trigger palette
				setTimeout(() => {
					const rect = e.currentTarget.getBoundingClientRect();
					handleCommandPaletteTrigger({
						x: rect.left + 20,
						y: rect.bottom + 5,
					});
				}, 10);
			}
		},
		[handleCreate, handleCommandPaletteTrigger]
	);

	// Handle example usage
	const handleUseExample = useCallback((example: string) => {
		setValue(example);
	}, []);

	return (
		<motion.div
			layoutId={command.label}
			className={theme.container}
			initial={{ opacity: 0, scale: 0.95, y: -10 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95, y: -10 }}
			transition={{ duration: 0.2, ease: 'easeOut' }}
		>
			<ComponentHeader icon={command.icon} label={command.label} />

			{/* Input and Preview Side by Side - Fixed 50/50 Layout */}
			<div className='flex items-stretch gap-3'>
				<InputSection
					value={value}
					onChange={setValue}
					onKeyDown={handleKeyDown}
					onSelectionChange={handleSelectionChange}
					placeholder={`Type naturally... ${command.examples?.[0] || ''}`}
					disabled={isCreating}
					enableCommands={true}
					currentNodeType={currentNodeType}
					onNodeTypeChange={handleNodeTypeChange}
					onCommandExecuted={handleCommandExecuted}
				/>

				<ArrowIndicator isVisible={value.trim().length > 0} />

				<PreviewSection
					preview={preview}
					nodeType={currentNodeType || command.nodeType}
					hasInput={value.trim().length > 0}
				/>
			</div>

			{/* Parsing Legend */}
			<AnimatePresence>
				{command.parsingPatterns && command.parsingPatterns.length > 0 && (
					<motion.div
						className='mt-3'
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
					>
						<ParsingLegend
							patterns={
								(
									nodeCommands.find(
										(cmd) =>
											cmd.nodeType === (currentNodeType || command.nodeType)
									) || command
								).parsingPatterns || []
							}
							onPatternClick={handlePatternInsert}
							isCollapsed={legendCollapsed}
							onToggleCollapse={() => setLegendCollapsed(!legendCollapsed)}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Show hint for nodes without patterns */}
			<AnimatePresence>
				{(!command.parsingPatterns || command.parsingPatterns.length === 0) && (
					<motion.div
						className='mt-3 text-xs text-zinc-500'
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
					>
						<p>
							This node type accepts plain text input without special syntax.
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			<ExamplesSection
				examples={command.examples || []}
				hasValue={value.length > 0}
				onUseExample={handleUseExample}
			/>

			<ErrorDisplay error={error} />

			<ActionBar
				onCreate={handleCreate}
				canCreate={value.trim().length > 0}
				isCreating={isCreating}
				mode={mode}
			/>

			{/* Command Palette Integration */}
			<AnimatePresence>
				{commandPaletteOpen && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0 z-50 pointer-events-none'
					>
						<CommandPalette
							onCommandExecute={handleCommandExecute}
							onClose={handlePaletteClose}
							className='pointer-events-auto'
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};
