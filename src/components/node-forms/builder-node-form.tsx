import generateUuid from '@/helpers/generate-uuid';
import {
	BuilderCanvas,
	BuilderElement,
	BuilderNodeData,
	ElementType,
} from '@/types/builder-node';
import { NodeData } from '@/types/node-data';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { BuilderCanvas as BuilderCanvasComponent } from '../builder/builder-canvas';
import { CanvasControls } from '../builder/canvas-controls';
import { ElementPalette } from '../builder/element-palette';
import { Button } from '../ui/button';

interface BuilderNodeFormProps {
	initialData: Partial<NodeData>;
}

const defaultCanvas: BuilderCanvas = {
	id: generateUuid(),
	width: 400,
	height: 300,
	columns: 6,
	rows: 4,
	columnWidth: 60,
	rowHeight: 60,
	columnGap: 4,
	rowGap: 4,
	elements: [],
};

const BuilderNodeForm = forwardRef<
	{ getFormData: () => Partial<NodeData> | null },
	BuilderNodeFormProps
>(({ initialData }, ref) => {
	const [canvas, setCanvas] = useState<BuilderCanvas>(() => {
		const builderData = initialData.metadata?.builderData as
			| BuilderNodeData
			| undefined;
		return builderData?.canvas || defaultCanvas;
	});

	const [isEditing, setIsEditing] = useState(true);

	useImperativeHandle(ref, () => ({
		getFormData: () => {
			const builderData: BuilderNodeData = {
				canvas,
				lastModified: new Date().toISOString(),
			};

			return {
				content: `Builder Node (${canvas.elements.length} elements)`,
				metadata: {
					...(initialData.metadata || {}),
					builderData,
				},
			};
		},
	}));

	const handleElementSelect = useCallback(
		(elementType: ElementType) => {
			// Find empty spot on canvas
			let placed = false;

			for (
				let y = 0;
				y <= canvas.rows - elementType.defaultSize.height && !placed;
				y++
			) {
				for (
					let x = 0;
					x <= canvas.columns - elementType.defaultSize.width && !placed;
					x++
				) {
					// Check if this position is free
					const isOccupied = canvas.elements.some((el) => {
						const elRight = el.position.x + el.position.width;
						const elBottom = el.position.y + el.position.height;
						const newRight = x + elementType.defaultSize.width;
						const newBottom = y + elementType.defaultSize.height;

						return !(
							x >= elRight ||
							newRight <= el.position.x ||
							y >= elBottom ||
							newBottom <= el.position.y
						);
					});

					if (!isOccupied) {
						const newElement: BuilderElement = {
							id: generateUuid(),
							type: elementType.id as BuilderElement['type'],
							position: {
								x,
								y,
								width: elementType.defaultSize.width,
								height: elementType.defaultSize.height,
							},
							properties: {
								...elementType.defaultProperties,
							},
						};

						setCanvas((prev) => ({
							...prev,
							elements: [...prev.elements, newElement],
						}));
						placed = true;
					}
				}
			}

			if (!placed) {
				// If no space found, add to the end and expand canvas if needed
				const newElement: BuilderElement = {
					id: generateUuid(),
					type: elementType.id as BuilderElement['type'],
					position: {
						x: 0,
						y: canvas.rows,
						width: elementType.defaultSize.width,
						height: elementType.defaultSize.height,
					},
					properties: {
						...elementType.defaultProperties,
					},
				};

				setCanvas((prev) => ({
					...prev,
					rows: prev.rows + elementType.defaultSize.height,
					elements: [...prev.elements, newElement],
				}));
			}
		},
		[canvas]
	);

	const handleCanvasUpdate = useCallback((newCanvas: BuilderCanvas) => {
		setCanvas(newCanvas);
	}, []);

	const handleClearCanvas = () => {
		setCanvas((prev) => ({ ...prev, elements: [] }));
	};

	const handleToggleEditMode = () => {
		setIsEditing((prev) => !prev);
	};

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center justify-between'>
				<h3 className='text-lg font-semibold'>Builder Configuration</h3>

				<div className='flex gap-2'>
					<Button
						size='sm'
						variant={isEditing ? 'default' : 'outline'}
						onClick={handleToggleEditMode}
					>
						{isEditing ? 'Preview' : 'Edit'}
					</Button>

					<Button
						size='sm'
						variant='outline'
						onClick={handleClearCanvas}
						disabled={canvas.elements.length === 0}
					>
						Clear
					</Button>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
				{/* Canvas Controls */}
				<div className='lg:col-span-1'>
					<CanvasControls canvas={canvas} onCanvasUpdate={handleCanvasUpdate} />
				</div>

				{/* Main Canvas */}
				<div className='lg:col-span-2'>
					<BuilderCanvasComponent
						canvas={canvas}
						onCanvasUpdate={handleCanvasUpdate}
						isEditing={isEditing}
					/>
				</div>
			</div>

			{/* Element Palette - only show in edit mode */}
			{isEditing && <ElementPalette onElementSelect={handleElementSelect} />}

			<div className='text-sm text-zinc-400'>
				Elements: {canvas.elements.length} | Canvas: {canvas.columns}×
				{canvas.rows}
			</div>
		</div>
	);
});

BuilderNodeForm.displayName = 'BuilderNodeForm';
export default BuilderNodeForm;
