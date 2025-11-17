import useAppStore from '@/store/mind-map-store';
import { EdgeData } from '@/types/edge-data';
import type { PathType } from '@/types/path-types';
import { SquareX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SidePanel } from '../side-panel';
import { Button } from '../ui/button';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';

const availablePathTypes: PathType[] = [
	'smoothstep',
	'step',
	'straight',
	'bezier',
];
const markerEndOptions = [
	{ value: 'none', label: 'None' },
	{ value: 'arrow', label: 'Default Arrow' },
	{ value: 'arrowclosed', label: 'Closed Arrow' },
];

export default function EdgeEditModal() {
	const {
		popoverOpen,
		setPopoverOpen,
		updateEdge,
		nodes,
		edgeInfo: edge,
		setEdgeInfo,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			updateEdge: state.updateEdge,
			edges: state.edges,
			nodes: state.nodes,
			edgeInfo: state.edgeInfo,
			setEdgeInfo: state.setEdgeInfo,
		}))
	);
	const isOpen = popoverOpen.edgeEdit;
	const [label, setLabel] = useState<string>('');
	const [pathStyle, setPathStyle] = useState<PathType>('smoothstep'); // Changed from type to pathStyle
	const [animated, setAnimated] = useState(false);
	const [color, setColor] = useState<string | undefined>('#6c757d');
	const [strokeWidth, setStrokeWidth] = useState<string | number | undefined>(
		undefined
	);
	const [markerEnd, setMarkerEnd] = useState<string | undefined>(undefined);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (edge) {
			setLabel((edge.label as string) || (edge.data?.label as string) || '');
			setPathStyle(edge.data?.metadata?.pathType || 'smoothstep'); // Use metadata.pathType
			setAnimated(String(edge.data?.animated) === 'true');
			setColor(edge.data?.style?.stroke || '#6c757d');
			setStrokeWidth(edge.data?.style?.strokeWidth || undefined);
			setMarkerEnd(edge.data?.markerEnd || 'none');
		}
	}, [edge, isOpen]);

	const handleSave = async () => {
		if (!edge || isSaving) return;
		const changes: Partial<EdgeData> = {
			label: label.trim() === '' ? undefined : label.trim(),
			animated: animated,
			markerEnd: markerEnd === 'none' ? undefined : markerEnd,
			style: {
				stroke: color ?? '',
				strokeWidth: strokeWidth ?? '',
			},
			metadata: {
				...(edge.data?.metadata || {}), // Preserve existing metadata
				pathType: pathStyle,
			},
		};

		setIsSaving(true);
		await updateEdge({ edgeId: edge.id!, data: changes });
		setIsSaving(false);
		handleOnClose();
	};

	if (!edge) return null;

	const sourceNodeContent =
		nodes.find((n) => n.id === edge.source)?.data?.content || edge.source;
	const targetNodeContent =
		nodes.find((n) => n.id === edge.target)?.data?.content || edge.target;

	const getContentSnippet = (content: string | undefined): string => {
		if (!content) return '<Empty>';
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = content;
		const textContent = (tempDiv.textContent || tempDiv.innerText || '').trim();
		return textContent.length > 30
			? textContent.substring(0, 30) + '...'
			: textContent || '<Empty>';
	};

	const handleOnClose = () => {
		setPopoverOpen({ edgeEdit: false });
		setEdgeInfo(null);
	};

	return (
		<SidePanel
			isOpen={isOpen}
			key={edge?.id}
			onClose={handleOnClose}
			title={`Edit Connection`}
		>
			<div className='flex flex-col gap-4'>
				<p className='text-sm text-zinc-400'>
					<span>From: </span>

					<span className='font-semibold text-zinc-200 italic'>
						{getContentSnippet(sourceNodeContent)}
					</span>
				</p>

				<p className='text-sm text-zinc-400'>
					<span>To: </span>

					<span className='font-semibold text-zinc-200 italic'>
						{getContentSnippet(targetNodeContent)}
					</span>
				</p>

				<hr className='my-2 border-zinc-700' />

				<div>
					<h3 className='text-md mb-2 font-semibold text-zinc-200'>
						Properties
					</h3>

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<FormField id='edgeLabel' label='Label'>
							<Input
								id='edgeLabel'
								onChange={(e) => setLabel(e.target.value)}
								placeholder='e.g., leads to, is part of'
								type='text'
								value={label}
							/>
						</FormField>

						<FormField id='edgePathStyle' label='Path Style'>
							<Select
								onValueChange={(value) => setPathStyle(value as PathType)}
								value={pathStyle}
							>
								{availablePathTypes.map((pType) => (
									<option key={pType} value={pType}>
										{pType
											? pType.charAt(0).toUpperCase() + pType.slice(1)
											: 'Default'}
									</option>
								))}
							</Select>
						</FormField>

						<div>
							<FormField id='edgeAnimated' label='Animated'>
								<Input
									checked={animated}
									className='mr-2 rounded border-zinc-600 text-teal-600 shadow-sm focus:ring-teal-500 disabled:opacity-50'
									onChange={(e) => setAnimated(e.target.checked)}
									type='checkbox'
								/>
							</FormField>
						</div>
					</div>
				</div>

				<div>
					<h3 className='text-md mb-2 font-semibold text-zinc-200'>
						Appearance
					</h3>

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<div className='flex flex-col gap-2'>
							<Label
								className='block text-sm font-medium text-zinc-400'
								htmlFor='edgeColor'
							>
								Color
							</Label>

							<div className='flex items-center gap-2'>
								<Input
									id='edgeColor'
									onChange={(e) => setColor(e.target.value)}
									type='color'
									value={color || '#000000'}
								/>

								{color && (
									<Button
										onClick={() => setColor(undefined)}
										size='icon'
										variant='secondary'
									>
										<SquareX className='size-4' />
									</Button>
								)}
							</div>
						</div>

						{/* Stroke Width Input */}
						<div className='flex flex-col gap-2'>
							<Label
								className='block text-sm font-medium text-zinc-400'
								htmlFor='strokeWidth'
							>
								Stroke Width (px)
							</Label>

							<div className='flex items-center gap-2'>
								<Input
									id='strokeWidth'
									max='10'
									min='1'
									placeholder='e.g. 2'
									type='number'
									value={strokeWidth ?? ''}
									onChange={(e) => {
										const value = parseInt(e.target.value, 10);
										setStrokeWidth(
											isNaN(value) || value <= 0 ? undefined : value
										);
									}}
								/>

								{strokeWidth !== undefined && (
									<Button
										onClick={() => setStrokeWidth(undefined)}
										size='icon'
										variant='secondary'
									>
										<SquareX className='size-4' />
									</Button>
								)}
							</div>
						</div>

						{/* Marker End Select */}
						<div>
							<Label
								className='block text-sm font-medium text-zinc-400'
								htmlFor='markerEnd'
							>
								Arrow Style (Marker End)
							</Label>

							<Select
								value={markerEnd || 'none'}
								onValueChange={(value) =>
									setMarkerEnd(value === 'none' ? undefined : value)
								}
							>
								{markerEndOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</div>
					</div>
				</div>

				{/* Keep footer outside the scrollable area if SidePanel doesn't include one */}
				{/* If SidePanel's children area scrolls, footer needs to be positioned separately or within */}
				<div className='mt-auto flex flex-shrink-0 justify-end gap-3 border-t border-zinc-700 pt-4'>
					<Button disabled={isSaving} onClick={handleOnClose} variant='outline'>
						Cancel
					</Button>

					<Button disabled={isSaving} onClick={handleSave}>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</SidePanel>
	);
}
