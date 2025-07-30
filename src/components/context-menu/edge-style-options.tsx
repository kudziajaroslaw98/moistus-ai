'use client';
import { EdgeData } from '@/types/edge-data';
import { PathType } from '@/types/path-types';
import { Edge } from '@xyflow/react';
import ABezierBIcon from '../icons/a-bezier-b';
import ASmoothstepBIcon from '../icons/a-smoothstep-b';
import AStepBIcon from '../icons/a-step-b';
import AStrainghtBIcon from '../icons/a-straight-b';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface EdgeStyleOptionsProps {
	edge: Edge<Partial<EdgeData>>;
	onPathTypeChange: (pathType: PathType) => void;
	onColorChange: (color: string | undefined) => void;
}

const getItemIcon = (type: PathType) => {
	switch (type) {
		case 'smoothstep':
			return <ASmoothstepBIcon className='size-4 stroke-zinc-200' />;
		case 'step':
			return <AStepBIcon className='size-4 stroke-zinc-200' />;
		case 'straight':
			return <AStrainghtBIcon className='size-4 stroke-zinc-200' />;
		case 'bezier':
			return <ABezierBIcon className='size-4 stroke-zinc-200' />;
		default:
			return <ASmoothstepBIcon className='size-4 stroke-zinc-200' />;
	}
};

const pathTypeOptions: PathType[] = [
	'smoothstep',
	'step',
	'straight',
	'bezier',
];

const colorOptions = [
	{ name: 'Default', value: undefined },
	{ name: 'Grey', value: '#888' },
	{ name: 'Teal', value: '#14b8a6' },
	{ name: 'Sky', value: '#38bdf8' },
	{ name: 'Rose', value: '#fb7185' },
];

export function EdgeStyleOptions({
	edge,
	onPathTypeChange,
	onColorChange,
}: EdgeStyleOptionsProps) {
	// Generate edge color options including custom color

	const isCustomColor =
		edge.data?.style?.stroke !== undefined &&
		colorOptions.find((c) => c.value === edge.data?.style?.stroke) ===
			undefined;

	const edgeColors = isCustomColor
		? [...colorOptions, { name: 'Custom', value: edge.data?.style?.stroke }]
		: colorOptions;

	return (
		<>
			{/* Path Style Section */}
			<span className='block w-full rounded-md px-2 py-1 text-xs font-medium text-zinc-400'>
				Path Style
			</span>

			<ToggleGroup
				type='single'
				value={edge.data?.metadata?.pathType}
				onValueChange={(value) => value && onPathTypeChange(value as PathType)}
				className='flex px-2 pb-2'
			>
				{pathTypeOptions.map((pathType) => (
					<ToggleGroupItem
						key={pathType}
						value={pathType}
						aria-label={`${pathType} path`}
						className='h-8 w-8 p-0'
					>
						{getItemIcon(pathType)}
					</ToggleGroupItem>
				))}
			</ToggleGroup>

			<span className='block w-full rounded-md px-2 py-1 text-xs font-medium text-zinc-400'>
				Color
			</span>

			<ToggleGroup
				type='single'
				value={edge.data?.style?.stroke}
				onValueChange={(value) => {
					const color = value === 'default' ? undefined : value;
					onColorChange(color);
				}}
				className='flex px-2 pb-2'
			>
				{edgeColors.map((colorOpt) => (
					<ToggleGroupItem
						key={colorOpt.name}
						value={colorOpt.value || 'default'}
						aria-label={colorOpt.name}
						className='h-8 w-8 p-0'
					>
						<span
							className='inline-block h-3 w-3 rounded-full border border-zinc-500'
							style={{
								backgroundColor: colorOpt.value || 'transparent',
							}}
						/>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</>
	);
}
