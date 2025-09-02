'use client';

import React, { forwardRef, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { motion, type MotionProps } from 'motion/react';
import { cn } from '@/utils/cn';
import { mindmapLang, mindmapCSS } from '../domain/codemirror/codemirror-mindmap-lang';
import { ValidationTooltip } from './validation-tooltip';
import { getValidationResults } from '../domain/validators';
import { universalCompletionSource } from '../domain/completion-providers/universal-completion-source';
import { validationDecorations } from '../domain/codemirror/codemirror-decorations';
import { patternDecorations } from '../domain/codemirror/codemirror-pattern-decorations';

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
		...rest
	}, ref) => {
		const editorRef = useRef<HTMLDivElement>(null);
		const editorViewRef = useRef<EditorView | null>(null);
		const editorState = useRef<EditorState|null>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const editableCompartment = useRef(new Compartment());
		const [validationTooltipOpen, setValidationTooltipOpen] = useState(false);
		const initializedRef = useRef(false);
		const isUserTypingRef = useRef(false);

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

		// Initialize CodeMirror editor with DOM stability checks
		useEffect(() => {
			if (!editorRef.current || editorViewRef.current || !editorRef.current.isConnected) {
				return;
			}

			console.log('Initializing CodeMirror editor...')
			try {
				editorState.current = EditorState.create({ 
				doc: value,
				extensions: [
					mindmapLang(),
					validationDecorations,
					patternDecorations,
					EditorView.lineWrapping, // Enable line wrapping for long text
					editableCompartment.current.of(EditorView.editable.of(!disabled)),
					// Universal completion system with pattern detection
					(() => {
						try {
							return autocompletion({
								override: [universalCompletionSource],
								maxRenderedOptions: 12, // Increased for more comprehensive results
								defaultKeymap: true,
								closeOnBlur: true,
								activateOnTyping: true,
								activateOnCompletion: () => true,
								interactionDelay: 0,
								selectOnOpen: false,
								optionClass: (completion) => {
									// Add custom CSS classes based on completion type
									const classes = ['completion-item'];
									if (completion.section?.name) {
										classes.push(`completion-category-${completion.section.name.toLowerCase()}`);
									}
									if (completion.type) {
										classes.push(`completion-type-${completion.type}`);
									}
									return classes.join(' ');
								},
								compareCompletions: (a, b) => {
									// Custom sorting: boost first, then section rank, then alphabetical
									const boostDiff = (b.boost || 0) - (a.boost || 0);
									if (boostDiff !== 0) return boostDiff;
									
									const sectionDiff = (a.section?.rank || 10) - (b.section?.rank || 10);
									if (sectionDiff !== 0) return sectionDiff;
									
									return a.label.localeCompare(b.label);
								}
							});
						} catch (error) {
							console.error('Universal completion extension failed:', error);
							// Fallback to basic autocompletion
							return autocompletion({
								override: [(context) => {
									const text = context.state.doc.toString();
									if (text.includes('@')) {
										return {
											from: context.pos,
											options: [
												{ label: 'today', type: 'keyword' },
												{ label: 'tomorrow', type: 'keyword' }
											]
										};
									}
									return null;
								}],
								maxRenderedOptions: 5,
								defaultKeymap: true,
								closeOnBlur: true
							});
						}
					})(),
					EditorView.updateListener.of((update) => {
						try {
							if (update.docChanged) {
								// Only call onChange for user-initiated changes
								const newValue = update.state.doc.toString();
								isUserTypingRef.current = true;
								onChange(newValue);
								// Reset the flag after a brief delay to allow React to process
								setTimeout(() => {
									isUserTypingRef.current = false;
								}, 50);
								
								// Debug log for completion testing - now supports all patterns
								const patterns = ['@', '#', 'color:', '[', '+'];
								const detectedPatterns = patterns.filter(pattern => newValue.includes(pattern));
								if (detectedPatterns.length > 0) {
									console.log(`Enhanced input: Pattern(s) detected [${detectedPatterns.join(', ')}], universal completion should be available`);
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
		}, []); // Empty dependency array - only run once

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

		// DISABLED: External value sync is causing the clearing issue
		// The editor will be controlled entirely by user input
		// External updates will be handled differently when needed

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