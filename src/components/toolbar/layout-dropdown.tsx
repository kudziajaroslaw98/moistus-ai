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
	ArrowRight,
	CheckSquare,
	LayoutGrid,
	Loader2,
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
		icon: <ArrowRight className='size-4' />,
		label: 'Left to Right',
	},
	{
		id: 'TOP_BOTTOM',
		icon: <ArrowDown className='size-4' />,
		label: 'Top to Bottom',
	},
];

export function LayoutMenuContent() {
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
		<>
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
						<span className='flex items-center gap-2'>
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
						<span className='flex items-center gap-2'>
							<CheckSquare className='size-4' />
							Layout Selected ({selectedNodes.length})
						</span>
					</DropdownMenuItem>
				</>
			)}
		</>
	);
}

interface LayoutDropdownProps {
	disabled?: boolean;
}

export function LayoutDropdown({ disabled = false }: LayoutDropdownProps) {
	const { isLayouting } = useAppStore(
		useShallow((state) => ({
			isLayouting: state.isLayouting,
		}))
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						className={cn('active:scale-95', isLayouting && 'animate-pulse')}
						data-onboarding-target='layout'
						aria-label='Auto Layout'
						size='icon'
						title='Auto Layout'
						variant='secondary'
						disabled={disabled || isLayouting}
					>
						{isLayouting ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<LayoutGrid className='size-4' />
						)}
					</Button>
				}
			/>
			<DropdownMenuContent align='start' className='w-48'>
				<LayoutMenuContent />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
