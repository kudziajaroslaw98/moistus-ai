'use client';

import type { Completion } from '@codemirror/autocomplete';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/collaborator-utils';
import type { EditorAnchorRect } from '../../types';
import type { CollaboratorMention } from '../../integrations/codemirror/completions';
import { useMobileAutocompleteViewport } from './use-mobile-autocomplete-viewport';

interface MobileCompletionTrayProps {
	isOpen: boolean;
	isEditorFocused: boolean;
	anchorRect: EditorAnchorRect | null;
	editorRect: EditorAnchorRect | null;
	mentionMap: Map<string, CollaboratorMention>;
	options: readonly Completion[];
	selectedIndex: number | null;
	onClose: () => void;
	onHighlight: (index: number) => void;
	onSelect: (index: number) => void;
}

type LayoutMode = 'keyboard-open' | 'floating';

const FLOATING_EDGE_PADDING = 12;
const FLOATING_GAP = 8;
const FLOATING_MAX_HEIGHT = 240;
const KEYBOARD_OPEN_MAX_HEIGHT = 132;
const KEYBOARD_OPEN_ROW_HEIGHT = 40;

function clamp(value: number, min: number, max: number) {
	if (max <= min) {
		return min;
	}

	return Math.min(Math.max(value, min), max);
}

function getMentionBadgeLabel(role: CollaboratorMention['role']) {
	switch (role) {
		case 'editor':
			return '[editor]';
		case 'viewer':
			return '[viewer]';
		default:
			return '[built-in]';
	}
}

function MentionAvatar({
	mention,
	compact,
}: {
	mention: CollaboratorMention;
	compact: boolean;
}) {
	const initials = getInitials(mention.displayName || mention.slug);

	return (
		<span
			aria-hidden='true'
			className={cn(
				'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border text-[9px] font-semibold uppercase tracking-[0.08em]',
				compact ? 'size-[18px]' : 'size-6',
				mention.avatarUrl
					? 'border-white/12 bg-zinc-900'
					: mention.role === 'built-in'
						? 'border-violet-500/20 bg-violet-500/18 text-violet-200'
						: 'border-emerald-500/20 bg-emerald-500/18 text-emerald-100'
			)}
		>
			<span>{initials || mention.slug.charAt(0).toUpperCase()}</span>

			{mention.avatarUrl && (
				<img
					alt=''
					className='absolute inset-0 size-full object-cover'
					onError={(event) => {
						event.currentTarget.remove();
					}}
					src={mention.avatarUrl}
				/>
			)}
		</span>
	);
}

function getFloatingPanelStyle(
	anchorRect: EditorAnchorRect | null,
	editorRect: EditorAnchorRect | null,
	viewportRect: EditorAnchorRect,
) {
	const viewportLeft = viewportRect.left + FLOATING_EDGE_PADDING;
	const viewportRight = viewportRect.right - FLOATING_EDGE_PADDING;
	const editorLeft = editorRect ? editorRect.left + FLOATING_EDGE_PADDING : viewportLeft;
	const editorRight = editorRect
		? editorRect.right - FLOATING_EDGE_PADDING
		: viewportRight;
	const availableWidth = Math.max(
		180,
		Math.min(viewportRight - viewportLeft, editorRight - editorLeft)
	);
	const width =
		availableWidth < 220 ? availableWidth : Math.min(360, availableWidth);
	const minLeft = Math.max(viewportLeft, editorLeft);
	const maxLeft = Math.max(
		minLeft,
		Math.min(viewportRight - width, editorRight - width)
	);
	const preferredLeft = anchorRect?.left ?? editorLeft;
	const left = clamp(preferredLeft, minLeft, maxLeft);
	const anchorBottom = anchorRect?.bottom ?? editorRect?.top ?? viewportRect.top;
	const top = Math.max(
		viewportRect.top + FLOATING_EDGE_PADDING,
		anchorBottom + FLOATING_GAP
	);
	const availableBelow = viewportRect.bottom - top - FLOATING_EDGE_PADDING;
	const maxHeight = Math.min(
		FLOATING_MAX_HEIGHT,
		Math.max(72, availableBelow)
	);

	return {
		left,
		top,
		width,
		maxHeight,
	};
}

function getKeyboardOpenPanelStyle(
	keyboardInset: number,
	optionCount: number
) {
	return {
		left: 0,
		right: 0,
		bottom: keyboardInset,
		maxHeight: Math.min(
			KEYBOARD_OPEN_MAX_HEIGHT,
			Math.max(48, Math.min(optionCount, 3) * KEYBOARD_OPEN_ROW_HEIGHT + 12)
		),
	};
}

export function MobileCompletionTray({
	isOpen,
	isEditorFocused,
	anchorRect,
	editorRect,
	mentionMap,
	options,
	selectedIndex,
	onClose,
	onHighlight,
	onSelect,
}: MobileCompletionTrayProps) {
	const { keyboardInset, keyboardOpen, visualViewportRect } =
		useMobileAutocompleteViewport(isOpen, isEditorFocused);

	const layoutMode: LayoutMode = keyboardOpen ? 'keyboard-open' : 'floating';
	const panelStyle = useMemo(() => {
		const viewportRect =
			visualViewportRect.width > 0
				? visualViewportRect
				: {
						top: 0,
						left: 0,
						right: window.innerWidth,
						bottom: window.innerHeight,
						width: window.innerWidth,
						height: window.innerHeight,
					};

		return layoutMode === 'keyboard-open'
			? getKeyboardOpenPanelStyle(keyboardInset, options.length)
			: getFloatingPanelStyle(
					anchorRect,
					editorRect,
					viewportRect
				);
	}, [
		anchorRect,
		editorRect,
		keyboardInset,
		layoutMode,
		options.length,
		visualViewportRect,
	]);

	if (!isOpen || options.length === 0) {
		return null;
	}

	const tray = (
		<AnimatePresence initial={false}>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				aria-label='Pattern autocomplete suggestions'
				className='fixed z-[160]'
				data-node-editor-autocomplete-tray='true'
				data-layout-mode={layoutMode}
				exit={{ opacity: 0, y: 6 }}
				initial={{ opacity: 0, y: 6 }}
				role='dialog'
				style={panelStyle}
				transition={{ duration: 0.16, ease: 'easeOut' }}
			>
				<div
					className={cn(
						'relative overflow-hidden border border-zinc-800/85 bg-zinc-950/98 text-zinc-100',
						layoutMode === 'keyboard-open'
							? 'border-b-0 border-x-0 shadow-[0_-1px_0_rgba(255,255,255,0.03)]'
							: 'rounded-[20px] shadow-[0_18px_36px_rgba(0,0,0,0.45)] ring-1 ring-primary-500/10'
					)}
				>
					{layoutMode === 'floating' && (
						<div className='pointer-events-none absolute right-2 top-2 z-10'>
							<button
								aria-label='Close suggestions'
								className='pointer-events-auto inline-flex size-7 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/90 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
								onClick={onClose}
								onPointerDown={(event) => event.preventDefault()}
								type='button'
							>
								<X className='size-3.5' />
							</button>
						</div>
					)}

					<div
						className={cn(
							'overflow-y-auto overscroll-y-contain touch-pan-y',
							layoutMode === 'keyboard-open' ? 'p-0' : 'p-1.5',
							layoutMode === 'floating' && 'pt-10'
						)}
						role='listbox'
						style={{
							maxHeight: panelStyle.maxHeight,
							WebkitOverflowScrolling: 'touch',
						}}
					>
						{options.map((option, index) => {
							const isSelected = selectedIndex === index;
							const mention = mentionMap.get(option.label);
							const isColorOption =
								option.label.startsWith('color:') &&
								typeof option.detail === 'string' &&
								option.detail.startsWith('#');
							const isCompact = layoutMode === 'keyboard-open';

							return (
								<button
									aria-selected={isSelected}
									className={cn(
										'flex w-full items-center gap-2.5 text-left transition-colors',
										isCompact
											? 'min-h-10 rounded-none px-3 py-2'
											: 'mb-1 min-h-11 rounded-2xl px-3 py-2.5 last:mb-0',
										isSelected
											? 'bg-primary-500/14 text-zinc-50 ring-1 ring-primary-400/30'
											: 'bg-transparent text-zinc-300 hover:bg-zinc-900/80'
									)}
									key={`${option.label}-${index}`}
									onClick={() => onSelect(index)}
									onFocus={() => onHighlight(index)}
									onMouseEnter={() => onHighlight(index)}
									onPointerDown={(event) => event.preventDefault()}
									role='option'
									type='button'
								>
									<span
										aria-hidden='true'
										className={cn(
											'h-6 w-0.5 shrink-0 rounded-full transition-colors',
											isSelected ? 'bg-primary-400' : 'bg-transparent'
										)}
									/>

									{mention ? (
										<MentionAvatar compact={isCompact} mention={mention} />
									) : isColorOption ? (
										<span
											aria-hidden='true'
											className={cn(
												'shrink-0 rounded-sm border border-white/10',
												isCompact ? 'size-3.5' : 'size-4'
											)}
											style={{ backgroundColor: option.detail }}
										/>
									) : (
										<span
											aria-hidden='true'
											className={cn(
												'shrink-0 rounded-full',
												isCompact ? 'size-2' : 'size-2.5',
												isSelected ? 'bg-primary-400' : 'bg-zinc-600'
											)}
										/>
									)}

									<span className='min-w-0 flex-1'>
										{mention ? (
											<>
												<span className='flex min-w-0 items-center gap-2'>
													<span className='shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400'>
														{getMentionBadgeLabel(mention.role)}
													</span>
													<span className='truncate font-mono text-[13px] font-semibold'>
														{option.label}
													</span>
												</span>
												<span className='mt-0.5 block truncate text-[11px] text-zinc-500'>
													{mention.displayName}
												</span>
											</>
										) : (
											<>
												<span className='block truncate text-[13px] font-medium'>
													{option.label}
												</span>

												{option.detail && (
													<span className='mt-0.5 block truncate text-[11px] text-zinc-500'>
														{option.detail}
													</span>
												)}
											</>
										)}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);

	if (typeof document === 'undefined') {
		return null;
	}

	const portalTarget =
		document.querySelector('[data-node-editor-overlay="true"]') ?? document.body;

	return createPortal(tray, portalTarget);
}
