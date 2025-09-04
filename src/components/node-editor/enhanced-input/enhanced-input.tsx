'use client';

import React, { forwardRef, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { motion, type MotionProps } from 'motion/react';
import { cn } from '@/utils/cn';
import { mindmapLang, mindmapCSS } from '../codemirror/language';
import { ValidationTooltip } from './validation-tooltip';
import { getValidationResults } from '../validation';
import universalCompletionSource from '../completions';
import { validationDecorations, patternDecorations } from '../codemirror/decorations';
import { createCommandDecorations, commandCompletions } from '../codemirror';

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
	({
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
	}, ref) => {
		const editorRef = useRef<HTMLDivElement>(null);
		const editorViewRef = useRef<EditorView | null>(null);
		const editorState = useRef<EditorState|null>(null);
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
		const hasErrors = validationErrors.some(error => error.type === 'error');
		const hasWarnings = validationErrors.some(error => error.type === 'warning');
		const hasSuggestions = validationErrors.some(error => error.type === 'suggestion');
		
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
		const handleQuickFix = useCallback((startIndex: number, endIndex: number, replacement: string) => {
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
		}, []);

		// Define event handlers outside useEffect for proper cleanup access
		const handleNodeTypeChange = useCallback((event: CustomEvent) => {
			try {
				console.log('Node type change event:', event.detail);
				
				// Call parent callback if provided
				if (onNodeTypeChange && event.detail?.nodeType) {
					onNodeTypeChange(event.detail.nodeType);
				}
				
				// Emit a custom event that parent components can listen to (backward compatibility)
				const nodeTypeChangeEvent = new CustomEvent('nodeEditorTypeChange', {
					detail: event.detail,
					bubbles: true
				});
				editorViewRef.current?.dom.dispatchEvent(nodeTypeChangeEvent);
			} catch (error) {
				console.error('Error handling node type change:', error);
			}
		}, [onNodeTypeChange]);
		
		const handleCommandExecuted = useCallback((event: CustomEvent) => {
			try {
				console.log('Command executed event:', event.detail);
				
				// Call parent callback if provided
				if (onCommandExecuted && event.detail) {
					onCommandExecuted(event.detail);
				}
				
				// Emit a custom event that parent components can listen to (backward compatibility)
				const commandExecutedEvent = new CustomEvent('nodeEditorCommandExecuted', {
					detail: event.detail,
					bubbles: true
				});
				editorViewRef.current?.dom.dispatchEvent(commandExecutedEvent);
			} catch (error) {
				console.error('Error handling command executed:', error);
			}
		}, [onCommandExecuted]);

		// Initialize CodeMirror editor with stable dependencies (avoids recreation on callback changes)
		useEffect(() => {
			if (!editorRef.current || editorViewRef.current || !editorRef.current.isConnected) {
				return;
			}

			console.log('Initializing CodeMirror editor...')
			
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
						maxRenderedOptions: 15,
						defaultKeymap: true,
						closeOnBlur: true,
						activateOnTyping: true,
						activateOnCompletion: () => true,
						interactionDelay: enableCommands ? 100 : 75,
						selectOnOpen: false,
						optionClass: (completion) => {
							const classes = [];
							
							// Add type-specific classes
							if (completion.section && typeof completion.section === 'object' && 'name' in completion.section) {
								const sectionName = completion.section.name;
								if (sectionName === 'Node Types') {
									classes.push('command-completion-item', `completion-section-${sectionName.toLowerCase().replace(/\s+/g, '-')}`);
								} else {
									classes.push('pattern-completion-item', `completion-category-${sectionName.toLowerCase()}`);
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
							
							const aSectionRank = (a.section && typeof a.section === 'object' && 'rank' in a.section) ? a.section.rank : 10;
							const bSectionRank = (b.section && typeof b.section === 'object' && 'rank' in b.section) ? b.section.rank : 10;
							const sectionDiff = aSectionRank - bSectionRank;
							if (sectionDiff !== 0) return sectionDiff;
							
							return a.label.localeCompare(b.label);
						}
					})
				);

				editorState.current = EditorState.create({ 
					doc: value,
					extensions: [
						...extensions,
					EditorView.updateListener.of((update) => {
						try {
							if (update.docChanged && !isInternalChangeRef.current) {
								// This is a user-initiated change
								const newValue = update.state.doc.toString();
								lastKnownValueRef.current = newValue;
								onChange(newValue);
								
								// Debug log for completion testing - supports patterns and commands
								const patterns = ['@', '#', 'color:', '[', '+'];
								const commandTriggers = enableCommands ? ['$', '/'] : [];
								const allTriggers = [...patterns, ...commandTriggers];
								const detectedTriggers = allTriggers.filter(trigger => newValue.includes(trigger));
								if (detectedTriggers.length > 0) {
									const triggerTypes = enableCommands ? 'patterns/commands' : 'patterns';
									console.log(`Enhanced input: ${triggerTypes} detected [${detectedTriggers.join(', ')}], completions should be available`);
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
							if ((event.key === 'Enter' && event.metaKey) || (event.key === 'Enter' && event.ctrlKey)) {
								const reactEvent = event as unknown as React.KeyboardEvent;
								onKeyDown(reactEvent);
								return true;
							}
							return false;
						}
					}),
					EditorView.theme({
						'&': {
							fontSize: '16px',
							fontFamily: 'inherit',
						},
						'.cm-content': {
							minHeight: '60px',
							maxHeight: '216px',
							padding: '12px',
							backgroundColor: 'rgba(24, 24, 27, 0.5)',
							color: 'rgb(212, 212, 216)',
							border: '1px solid rgb(39, 39, 42)',
							borderRadius: '6px',
							outline: 'none',
							wordWrap: 'break-word',
							overflowWrap: 'break-word',
							whiteSpace: 'pre-wrap',
						},
						'.cm-focused .cm-content': {
							outline: 'none',
							borderColor: 'rgb(20, 184, 166)',
							boxShadow: '0 0 0 1px rgb(20, 184, 166)',
						},
						'.cm-editor': {
							borderRadius: '6px',
							backgroundColor: 'transparent',
						},
						'.cm-scroller': {
							fontFamily: 'inherit',
							lineHeight: '1.4',
						},
						// Enhanced autocompletion dropdown styling
						'.cm-tooltip-autocomplete': {
							backgroundColor: 'rgb(39 39 42)',
							border: '1px solid rgb(63 63 70)',
							borderRadius: '8px',
							color: 'rgb(244 244 245)',
							fontSize: '14px',
							boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
							maxHeight: '300px',
							minWidth: '280px',
						},
						'.cm-tooltip-autocomplete ul': {
							maxHeight: '280px',
						},
						'.cm-tooltip-autocomplete ul li': {
							padding: '6px 12px',
							borderRadius: '4px',
							margin: '2px 4px',
							cursor: 'pointer',
							transition: 'background-color 0.15s ease',
						},
						'.cm-tooltip-autocomplete ul li[aria-selected]': {
							backgroundColor: 'rgb(20 184 166)',
							color: 'rgb(255 255 255)',
						},
						'.cm-tooltip-autocomplete ul li:hover': {
							backgroundColor: 'rgb(63 63 70)',
						},
						'.cm-tooltip-autocomplete-disabled': {
							opacity: '0.5',
						},
						// Completion content styling
						'.cm-completionLabel': {
							color: 'rgb(244 244 245)',
							fontWeight: '500',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
						},
						'.cm-completionDetail': {
							color: 'rgb(161 161 170)',
							fontSize: '12px',
							marginTop: '2px',
							lineHeight: '1.3',
						},
						'.cm-completionMatchedText': {
							backgroundColor: 'rgb(255 255 0)',
							color: 'rgb(0 0 0)',
							borderRadius: '2px',
							padding: '0 1px',
						},
						// Pattern-specific completion type styling
						'.completion-type-keyword::before': {
							content: '"📅"',
							marginRight: '4px',
							fontSize: '12px',
						},
						'.completion-type-variable::before': {
							content: '"🔥"',
							marginRight: '4px',
							fontSize: '12px',
						},
						'.completion-type-property::before': {
							content: '"🎨"',
							marginRight: '4px',
							fontSize: '12px',
						},
						'.completion-type-type::before': {
							content: '"🏷️"',
							marginRight: '4px',
							fontSize: '12px',
						},
						'.completion-type-function::before': {
							content: '"👤"',
							marginRight: '4px',
							fontSize: '12px',
						},
						// Category-specific styling to match preview patterns
						'.completion-category-quick': {
							borderLeft: '3px solid rgb(34 197 94)',
							backgroundColor: 'rgba(34, 197, 94, 0.05)',
						},
						'.completion-category-priority': {
							borderLeft: '3px solid rgb(239 68 68)',
							backgroundColor: 'rgba(239, 68, 68, 0.05)',
						},
						'.completion-category-basic': {
							borderLeft: '3px solid rgb(59 130 246)',
							backgroundColor: 'rgba(59, 130, 246, 0.05)',
						},
						'.completion-category-status': {
							borderLeft: '3px solid rgb(251 191 36)',
							backgroundColor: 'rgba(251, 191, 36, 0.05)',
						},
						'.completion-category-work': {
							borderLeft: '3px solid rgb(168 85 247)',
							backgroundColor: 'rgba(168, 85, 247, 0.05)',
						},
						'.completion-category-special': {
							borderLeft: '3px solid rgb(14 165 233)',
							backgroundColor: 'rgba(14, 165, 233, 0.05)',
						}
					}, { dark: true })
				]
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
								if (update.docChanged) {
									onChange(update.state.doc.toString());
								}
								if (update.selectionSet) {
									onSelectionChange();
								}
							}),
							EditorView.theme({
								'&': { fontSize: '16px', fontFamily: 'inherit' },
								'.cm-content': {
									minHeight: '60px',
									maxHeight: '216px',
									padding: '12px',
									backgroundColor: 'rgba(24, 24, 27, 0.5)',
									color: 'rgb(212, 212, 216)',
									border: '1px solid rgb(39, 39, 42)',
									borderRadius: '6px',
									outline: 'none',
									wordWrap: 'break-word',
									overflowWrap: 'break-word',
									whiteSpace: 'pre-wrap',
								},
								'.cm-editor': {
									borderRadius: '6px',
									backgroundColor: 'transparent'
								}
							}, { dark: true })
						]
					});

					const view = new EditorView({
						state: editorState.current,
						parent: editorRef.current,
					});

					editorViewRef.current = view;
					initializedRef.current = true;
					view.focus();
				} catch (fallbackError) {
					console.error('Even fallback editor initialization failed:', fallbackError);
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

			return () => {
				// Clean up event listeners
				if (view.dom) {
					view.dom.removeEventListener('nodeTypeChange', handleNodeTypeChange);
					view.dom.removeEventListener('commandExecuted', handleCommandExecuted);
				}
			};
		}, [handleNodeTypeChange, handleCommandExecuted, enableCommands]);

		// Handle disabled state changes with DOM validity check
		useEffect(() => {
			try {
				const view = editorViewRef.current;
				if (view && view.dom && view.dom.isConnected) {
					view.dispatch({
						effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled))
					});
				}
			} catch (error) {
				console.error('Error updating disabled state:', error);
			}
		}, [disabled]);

		// Disable external value sync - let CodeMirror manage its own state
		// The editor will update the parent through onChange callbacks
		// This prevents cursor reset issues

		return (
			<>
				<style dangerouslySetInnerHTML={{ __html: mindmapCSS }} />
				
				<motion.div
					ref={containerRef}
					data-testid="enhanced-input-container"
					className={cn(
						'enhanced-input-container flex-1 relative', 
						hasErrors && 'has-validation-errors',
						hasWarnings && 'has-validation-warnings',
						hasSuggestions && 'has-validation-suggestions',
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
							className="enhanced-input-wrapper"
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