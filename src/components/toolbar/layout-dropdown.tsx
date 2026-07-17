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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	LAYOUT_PRESET_GROUPS,
	LAYOUT_PRESETS,
} from '@/helpers/layout/elk-config';
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
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
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
		case 'roomy-right':
		case 'roomy-down':
			return <LayoutGrid className='size-4' />;
		case 'tree-right':
			return <GitBranch className='size-4 rotate-90' />;
		case 'tree-down':
			return <GitBranch className='size-4' />;
		case 'radial-tree':
			return <Circle className='size-4' />;
	}
}

export function LayoutMenuContent() {
	const {
		applyLayout,
		applyLayoutPreset,
		applyLayoutToSelected,
		isLayouting,
		selectedNodes,
	} = useAppStore(
		useShallow((state) => ({
			applyLayout: state.applyLayout,
			applyLayoutPreset: state.applyLayoutPreset,
			applyLayoutToSelected: state.applyLayoutToSelected,
			isLayouting: state.isLayouting,
			selectedNodes: state.selectedNodes,
		}))
	);

	// Layout choices are one-shot actions; direction is retained only for local reflow.
	const handleLayoutSelect = (direction: LayoutDirection) => {
		applyLayout(direction);
	};

	const handleLayoutPresetSelect = (presetId: LayoutPresetId) => {
		applyLayoutPreset(presetId);
	};

	// Handle layout selected only
	const handleLayoutSelected = () => {
		applyLayoutToSelected();
	};

	// Show "Layout Selected" option when 2+ nodes are selected
	const canLayoutSelected = selectedNodes.length >= 2;

	return (
		<>
			<DropdownMenuGroup>
				<DropdownMenuLabel className='text-xs text-muted-foreground'>
					Linear
				</DropdownMenuLabel>
				{layoutDirections.map((direction) => (
					<DropdownMenuItem
						key={direction.id}
						onClick={() => handleLayoutSelect(direction.id)}
						disabled={isLayouting}
					>
						<span className='flex items-center gap-2'>
							{direction.icon}
							{direction.label}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuGroup>

			{LAYOUT_PRESET_GROUPS.map((group) => (
				<Fragment key={group.id}>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuLabel className='text-xs text-muted-foreground'>
							{group.label}
						</DropdownMenuLabel>
						{LAYOUT_PRESETS.filter(
							(preset) => preset.category === group.id
						).map((preset) => (
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
				</Fragment>
			))}

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
