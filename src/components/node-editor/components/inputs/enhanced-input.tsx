'use client';

import {
	acceptCompletion,
	closeCompletion,
	setSelectedCompletion,
} from '@codemirror/autocomplete';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import { assertAvailableNodeTypeWithLog } from '@/registry/type-guards';
import { cn } from '@/utils/cn';
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
import type { CollaboratorMention } from '../../integrations/codemirror/completions';
import {
	createNodeEditor,
	type NodeEditorView,
} from '../../integrations/codemirror/setup';
import { ValidationTooltip } from './validation-tooltip';
import type {
	EditorAutocompleteController,
	EditorAutocompleteState,
} from '../../types';

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
	onAutocompleteControllerReady?: (
		controller: EditorAutocompleteController | null
	) => void;
	onAutocompleteStateChange?: (state: EditorAutocompleteState) => void;
	onFocusChange?: (isFocused: boolean) => void;
	showNativeAutocomplete?: boolean;
	enableCommands?: boolean; // Feature flag
	collaborators?: CollaboratorMention[];
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
	onAutocompleteControllerReady,
	onAutocompleteStateChange,
	onFocusChange,
	showNativeAutocomplete = true,
	enableCommands = true, // Default enabled
	collaborators,
	...rest
}: EnhancedInputProps) => {
	const editorRef = useRef<HTMLDivElement>(null);
	const editorViewRef = useRef<NodeEditorView | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [validationTooltipOpen, setValidationTooltipOpen] = useState(false);
	const initializedRef = useRef(false);
	const lastKnownValueRef = useRef(value);

	// Store the latest callbacks in refs to avoid stale closures
	const onKeyDownRef = useRef(onKeyDown);
	const onSelectionChangeRef = useRef(onSelectionChange);
	const onAutocompleteControllerReadyRef = useRef(onAutocompleteControllerReady);
	const onAutocompleteStateChangeRef = useRef(onAutocompleteStateChange);
	const onFocusChangeRef = useRef(onFocusChange);

	// Update refs when callbacks change
	useEffect(() => {
		onKeyDownRef.current = onKeyDown;
		onSelectionChangeRef.current = onSelectionChange;
		onAutocompleteControllerReadyRef.current = onAutocompleteControllerReady;
		onAutocompleteStateChangeRef.current = onAutocompleteStateChange;
		onFocusChangeRef.current = onFocusChange;
	}, [
		onAutocompleteControllerReady,
		onAutocompleteStateChange,
		onFocusChange,
		onKeyDown,
		onSelectionChange,
	]);

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
		let handleFocusIn: (() => void) | null = null;
		let handleFocusOut: ((event: FocusEvent) => void) | null = null;

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
				placeholder,
				enableCompletions: true,
				enablePatternHighlighting: true,
				enableValidation: true,
				collaborators: collaborators ?? [],
				showNativeAutocompleteTooltip: showNativeAutocomplete,
				onAutocompleteChange: (nextAutocompleteState) => {
					onAutocompleteStateChangeRef.current?.(nextAutocompleteState);
				},
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
			onAutocompleteControllerReadyRef.current?.({
				acceptOption: (index: number) => {
					if (!editorViewRef.current) {
						return false;
					}

					editorViewRef.current.dispatch({
						effects: setSelectedCompletion(index),
					});
					const didAccept = acceptCompletion(editorViewRef.current);

					if (didAccept) {
						editorViewRef.current.focus();
					}

					return didAccept;
				},
				close: () => {
					if (!editorViewRef.current) {
						return false;
					}

					const didClose = closeCompletion(editorViewRef.current);
					editorViewRef.current.focus();
					return didClose;
				},
				focusEditor: () => {
					editorViewRef.current?.focus();
				},
				setSelectedIndex: (index: number) => {
					if (!editorViewRef.current) {
						return;
					}

					editorViewRef.current.dispatch({
						effects: setSelectedCompletion(index),
					});
				},
			});

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

			handleFocusIn = () => {
				onFocusChangeRef.current?.(true);
			};
			handleFocusOut = (event: FocusEvent) => {
				const relatedTarget = event.relatedTarget;

				if (relatedTarget instanceof Node && view.dom.contains(relatedTarget)) {
					return;
				}

				onFocusChangeRef.current?.(false);
			};

			view.dom.addEventListener('focusin', handleFocusIn);
			view.dom.addEventListener('focusout', handleFocusOut);
			view.focus();
			onFocusChangeRef.current?.(view.hasFocus);
		} catch (error) {
			console.error('Failed to initialize CodeMirror editor:', error);
		}

		return () => {
			try {
				if (editorViewRef.current && handleFocusIn && handleFocusOut) {
					editorViewRef.current.dom.removeEventListener('focusin', handleFocusIn);
					editorViewRef.current.dom.removeEventListener(
						'focusout',
						handleFocusOut
					);
				}

				onFocusChangeRef.current?.(false);
				if (editorViewRef.current) {
					editorViewRef.current.destroy();
					editorViewRef.current = null;
				}

				initializedRef.current = false;
				onAutocompleteControllerReadyRef.current?.(null);
			} catch (error) {
				console.error('Error cleaning up CodeMirror:', error);
			}
		};
	}, [collaborators]); // Recreate only when the completion source changes structurally

	useEffect(() => {
		editorViewRef.current?.updateRuntimeConfig({
			placeholder,
			showNativeAutocompleteTooltip: showNativeAutocomplete,
		});
	}, [placeholder, showNativeAutocomplete]);

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
