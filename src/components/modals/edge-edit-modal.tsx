'use client';

import { toEdgeAnimated, toEdgeMarker } from '@/helpers/edge-values';
import useAppStore from '@/store/mind-map-store';
import { EdgeData } from '@/types/edge-data';
import { cn } from '@/utils/cn';
import { SquareX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
	Panel,
	PanelFooterActions,
	PanelFooterNote,
	PanelRow,
	PanelSection,
	PanelField,
	panelButtonClass,
	panelInputClass,
	panelSelectClass,
} from '../ui/panel';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';

const markerEndOptions = [
	{ value: 'none', label: 'None' },
	{ value: 'arrow', label: 'Default arrow' },
	{ value: 'arrowclosed', label: 'Closed arrow' },
];

const clearButtonClass =
	'size-10 shrink-0 rounded-[10px] border-white/10 bg-white/[0.04]';

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
			nodes: state.nodes,
			edgeInfo: state.edgeInfo,
			setEdgeInfo: state.setEdgeInfo,
		}))
	);
	const isOpen = popoverOpen.edgeEdit;
	const [label, setLabel] = useState<string>('');
	const [animated, setAnimated] = useState(false);
	const [color, setColor] = useState<string | undefined>('#6c757d');
	const [strokeWidth, setStrokeWidth] = useState<string | number | undefined>(
		undefined
	);
	const [markerEnd, setMarkerEnd] = useState<string | undefined>(undefined);
	const [isSaving, setIsSaving] = useState(false);
	// Closing clears the store's edge; keep showing the last one while the panel slides out.
	const [shownEdge, setShownEdge] = useState(edge);

	if (edge && edge !== shownEdge) {
		setShownEdge(edge);
	}

	useEffect(() => {
		if (edge) {
			setLabel((edge.label as string) || (edge.data?.label as string) || '');
			setAnimated(toEdgeAnimated(edge.data?.animated));
			setColor(edge.data?.style?.stroke || '#6c757d');
			setStrokeWidth(edge.data?.style?.strokeWidth || undefined);
			setMarkerEnd(toEdgeMarker(edge.data?.markerEnd) ?? 'none');
		}
	}, [edge, isOpen]);

	const handleOnClose = () => {
		setPopoverOpen({ edgeEdit: false });
		setEdgeInfo(null);
	};

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
		};

		setIsSaving(true);
		await updateEdge({ edgeId: edge.id!, data: changes });
		setIsSaving(false);
		handleOnClose();
	};

	const viewEdge = edge ?? shownEdge;

	if (!viewEdge) return null;

	const sourceNodeContent =
		nodes.find((n) => n.id === viewEdge.source)?.data?.content ||
		viewEdge.source;
	const targetNodeContent =
		nodes.find((n) => n.id === viewEdge.target)?.data?.content ||
		viewEdge.target;

	// Extract text content safely without using innerHTML (prevents XSS)
	const getContentSnippet = (content: string | undefined): string => {
		if (!content) return '<Empty>';
		// Strip HTML tags using regex instead of innerHTML to prevent XSS
		const textContent = content
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		return textContent.length > 30
			? textContent.substring(0, 30) + '...'
			: textContent || '<Empty>';
	};

	return (
		<Panel
			footer={
				<>
					<PanelFooterNote>Changes apply to this connection only</PanelFooterNote>

					<PanelFooterActions>
						<Button
							className={panelButtonClass}
							disabled={isSaving}
							onClick={handleOnClose}
							variant='ghost'
						>
							Cancel
						</Button>

						<Button
							className={panelButtonClass}
							disabled={isSaving}
							onClick={handleSave}
						>
							{isSaving ? 'Saving...' : 'Save changes'}
						</Button>
					</PanelFooterActions>
				</>
			}
			onOpenChange={(open) => {
				if (!open) handleOnClose();
			}}
			open={isOpen}
			title='Edit connection'
		>
			<PanelSection label='Connection'>
				<PanelRow
					description={getContentSnippet(sourceNodeContent)}
					singleLine
					title='From'
				/>

				<PanelRow
					description={getContentSnippet(targetNodeContent)}
					singleLine
					title='To'
				/>
			</PanelSection>

			<PanelSection label='Properties'>
				<PanelField htmlFor='edgeLabel' label='Label'>
					<Input
						className={panelInputClass}
						id='edgeLabel'
						onChange={(e) => setLabel(e.target.value)}
						placeholder='e.g., leads to, is part of'
						type='text'
						value={label}
					/>
				</PanelField>

				<div className='mt-3.5 flex items-center justify-between gap-4'>
					<label
						className='text-[13px] font-medium text-text-primary'
						htmlFor='edgeAnimated'
					>
						Animated
					</label>

					<label className='shrink-0 cursor-pointer' htmlFor='edgeAnimated'>
						<Switch
							checked={animated}
							id='edgeAnimated'
							onCheckedChange={setAnimated}
							role='switch'
						/>
					</label>
				</div>
			</PanelSection>

			<PanelSection label='Appearance'>
				<div className='grid grid-cols-2 gap-3'>
					<PanelField className='mt-0' htmlFor='edgeColor' label='Color'>
						<div className='flex items-center gap-2'>
							<Input
								className={cn(panelInputClass, 'cursor-pointer p-1')}
								id='edgeColor'
								onChange={(e) => setColor(e.target.value)}
								type='color'
								value={color || '#000000'}
							/>

							{color && (
								<Button
									aria-label='Reset color'
									className={clearButtonClass}
									onClick={() => setColor(undefined)}
									size='icon'
									variant='outline'
								>
									<SquareX className='size-4' />
								</Button>
							)}
						</div>
					</PanelField>

					<PanelField className='mt-0' htmlFor='strokeWidth' label='Stroke width (px)'>
						<div className='flex items-center gap-2'>
							<Input
								className={panelInputClass}
								id='strokeWidth'
								max='10'
								min='1'
								placeholder='e.g. 2'
								type='number'
								value={strokeWidth ?? ''}
								onChange={(e) => {
									const value = parseInt(e.target.value, 10);
									setStrokeWidth(isNaN(value) || value <= 0 ? undefined : value);
								}}
							/>

							{strokeWidth !== undefined && (
								<Button
									aria-label='Reset stroke width'
									className={clearButtonClass}
									onClick={() => setStrokeWidth(undefined)}
									size='icon'
									variant='outline'
								>
									<SquareX className='size-4' />
								</Button>
							)}
						</div>
					</PanelField>
				</div>

				<PanelField htmlFor='markerEnd' label='Arrow style'>
					<Select
						value={markerEnd || 'none'}
						onValueChange={(value) =>
							setMarkerEnd(value === 'none' ? undefined : (value as string))
						}
					>
						<SelectTrigger className={panelSelectClass} id='markerEnd'>
							<SelectValue />
						</SelectTrigger>

						<SelectContent>
							{markerEndOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</PanelField>
			</PanelSection>
		</Panel>
	);
}
