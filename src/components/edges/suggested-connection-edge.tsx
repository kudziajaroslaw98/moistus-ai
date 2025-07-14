import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import useAppStore from '@/store/mind-map-store';
import { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { PathType } from '@/types/path-types';
import { cn } from '@/utils/cn';
import {
	BaseEdge,
	EdgeLabelRenderer,
	EdgeProps,
	getBezierPath,
	getSmoothStepPath,
	getStraightPath,
	Node,
	Position,
	useInternalNode,
	type Edge,
} from '@xyflow/react';
import { Check, X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';

// Helper function to get the appropriate path calculation function
const getPathFunction = (pathType?: PathType) => {
	switch (pathType) {
		case 'bezier':
			return getBezierPath;
		case 'straight':
			return getStraightPath;
		case 'step':
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return (params: any) => getSmoothStepPath({ ...params, borderRadius: 0 });
		case 'smoothstep':
		default:
			return getSmoothStepPath;
	}
};

const SuggestedConnectionEdgeComponent = ({
	id,
	source,
	target,
	style = {},
	data,
	selected,
}: EdgeProps<Edge<EdgeData>>) => {
	const [isProcessing, setIsProcessing] = useState(false);

	const { acceptConnectionSuggestion, rejectConnectionSuggestion } =
		useAppStore(
			useShallow((state) => ({
				acceptConnectionSuggestion: state.acceptConnectionSuggestion,
				rejectConnectionSuggestion: state.rejectConnectionSuggestion,
			}))
		);

	const pathFunction = useMemo(
		() => getPathFunction(data?.metadata?.pathType),
		[data?.metadata?.pathType]
	);
	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const strokeWidth =
		parseInt(data?.style?.strokeWidth?.toString() ?? '2') ?? 2;

	const { sourceX, sourceY, targetX, targetY, sourcePos, targetPos } =
		useMemo(() => {
			if (!sourceNode || !targetNode) {
				return {
					sourceX: 0,
					sourceY: 0,
					targetX: 0,
					targetY: 0,
					sourcePos: Position.Top,
					targetPos: Position.Top,
				};
			}

			return getFloatingEdgePath(sourceNode, targetNode, strokeWidth * 2);
		}, [sourceNode, targetNode, strokeWidth]);

	const [edgePath, labelX, labelY] = useMemo(
		() =>
			pathFunction({
				sourceX,
				sourceY,
				sourcePosition: sourcePos,
				targetX,
				targetY,
				targetPosition: targetPos,
			}),
		[pathFunction, sourceX, sourceY, sourcePos, targetX, targetY, targetPos]
	);

	// Suggestion-specific styling
	const suggestionColor = selected ? '#f59e0b' : '#f59e0b'; // Orange/amber for suggestions
	const suggestionStyle = {
		...style,
		...data?.style,
		stroke: suggestionColor,
		strokeWidth,
		strokeDasharray: '8,4', // Dashed pattern for suggestions (handled by SVG, not data)
	};

	const handleAcceptSuggestion = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isProcessing) return;

		setIsProcessing(true);

		try {
			acceptConnectionSuggestion(id);
		} catch (error) {
			console.error('Failed to accept suggestion:', error);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleRejectSuggestion = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isProcessing) return;

		rejectConnectionSuggestion(id);
	};

	if (!sourceNode || !targetNode) {
		return null;
	}

	const reason = data?.aiData?.reason || 'AI suggested connection';

	return (
		<>
			<defs>
				<marker
					markerWidth={16}
					markerHeight={16}
					id={`suggestion-arrow-end-${id}`}
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
					orient='auto'
					markerUnits='userSpaceOnUse'
				>
					<polyline
						style={{
							stroke: suggestionColor,
							fill: suggestionColor,
							strokeWidth,
						}}
						strokeLinecap='round'
						strokeLinejoin='round'
						points='-5,-4 0,0 -5,4 -5,-4'
					/>
				</marker>

				<marker
					markerWidth={16}
					markerHeight={16}
					id={`suggestion-circle-start-${id}`}
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
					orient='auto'
					markerUnits='userSpaceOnUse'
				>
					<circle
						style={{
							stroke: suggestionColor,
							fill: suggestionColor,
							strokeWidth,
						}}
						r='5'
					/>
				</marker>
			</defs>

			<BaseEdge
				id={id}
				path={edgePath}
				style={suggestionStyle}
				className={cn(
					'react-flow__edge-path',
					'cursor-pointer',
					'transition-all duration-200 ease-in-out',
					'animate-pulse' // Always pulse for suggestions
				)}
				markerStart={`url(#suggestion-circle-start-${id})`}
				markerEnd={`url(#suggestion-arrow-end-${id})`}
			>
				<EdgeLabelRenderer>
					<div
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						}}
						className='nodrag absolute z-[3] pointer-events-auto nopan flex flex-col items-center gap-2 text-xs'
					>
						{/* AI Reason Label - Always Visible */}
						<div className='rounded-lg bg-amber-600/90 px-3 py-1.5 shadow-lg border border-amber-500/20'>
							<div className='text-white font-medium text-center max-w-48 leading-tight'>
								{reason}
							</div>
						</div>

						{/* Accept/Reject Controls - Always Visible */}
						<div className='flex items-center gap-2'>
							<Button
								variant='default'
								size='icon'
								onClick={handleAcceptSuggestion}
								disabled={isProcessing}
								title='Accept suggestion'
								aria-label='Accept AI connection suggestion'
								className='!size-8 bg-green-600 hover:bg-green-700 text-white border-green-500/20'
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.95 }}
							>
								<Check className='w-4 h-4' />
							</Button>

							<Button
								variant='destructive'
								size='icon'
								onClick={handleRejectSuggestion}
								disabled={isProcessing}
								title='Reject suggestion'
								aria-label='Reject AI connection suggestion'
								className='!size-8'
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.95 }}
							>
								<X className='w-4 h-4' />
							</Button>
						</div>
					</div>
				</EdgeLabelRenderer>
			</BaseEdge>
		</>
	);
};

const SuggestedConnectionEdge = memo(SuggestedConnectionEdgeComponent);
SuggestedConnectionEdge.displayName = 'SuggestedConnectionEdge';
export default SuggestedConnectionEdge;
