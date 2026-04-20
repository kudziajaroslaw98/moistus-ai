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
	useInternalNode,
	type Edge,
} from '@xyflow/react';
import {
	ArrowRight,
	Check,
	CircleHelpIcon,
	EyeOff,
	GitBranchPlus,
	GitCommitVertical,
	GitPullRequestArrow,
	Sparkles,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
const AI_SUGGESTION_LABEL_Z_INDEX = 51_000;

interface ConnectionProxyIndicator {
	key: 'source' | 'target';
	label: string;
}

export function getConnectionProxyIndicators(
	data: EdgeData | undefined
): ConnectionProxyIndicator[] {
	const connectionProxy = data?.aiData?.connectionProxy;
	if (!connectionProxy) {
		return [];
	}

	const indicators: ConnectionProxyIndicator[] = [];
	if (connectionProxy.sourceHiddenChildLabel) {
		indicators.push({
			key: 'source',
			label: connectionProxy.sourceHiddenChildLabel,
		});
	}
	if (connectionProxy.targetHiddenChildLabel) {
		indicators.push({
			key: 'target',
			label: connectionProxy.targetHiddenChildLabel,
		});
	}

	return indicators;
}

const SuggestedConnectionEdgeComponent = ({
	id,
	source,
	target,
	style = {},
	data,
	selected,
}: EdgeProps<Edge<EdgeData>>) => {
	const [isProcessing, setIsProcessing] = useState(false);
	const [whySuggestedOpen, setWhySuggestedOpen] = useState(false);

	const {
		acceptConnectionSuggestion,
		rejectConnectionSuggestion,
		centerOnNode,
	} = useAppStore(
		useShallow((state) => ({
			acceptConnectionSuggestion: state.acceptConnectionSuggestion,
			centerOnNode: state.centerOnNode,
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

	const isSelfLoop = sourceNode?.id === targetNode?.id;
	const { edgePath, labelX, labelY, sourceX, sourceY, targetX, targetY } =
		useMemo(() => {
			if (!sourceNode || !targetNode) {
				return {
					edgePath: '',
					labelX: 0,
					labelY: 0,
					sourceX: 0,
					sourceY: 0,
					targetX: 0,
					targetY: 0,
				};
			}

			if (isSelfLoop) {
				const nodeX = sourceNode.internals.positionAbsolute.x;
				const nodeY = sourceNode.internals.positionAbsolute.y;
				const nodeWidth = sourceNode.measured.width ?? 240;
				const nodeHeight = sourceNode.measured.height ?? 120;
				const loopStartX = nodeX + nodeWidth;
				const loopStartY = nodeY + nodeHeight * 0.35;
				const loopEndX = nodeX + nodeWidth;
				const loopEndY = nodeY + nodeHeight * 0.65;
				const loopOffsetX = 72;
				const loopOffsetY = 36;

				return {
					edgePath: `M ${loopStartX} ${loopStartY} C ${loopStartX + loopOffsetX} ${loopStartY - loopOffsetY}, ${loopEndX + loopOffsetX} ${loopEndY + loopOffsetY}, ${loopEndX} ${loopEndY}`,
					labelX: nodeX + nodeWidth + 66,
					labelY: nodeY + nodeHeight / 2,
					sourceX: loopStartX,
					sourceY: loopStartY,
					targetX: loopEndX,
					targetY: loopEndY,
				};
			}

			const {
				sourceX: nextSourceX,
				sourceY: nextSourceY,
				targetX: nextTargetX,
				targetY: nextTargetY,
				sourcePos,
				targetPos,
			} = getFloatingEdgePath(sourceNode, targetNode, strokeWidth * 2);
			const [nextEdgePath, nextLabelX, nextLabelY] = pathFunction({
				sourceX: nextSourceX,
				sourceY: nextSourceY,
				sourcePosition: sourcePos,
				targetX: nextTargetX,
				targetY: nextTargetY,
				targetPosition: targetPos,
			});

			return {
				edgePath: nextEdgePath,
				labelX: nextLabelX,
				labelY: nextLabelY,
				sourceX: nextSourceX,
				sourceY: nextSourceY,
				targetX: nextTargetX,
				targetY: nextTargetY,
			};
		}, [isSelfLoop, pathFunction, sourceNode, strokeWidth, targetNode]);

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

	const handleCenterOnSource = () => {
		if (sourceNode) centerOnNode(sourceNode.id);
	};

	const handleCenterOnTarget = () => {
		if (targetNode) centerOnNode(targetNode.id);
	};

	const handleWhySuggestedToggle = () => {
		setWhySuggestedOpen((prev) => !prev);
	};

	if (!sourceNode || !targetNode) {
		return null;
	}

	const reason = data?.aiData?.reason || 'AI suggested connection';
	const targetTitle =
		(targetNode.data.content?.slice(0, 15) ||
			targetNode.data.metadata?.title?.slice(0, 15)) ??
		'Target';
	const sourceTitle =
		(sourceNode.data.content?.slice(0, 15) ||
			sourceNode.data.metadata?.title?.slice(0, 15)) ??
		'Source';
	const proxyIndicators = getConnectionProxyIndicators(data);

	return (
		<>
			<defs>
				<marker
					id={`suggestion-arrow-end-${id}`}
					markerHeight={16}
					markerUnits='userSpaceOnUse'
					markerWidth={16}
					orient='auto'
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
				>
					<polyline
						points='-5,-4 0,0 -5,4 -5,-4'
						strokeLinecap='round'
						strokeLinejoin='round'
						style={{
							stroke: suggestionColor,
							fill: suggestionColor,
							strokeWidth,
						}}
					/>
				</marker>

				<marker
					id={`suggestion-circle-start-${id}`}
					markerHeight={16}
					markerUnits='userSpaceOnUse'
					markerWidth={16}
					orient='auto'
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
				>
					<circle
						r='5'
						style={{
							stroke: suggestionColor,
							fill: suggestionColor,
							strokeWidth,
						}}
					/>
				</marker>
			</defs>

			<BaseEdge
				id={id}
				markerEnd={`url(#suggestion-arrow-end-${id})`}
				markerStart={`url(#suggestion-circle-start-${id})`}
				path={edgePath}
				style={suggestionStyle}
				className={cn(
					'react-flow__edge-path',
					'cursor-pointer',
					'transition-all duration-200 ease-in-out',
					'animate-pulse' // Always pulse for suggestions
				)}
			>
				<EdgeLabelRenderer>
					{proxyIndicators.map((indicator) => {
						const chipX = indicator.key === 'source' ? sourceX : targetX;
						const chipY =
							indicator.key === 'source' ? sourceY - 24 : targetY + 24;

						return (
							<div
								key={`${id}-${indicator.key}`}
								className='nodrag absolute z-[3] pointer-events-none nopan flex-col flex p-3 text-[12px] text-violet-100'
								style={{
									transform: `translate(-50%, -50%) translate(${chipX}px,${chipY}px)`,
									zIndex: AI_SUGGESTION_LABEL_Z_INDEX,
								}}
							>
								<div className='flex gap-2 bg-base/60 backdrop-blur-[3px] border border-amber-500/20 border-b-0 px-4 py-1 rounded-t-md top-0 left-2 ml-2 w-fit text-[10px] text-amber-300'>
									<EyeOff className='size-3' />
									<span>Collapsed branch connection</span>
								</div>
								<div className='relative rounded-md bg-base/60 backdrop-blur-lg p-6 flex flex-col shadow-2xl shadow-border-subtle border max-w-[400px] border-amber-500/20'>
									<div className='text-text-tertiary text-pretty'>
										{indicator.label}
									</div>
								</div>
							</div>
						);
					})}
					<div
						className='nodrag absolute z-[3] flex flex-col gap-0 pointer-events-auto nopan text-xs'
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							zIndex: AI_SUGGESTION_LABEL_Z_INDEX,
						}}
					>
						<div className='flex gap-2 bg-base/60 backdrop-blur-[3px] border border-amber-500/20 border-b-0 px-4 py-1 rounded-t-md top-0 left-2 ml-2 w-fit text-[10px] text-amber-300'>
							<GitPullRequestArrow className='size-3' />
							<span>Suggested connection</span>
						</div>
						{/* AI Reason Label - Always Visible */}
						<div className='relative rounded-md bg-base/60 backdrop-blur-lg p-6 flex flex-col shadow-2xl shadow-border-subtle border max-w-[400px] border-amber-500/20'>
							{sourceNode && targetNode && (
								<div className='flex justify-between items-center'>
									<div
										role='button'
										onClick={handleCenterOnTarget}
										className='cursor-pointer w-fit min-w-40 px-3 py-2 rounded-md bg-overlay/40 border border-border-default flex gap-2'
									>
										<span>
											<GitCommitVertical className='size-4' />
										</span>
										<span>{targetTitle}..</span>
									</div>
									<span className='w-full flex justify-center'>
										<ArrowRight className='size-4 text-amber-500' />
									</span>
									<div
										role='button'
										onClick={handleCenterOnSource}
										className='cursor-pointer w-fit min-w-40 px-3 py-2 rounded-md bg-overlay/40 border border-border-default flex gap-2'
									>
										<span>
											<GitBranchPlus className='size-4' />
										</span>
										<span>{sourceTitle}..</span>
									</div>
								</div>
							)}
							<div className='text-text-tertiary text-[12px] mt-4 text-pretty'>
								{data?.aiData?.suggestion?.reason}
							</div>
							<div className='bg-emerald-500/10 text-emerald-400 mt-4  w-fit flex gap-2 justify-center items-center px-2 py-0.5 rounded-sm border border-emerald-500/10'>
								<Sparkles className='size-3' />
								<span>
									Confidence • {data?.aiData?.suggestion?.confidence * 100}%
								</span>
							</div>

							<div className='flex flex-col gap-2 mt-4 pt-4'>
								<Button
									aria-label='Accept AI connection suggestion'
									disabled={isProcessing}
									onClick={handleAcceptSuggestion}
									size='md'
									className='gap-2 w-full justify-center'
									title='Accept suggestion'
									state='success'
									variant='normal'
									whileHover={{ scale: 1.05, willChange: 'transform' }}
									whileTap={{ scale: 0.95 }}
								>
									<span>Connect</span>
									<Check className='size-4' />
								</Button>

								<div className='flex gap-2'>
									<Button
										aria-label='Reject AI connection suggestion'
										disabled={isProcessing}
										onClick={handleWhySuggestedToggle}
										size='md'
										className='gap-2 text-xs text-nowrap w-full'
										title='Why suggested'
										state='dimmed'
										variant='ghost'
										whileHover={{ scale: 1.05, willChange: 'transform' }}
										whileTap={{ scale: 0.95 }}
									>
										<CircleHelpIcon className='size-4' />
										<span>Why suggested</span>
									</Button>

									<Button
										aria-label='Reject AI connection suggestion'
										disabled={isProcessing}
										onClick={handleRejectSuggestion}
										size='md'
										className='gap-2 text-xs w-full'
										title='Reject suggestion'
										state='dimmed'
										variant='ghost'
										whileHover={{ scale: 1.05, willChange: 'transform' }}
										whileTap={{ scale: 0.95 }}
									>
										<X className='size-4' />
										<span>Dismiss</span>
									</Button>
								</div>
							</div>

							<span className={cn(whySuggestedOpen ? 'mt-4' : 'mt-0')}>
								<AnimatePresence mode='sync'>
									{whySuggestedOpen && (
										<motion.div
											className='grid'
											initial={{
												willChange: 'auto',
												gridTemplateRows: '0fr',
												opacity: 0,
												filter: 'blur(4px)',
											}}
											animate={{
												willChange: 'auto',
												gridTemplateRows: '1fr',
												opacity: 1,
												filter: 'blur(0)',
											}}
											exit={{
												willChange: 'auto',
												gridTemplateRows: '0fr',
												opacity: 0,
												filter: 'blur(4px)',
											}}
											transition={{ type: 'spring', duration: 0.3 }}
										>
											<span className='overflow-hidden'>
												{data?.aiData?.suggestion?.extendedReason}
											</span>
										</motion.div>
									)}
								</AnimatePresence>
							</span>
						</div>

						{/* Accept/Reject Controls - Always Visible */}
					</div>
				</EdgeLabelRenderer>
			</BaseEdge>
		</>
	);
};

const SuggestedConnectionEdge = memo(SuggestedConnectionEdgeComponent);
SuggestedConnectionEdge.displayName = 'SuggestedConnectionEdge';
export default SuggestedConnectionEdge;
