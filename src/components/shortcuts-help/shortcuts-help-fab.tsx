'use client';

import {
	CATEGORY_LABELS,
	CATEGORY_ORDER,
	KEYBOARD_SHORTCUTS,
	type KeyboardShortcut,
	type ShortcutCategory,
} from '@/constants/keyboard-shortcuts';
import { cn } from '@/utils/cn';
import { Keyboard, X } from 'lucide-react';
import {
	AnimatePresence,
	motion,
	useReducedMotion,
} from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Detect if the user is on macOS for showing ⌘ vs Ctrl
 */
function useIsMac() {
	const [isMac, setIsMac] = useState(true); // Default to Mac for SSR

	useEffect(() => {
		setIsMac(
			typeof navigator !== 'undefined' &&
				navigator.platform.toLowerCase().includes('mac')
		);
	}, []);

	return isMac;
}

/**
 * Convert Mac-style key symbols to Windows equivalents
 */
function convertKeyForPlatform(key: string, isMac: boolean): string {
	if (isMac) return key;

	const conversions: Record<string, string> = {
		'⌘': 'Ctrl',
		'⇧': 'Shift',
		'⌥': 'Alt',
	};

	return conversions[key] ?? key;
}

/**
 * Renders a single key in a keyboard-style badge
 */
function KeyBadge({ keyLabel }: { keyLabel: string }) {
	return (
		<span
			className={cn(
				'inline-flex items-center justify-center',
				'min-w-[22px] h-[22px] px-1.5',
				'text-xs font-medium',
				'bg-white/10 border border-white/15',
				'rounded-[4px]',
				'text-white/80'
			)}
		>
			{keyLabel}
		</span>
	);
}

/**
 * Renders a keyboard shortcut row with keys and label
 */
function ShortcutRow({
	shortcut,
	isMac,
}: {
	shortcut: KeyboardShortcut;
	isMac: boolean;
}) {
	const displayKeys = shortcut.keys.map((key) =>
		convertKeyForPlatform(key, isMac)
	);

	return (
		<div className='flex items-center justify-between gap-4 py-1.5'>
			<span className='text-sm text-white/70'>{shortcut.label}</span>
			<div className='flex items-center gap-1 shrink-0'>
				{displayKeys.map((key, idx) => (
					<KeyBadge key={`${key}-${idx}`} keyLabel={key} />
				))}
			</div>
		</div>
	);
}

/**
 * Groups shortcuts by category
 */
function groupShortcutsByCategory(
	shortcuts: KeyboardShortcut[]
): Map<ShortcutCategory, KeyboardShortcut[]> {
	const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();

	for (const category of CATEGORY_ORDER) {
		const categoryShortcuts = shortcuts.filter(
			(s) => s.category === category
		);
		if (categoryShortcuts.length > 0) {
			grouped.set(category, categoryShortcuts);
		}
	}

	return grouped;
}

/**
 * Floating Action Button that shows keyboard shortcuts help
 */
export function ShortcutsHelpFab() {
	const [isOpen, setIsOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const isMac = useIsMac();
	const shouldReduceMotion = useReducedMotion();

	// Group shortcuts by category
	const groupedShortcuts = useMemo(
		() => groupShortcutsByCategory(KEYBOARD_SHORTCUTS),
		[]
	);

	// Handle mount for portal
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Handle escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				setIsOpen(false);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen]);

	const handleToggle = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	const handleClickOutside = useCallback(() => {
		setIsOpen(false);
	}, []);

	// Animation variants
	const fabVariants = {
		closed: { scale: 1 },
		open: { scale: 1.05 },
	};

	const cardVariants = shouldReduceMotion
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1 },
				exit: { opacity: 0 },
			}
		: {
				hidden: { opacity: 0, scale: 0.85, y: 20 },
				visible: {
					opacity: 1,
					scale: 1,
					y: 0,
					transition: {
						type: 'spring' as const,
						stiffness: 400,
						damping: 30,
					},
				},
				exit: {
					opacity: 0,
					scale: 0.85,
					y: 20,
					transition: { duration: 0.15 },
				},
			};

	const contentVariants = shouldReduceMotion
		? undefined
		: {
				hidden: { opacity: 0 },
				visible: {
					opacity: 1,
					transition: {
						staggerChildren: 0.03,
						delayChildren: 0.1,
					},
				},
			};

	const itemVariants = shouldReduceMotion
		? undefined
		: {
				hidden: { opacity: 0, y: 8 },
				visible: { opacity: 1, y: 0 },
			};

	if (!isMounted) return null;

	return createPortal(
		<div className='fixed bottom-6 right-6 z-30'>
			{/* Click-outside backdrop when open */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						className='fixed inset-0 z-30'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClickOutside}
						aria-hidden='true'
					/>
				)}
			</AnimatePresence>

			{/* Card - positioned above the FAB */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						className={cn(
							'absolute bottom-14 right-0 z-35',
							'w-80 max-h-[70vh] overflow-y-auto',
							'bg-neutral-900/95 backdrop-blur-md',
							'border border-white/10',
							'rounded-xl shadow-2xl shadow-black/50',
							'origin-bottom-right'
						)}
						variants={cardVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
					>
						{/* Header */}
						<div className='flex items-center justify-between px-4 py-3 border-b border-white/10'>
							<h3 className='text-sm font-semibold text-white/90'>
								Keyboard Shortcuts
							</h3>
							<button
								onClick={handleToggle}
								className={cn(
									'p-1 rounded-md',
									'text-white/50 hover:text-white/80',
									'hover:bg-white/10',
									'transition-colors duration-150'
								)}
								aria-label='Close shortcuts help'
							>
								<X className='size-4' />
							</button>
						</div>

						{/* Content */}
						<motion.div
							className='p-4 space-y-4'
							variants={contentVariants}
							initial='hidden'
							animate='visible'
						>
							{Array.from(groupedShortcuts.entries()).map(
								([category, shortcuts]) => (
									<motion.div
										key={category}
										variants={itemVariants}
									>
										<h4 className='text-xs font-medium text-white/40 uppercase tracking-wider mb-2'>
											{CATEGORY_LABELS[category]}
										</h4>
										<div className='space-y-0.5'>
											{shortcuts.map((shortcut) => (
												<ShortcutRow
													key={shortcut.label}
													shortcut={shortcut}
													isMac={isMac}
												/>
											))}
										</div>
									</motion.div>
								)
							)}
						</motion.div>

						{/* Footer hint */}
						<div className='px-4 py-2.5 border-t border-white/10'>
							<p className='text-xs text-white/40 text-center'>
								Press <KeyBadge keyLabel='?' /> anytime for help
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* FAB Button */}
			<motion.button
				onClick={handleToggle}
				className={cn(
					'relative w-10 h-10 rounded-xl',
					'flex items-center justify-center',
					'bg-white/10 backdrop-blur-sm',
					'border border-white/15',
					'shadow-lg shadow-black/30',
					'cursor-pointer',
					'transition-colors duration-200',
					// Note: hover styles work on touch but are acceptable for this small interactive element
					'hover:bg-white/15 hover:border-white/20',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
					isOpen && 'bg-white/15 border-white/20'
				)}
				variants={fabVariants}
				animate={isOpen ? 'open' : 'closed'}
				// Respect reduced motion preference for hover/tap transforms
				whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
				whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
				aria-label='Keyboard shortcuts help'
				aria-expanded={isOpen}
				tabIndex={0}
			>
				<Keyboard
					className={cn(
						'size-5',
						'text-white/70',
						'transition-colors duration-200',
						isOpen && 'text-white/90'
					)}
				/>
			</motion.button>
		</div>,
		document.body
	);
}
