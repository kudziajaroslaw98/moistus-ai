'use client';

import { AvailableNodeTypes } from '@/registry/node-registry';
import { assertAvailableNodeTypeWithLog } from '@/registry/type-guards';
import { cn } from '@/utils/cn';
import { EditorView } from '@codemirror/view';
import { RefreshCw } from 'lucide-react';
import { motion, type MotionProps } from 'motion/react';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Command } from '../../core/commands/command-types';
import { validateInput } from '../../core/validators/input-validator';
import { createNodeEditor } from '../../integrations/codemirror/setup';
import { ValidationTooltip } from './validation-tooltip';

// Internal change tracking for preventing infinite loops
let isInternalChange = false;

interface EnhancedInputProps {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onSelectionChange: () => void;
	placeholder: string;
	disabled: boolean;
	className?: string;
	initial?: MotionProps['initial'];
	animate?: MotionProps['animate'];
	transition?: MotionProps['transition'];
	whileFocus?: MotionProps['whileFocus'];
	// Command completion integration props
	onNodeTypeChange?: (nodeType: AvailableNodeTypes) => void;
	onCommandExecuted?: (command: Command) => void;
	enableCommands?: boolean; // Feature flag
}

export const EnhancedInput = ({
	value,
	onChange,
	onKeyDown,
	onSelectionChange,
	placeholder,
	disabled,
	className,
	initial,
	animate,
	transition,
	onNodeTypeChange,
	onCommandExecuted,
	enableCommands = true, // Default enabled
	...rest
}: EnhancedInputProps) => {
	const editorRef = useRef<HTMLDivElement>(null);
	const editorViewRef = useRef<EditorView | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [validationTooltipOpen, setValidationTooltipOpen] = useState(false);
	const initializedRef = useRef(false);
	const lastKnownValueRef = useRef(value);

	// Store the latest callbacks in refs to avoid stale closures
	const onKeyDownRef = useRef(onKeyDown);
	const onSelectionChangeRef = useRef(onSelectionChange);

	// Update refs when callbacks change
	useEffect(() => {
		onKeyDownRef.current = onKeyDown;
		onSelectionChangeRef.current = onSelectionChange;
	}, [onKeyDown, onSelectionChange]);

	// Get validation results with error boundary using new validator
	const validationErrors = useMemo(() => {
		try {
			const result = validateInput(value);
			return [...(result.errors || []), ...(result.warnings || [])];
		} catch (error) {
			console.error('Validation error:', error);
			return [];
		}
	}, [value]);
	const hasErrors = validationErrors.some((error) => error.type === 'error');
	const hasWarnings = validationErrors.some(
		(error) => error.type === 'warning'
	);
	const hasSuggestions = validationErrors.some(
		(error) => error.type === 'suggestion'
	);

	// Debounced validation tooltip to prevent rapid state changes
	const debouncedShowTooltip = useCallback(() => {
		if (hasErrors || hasWarnings || hasSuggestions) {
			setValidationTooltipOpen(true);
		} else {
			setValidationTooltipOpen(false);
		}
	}, [hasErrors, hasWarnings, hasSuggestions]);

	// Auto-show validation tooltip with longer debouncing to prevent CodeMirror interference
	useEffect(() => {
		try {
			// Increase debounce delay to prevent rapid state changes that affect CodeMirror
			const timer = setTimeout(debouncedShowTooltip, 1000);
			return () => clearTimeout(timer);
		} catch (error) {
			console.error('Validation tooltip error:', error);
		}
	}, [debouncedShowTooltip]);

	// Quick fix handler for validation errors
	const handleQuickFix = useCallback(
		(startIndex: number, endIndex: number, replacement: string) => {
			try {
				const view = editorViewRef.current;

				if (!view || !view.dom || !view.dom.isConnected) {
					return;
				}

				// Apply the text replacement
				view.dispatch({
					changes: {
						from: startIndex,
						to: endIndex,
						insert: replacement,
					},
				});

				// Focus the editor after the fix
				view.focus();
			} catch (error) {
				console.error('Quick fix error:', error);
			}
		},
		[]
	);

	// Define event handlers outside useEffect for proper cleanup access
	const handleNodeTypeChange = useCallback(
		(event: CustomEvent) => {
			try {

				// Call parent callback if provided
				if (onNodeTypeChange && event.detail?.nodeType) {
					onNodeTypeChange(event.detail.nodeType);
				}

				// Emit a custom event that parent components can listen to (backward compatibility)
				const nodeTypeChangeEvent = new CustomEvent('nodeEditorTypeChange', {
					detail: event.detail,
					bubbles: true,
				});
				editorViewRef.current?.dom.dispatchEvent(nodeTypeChangeEvent);
			} catch (error) {
				console.error('Error handling node type change:', error);
			}
		},
		[onNodeTypeChange]
	);

	const handleCommandExecuted = useCallback(
		(event: CustomEvent) => {
			try {

				// Call parent callback if provided
				if (onCommandExecuted && event.detail) {
					onCommandExecuted(event.detail);
				}

				// Emit a custom event that parent components can listen to (backward compatibility)
				const commandExecutedEvent = new CustomEvent(
					'nodeEditorCommandExecuted',
					{
						detail: event.detail,
						bubbles: true,
					}
				);
				editorViewRef.current?.dom.dispatchEvent(commandExecutedEvent);
			} catch (error) {
				console.error('Error handling command executed:', error);
			}
		},
		[onCommandExecuted]
	);

	const handleReferenceSelected = useCallback(
		(event: CustomEvent) => {
			try {

				// Call parent callback if provided (for future extensibility)
				if (onCommandExecuted && event.detail) {
					// Treat reference selection as a command execution
					onCommandExecuted({
						id: 'reference-selected',
						trigger: 'mouse',
						label: 'Reference Selected',
						description: 'Select a reference',
						icon: RefreshCw,
						category: 'content',
						triggerType: 'node-type',
					});
				}

				// Emit a custom event that parent components can listen to
				const referenceSelectedEvent = new CustomEvent(
					'nodeEditorReferenceSelected',
					{
						detail: event.detail,
						bubbles: true,
					}
				);
				editorViewRef.current?.dom.dispatchEvent(referenceSelectedEvent);
			} catch (error) {
				console.error('Error handling reference selected:', error);
			}
		},
		[onCommandExecuted]
	);

	// Initialize CodeMirror editor with unified setup
	useEffect(() => {
		if (
			!editorRef.current ||
			editorViewRef.current ||
			!editorRef.current.isConnected
		) {
			return;
		}


		try {
			// Use the new unified createNodeEditor function
			const view = createNodeEditor(editorRef.current, {
				initialContent: value,
				placeholder:
					placeholder ||
					'Type # for tags, @ for people, ^ for dates, ! for priority...',
				enableCompletions: true,
				enablePatternHighlighting: true,
				enableValidation: true,
				onContentChange: (newValue) => {
					// Prevent infinite loops with external changes
					if (!isInternalChange && newValue !== lastKnownValueRef.current) {
						lastKnownValueRef.current = newValue;
						onChange(newValue);
					}
				},
				onNodeTypeChange: (nodeType) => {
					// Validate node type with logging guard
					if (assertAvailableNodeTypeWithLog(nodeType, 'onNodeTypeChange')) {
						if (onNodeTypeChange) {
							onNodeTypeChange(nodeType);
						}

						// Emit custom event for backward compatibility
						const nodeTypeChangeEvent = new CustomEvent(
							'nodeEditorTypeChange',
							{
								detail: { nodeType },
								bubbles: true,
							}
						);
						editorRef.current?.dispatchEvent(nodeTypeChangeEvent);
					}
				},
			});

			editorViewRef.current = view;
			initializedRef.current = true;

			// Add custom keydown handler for Ctrl+Enter / Cmd+Enter
			// Use ref to avoid stale closures
			view.dom.addEventListener('keydown', (event: KeyboardEvent) => {
				if (
					(event.key === 'Enter' && event.metaKey) ||
					(event.key === 'Enter' && event.ctrlKey)
				) {
					const reactEvent = event as unknown as React.KeyboardEvent;
					onKeyDownRef.current(reactEvent);
					event.preventDefault();
				}
			});

			// Add selection change listener
			// Use ref to avoid stale closures
			view.dom.addEventListener('click', () => {
				onSelectionChangeRef.current();
			});

			view.focus();
		} catch (error) {
			console.error('Failed to initialize CodeMirror editor:', error);
		}

		return () => {
			try {
				if (editorViewRef.current) {
					editorViewRef.current.destroy();
					editorViewRef.current = null;
				}

				initializedRef.current = false;
			} catch (error) {
				console.error('Error cleaning up CodeMirror:', error);
			}
		};
	}, [enableCommands, disabled]); // Only stable dependencies - no callbacks!

	// Separate event listener management (can change without recreating editor)
	useEffect(() => {
		const view = editorViewRef.current;

		if (!view || !view.dom || !enableCommands) {
			return;
		}

		// Add command event listeners
		view.dom.addEventListener(
			'nodeTypeChange',
			handleNodeTypeChange as EventListener
		);
		view.dom.addEventListener(
			'commandExecuted',
			handleCommandExecuted as EventListener
		);
		view.dom.addEventListener(
			'referenceSelected',
			handleReferenceSelected as EventListener
		);

		return () => {
			// Clean up event listeners
			if (view.dom) {
				view.dom.removeEventListener(
					'nodeTypeChange',
					handleNodeTypeChange as EventListener
				);
				view.dom.removeEventListener(
					'commandExecuted',
					handleCommandExecuted as EventListener
				);
				view.dom.removeEventListener(
					'referenceSelected',
					handleReferenceSelected as EventListener
				);
			}
		};
	}, [
		handleNodeTypeChange,
		handleCommandExecuted,
		handleReferenceSelected,
		enableCommands,
	]);

	// Sync external value changes to CodeMirror (with loop prevention)
	useEffect(() => {
		const view = editorViewRef.current;

		if (!view || !view.dom || !view.dom.isConnected) {
			return;
		}

		const currentContent = view.state.doc.toString();

		// Only update if values actually differ
		if (value !== currentContent && value !== lastKnownValueRef.current) {
			// Use the new setup's content update mechanism
			isInternalChange = true;
			view.dispatch({
				changes: {
					from: 0,
					to: currentContent.length,
					insert: value || '',
				},
			});
			isInternalChange = false;

			lastKnownValueRef.current = value;
		}
	}, [value]);

	return (
		<>
			<motion.div
				animate={animate}
				data-testid='enhanced-input-container'
				initial={initial}
				ref={containerRef}
				transition={transition}
				className={cn(
					'enhanced-input-container relative',
					hasErrors && 'has-validation-errors',
					hasWarnings && 'has-validation-warnings',
					hasSuggestions && 'has-validation-suggestions',
					'z-[100]',
					className
				)}
				{...rest}
			>
				<ValidationTooltip
					errors={validationErrors}
					isOpen={validationTooltipOpen}
					onOpenChange={setValidationTooltipOpen}
					onQuickFix={handleQuickFix}
				>
					{/* Remove motion wrapper from input to prevent CodeMirror interference */}
					<div
						className='enhanced-input-wrapper'
						style={{
							// Stable container to prevent CodeMirror DOM issues
							isolation: 'isolate',
							contain: 'layout',
						}}
					>
						<div
							ref={editorRef}
							className={cn(
								'w-full rounded-md',
								disabled && 'opacity-50 cursor-not-allowed'
							)}
							style={{
								// Ensure the editor container is stable
								minHeight: '60px',
								willChange: 'auto', // Prevent unnecessary GPU layers
							}}
						/>
					</div>
				</ValidationTooltip>
			</motion.div>
		</>
	);
};

EnhancedInput.displayName = 'EnhancedInput';
