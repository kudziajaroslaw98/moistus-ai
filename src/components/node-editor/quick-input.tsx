'use client';

import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { ActionBar } from './components/action-bar';
import { ArrowIndicator } from './components/arrow-indicator';
import { ComponentHeader } from './components/component-header';
import { ErrorDisplay } from './components/error-display';
import { ExamplesSection } from './components/examples-section';
import { InputSection } from './components/input-section';
import { PreviewSection } from './components/preview-section';
import { createOrUpdateNodeFromCommand, transformNodeToQuickInputString } from './node-updater';
import { ParsingLegend } from './parsing-legend';
import type { QuickInputProps } from './types';
import { announceToScreenReader } from './domain/utilities/text-utils';

const theme = {
	container: 'p-4',
	hint: 'text-xs text-zinc-500 mt-2',
};

export const QuickInput: React.FC<QuickInputProps> = ({
	command,
	parentNode,
	position,
	mode = 'create',
	existingNode,
}) => {
	const [value, setValue] = useState('');
	const [preview, setPreview] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const [legendCollapsed, setLegendCollapsed] = useState(
		() => localStorage.getItem('parsingLegendCollapsed') === 'true'
	);
	const [cursorPosition, setCursorPosition] = useState(0);

	const { closeInlineCreator, closeNodeEditor, addNode, updateNode } = useAppStore(
		useShallow((state) => ({
			closeInlineCreator: state.closeInlineCreator,
			closeNodeEditor: state.closeNodeEditor,
			addNode: state.addNode,
			updateNode: state.updateNode,
		}))
	);

	// Initialize value with existing node content in edit mode
	useEffect(() => {
		if (mode === 'edit' && existingNode) {
			const initialContent = transformNodeToQuickInputString(
				existingNode,
				command.nodeType
			);
			setValue(initialContent);
		}
	}, [mode, existingNode, command.nodeType]);

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

	// Parse input in real-time for preview
	useEffect(() => {
		if (!value.trim() || !command.quickParse) {
			setPreview(null);
			setError(null);
			return;
		}

		try {
			const parsed = command.quickParse(value);
			setPreview(parsed);
			setError(null);
		} catch (err) {
			setPreview(null);
			setError('Invalid input format');
		}
	}, [value, command]);

	// Handle node creation
	const handleCreate = useCallback(async () => {
		if (!value.trim() || isCreating) return;

		try {
			setIsCreating(true);
			const nodeData = command.quickParse
				? command.quickParse(value)
				: { content: value };

			const result = await createOrUpdateNodeFromCommand({
				command,
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
			// For now, we'll use NodeEditor for edit mode, InlineCreator for create mode
			// This logic can be refined based on how the component is called
			if (mode === 'edit') {
				closeNodeEditor();
			} else {
				closeInlineCreator();
			}
		} catch (err) {
			setError(`An error occurred while ${mode === 'edit' ? 'updating' : 'creating'} the node`);
		} finally {
			setIsCreating(false);
		}
	}, [
		value,
		command,
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
	}, [value]);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleCreate();
			}
			// Enter without modifiers will create a new line (default behavior)
		},
		[handleCreate]
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
				/>

				<ArrowIndicator isVisible={value.trim().length > 0} />

				<PreviewSection
					preview={preview}
					nodeType={command.nodeType}
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
							patterns={command.parsingPatterns}
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
		</motion.div>
	);
};
