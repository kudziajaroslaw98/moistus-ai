'use client';
import useAppStore from '@/store/mind-map-store';
import {
	autoUpdate,
	flip,
	FloatingPortal,
	offset,
	shift,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { ContextMenuRenderer } from './context-menu-renderer';
import { useContextMenuConfig } from './use-context-menu-config';
import { GlassmorphismTheme } from '../nodes/themes/glassmorphism-theme';

interface ContextMenuDisplayProps {
	aiActions: {
		summarizeNode: (nodeId: string) => void;
		summarizeBranch: (nodeId: string) => void;
		extractConcepts: (nodeId: string) => void;
		openContentModal: (nodeId: string) => void;
		suggestConnections: () => void;
		suggestMerges: () => void;
		generateFromSelectedNodes?: (
			nodeIds: string[],
			prompt: string
		) => Promise<void>;
	};
}

interface VirtualElement {
	getBoundingClientRect(): DOMRect;
}

function createVirtualElement(x: number, y: number): VirtualElement {
	return {
		getBoundingClientRect() {
			return {
				width: 0,
				height: 0,
				x,
				y,
				top: y,
				left: x,
				right: x,
				bottom: y,
				toJSON() {
					return {};
				},
			} as DOMRect;
		},
	};
}

export function ContextMenuDisplay({ aiActions }: ContextMenuDisplayProps) {
	const { contextMenuState, popoverOpen, setPopoverOpen, setContextMenuState } =
		useAppStore(
			useShallow((state) => ({
				contextMenuState: state.contextMenuState,
				popoverOpen: state.popoverOpen,
				setPopoverOpen: state.setPopoverOpen,
				setContextMenuState: state.setContextMenuState,
			}))
		);

	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

	const { x, y } = contextMenuState;

	const handleClose = useCallback(() => {
		setPopoverOpen({ contextMenu: false });
		setContextMenuState({
			x: 0,
			y: 0,
			nodeId: null,
			edgeId: null,
		});
	}, [setPopoverOpen, setContextMenuState]);

	// Get menu configuration
	const { menuConfig } = useContextMenuConfig({
		aiActions,
		onClose: handleClose,
	});

	// Create virtual element from mouse coordinates
	const virtualElement = useMemo(() => {
		if (typeof x === 'number' && typeof y === 'number' && x !== 0 && y !== 0) {
			return createVirtualElement(x, y);
		}

		return null;
	}, [x, y]);

	// Floating UI configuration
	const { refs, floatingStyles, context } = useFloating({
		open: popoverOpen.contextMenu,
		onOpenChange: (open) => {
			setPopoverOpen({ contextMenu: open });

			if (!open) {
				handleClose();
			}
		},
		middleware: [
			offset(8),
			flip({
				fallbackAxisSideDirection: 'start',
				fallbackPlacements: [
					'bottom-start',
					'top-start',
					'right-start',
					'left-start',
				],
			}),
			shift({ padding: 8 }),
		],
		whileElementsMounted: autoUpdate,
		placement: 'bottom-start',
		strategy: 'fixed',
		transform: false,
	});

	// Set virtual element as reference
	useEffect(() => {
		if (virtualElement && popoverOpen.contextMenu) {
			refs.setReference(virtualElement);
		}
	}, [virtualElement, popoverOpen.contextMenu, contextMenuState, refs]);

	// Interaction hooks
	const dismiss = useDismiss(context, {
		outsidePressEvent: 'mousedown',
		bubbles: {
			escapeKey: true,
		},
	});

	const role = useRole(context, {
		role: 'menu',
	});

	const { getFloatingProps } = useInteractions([dismiss, role]);

	// Keyboard navigation
	useEffect(() => {
		if (!popoverOpen.contextMenu) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			const menuItems = menuItemsRef.current.filter(Boolean);
			const currentIndex = activeIndex ?? -1;

			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault();
					const nextIndex = currentIndex + 1;
					setActiveIndex(nextIndex >= menuItems.length ? 0 : nextIndex);
					menuItems[nextIndex >= menuItems.length ? 0 : nextIndex]?.focus();
					break;
				case 'ArrowUp':
					event.preventDefault();
					const prevIndex = currentIndex - 1;
					setActiveIndex(prevIndex < 0 ? menuItems.length - 1 : prevIndex);
					menuItems[prevIndex < 0 ? menuItems.length - 1 : prevIndex]?.focus();
					break;
				case 'Home':
					event.preventDefault();
					setActiveIndex(0);
					menuItems[0]?.focus();
					break;
				case 'End':
					event.preventDefault();
					setActiveIndex(menuItems.length - 1);
					menuItems[menuItems.length - 1]?.focus();
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [popoverOpen.contextMenu, activeIndex]);

	// Reset active index when menu closes
	useEffect(() => {
		if (!popoverOpen.contextMenu) {
			setActiveIndex(null);
			menuItemsRef.current = [];
		}
	}, [popoverOpen.contextMenu]);

	const menuVariants = {
		hidden: {
			opacity: 0,
			scale: 0.95,
			y: -10,
		},
		visible: {
			opacity: 1,
			scale: 1,
			y: 0,
			transition: {
				duration: 0.2,
				ease: 'easeOut',
			},
		},
		exit: {
			opacity: 0,
			scale: 0.95,
			y: -5,
			transition: {
				duration: 0.15,
				ease: 'easeIn',
			},
		},
	};

	// Don't render if menu is not open or coordinates are not set
	if (
		!popoverOpen.contextMenu ||
		typeof x !== 'number' ||
		typeof y !== 'number' ||
		(x === 0 && y === 0)
	) {
		return null;
	}

	return (
		<FloatingPortal>
			<AnimatePresence>
				{popoverOpen.contextMenu && (
					<motion.div
						ref={refs.setFloating}
						style={floatingStyles}
						{...getFloatingProps()}
						variants={menuVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
						className='ring-opacity-5 flex min-w-[250px] flex-col gap-1 rounded-sm shadow-lg ring-1 ring-black focus:outline-none px-2 py-2'
						style={{
							backgroundColor: GlassmorphismTheme.elevation[24], // Context menu elevation
							border: `1px solid ${GlassmorphismTheme.borders.default}`,
							backdropFilter: 'blur(8px)',
							zIndex: 9999, // Ensure context menu appears above everything
							position: 'relative',
						}}
						role='menu'
						aria-label='Context menu'
						aria-orientation='vertical'
						aria-activedescendant={
							activeIndex !== null ? `menu-item-${activeIndex}` : undefined
						}
					>
						<ContextMenuRenderer
							sections={menuConfig}
							menuItemsRef={menuItemsRef}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	);
}
