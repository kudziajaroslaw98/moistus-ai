'use client';
import { EdgeData } from '@/types/edge-data';
import { PathType } from '@/types/path-types';
import { Edge } from '@xyflow/react';
import ABezierBIcon from '../icons/a-bezier-b';
import ASmoothstepBIcon from '../icons/a-smoothstep-b';
import AStepBIcon from '../icons/a-step-b';
import AStrainghtBIcon from '../icons/a-straight-b';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { GlassmorphismTheme } from '../nodes/themes/glassmorphism-theme';

interface EdgeStyleSelectorProps {
	edge: Edge<Partial<EdgeData>>;
	onPathTypeChange: (pathType: PathType) => void;
	onColorChange: (color: string | undefined) => void;
}

const getItemIcon = (type: PathType) => {
	const iconProps = {
		className: 'size-4',
		style: { stroke: GlassmorphismTheme.text.high },
	};

	switch (type) {
		case 'smoothstep':
			return <ASmoothstepBIcon {...iconProps} />;
		case 'step':
			return <AStepBIcon {...iconProps} />;
		case 'straight':
			return <AStrainghtBIcon {...iconProps} />;
		case 'bezier':
			return <ABezierBIcon {...iconProps} />;
		default:
			return <ASmoothstepBIcon {...iconProps} />;
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

export function EdgeStyleSelector({
	edge,
	onPathTypeChange,
	onColorChange,
}: EdgeStyleSelectorProps) {
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
			<span
				className='block w-full rounded-md px-2 py-1 text-xs font-medium'
				style={{ color: GlassmorphismTheme.text.medium }}
			>
				Path Style
			</span>

			<ToggleGroup
				className='flex px-2 pb-2'
				type='single'
				value={edge.data?.metadata?.pathType}
				onValueChange={(value) => value && onPathTypeChange(value as PathType)}
			>
				{pathTypeOptions.map((pathType) => (
					<ToggleGroupItem
						aria-label={`${pathType} path`}
						className='h-8 w-8 p-0'
						key={pathType}
						value={pathType}
					>
						{getItemIcon(pathType)}
					</ToggleGroupItem>
				))}
			</ToggleGroup>

			{/* Color Section */}
			<span
				className='block w-full rounded-md px-2 py-1 text-xs font-medium'
				style={{ color: GlassmorphismTheme.text.medium }}
			>
				Color
			</span>

			<ToggleGroup
				className='flex px-2 pb-2'
				type='single'
				value={edge.data?.style?.stroke}
				onValueChange={(value) => {
					const color = value === 'default' ? undefined : value;
					onColorChange(color);
				}}
			>
				{edgeColors.map((colorOpt) => (
					<ToggleGroupItem
						aria-label={colorOpt.name}
						className='h-8 w-8 p-0'
						key={colorOpt.name}
						value={colorOpt.value || 'default'}
					>
						<span
							className='inline-block h-3 w-3 rounded-full'
							style={{
								backgroundColor: colorOpt.value || 'transparent',
								border: `1px solid ${GlassmorphismTheme.borders.default}`,
							}}
						/>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</>
	);
}
