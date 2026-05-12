'use client';

import {
	buildHistoryPresentation,
	formatHistoryActionTitle,
	type HistoryFocusTarget,
	type HistoryPresentationSubject,
	normalizeHistoryActionIntent,
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
	ArrowRightLeft,
	ChevronDown,
	Clock,
	GitCommit,
	Link2,
	Loader2,
	Lock,
	Milestone,
	Pencil,
	Plus,
	Scissors,
	Trash,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
	const displayHeadlineDetail =
		presentation?.summaryDetail ?? meta.summaryDetail;
	const displaySubjectPreview =
		presentation?.subjectPreview ?? metaSubjectPreview;

	const fallbackSubjects = useMemo(
		() => (meta.subjects ?? []).map(mapHintToPresentationSubject),
		[meta.subjects]
	);
	const displaySubjects = presentation?.subjects ?? fallbackSubjects;
	const inlineSubject =
		displaySubjects.length === 1 ? displaySubjects[0] : null;
	const firstFocusableSubject =
		inlineSubject ??
		displaySubjects.find((subject) => Boolean(subject.focusTarget)) ??
		null;
	const mobileFocusTarget = firstFocusableSubject?.focusTarget ?? null;
	const mobileFocusLabel = firstFocusableSubject?.label ?? 'item';
	const actionIntent = normalizeHistoryActionIntent(meta.actionName);
	const actorUserId = delta?.userId ?? meta.userId;
	const actorName = delta?.userName ?? meta.userName;
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

	const getActionVisual = () => {
		if (meta.isMajor) {
			return {
				icon: <Milestone className='h-4 w-4' />,
				chipClass: 'bg-sky-500/18 text-sky-300 border border-sky-400/30',
			};
		}

		if (meta.type === 'snapshot') {
			return {
				icon: <GitCommit className='h-4 w-4' />,
				chipClass:
					'bg-violet-500/16 text-violet-200 border border-violet-400/28',
			};
		}

		if (actionIntent === 'node_add') {
			return {
				icon: <Plus className='h-4 w-4' />,
				chipClass:
					'bg-violet-500/16 text-violet-200 border border-violet-400/28',
			};
		}

		if (
			actionIntent === 'node_delete' ||
			actionIntent === 'connection_remove'
		) {
			return {
				icon: <Trash className='h-4 w-4' />,
				chipClass: 'bg-rose-500/16 text-rose-200 border border-rose-400/32',
			};
		}

		if (
			actionIntent === 'node_move' ||
			actionIntent === 'layout_apply' ||
			actionIntent === 'node_detach_or_reparent'
		) {
			return {
				icon: <ArrowRightLeft className='h-4 w-4' />,
				chipClass:
					'bg-emerald-500/16 text-emerald-200 border border-emerald-400/30',
			};
		}

		if (
			actionIntent === 'connection_add' ||
			actionIntent === 'connection_update'
		) {
			return {
				icon: <Link2 className='h-4 w-4' />,
				chipClass: 'bg-amber-500/16 text-amber-200 border border-amber-400/30',
			};
		}

		if (actionIntent === 'node_resize') {
			return {
				icon: <Scissors className='h-4 w-4' />,
				chipClass: 'bg-sky-500/16 text-sky-200 border border-sky-400/28',
			};
		}

		if (meta.operationType === 'delete') {
			return {
				icon: <Trash className='h-4 w-4' />,
				chipClass: 'bg-rose-500/16 text-rose-200 border border-rose-400/32',
			};
		}
		if (meta.operationType === 'add') {
			return {
				icon: <Plus className='h-4 w-4' />,
				chipClass:
					'bg-violet-500/16 text-violet-200 border border-violet-400/28',
			};
		}
		if (meta.operationType === 'update') {
			return {
				icon: <Pencil className='h-4 w-4' />,
				chipClass: 'bg-sky-500/16 text-sky-200 border border-sky-400/28',
			};
		}
		return {
			icon: <Clock className='h-4 w-4' />,
			chipClass: 'bg-white/10 text-white/70 border border-white/14',
		};
	};

	const actionVisual = getActionVisual();
	const smallActionIcon = getSmallActionIcon(actionIntent, meta);
	const timestamp = formatTimestamp(meta.timestamp);

	return (
		<motion.div
			onClick={canShowDiff ? handleToggleExpand : undefined}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
			className={cn(
				'flex flex-col gap-2.5 border-y border-white/10 bg-[#1f1f1f] px-3 py-3 sm:rounded-sm sm:border sm:px-4 sm:py-3.5',
				canShowDiff && 'cursor-pointer',
				isCurrent
					? 'border-primary-500/45 bg-primary-500/[0.12] sm:shadow-[0_0_0_1px_rgba(96,165,250,0.24)]'
					: 'hover:border-white/20 hover:bg-[#272727]'
			)}
		>
			<div className='flex items-start gap-2.5'>
				<div
					className={cn(
						'mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full sm:flex',
						actionVisual.chipClass
					)}
				>
					{actionVisual.icon}
				</div>

				<div className='min-w-0 flex-grow'>
					<div className='flex items-start justify-between gap-2'>
						<div className='min-w-0 flex-grow space-y-1'>
							<div className='w-full flex justify-between'>
								<div className='flex min-w-0 items-start gap-1.5'>
									<span
										className={cn(
											'mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-white/75 sm:hidden',
											isCurrent && 'text-primary-200'
										)}
									>
										{smallActionIcon}
									</span>

									<h4
										className={cn(
											'min-w-0 text-[15px] font-semibold leading-5 text-white/92',
											isCurrent && 'text-primary-200'
										)}
									>
										{displayHeadline}
									</h4>
								</div>

								<div className='mt-2 flex items-center justify-between gap-2 sm:hidden'>
									{canShowDiff && (
										<motion.div
											animate={{ rotate: isExpanded ? 180 : 0 }}
											className='text-white/42'
											transition={{
												ease: [0.215, 0.61, 0.355, 1],
												duration: 0.2,
											}}
										>
											<ChevronDown className='h-4 w-4' />
										</motion.div>
									)}
								</div>
							</div>

							{displayHeadlineDetail && (
								<p className='text-[12px] leading-4 text-white/72 sm:text-[13px] sm:leading-5'>
									{displayHeadlineDetail}
								</p>
							)}

							{inlineSubject && (
								<p className='truncate text-[12px] text-white/62 sm:text-[13px]'>
									{inlineSubject.label}
								</p>
							)}

							{!inlineSubject && displaySubjectPreview && (
								<p className='truncate text-[12px] text-white/62 sm:text-[13px]'>
									{displaySubjectPreview}
								</p>
							)}

							{/* User attribution */}
							{hasAttribution && (
								<div className='flex items-center gap-1.5 text-[11px] text-white/60 sm:text-[12px]'>
									<span>{getUserDisplay()}</span>

									<span className='text-white/38'>•</span>

									<span className='cursor-help' title={timestamp.tooltip}>
										{timestamp.display}
									</span>
								</div>
							)}

							{!hasAttribution && (
								<p
									className='text-[11px] text-white/60 cursor-help sm:text-[12px]'
									title={timestamp.tooltip}
								>
									{timestamp.display}
								</p>
							)}
						</div>

						<div className='hidden items-center gap-1.5 sm:flex'>
							{canShowDiff && (
								<motion.div
									animate={{ rotate: isExpanded ? 180 : 0 }}
									className='text-white/42'
									transition={{
										ease: [0.215, 0.61, 0.355, 1],
										duration: 0.2,
									}}
								>
									<ChevronDown className='h-4 w-4' />
								</motion.div>
							)}

							{inlineSubject && (
								<Button
									aria-label={`Focus ${inlineSubject.label}`}
									className='h-7 border-white/12 bg-white/[0.05] px-2.5 text-[11px] text-white/74 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200'
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
							)}

							{!isCurrent && (
								<Button
									disabled={isLoading || isReverting || !hasPermission}
									size='sm'
									variant='outline'
									className={cn(
										'h-7 px-2.5 text-xs gap-1',
										'border-amber-400/35 bg-amber-500/14 text-amber-100',
										'hover:border-amber-300/55 hover:bg-amber-500/24',
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
						</div>
					</div>
				</div>
			</div>

			{!isCurrent && (
				<div className='grid grid-cols-2 gap-2 sm:hidden'>
					<Button
						aria-label={`Focus ${mobileFocusLabel}`}
						className='h-10 w-full border-white/15 bg-white/[0.05] text-[12px] text-white/80 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-200 disabled:opacity-45'
						disabled={!mobileFocusTarget}
						onClick={(event) => {
							event.stopPropagation();
							if (mobileFocusTarget) handleFocusTarget(mobileFocusTarget);
						}}
						size='sm'
						type='button'
						variant='outline'
					>
						Focus
					</Button>

					<Button
						disabled={isLoading || isReverting || !hasPermission}
						size='sm'
						type='button'
						variant='outline'
						className={cn(
							'h-10 w-full text-[12px]',
							'border-amber-400/35 bg-amber-500/14 text-amber-100',
							'hover:border-amber-300/55 hover:bg-amber-500/24',
							(!hasPermission || isReverting) && 'cursor-not-allowed opacity-50'
						)}
						onClick={(event) => {
							event.stopPropagation();
							handleRevert();
						}}
					>
						{isThisReverting ? (
							<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
						) : (
							!hasPermission && <Lock className='mr-1 h-3.5 w-3.5' />
						)}
						{isThisReverting ? 'Reverting...' : 'Revert'}
					</Button>
				</div>
			)}

			{/* Diff view (expandable) */}
			<AnimatePresence mode='popLayout'>
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

function getSmallActionIcon(
	actionIntent: ReturnType<typeof normalizeHistoryActionIntent>,
	meta: HistoryMeta
) {
	if (meta.isMajor) return <Milestone className='h-3.5 w-3.5' />;
	if (meta.type === 'snapshot') return <GitCommit className='h-3.5 w-3.5' />;
	if (actionIntent === 'node_add') return <Plus className='h-3.5 w-3.5' />;
	if (actionIntent === 'node_delete' || actionIntent === 'connection_remove') {
		return <Trash className='h-3.5 w-3.5' />;
	}
	if (
		actionIntent === 'node_move' ||
		actionIntent === 'layout_apply' ||
		actionIntent === 'node_detach_or_reparent'
	) {
		return <ArrowRightLeft className='h-3.5 w-3.5' />;
	}
	if (
		actionIntent === 'connection_add' ||
		actionIntent === 'connection_update'
	) {
		return <Link2 className='h-3.5 w-3.5' />;
	}
	if (actionIntent === 'node_resize')
		return <Scissors className='h-3.5 w-3.5' />;
	if (meta.operationType === 'delete') return <Trash className='h-3.5 w-3.5' />;
	if (meta.operationType === 'add') return <Plus className='h-3.5 w-3.5' />;
	if (meta.operationType === 'update')
		return <Pencil className='h-3.5 w-3.5' />;
	return <Clock className='h-3.5 w-3.5' />;
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
