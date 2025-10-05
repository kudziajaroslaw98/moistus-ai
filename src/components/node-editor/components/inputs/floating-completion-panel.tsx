'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
	useFloating, 
	autoUpdate, 
	offset, 
	flip, 
	shift, 
	useDismiss, 
	useRole, 
	useInteractions,
	FloatingFocusManager,
	useListNavigation,
	useTypeahead
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { type PatternType } from '../../core/parsers/pattern-extractor';
import {
	getColorCompletions,
	getDateCompletions,
	getPriorityCompletions,
	getTagCompletions,
	getCompletionsForPattern
} from '../../core/completions';
import type { CompletionItem } from '../../core/completions';

interface FloatingCompletionPanelProps {
	isOpen: boolean;
	type: PatternType | null;
	currentValue: string;
	onSelect: (value: string) => void;
	onClose: () => void;
	anchorRef: React.RefObject<HTMLElement>;
	cursorPosition: number;
}

export const FloatingCompletionPanel: React.FC<FloatingCompletionPanelProps> = ({
	isOpen,
	type,
	currentValue,
	onSelect,
	onClose,
	anchorRef,
	cursorPosition,
}) => {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	
	const listRef = useRef<Array<HTMLElement | null>>([]);
	const listContentRef = useRef<string[]>([]);
	const typeaheadRef = useRef<string>('');

	// Get completions based on pattern type
	function getCompletionsForType(patternType: PatternType | null): CompletionItem[] {
		if (!patternType) return [];
		return getCompletionsForPattern(patternType, currentValue || '');
	}

	// Filter completions based on current input
	const filteredCompletions = useMemo(() => {
		if (!type) return [];
		return getCompletionsForType(type);
	}, [type, currentValue]);

	// Update list content for typeahead
	useEffect(() => {
		listContentRef.current = filteredCompletions.map(item => item.label);
	}, [filteredCompletions]);

	// Floating UI setup
	const { refs, floatingStyles, context } = useFloating({
		open: isOpen,
		onOpenChange: (open) => {
			if (!open) {
				onClose();
			}
		},
		middleware: [
			offset(8),
			flip({ padding: 16 }),
			shift({ padding: 16 })
		],
		whileElementsMounted: autoUpdate,
	});

	// Interactions
	const dismiss = useDismiss(context);
	const role = useRole(context, { role: 'listbox' });
	const listNavigation = useListNavigation(context, {
		listRef,
		activeIndex,
		selectedIndex,
		onNavigate: setActiveIndex,
		loop: true
	});
	const typeahead = useTypeahead(context, {
		listRef: listContentRef,
		activeIndex,
		selectedIndex,
		onMatch: (index) => {
			setActiveIndex(index);
			setSelectedIndex(index);
		},
		onTypingChange(isTyping) {
			if (!isTyping) {
				typeaheadRef.current = '';
			}
		}
	});

	const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
		dismiss,
		role,
		listNavigation,
		typeahead
	]);

	// Handle item selection
	const handleSelect = useCallback((item: CompletionItem, index: number) => {
		onSelect(item.value);
		setSelectedIndex(index);
		setActiveIndex(null);
	}, [onSelect]);

	// Handle keyboard events
	const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
		if (event.key === 'Enter' && activeIndex != null) {
			event.preventDefault();
			const selectedItem = filteredCompletions[activeIndex];

			if (selectedItem) {
				handleSelect(selectedItem, activeIndex);
			}
		}
	}, [activeIndex, filteredCompletions, handleSelect]);

	// Set floating element reference to anchor
	useEffect(() => {
		if (anchorRef.current) {
			refs.setReference(anchorRef.current);
		}
	}, [anchorRef, refs]);

	// Reset active index when completions change
	useEffect(() => {
		setActiveIndex(0);
		setSelectedIndex(null);
	}, [filteredCompletions]);

	if (!isOpen || !type || filteredCompletions.length === 0) {
		return null;
	}

	return (
		<AnimatePresence>
			<FloatingFocusManager
				context={context}
				modal={false}
				initialFocus={-1}
				returnFocus={false}
			>
				<motion.div
					{...getFloatingProps()}
					ref={refs.setFloating}
					style={floatingStyles}
					className="z-50"
					initial={{ opacity: 0, scale: 0.95, y: -10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: -10 }}
					transition={{ duration: 0.15 }}
					onKeyDown={handleKeyDown}
				>
					<div className="bg-zinc-950/95 border border-zinc-800/80 rounded-xl shadow-2xl backdrop-blur-md ring-1 ring-teal-500/10 py-2 min-w-[280px] sm:min-w-[320px] max-w-[340px] sm:max-w-[380px] max-h-[400px] overflow-auto">
						{/* Header */}
						<div className="px-4 py-2 text-xs text-zinc-400 font-semibold border-b border-zinc-800/60 mb-1 bg-gradient-to-r from-zinc-900/60 to-zinc-800/40">
							{getTypeLabel(type)} suggestions
						</div>
						
						{/* Items */}
						<div role="listbox">
							{filteredCompletions.map((item, index) => (
								<motion.div
									key={`${item.value}-${index}`}
									{...getItemProps({
										ref(node) {
											listRef.current[index] = node;
										},
										onClick() {
											handleSelect(item, index);
										}
									})}
									className={cn(
										'px-4 py-3 sm:py-2.5 cursor-pointer flex items-center justify-between',
										'text-sm transition-all duration-300 ease-out rounded-md mx-2 mb-1',
										'min-h-[44px] sm:min-h-[auto]', // 44px is minimum touch target
										activeIndex === index 
											? 'bg-teal-900/25 text-zinc-100 ring-1 ring-teal-500/40 shadow-teal-500/10 transform translate-x-1' 
											: 'text-zinc-300 hover:bg-zinc-800/60 active:bg-zinc-700'
									)}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.02, duration: 0.15 }}
								>
									<div className="flex items-center gap-2">
										{getTypeIcon(type)}

										<div className="flex flex-col">
											<span className="font-medium">{item.label}</span>

											{item.description && (
												<span className="text-xs text-zinc-500">{item.description}</span>
											)}
										</div>
									</div>
									
									{/* Preview for color items */}
									{type === 'color' && (
										<div 
											className="w-4 h-4 rounded border border-zinc-600 flex-shrink-0"
											style={{ backgroundColor: item.value }}
										/>
									)}
								</motion.div>
							))}
						</div>
						
						{/* Footer hint */}
						<div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800/60 mt-1 bg-gradient-to-r from-zinc-900/40 to-zinc-800/30 backdrop-blur-sm">
							<div className="flex items-center gap-3">
								<span className="flex gap-1 items-center">
									<kbd className="px-1.5 py-0.5 bg-zinc-800/90 border border-zinc-700/50 rounded text-zinc-400 font-mono text-xs">↑↓</kbd>

									<span className="text-zinc-400">navigate</span>
								</span>

								<span className="flex gap-1 items-center">
									<kbd className="px-1.5 py-0.5 bg-zinc-800/90 border border-zinc-700/50 rounded text-zinc-400 font-mono text-xs">↵</kbd>

									<span className="text-zinc-400">select</span>
								</span>

								<span className="flex gap-1 items-center">
									<kbd className="px-1.5 py-0.5 bg-zinc-800/90 border border-zinc-700/50 rounded text-zinc-400 font-mono text-xs">esc</kbd>

									<span className="text-zinc-400">close</span>
								</span>
							</div>
						</div>
					</div>
				</motion.div>
			</FloatingFocusManager>
		</AnimatePresence>
	);
};

// Helper functions
function getTypeLabel(type: PatternType): string {
	switch (type) {
		case 'color': return 'Color';
		case 'date': return 'Date';
		case 'priority': return 'Priority';
		case 'tag': return 'Tag';
		case 'assignee': return 'Assignee';
		default: return 'Suggestion';
	}
}

function getTypeIcon(type: PatternType): React.ReactNode {
	const iconClass = "w-3 h-3 flex-shrink-0";
	
	switch (type) {
		case 'color':
			return <div className={cn(iconClass, "rounded-full bg-purple-500")} />;
		case 'date':
			return <div className={cn(iconClass, "rounded bg-emerald-500")} />;
		case 'priority':
			return <div className={cn(iconClass, "rounded bg-orange-500")} />;
		case 'tag':
			return <div className={cn(iconClass, "rounded bg-blue-500")} />;
		case 'assignee':
			return <div className={cn(iconClass, "rounded-full bg-violet-500")} />;
		default:
			return <div className={cn(iconClass, "rounded bg-gray-500")} />;
	}
}