'use client';

import {
	buildHistoryPresentation,
	formatHistoryActionTitle,
	type HistoryFocusTarget,
	type HistoryPresentationSubject,
} from '@/helpers/history/presentation';
import { formatTimestamp } from '@/helpers/history/time-utils';
import useAppStore from '@/store/mind-map-store';
import type {
	AttributedHistoryDelta,
	HistoryItem as HistoryMeta,
	HistorySubjectHint,
} from '@/types/history-state';
import { cn } from '@/utils/cn';
import {
	ChevronDown,
	Clock,
	GitCommit,
	Loader2,
	Lock,
	Milestone,
	Pencil,
	Plus,
	Trash,
	User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { DiffView } from './diff-view';

interface Props {
	meta: HistoryMeta;
	originalIndex: number;
	isCurrent: boolean;
}

export function HistoryItem({ meta, originalIndex, isCurrent }: Props) {
	const {
		isLoading,
		isReverting,
		revertingIndex,
		revertToHistoryState,
		canRevertChange,
		currentUser,
		mapId,
		nodes,
		edges,
		centerOnNode,
		reactFlowInstance,
		setSelectedNodes,
	} = useAppStore(
		useShallow((s) => ({
			isLoading: s.loadingStates?.isHistoryLoading,
			isReverting: s.isReverting,
			revertingIndex: s.revertingIndex,
			revertToHistoryState: s.revertToHistoryState,
			canRevertChange: s.canRevertChange,
			currentUser: s.currentUser,
			mapId: s.mapId,
			nodes: s.nodes,
			edges: s.edges,
			centerOnNode: s.centerOnNode,
			reactFlowInstance: s.reactFlowInstance,
			setSelectedNodes: s.setSelectedNodes,
		}))
	);

	// Check if this specific item is being reverted
	const isThisReverting = revertingIndex === originalIndex;

	// Expand/collapse state - delta is fetched on-demand from DB
	const [isExpanded, setIsExpanded] = useState(false);
	const [cachedDelta, setCachedDelta] = useState<AttributedHistoryDelta | null>(
		null
	);
	const [isFetchingDelta, setIsFetchingDelta] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	// For permission check, we'll use fetched delta when available
	const delta = cachedDelta;

	const handleRevert = () => {
		if (!isLoading && !isReverting) revertToHistoryState(originalIndex);
	};

	const handleToggleExpand = async () => {
		const newExpandedState = !isExpanded;
		setIsExpanded(newExpandedState);

		// If expanding and no cached delta, fetch it
		if (newExpandedState && !cachedDelta && meta.type === 'event' && mapId) {
			setIsFetchingDelta(true);
			setFetchError(null);

			try {
				const response = await fetch(`/api/history/${mapId}/delta/${meta.id}`);
				if (!response.ok) {
					throw new Error('Failed to fetch change details');
				}
				const data = await response.json();

				// Store the fetched delta
				const fetchedDelta: AttributedHistoryDelta = {
					operation: data.operation,
					entityType: data.entityType,
					changes: data.changes,
					userId: data.userId || 'unknown',
					userName: data.userName || 'Unknown',
					userAvatar: data.userAvatar,
					actionName: data.actionName || meta.actionName,
					timestamp: data.timestamp || meta.timestamp,
					summary: data.summary,
					summaryDetail: data.summaryDetail,
					subjectHints: data.subjectHints,
				};

				setCachedDelta(fetchedDelta);
			} catch (error) {
				console.error('Failed to fetch delta:', error);
				setFetchError(error instanceof Error ? error.message : 'Unknown error');
			} finally {
				setIsFetchingDelta(false);
			}
		}
	};

	// Check if user has permission to revert this change
	const hasPermission = canRevertChange(delta ?? undefined);

	// Determine if this item can show a diff
	const canShowDiff = meta.type === 'event' || !!delta;

	const presentation = useMemo(
		() =>
			delta
				? buildHistoryPresentation(delta, {
						actionName: delta.actionName || meta.actionName,
						nodes,
						edges,
					})
				: null,
		[delta, edges, meta.actionName, nodes]
	);

	const metaSubjectPreview = useMemo(() => {
		const subjects = meta.subjects ?? [];
		if (subjects.length === 0) return '';

		const labels = subjects
			.slice(0, 3)
			.map(
				(subject) =>
					subject.label || `${subject.type} ${subject.id.slice(0, 8)}`
			);
		if (subjects.length > 3) labels.push(`+${subjects.length - 3} more`);
		return labels.join(', ');
	}, [meta.subjects]);

	const displayHeadline =
		presentation?.summary ??
		meta.summary ??
		formatHistoryActionTitle(meta.actionName);
	const displayHeadlineDetail = presentation?.summaryDetail ?? meta.summaryDetail;
	const displaySubjectPreview = presentation?.subjectPreview ?? metaSubjectPreview;

	const fallbackSubjects = useMemo(
		() => (meta.subjects ?? []).map(mapHintToPresentationSubject),
		[meta.subjects]
	);
	const displaySubjects = presentation?.subjects ?? fallbackSubjects;
	const inlineSubject = displaySubjects.length === 1 ? displaySubjects[0] : null;
	const actorUserId = delta?.userId ?? meta.userId;
	const actorName = delta?.userName ?? meta.userName;
	const actorAvatar = delta?.userAvatar ?? meta.userAvatar;
	const hasAttribution = Boolean(actorUserId || actorName);

	// Display user name
	const getUserDisplay = (): string => {
		if (!hasAttribution) return '';
		if (actorUserId === currentUser?.id) return 'You';
		return actorName || 'Unknown';
	};

	const handleFocusTarget = useCallback(
		(target: HistoryFocusTarget) => {
			if (target.type === 'node') {
				const currentNode = nodes.find((node) => node.id === target.nodeId);
				if (currentNode) {
					centerOnNode(target.nodeId);
					return;
				}

				if (target.position && reactFlowInstance) {
					reactFlowInstance.setCenter(
						target.position.x + (target.width || 0) / 2,
						target.position.y + (target.height || 0) / 2,
						{ zoom: 1.2, duration: 800 }
					);
				}
				return;
			}

			const targetNodes = target.nodeIds
				.map((nodeId) => nodes.find((node) => node.id === nodeId))
				.filter((node): node is (typeof nodes)[number] => Boolean(node));

			if (targetNodes.length >= 2 && reactFlowInstance) {
				reactFlowInstance.fitView({
					nodes: targetNodes.map((node) => ({ id: node.id })),
					padding: 0.35,
					duration: 800,
				});
				targetNodes.forEach((node) => {
					reactFlowInstance.updateNode(node.id, { selected: true });
				});
				setSelectedNodes(targetNodes);
				return;
			}

			if (targetNodes.length === 1) {
				centerOnNode(targetNodes[0].id);
			}
		},
		[centerOnNode, nodes, reactFlowInstance, setSelectedNodes]
	);

	const getActionIcon = () => {
		if (meta.isMajor) return <Milestone className='h-4 w-4' />;
		if (meta.type === 'snapshot') return <GitCommit className='h-4 w-4' />;
		if (meta.operationType === 'delete') return <Trash className='h-4 w-4' />;
		if (meta.operationType === 'add') return <Plus className='h-4 w-4' />;
		if (meta.operationType === 'update') return <Pencil className='h-4 w-4' />;
		return <Clock className='h-4 w-4' />;
	};

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 20 }}
			initial={{ opacity: 0, y: -20 }}
			onClick={canShowDiff ? handleToggleExpand : undefined}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
			whileHover={{ scale: 1.01 }}
			whileTap={{ scale: 0.99 }}
			className={cn(
				'flex flex-col gap-3 rounded-lg border p-3',
				canShowDiff && 'cursor-pointer',
				isCurrent
					? 'border-primary-500/50 bg-primary-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.3)]'
					: 'border-white/6 bg-[#1E1E1E] hover:border-white/10 hover:bg-[#222222]'
			)}
		>
			{/* Header section */}
			<div className='flex items-start gap-3'>
				<div
					className={cn(
						'mt-0.5 shrink-0',
						isCurrent ? 'text-primary-400' : 'text-zinc-400'
					)}
				>
					{getActionIcon()}
				</div>

				<div className='flex-grow'>
					<div className='flex items-start justify-between gap-2'>
						<div className='flex-grow flex flex-col gap-1'>
							<h4
								className={cn(
									'text-sm font-medium',
									isCurrent ? 'text-primary-300' : 'text-white/87'
								)}
							>
								{displayHeadline}
							</h4>

							{displayHeadlineDetail && (
								<p className='text-xs leading-4 text-white/60'>
									{displayHeadlineDetail}
								</p>
							)}

							{inlineSubject && (
								<div className='flex items-center gap-2'>
									<span className='truncate text-xs text-white/72'>
										{inlineSubject.label}
									</span>

									<Button
										aria-label={`Focus ${inlineSubject.label}`}
										className='h-5 border-white/10 bg-white/5 px-2 text-[11px] text-white/70 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200'
										disabled={!inlineSubject.focusTarget}
										onClick={(event) => {
											event.stopPropagation();
											if (inlineSubject.focusTarget) {
												handleFocusTarget(inlineSubject.focusTarget);
											}
										}}
										size='sm'
										type='button'
										variant='outline'
									>
										Focus
									</Button>
								</div>
							)}

							{!inlineSubject && displaySubjectPreview && (
								<p className='truncate text-xs text-white/45'>
									{displaySubjectPreview}
								</p>
							)}

							{/* User attribution */}
							{hasAttribution && (
								<div className='flex items-center gap-1.5'>
									{actorAvatar ? (
										<Image
											unoptimized
											alt={actorName || 'User'}
											className='rounded-full'
											height={16}
											src={actorAvatar}
											width={16}
										/>
									) : (
										<User className='h-4 w-4 text-white/38' />
									)}

									<span className='text-xs text-white/60'>
										{getUserDisplay()}
									</span>

									<span className='text-xs text-white/38'>•</span>

									<span
										className='text-xs text-white/60 cursor-help'
										title={formatTimestamp(meta.timestamp).tooltip}
									>
										{formatTimestamp(meta.timestamp).display}
									</span>
								</div>
							)}

							{!hasAttribution && (
								<p
									className='text-xs text-white/60 cursor-help'
									title={formatTimestamp(meta.timestamp).tooltip}
								>
									{formatTimestamp(meta.timestamp).display}
								</p>
							)}

							{(typeof meta.nodeCount === 'number' ||
								typeof meta.edgeCount === 'number') && (
								<div className='flex flex-wrap gap-3 text-xs text-white/38'>
									{typeof meta.nodeCount === 'number' && (
										<span>Nodes: {meta.nodeCount}</span>
									)}

									{typeof meta.edgeCount === 'number' && (
										<span>Edges: {meta.edgeCount}</span>
									)}
								</div>
							)}
						</div>

						<div className='flex items-center gap-2'>
							{/* Chevron for expandable items */}
							{canShowDiff && (
								<motion.div
									animate={{ rotate: isExpanded ? 180 : 0 }}
									className='text-white/38'
									transition={{
										ease: [0.215, 0.61, 0.355, 1],
										duration: 0.2,
									}}
								>
									<ChevronDown className='h-4 w-4' />
								</motion.div>
							)}

							{!isCurrent && (
								<Button
									disabled={isLoading || isReverting || !hasPermission}
									size='sm'
									variant='outline'
									className={cn(
										'h-6 px-2 text-xs gap-1',
										'bg-white/5 border-white/10 text-white/87',
										'hover:border-white/20 hover:bg-white/10',
										(!hasPermission || isReverting) &&
											'cursor-not-allowed opacity-50'
									)}
									onClick={(e) => {
										e.stopPropagation();
										handleRevert();
									}}
									title={
										!hasPermission
											? 'You do not have permission to revert this change'
											: isReverting
												? 'Revert in progress...'
												: 'Revert to this state'
									}
								>
									{isThisReverting ? (
										<Loader2 className='h-3 w-3 animate-spin' />
									) : (
										!hasPermission && <Lock className='h-3 w-3' />
									)}
									{isThisReverting ? 'Reverting...' : 'Revert'}
								</Button>
							)}

							{isCurrent && (
								<span className='text-xs font-semibold text-primary-400'>
									Current
								</span>
							)}
						</div>
					</div>

					{meta.isMajor && (
						<div className='mt-2'>
							<span className='inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400/90'>
								<Milestone className='h-3 w-3' />
								Checkpoint
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Diff view (expandable) */}
			<AnimatePresence>
				{isExpanded && (
					<DiffView
						delta={cachedDelta}
						error={fetchError}
						isLoading={isFetchingDelta}
						onFocusTarget={handleFocusTarget}
						presentation={presentation}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

function mapHintToPresentationSubject(
	hint: HistorySubjectHint
): HistoryPresentationSubject {
	return {
		id: hint.id,
		type: hint.type,
		label:
			hint.label ||
			(hint.type === 'node'
				? `Node #${hint.id.slice(0, 8)}`
				: `Connection #${hint.id.slice(0, 8)}`),
		description:
			hint.type === 'edge' && hint.sourceLabel && hint.targetLabel
				? `${hint.sourceLabel} -> ${hint.targetLabel}`
				: hint.type === 'node'
					? hint.nodeType || 'Node'
					: 'Connection',
		focusTarget:
			hint.type === 'node'
				? {
						type: 'node',
						nodeId: hint.id,
						label: hint.label || `Node #${hint.id.slice(0, 8)}`,
						position: hint.position,
						width: hint.width,
						height: hint.height,
					}
				: hint.sourceId && hint.targetId
					? {
							type: 'edge',
							edgeId: hint.id,
							label: hint.label || `Connection #${hint.id.slice(0, 8)}`,
							nodeIds: [hint.sourceId, hint.targetId],
						}
					: null,
		changes: [],
	};
}
