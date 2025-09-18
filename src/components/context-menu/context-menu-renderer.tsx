'use client';
import { Fragment } from 'react';
import { ContextMenuItem } from './context-menu-item';
import { ContextMenuSection } from './context-menu-section';
import { MenuSection } from './types';

interface ContextMenuRendererProps {
	sections: MenuSection[];
	menuItemsRef?: MutableRefObject<(HTMLButtonElement | null)[]>;
}

export function ContextMenuRenderer({
	sections,
	menuItemsRef,
}: ContextMenuRendererProps) {
	let itemIndex = 0;

	return (
		<>
			{sections.map((section, sectionIndex) => {
				// Filter out hidden items
				const visibleItems = section.items.filter((item) => !item.hidden);

				if (visibleItems.length === 0) return null;

				const sectionContent = visibleItems.map((item) => {
					// If the item has a custom component, render it directly
					if (item.customComponent) {
						return <Fragment key={item.id}>{item.customComponent}</Fragment>;
					}

					// Otherwise render the standard menu item
					return (
						<ContextMenuItem
							key={item.id}
							ref={
								menuItemsRef
									? (el) => (menuItemsRef.current[itemIndex++] = el)
									: undefined
							}
							icon={item.icon}
							label={item.label}
							onClick={item.onClick}
							disabled={item.disabled}
							variant={item.variant}
							shortcut={item.shortcut}
							loading={item.loading}
						/>
					);
				});

				if (
					section.title ||
					(section.showDivider !== false && sectionIndex > 0)
				) {
					return (
						<ContextMenuSection
							key={section.id}
							title={section.title}
							showDivider={section.showDivider !== false && sectionIndex > 0}
						>
							{sectionContent}
						</ContextMenuSection>
					);
				}

				return <Fragment key={section.id}>{sectionContent}</Fragment>;
			})}
		</>
	);
}
