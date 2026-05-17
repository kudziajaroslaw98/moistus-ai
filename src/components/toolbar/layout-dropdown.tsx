'use client';

/**
 * Layout Dropdown Component
 * Provides layout direction options and selected-only layout in the toolbar
 */

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LAYOUT_PRESETS } from '@/helpers/layout/elk-config';
import useAppStore from '@/store/mind-map-store';
import type { LayoutDirection, LayoutPresetId } from '@/types/layout-types';
import { cn } from '@/utils/cn';
import {
	ArrowDown,
	ArrowRight,
	CheckSquare,
	Circle,
	GitBranch,
	LayoutGrid,
	Loader2,
	Move,
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

function getPresetIcon(presetId: LayoutPresetId): ReactNode {
	switch (presetId) {
		case 'roomy-branches':
			return <LayoutGrid className='size-4' />;
		case 'tree-right':
			return <GitBranch className='size-4 rotate-90' />;
		case 'tree-down':
			return <GitBranch className='size-4' />;
		case 'radial-tree':
			return <Circle className='size-4' />;
		case 'organic-spread':
			return <Move className='size-4' />;
	}
}

export function LayoutMenuContent() {
	const {
		layoutConfig,
		applyLayout,
		applyLayoutPreset,
		applyLayoutToSelected,
		isLayouting,
		selectedNodes,
	} = useAppStore(
		useShallow((state) => ({
			layoutConfig: state.layoutConfig,
			applyLayout: state.applyLayout,
			applyLayoutPreset: state.applyLayoutPreset,
			applyLayoutToSelected: state.applyLayoutToSelected,
			isLayouting: state.isLayouting,
			selectedNodes: state.selectedNodes,
		}))
	);

	// Handle layout direction selection - immediately applies layout
	const handleLayoutSelect = (direction: string) => {
		applyLayout(direction as LayoutDirection);
	};

	const handleLayoutPresetSelect = (presetId: LayoutPresetId) => {
		applyLayoutPreset(presetId);
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

			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuLabel className='text-xs text-muted-foreground'>
					Experiments
				</DropdownMenuLabel>
				{LAYOUT_PRESETS.map((preset) => (
					<DropdownMenuItem
						key={preset.id}
						onClick={() => handleLayoutPresetSelect(preset.id)}
						disabled={isLayouting}
						title={preset.description}
					>
						<span className='flex items-center gap-2'>
							{getPresetIcon(preset.id)}
							{preset.label}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuGroup>

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
						variant='outline'
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
