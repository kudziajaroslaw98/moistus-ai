'use client';

import { cn } from '@/utils/cn';
import { autocompletion } from '@codemirror/autocomplete';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { motion, type MotionProps } from 'motion/react';
import React, {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { commandCompletions, createCommandDecorations } from '../codemirror';
import {
	patternDecorations,
	validationDecorations,
} from '../codemirror/decorations';
import { mindmapLang } from '../codemirror/language';
import { nodeEditorTheme } from '../codemirror/themes';
import universalCompletionSource from '../completions';
import { getValidationResults } from '../validation';
import { ValidationTooltip } from './validation-tooltip';

// Annotation to mark external (programmatic) changes to prevent infinite loops
const ExternalChange = Annotation.define<boolean>();

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
	onNodeTypeChange?: (nodeType: string) => void;
	onCommandExecuted?: (command: any) => void;
	enableCommands?: boolean; // Feature flag
	currentNodeType?: string; // Current node type context
}

export const EnhancedInput = forwardRef<HTMLDivElement, EnhancedInputProps>(
	(
		{
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
			whileFocus,
			// Command completion props
			onNodeTypeChange,
			onCommandExecuted,
			enableCommands = true, // Default enabled
			currentNodeType,
			...rest
		},
		ref
	) => {
		const editorRef = useRef<HTMLDivElement>(null);
		const editorViewRef = useRef<EditorView | null>(null);
		const editorState = useRef<EditorState | null>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const editableCompartment = useRef(new Compartment());
		const [validationTooltipOpen, setValidationTooltipOpen] = useState(false);
		const initializedRef = useRef(false);
		const isInternalChangeRef = useRef(false);
		const lastKnownValueRef = useRef(value);

		// Get validation results with error boundary
		const validationErrors = useMemo(() => {
			try {
				return getValidationResults(value);
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
					console.log('Node type change event:', event.detail);

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
					console.log('Command executed event:', event.detail);

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
					console.log('Reference selected event:', event.detail);

					// Call parent callback if provided (for future extensibility)
					if (onCommandExecuted && event.detail) {
						// Treat reference selection as a command execution
						onCommandExecuted({
							commandId: 'reference-selected',
							result: event.detail,
							text: event.detail.displayText,
							cursorPosition: 0
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

		// Initialize CodeMirror editor with stable dependencies (avoids recreation on callback changes)
		useEffect(() => {
			if (
				!editorRef.current ||
				editorViewRef.current ||
				!editorRef.current.isConnected
			) {
				return;
			}

			console.log('Initializing CodeMirror editor...');

			try {
				// Build extensions array based on feature flags
				const extensions = [
					mindmapLang(),
					EditorView.lineWrapping, // Enable line wrapping for long text
					editableCompartment.current.of(EditorView.editable.of(!disabled)),
					validationDecorations,
					patternDecorations,
				];

				// Build completion sources array
				const completionSources = [];

				// Add universal completion for patterns (base priority)
				completionSources.push(universalCompletionSource);

				// Add command completions source if enabled (higher priority)
				if (enableCommands) {
					completionSources.unshift(commandCompletions); // Higher priority
					extensions.push(createCommandDecorations()); // Add command decorations
				}

				// Add combined autocompletion extension
				extensions.push(
					autocompletion({
						override: completionSources,
						maxRenderedOptions: 25,
						defaultKeymap: true,
						closeOnBlur: false,
						activateOnTyping: true,
						activateOnCompletion: () => true,
						interactionDelay: enableCommands ? 100 : 75,
						selectOnOpen: false,
						icons: false, // Disable built-in icons since we have custom ones
						optionClass: (completion) => {
							const classes = [];

							// Add type-specific classes
							if (
								completion.section &&
								typeof completion.section === 'object' &&
								'name' in completion.section
							) {
								const sectionName = completion.section.name;
								if (sectionName === 'Node Types') {
									classes.push(
										'command-completion-item',
										`completion-section-${sectionName.toLowerCase().replace(/\s+/g, '-')}`
									);
								} else {
									classes.push(
										'pattern-completion-item',
										`completion-category-${sectionName.toLowerCase()}`
									);
								}
							} else {
								// Fallback for items without sections
								classes.push('pattern-completion-item');
							}

							if (completion.type) {
								classes.push(`completion-type-${completion.type}`);
							}

							return classes.join(' ');
						},
						compareCompletions: (a, b) => {
							// Prioritize by boost, then section rank, then alphabetical
							const boostDiff = (b.boost || 0) - (a.boost || 0);
							if (boostDiff !== 0) return boostDiff;

							const aSectionRank =
								a.section &&
								typeof a.section === 'object' &&
								'rank' in a.section
									? a.section.rank
									: 10;
							const bSectionRank =
								b.section &&
								typeof b.section === 'object' &&
								'rank' in b.section
									? b.section.rank
									: 10;
							const sectionDiff = aSectionRank - bSectionRank;
							if (sectionDiff !== 0) return sectionDiff;

							return a.label.localeCompare(b.label);
						},
						addToOptions: [
							{
								render: (completion: any, state, view) => {
									// Only render color swatches for color completions
									if (!completion.hexColor) return null;

									const swatch = document.createElement('div');
									swatch.className = 'color-swatch';
									swatch.style.cssText = `
									width: 16px;
									height: 16px;
									border-radius: 3px;
									background-color: ${completion.hexColor};
									border: 1px solid rgba(255, 255, 255, 0.2);
									flex-shrink: 0;
									margin-right: 8px;
								`;

									// Handle white color special case for better visibility
									if (
										completion.hexColor.toLowerCase() === '#ffffff' ||
										completion.hexColor.toLowerCase() === 'white'
									) {
										swatch.style.border = '1px solid rgba(0, 0, 0, 0.3)';
									}

									return swatch;
								},
								position: 0, // Position the swatch at the beginning
							},
						],
					})
				);

				editorState.current = EditorState.create({
					doc: value,
					extensions: [
						...extensions,
						EditorView.updateListener.of((update) => {
							try {
								// Ignore external changes to prevent infinite loops
								if (
									update.docChanged &&
									!isInternalChangeRef.current &&
									!update.transactions.some((tr) =>
										tr.annotation(ExternalChange)
									)
								) {
									// This is a user-initiated change
									const newValue = update.state.doc.toString();
									lastKnownValueRef.current = newValue;
									onChange(newValue);

									// Debug log for completion testing - supports patterns and commands
									const patterns = ['@', '#', 'color:', '[', '+'];
									const commandTriggers = enableCommands ? ['$', '/'] : [];
									const allTriggers = [...patterns, ...commandTriggers];
									const detectedTriggers = allTriggers.filter((trigger) =>
										newValue.includes(trigger)
									);
									if (detectedTriggers.length > 0) {
										const triggerTypes = enableCommands
											? 'patterns/commands'
											: 'patterns';
										console.log(
											`Enhanced input: ${triggerTypes} detected [${detectedTriggers.join(', ')}], completions should be available`
										);
									}
								}
								if (update.selectionSet) {
									onSelectionChange();
								}
							} catch (error) {
								console.error('CodeMirror update listener error:', error);
							}
						}),
						EditorView.domEventHandlers({
							keydown: (event, view) => {
								if (
									(event.key === 'Enter' && event.metaKey) ||
									(event.key === 'Enter' && event.ctrlKey)
								) {
									const reactEvent = event as unknown as React.KeyboardEvent;
									onKeyDown(reactEvent);
									return true;
								}
								return false;
							},
						}),
						// Use node editor theme
						nodeEditorTheme,
					],
				});

				const view = new EditorView({
					state: editorState.current,
					parent: editorRef.current,
				});

				editorViewRef.current = view;
				initializedRef.current = true;
				view.focus();
			} catch (error) {
				console.error('Failed to initialize CodeMirror editor:', error);
				// Fallback: just create a basic editor without autocompletion
				try {
					editorState.current = EditorState.create({
						doc: value,
						extensions: [
							mindmapLang(),
							validationDecorations,
							patternDecorations,
							EditorView.lineWrapping, // Enable line wrapping for fallback editor too
							editableCompartment.current.of(EditorView.editable.of(!disabled)),
							EditorView.updateListener.of((update) => {
								// Ignore external changes in fallback editor too
								if (
									update.docChanged &&
									!update.transactions.some((tr) =>
										tr.annotation(ExternalChange)
									)
								) {
									const newValue = update.state.doc.toString();
									lastKnownValueRef.current = newValue;
									onChange(newValue);
								}
								if (update.selectionSet) {
									onSelectionChange();
								}
							}),
							// Use node editor theme for fallback editor
							nodeEditorTheme,
						],
					});

					const view = new EditorView({
						state: editorState.current,
						parent: editorRef.current,
					});

					editorViewRef.current = view;
					initializedRef.current = true;
					view.focus();
				} catch (fallbackError) {
					console.error(
						'Even fallback editor initialization failed:',
						fallbackError
					);
				}
			}

			return () => {
				try {
					if (editorViewRef.current) {
						editorViewRef.current.destroy();
						editorViewRef.current = null;
					}
					editorState.current = null;
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
			view.dom.addEventListener('nodeTypeChange', handleNodeTypeChange);
			view.dom.addEventListener('commandExecuted', handleCommandExecuted);
			view.dom.addEventListener('referenceSelected', handleReferenceSelected);

			return () => {
				// Clean up event listeners
				if (view.dom) {
					view.dom.removeEventListener('nodeTypeChange', handleNodeTypeChange);
					view.dom.removeEventListener(
						'commandExecuted',
						handleCommandExecuted
					);
					view.dom.removeEventListener(
						'referenceSelected',
						handleReferenceSelected
					);
				}
			};
		}, [handleNodeTypeChange, handleCommandExecuted, handleReferenceSelected, enableCommands]);

		// Handle disabled state changes with DOM validity check
		useEffect(() => {
			try {
				const view = editorViewRef.current;
				if (view && view.dom && view.dom.isConnected) {
					view.dispatch({
						effects: editableCompartment.current.reconfigure(
							EditorView.editable.of(!disabled)
						),
					});
				}
			} catch (error) {
				console.error('Error updating disabled state:', error);
			}
		}, [disabled]);

		// Sync external value changes to CodeMirror (with loop prevention)
		useEffect(() => {
			const view = editorViewRef.current;
			if (!view || !view.dom || !view.dom.isConnected) {
				return;
			}

			const currentContent = view.state.doc.toString();

			// Only update if values actually differ
			if (value !== currentContent && value !== lastKnownValueRef.current) {
				// Preserve cursor position
				const currentSelection = view.state.selection.main;

				view.dispatch({
					changes: {
						from: 0,
						to: currentContent.length,
						insert: value || '',
					},
					annotations: [ExternalChange.of(true)],
					// Restore cursor position if it's within the new content
					selection:
						value && currentSelection.from <= (value || '').length
							? currentSelection
							: undefined,
				});

				lastKnownValueRef.current = value;
			}
		}, [value]);

		return (
			<>
				<motion.div
					ref={containerRef}
					data-testid='enhanced-input-container'
					className={cn(
						'enhanced-input-container flex-1 relative',
						hasErrors && 'has-validation-errors',
						hasWarnings && 'has-validation-warnings',
						hasSuggestions && 'has-validation-suggestions',
						'z-[100]',
						className
					)}
					initial={initial}
					animate={animate}
					transition={transition}
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
	}
);

EnhancedInput.displayName = 'EnhancedInput';
