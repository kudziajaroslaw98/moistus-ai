'use client';

import type { Completion } from '@codemirror/autocomplete';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { useMobileAutocompleteViewport } from './use-mobile-autocomplete-viewport';

interface MobileCompletionTrayProps {
	isOpen: boolean;
	options: readonly Completion[];
	selectedIndex: number | null;
	onClose: () => void;
	onHighlight: (index: number) => void;
	onSelect: (index: number) => void;
}

const TRAY_EDGE_PADDING = 12;
const TRAY_KEYBOARD_GAP = 12;
const TRAY_MAX_HEIGHT = 280;
const TRAY_MIN_HEIGHT = 120;

export function MobileCompletionTray({
	isOpen,
	options,
	selectedIndex,
	onClose,
	onHighlight,
	onSelect,
}: MobileCompletionTrayProps) {
	const { keyboardInset, visibleViewportHeight } =
		useMobileAutocompleteViewport(isOpen);

	const maxHeight = useMemo(() => {
		if (!visibleViewportHeight) {
			return TRAY_MAX_HEIGHT;
		}

		return Math.min(
			TRAY_MAX_HEIGHT,
			Math.max(TRAY_MIN_HEIGHT, visibleViewportHeight * 0.42)
		);
	}, [visibleViewportHeight]);

	if (!isOpen || options.length === 0) {
		return null;
	}

	return (
		<AnimatePresence>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				aria-label='Pattern autocomplete suggestions'
				className='fixed z-[160]'
				exit={{ opacity: 0, y: 8 }}
				initial={{ opacity: 0, y: 8 }}
				role='dialog'
				style={{
					left: TRAY_EDGE_PADDING,
					right: TRAY_EDGE_PADDING,
					bottom: `calc(env(safe-area-inset-bottom, 0px) + ${
						keyboardInset + TRAY_KEYBOARD_GAP
					}px)`,
				}}
				transition={{ duration: 0.18, ease: 'easeOut' }}
			>
				<div className='overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/96 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl ring-1 ring-primary-500/10'>
					<div className='flex items-center justify-between gap-3 border-b border-zinc-800/70 bg-zinc-900/80 px-4 py-3'>
						<div>
							<p className='text-sm font-medium text-zinc-100'>Suggestions</p>
							<p className='text-xs text-zinc-400'>
								Tap a pattern to insert it
							</p>
						</div>

						<button
							aria-label='Close suggestions'
							className='inline-flex size-8 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-900/80 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
							onClick={onClose}
							onMouseDown={(event) => event.preventDefault()}
							type='button'
						>
							<X className='size-4' />
						</button>
					</div>

					<div
						className='overflow-y-auto p-2'
						role='listbox'
						style={{ maxHeight }}
					>
						{options.map((option, index) => {
							const isSelected = selectedIndex === index;
							const isColorOption =
								option.label.startsWith('color:') &&
								typeof option.detail === 'string' &&
								option.detail.startsWith('#');

							return (
								<button
									aria-selected={isSelected}
									className={cn(
										'mb-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
										isSelected
											? 'bg-primary-500/12 text-zinc-50 ring-1 ring-primary-500/40'
											: 'bg-transparent text-zinc-300 hover:bg-zinc-900/80'
									)}
									key={`${option.label}-${index}`}
									onClick={() => onSelect(index)}
									onFocus={() => onHighlight(index)}
									onMouseDown={(event) => event.preventDefault()}
									onMouseEnter={() => onHighlight(index)}
									role='option'
									type='button'
								>
									{isColorOption ? (
										<span
											aria-hidden='true'
											className='size-4 shrink-0 rounded-sm border border-white/10'
											style={{ backgroundColor: option.detail }}
										/>
									) : (
										<span
											aria-hidden='true'
											className={cn(
												'size-2.5 shrink-0 rounded-full',
												isSelected ? 'bg-primary-400' : 'bg-zinc-600'
											)}
										/>
									)}

									<span className='min-w-0 flex-1'>
										<span className='block truncate text-sm font-medium'>
											{option.label}
										</span>

										{option.detail && (
											<span className='block truncate text-xs text-zinc-500'>
												{option.detail}
											</span>
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
}
