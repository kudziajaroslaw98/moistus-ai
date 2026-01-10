'use client';

/**
 * Layout Dropdown Component
 * Provides layout direction options and selected-only layout in the toolbar
 */

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useAppStore from '@/store/mind-map-store';
import type { LayoutDirection } from '@/types/layout-types';
import { cn } from '@/utils/cn';
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	CheckSquare,
	LayoutGrid,
	Loader2,
	Sun,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useShallow } from 'zustand/shallow';

// Layout direction options with icons and labels
const layoutDirections: {
	id: LayoutDirection;
	icon: ReactNode;
	label: string;
}[] = [
	{
		id: 'LEFT_RIGHT',
		icon: <ArrowRight className="size-4" />,
		label: 'Left to Right',
	},
	{
		id: 'RIGHT_LEFT',
		icon: <ArrowLeft className="size-4" />,
		label: 'Right to Left',
	},
	{
		id: 'TOP_BOTTOM',
		icon: <ArrowDown className="size-4" />,
		label: 'Top to Bottom',
	},
	{
		id: 'BOTTOM_TOP',
		icon: <ArrowUp className="size-4" />,
		label: 'Bottom to Top',
	},
	{
		id: 'RADIAL',
		icon: <Sun className="size-4" />,
		label: 'Radial',
	},
];

export function LayoutDropdown() {
	const {
		layoutConfig,
		applyLayout,
		applyLayoutToSelected,
		isLayouting,
		selectedNodes,
	} = useAppStore(
		useShallow((state) => ({
			layoutConfig: state.layoutConfig,
			applyLayout: state.applyLayout,
			applyLayoutToSelected: state.applyLayoutToSelected,
			isLayouting: state.isLayouting,
			selectedNodes: state.selectedNodes,
		}))
	);

	// Handle layout direction selection - immediately applies layout
	const handleLayoutSelect = (direction: string) => {
		applyLayout(direction as LayoutDirection);
	};

	// Handle layout selected only
	const handleLayoutSelected = () => {
		applyLayoutToSelected();
	};

	// Get current direction for radio selection
	const currentDirection = layoutConfig.direction;

	// Show "Layout Selected" option when 2+ nodes are selected
	const canLayoutSelected = selectedNodes.length >= 2;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className={cn('active:scale-95', isLayouting && 'animate-pulse')}
					size="icon"
					title="Auto Layout"
					variant="secondary"
					disabled={isLayouting}
				>
					{isLayouting ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<LayoutGrid className="size-4" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				<DropdownMenuRadioGroup
					value={currentDirection}
					onValueChange={handleLayoutSelect}
				>
					{layoutDirections.map((direction) => (
						<DropdownMenuRadioItem
							key={direction.id}
							value={direction.id}
							disabled={isLayouting}
						>
							<span className="flex items-center gap-2">
								{direction.icon}
								{direction.label}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>

				{canLayoutSelected && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleLayoutSelected}
							disabled={isLayouting}
						>
							<span className="flex items-center gap-2">
								<CheckSquare className="size-4" />
								Layout Selected ({selectedNodes.length})
							</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
