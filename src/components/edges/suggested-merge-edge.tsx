// In: src/components/edges/suggested-merge-edge.tsx

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useAppStore from '@/store/mind-map-store';
import { SuggestedMergeEdgeProps } from '@/types/merge-edge-data';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { Check, Merge, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

export const SuggestedMergeEdge = (props: SuggestedMergeEdgeProps) => {
	const { id, data, selected } = props;

	const { acceptMerge, rejectMerge } = useAppStore(
		useShallow((state) => ({
			acceptMerge: state.acceptMerge,
			rejectMerge: state.rejectMerge,
		}))
	);

	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX: props.sourceX,
		sourceY: props.sourceY,
		targetX: props.targetX,
		targetY: props.targetY,
		sourcePosition: props.sourcePosition,
		targetPosition: props.targetPosition,
		borderRadius: 8,
	});

	const handleAccept = useCallback(() => {
		acceptMerge(data?.aiData.suggestion).catch((err) => console.error(err));
	}, [acceptMerge, data?.aiData.suggestion]);

	const handleReject = useCallback(() => {
		rejectMerge(data?.aiData.suggestion);
	}, [rejectMerge, data?.aiData.suggestion]);

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				markerEnd={props.markerEnd}
				style={{ strokeWidth: 2 }}
				className={cn(
					'!stroke-purple-600 opacity-80 [stroke-dasharray:5_5] transition-all duration-200',
					'hover:!stroke-purple-500 opacity-100',
					data?.animated && 'animate-dash-flow'
				)}
			/>

			<EdgeLabelRenderer>
				<div
					style={{
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
					}}
					className='nodrag nopan absolute z-10 pointer-events-auto '
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						className='flex flex-col items-center gap-2'
					>
						<div className='flex items-center gap-2 flex-col p-2 rounded-md border border-zinc-700 bg-zinc-800/80  shadow-lg'>
							<div className='flex cursor-default items-center gap-1.5  text-xs font-medium text-zinc-100'>
								<Merge className='h-3 w-3 text-purple-400' />

								<span>Merge Suggestion</span>
							</div>

							<p className='max-w-xs text-center'>{data?.aiData?.reason}</p>

							<span className='text-xs'>
								Similarity: {data?.aiData?.similarityScore}
							</span>

							<span className='text-xs'>
								Confidence: {data?.aiData?.confidence}
							</span>
						</div>

						<div className='flex items-center gap-1.5'>
							<Button
								onClick={handleAccept}
								size='icon'
								className='h-6 w-6 bg-green-600 hover:bg-green-500'
							>
								<Check className='h-4 w-4' />
							</Button>

							<Button
								onClick={handleReject}
								size='icon'
								className='h-6 w-6 bg-red-600 hover:bg-red-500'
							>
								<X className='h-4 w-4' />
							</Button>
						</div>
					</motion.div>
				</div>
			</EdgeLabelRenderer>
		</>
	);
};
