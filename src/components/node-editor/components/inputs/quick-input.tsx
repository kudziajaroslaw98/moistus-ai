'use client';

import type { AvailableNodeTypes } from '@/registry/node-registry';
import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FC,
	type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { processNodeTypeSwitch } from '../../core/commands/command-executor';
import { getNodeTypeConfig } from '../../core/config/node-type-config';
import { parseInput } from '../../core/parsers/pattern-extractor';
import { announceToScreenReader } from '../../core/utils/text-utils';
import {
	createOrUpdateNode,
	transformNodeToQuickInputString,
} from '../../node-updater';
import type { QuickInputProps } from '../../types';
import { ActionBar } from '../action-bar';
import { ComponentHeader } from '../component-header';
import { ErrorDisplay } from '../error-display';
import { ExamplesSection } from '../examples-section';
import { ParsingLegend } from '../parsing-legend';
import { PreviewSection } from '../preview-section';
import { EnhancedInput } from './enhanced-input';

const theme = {
	container: 'p-4',
	hint: 'text-xs text-zinc-500 mt-2',
};

// Helper function to determine if we should auto-process node type switch
const shouldAutoProcessSwitch = (
	text: string,
	currentNodeType?: string
): boolean => {
	// Check if text starts with a node type trigger (e.g., $task, $note)
	const nodeTypeTriggerPattern = /^\$\w+\s/;
	return nodeTypeTriggerPattern.test(text);
};

export const QuickInput: FC<QuickInputProps> = ({
	nodeType: initialNodeType,
	parentNode,
	position,
	mode = 'create',
	existingNode,
}) => {
	// Get configuration for this node type
	const config = getNodeTypeConfig(initialNodeType);
	// Local UI state
	const [preview, setPreview] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);

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
	} = useAppStore(
		useShallow((state) => ({
			quickInputValue: state.quickInputValue,
			quickInputNodeType: state.quickInputNodeType,
			quickInputCursorPosition: state.quickInputCursorPosition,
			setQuickInputValue: state.setQuickInputValue,
			setQuickInputNodeType: state.setQuickInputNodeType,
			setQuickInputCursorPosition: state.setQuickInputCursorPosition,
			initializeQuickInput: state.initializeQuickInput,
		}))
	);

	const { closeNodeEditor, addNode, updateNode } = useAppStore(
		useShallow((state) => ({
			closeNodeEditor: state.closeNodeEditor,
			addNode: state.addNode,
			updateNode: state.updateNode,
		}))
	);

	// Initialize QuickInput state when component mounts or mode changes
	useEffect(() => {
		console.log(
			'🔧 QuickInput useEffect initialization:',
			JSON.stringify({
				mode,
				hasExistingNode: !!existingNode,
				existingNodeId: existingNode?.id,
				initialNodeType,
				currentNodeType,
			})
		);

		if (mode === 'edit' && existingNode) {
			// Edit mode: initialize with existing node content (only once)
			console.log('✅ Edit mode detected, calling initializeQuickInput');
			const nodeType = initialNodeType || 'defaultNode';
			const initialContent = transformNodeToQuickInputString(
				existingNode,
				nodeType
			);
			console.log(
				'📝 Initial content for edit mode:',
				JSON.stringify(initialContent)
			);
			initializeQuickInput(initialContent, nodeType);
		} else if (mode === 'create') {
			// Create mode: only set initial node type if none exists
			// Don't override user-selected node types from $nodeType switching
			console.log(
				'🔧 QuickInput create mode initialization:',
				JSON.stringify({
					currentNodeType,
					initialNodeType,
					shouldSetNodeType: !currentNodeType,
				})
			);

			if (!currentNodeType && initialNodeType) {
				console.log(
					'✅ Setting node type to:',
					JSON.stringify(initialNodeType)
				);
				setCurrentNodeType(initialNodeType);
			} else {
				console.log(
					'⚠️ Node type already set, not overriding:',
					JSON.stringify(currentNodeType)
				);
			}
			// Don't reset value in create mode to preserve user input across remounts
		}
	}, [
		mode,
		existingNode?.id,
		initialNodeType,
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
			const processed = processNodeTypeSwitch(value);

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
		// Clean the input by removing any $nodeType prefix (e.g., $task, $note)
		const cleanValue = value.replace(/^\$\w+\s*/, '').trim();

		if (!cleanValue) {
			setPreview(null);
			setError(null);
			return;
		}

		try {
			const parsed = parseInput(cleanValue);

			// Enhance preview with reference metadata for reference nodes
			const effectiveNodeType = currentNodeType || initialNodeType;
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
		} catch {
			setPreview(null);
			setError('Invalid input format');
		}
	}, [value, currentNodeType, initialNodeType, referenceMetadata]);

	// Handle node creation with current node type
	const handleCreate = useCallback(async () => {
		if (!value.trim() || isCreating) return;

		try {
			setIsCreating(true);

			// Use current node type
			const effectiveNodeType = currentNodeType || initialNodeType;

			// Clean the input by removing any $nodeType prefix
			const cleanValue = value.replace(/^\$\w+\s*/, '').trim() || value;

			// Parse the input
			const nodeData = parseInput(cleanValue);

			// Merge reference metadata for reference nodes
			if (effectiveNodeType === 'referenceNode' && referenceMetadata) {
				Object.assign(nodeData.metadata, {
					targetNodeId: referenceMetadata.targetNodeId,
					targetMapId: referenceMetadata.targetMapId,
					targetMapTitle: referenceMetadata.targetMapTitle,
					contentSnippet: referenceMetadata.contentSnippet,
				});
			}

			const result = await createOrUpdateNode({
				nodeType: effectiveNodeType,
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
			}
		} catch (err) {
			console.error('Error creating/updating node:', err);
			setError(
				`An error occurred while ${mode === 'edit' ? 'updating' : 'creating'} the node`
			);
		} finally {
			setIsCreating(false);
		}
	}, [
		value,
		currentNodeType,
		initialNodeType,
		position,
		parentNode,
		addNode,
		updateNode,
		closeNodeEditor,
		isCreating,
		mode,
		existingNode,
		referenceMetadata,
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
	const handleCommandExecuted = useCallback((commandData: any) => {
		if (commandData.id === 'reference-selected') {
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
		}
	}, []);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleCreate();
				return;
			}
		},
		[handleCreate]
	);

	// Handle example usage
	const handleUseExample = useCallback((example: string) => {
		setValue(example);
	}, []);

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className={theme.container}
			exit={{ opacity: 0, scale: 0.95 }}
			initial={{ opacity: 0, scale: 0.95 }}
			layoutId={config.label}
			transition={{ duration: 0.2, ease: 'easeOut' as const }}
		>
			<ComponentHeader icon={config.icon} label={config.label} />

			{/* Input and Preview Side by Side - Fixed 50/50 Layout */}
			<div className='flex items-stretch gap-3'>
				<EnhancedInput
					animate={{ opacity: 1, y: 0 }}
					className='flex-1 min-w-0 mt-5'
					disabled={isCreating}
					enableCommands={true}
					initial={{ opacity: 1, y: -20 }}
					onChange={setValue}
					onCommandExecuted={handleCommandExecuted}
					onKeyDown={handleKeyDown}
					onNodeTypeChange={handleNodeTypeChange}
					onSelectionChange={handleSelectionChange}
					placeholder={`Type naturally... ${config.examples?.[0] || ''}`}
					transition={{ duration: 0.25, ease: 'easeOut' as const }}
					value={value}
					whileFocus={{
						scale: 1.01,
						transition: { duration: 0.2 },
					}}
				/>

				<PreviewSection
					hasInput={value.trim().length > 0}
					nodeType={currentNodeType || initialNodeType || 'defaultNode'}
					preview={preview}
				/>
			</div>

			{/* Parsing Legend */}
			<AnimatePresence>
				{config.parsingPatterns && config.parsingPatterns.length > 0 && (
					<motion.div
						animate={{ opacity: 1, height: 'auto', y: 0 }}
						className='mt-3'
						exit={{ opacity: 0, height: 0, y: -20 }}
						initial={{ opacity: 0, height: 0, y: -20 }}
						transition={{
							duration: 0.2,
							delay: 0.1,
							ease: 'easeInOut' as const,
						}}
					>
						<ParsingLegend
							isCollapsed={legendCollapsed}
							onPatternClick={handlePatternInsert}
							onToggleCollapse={() => setLegendCollapsed(!legendCollapsed)}
							patterns={
								getNodeTypeConfig(currentNodeType || initialNodeType)
									.parsingPatterns || []
							}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Show hint for nodes without patterns */}
			<AnimatePresence>
				{(!config.parsingPatterns || config.parsingPatterns.length === 0) && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='mt-3 text-xs text-zinc-500'
						exit={{ opacity: 0, y: -10 }}
						initial={{ opacity: 0, y: -10 }}
						transition={{
							delay: 0.05,
							duration: 0.3,
							ease: 'easeOut' as const,
						}}
					>
						<p>
							This node type accepts plain text input without special syntax.
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			<ExamplesSection
				examples={config.examples || []}
				hasValue={value.length > 0}
				onUseExample={handleUseExample}
			/>

			<ErrorDisplay error={error} />

			<ActionBar
				canCreate={value.trim().length > 0}
				isCreating={isCreating}
				mode={mode}
				onCreate={handleCreate}
			/>
		</motion.div>
	);
};
