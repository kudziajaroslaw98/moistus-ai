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
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { GlassmorphismTheme } from '../nodes/themes/glassmorphism-theme';
import { ContextMenuItem } from './context-menu-item';
import { useContextMenuConfig } from './use-context-menu-config';

interface ContextMenuProps {
	aiActions: {
		suggestConnections: () => void;
		suggestMerges: () => void;
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

export function ContextMenu({ aiActions }: ContextMenuProps) {
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

	// Animation variants following animation-guidelines.md
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
				ease: [0.215, 0.61, 0.355, 1] as const, // ease-out-cubic from animation-guidelines.md
			},
		},
		exit: {
			opacity: 0,
			scale: 0.98,
			y: -5,
			transition: {
				duration: 0.15,
				ease: [0.25, 0.46, 0.45, 0.94] as const, // ease-out-quad from animation-guidelines.md (NOT ease-in!)
			},
		},
	};

	// Stagger animation for menu items
	const itemVariants = {
		hidden: { opacity: 0 },
		visible: (custom: number) => ({
			opacity: 1,
			transition: {
				duration: 0.2,
				ease: [0.215, 0.61, 0.355, 1] as const, // ease-out-cubic
			},
		}),
	};

	// Render menu sections with inlined logic
	const renderSections = () => {
		let itemIndex = 0;

		return menuConfig.map((section, sectionIndex) => {
			// Filter out hidden items
			const visibleItems = section.items.filter((item) => !item.hidden);

			if (visibleItems.length === 0) return null;

			const sectionContent = visibleItems.map((item, itemInSectionIndex) => {
				// If the item has a custom component, render it directly
				if (item.customComponent) {
					return (
						<motion.div
							key={item.id}
							custom={itemIndex++}
							variants={itemVariants}
							initial='hidden'
							animate='visible'
						>
							{item.customComponent}
						</motion.div>
					);
				}

				// Otherwise render the standard menu item
				return (
					<motion.div
						key={item.id}
						custom={itemIndex}
						variants={itemVariants}
						initial='hidden'
						animate='visible'
					>
						<ContextMenuItem
							ref={(el) => {
								menuItemsRef.current[itemIndex++] = el;
							}}
							icon={item.icon}
							label={item.label}
							onClick={item.onClick}
							disabled={item.disabled}
							variant={item.variant}
							shortcut={item.shortcut}
							loading={item.loading}
						/>
					</motion.div>
				);
			});

			// Render section with divider and optional title (inlined section logic)
			return (
				<Fragment key={section.id}>
					{/* Divider - show before sections after the first */}
					{section.showDivider !== false && sectionIndex > 0 && (
						<hr
							className='my-1'
							style={{
								borderColor: GlassmorphismTheme.borders.default,
								borderWidth: '1px',
								borderStyle: 'solid',
							}}
						/>
					)}

					{/* Section title */}
					{section.title && (
						<div
							className='px-2 py-1 text-xs font-medium'
							style={{ color: GlassmorphismTheme.text.medium }}
						>
							{section.title}
						</div>
					)}

					{/* Section items */}
					<div className='flex flex-col gap-0.5'>{sectionContent}</div>
				</Fragment>
			);
		});
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
						style={{
							...floatingStyles,
							zIndex: 9999,
							backgroundColor: GlassmorphismTheme.elevation[24],
							border: `1px solid ${GlassmorphismTheme.borders.default}`,
							backdropFilter: GlassmorphismTheme.effects.glassmorphism,
							boxShadow: `0 0 0 1px ${GlassmorphismTheme.borders.default}`,
						}}
						variants={menuVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
						className='flex min-w-[250px] flex-col gap-1 rounded-sm px-2 py-2 focus:outline-none motion-reduce:transform-none'
						role='menu'
						aria-label='Context menu'
						aria-orientation='vertical'
						aria-activedescendant={
							activeIndex !== null ? `menu-item-${activeIndex}` : undefined
						}
						{...getFloatingProps()}
					>
						{renderSections()}
					</motion.div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	);
}
