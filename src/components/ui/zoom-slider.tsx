'use client';

import { cn } from '@/utils/cn';
import {
	Panel,
	type PanelProps,
	useOnViewportChange,
	useReactFlow,
	useStore,
	type Viewport,
} from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { forwardRef, memo, useCallback, useEffect, useState } from 'react';
import { Button } from './button';
import { Slider } from './slider';

const ZoomSliderComponent = forwardRef<
	HTMLDivElement,
	Omit<PanelProps, 'children'>
>(({ className, position = 'bottom-center', ...props }, ref) => {
	const reactFlow = useReactFlow();
	const minZoom = useStore((state) => state.minZoom);
	const maxZoom = useStore((state) => state.maxZoom);
	const [zoom, setZoom] = useState(0);

	useOnViewportChange({
		onEnd: (viewport: Viewport) => {
			setZoom(viewport.zoom);
		},
	});

	const handleZoomChange = useCallback(
		(values: number[]) => {
			if (values.length > 0) {
				reactFlow.zoomTo(values[0], { duration: 100 });
				setZoom(values[0]);
			}
		},
		[reactFlow.zoomTo]
	);

	const handleZoomOut = useCallback(() => {
		reactFlow.zoomOut({ duration: 300 });
		setZoom(reactFlow.getZoom());
	}, [reactFlow]);

	const handleZoomIn = useCallback(() => {
		reactFlow.zoomIn({ duration: 300 });
		setZoom(reactFlow.getZoom());
	}, [reactFlow]);

	const handleResetZoom = useCallback(() => {
		reactFlow.zoomTo(1, { duration: 300 });
		setZoom(1);
	}, [reactFlow]);

	const handleFitView = useCallback(() => {
		reactFlow.fitView({ duration: 300, padding: 0.1 });
		setTimeout(() => setZoom(reactFlow.getZoom()), 300);
	}, [reactFlow]);

	useEffect(() => {
		setZoom(reactFlow.getZoom());
	}, [reactFlow.getZoom]);

	return (
		<Panel
			position={position}
			ref={ref}
			className={cn(
				'flex gap-1 rounded-md bg-zinc-800/80 px-2 text-zinc-200 h-8 backdrop-blur-sm border border-zinc-700 shadow-md',
				className
			)}
			{...props}
		>
			<Button
				size='icon'
				title='Zoom out'
				variant='ghost'
				onClick={handleZoomOut}
			>
				<Minus className='size-4' />
			</Button>

			<Slider
				className='w-[140px]'
				max={maxZoom}
				min={minZoom}
				step={0.01}
				value={[zoom]}
				onValueChange={handleZoomChange}
			/>

			<Button
				size='icon'
				title='Zoom in'
				variant='ghost'
				onClick={handleZoomIn}
			>
				<Plus className='size-4' />
			</Button>

			<Button
				className='min-w-16 tabular-nums text-xs'
				title='Reset zoom to 100%'
				variant='ghost'
				onClick={handleResetZoom}
			>
				{(100 * zoom).toFixed(0)}%
			</Button>

			<Button
				size='icon'
				title='Fit view'
				variant='ghost'
				onClick={handleFitView}
			>
				<Maximize className='size-4' />
			</Button>
		</Panel>
	);
});

export const ZoomSlider = memo(ZoomSliderComponent);
ZoomSliderComponent.displayName = 'ZoomSlider';
