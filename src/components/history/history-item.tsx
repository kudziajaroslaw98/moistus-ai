'use client';

import { formatTimestamp } from '@/helpers/history/time-utils';
import useAppStore from '@/store/mind-map-store';
import type {
	AttributedHistoryDelta,
	HistoryItem as HistoryMeta,
} from '@/types/history-state';
import { cn } from '@/utils/cn';
import {
	ChevronDown,
	Clock,
	GitCommit,
	Layout,
	Lock,
	Milestone,
	Pencil,
	Plus,
	Trash,
	User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '../ui/button';
import { DiffView } from './diff-view';

interface Props {
	meta: HistoryMeta;
	originalIndex: number;
	isCurrent: boolean;
}

export function HistoryItem({ meta, originalIndex, isCurrent }: Props) {
	const isLoading = useAppStore((s) => s.loadingStates?.isStateLoading);
	const revertToHistoryState = useAppStore((s) => s.revertToHistoryState);
	const history = useAppStore((s) => s.history);
	const canRevertChange = useAppStore((s) => s.canRevertChange);
	const currentUser = useAppStore((s) => s.currentUser);
	const mapId = useAppStore((s) => s.mapId);

	// Get delta for attribution
	const historyEntry = history[originalIndex] as any;
	const delta = historyEntry?._delta as AttributedHistoryDelta | undefined;

	// Expand/collapse state
	const [isExpanded, setIsExpanded] = useState(false);
	const [cachedDelta, setCachedDelta] = useState<AttributedHistoryDelta | null>(
		delta || null
	);
	const [isFetchingDelta, setIsFetchingDelta] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const handleRevert = () => {
		if (!isLoading) revertToHistoryState(originalIndex);
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
	const hasPermission = canRevertChange(delta);

	// Determine if this item can show a diff
	const canShowDiff = meta.type === 'event' || !!delta;

	// Display user name
	const getUserDisplay = (): string => {
		if (!delta) return '';
		if (delta.userId === currentUser?.id) return 'You';
		return delta.userName || 'Unknown';
	};

	const getActionIcon = () => {
		if (meta.isMajor) return <Milestone className='h-4 w-4' />;
		if (meta.type === 'snapshot') return <GitCommit className='h-4 w-4' />;
		if (meta.operationType === 'delete') return <Trash className='h-4 w-4' />;
		if (meta.operationType === 'add') return <Plus className='h-4 w-4' />;
		if (meta.operationType === 'update') return <Pencil className='h-4 w-4' />;
		if (meta.actionName.includes('applyLayout'))
			return <Layout className='h-4 w-4' />;
		return <Clock className='h-4 w-4' />;
	};

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 20 }}
			initial={{ opacity: 0, y: -20 }}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
			whileHover={{ scale: 1.01 }}
			whileTap={{ scale: 0.99 }}
			className={cn(
				'flex flex-col gap-3 rounded-lg border p-3',
				canShowDiff && 'cursor-pointer',
				isCurrent
					? 'border-teal-500/50 bg-teal-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.3)]'
					: 'border-white/6 bg-[#1E1E1E] hover:border-white/10 hover:bg-[#222222]'
			)}
			onClick={canShowDiff ? handleToggleExpand : undefined}
		>
			{/* Header section */}
			<div className='flex items-start gap-3'>
				<div
					className={cn(
						'mt-0.5 flex-shrink-0',
						isCurrent ? 'text-teal-400' : 'text-zinc-400'
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
									isCurrent ? 'text-teal-300' : 'text-white/87'
								)}
							>
								{meta.actionName}
							</h4>

							{/* User attribution */}
							{delta && (
								<div className='flex items-center gap-1.5'>
									{delta.userAvatar ? (
										<Image
											unoptimized
											alt={delta.userName}
											className='rounded-full'
											height={16}
											src={delta.userAvatar}
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

							{!delta && (
								<p
									className='text-xs text-white/60 cursor-help'
									title={formatTimestamp(meta.timestamp).tooltip}
								>
									{formatTimestamp(meta.timestamp).display}
								</p>
							)}

							{typeof meta.nodeCount === 'number' ||
								(typeof meta.edgeCount === 'number' && (
									<div className='flex flex-wrap gap-3 text-xs text-white/38'>
										{typeof meta.nodeCount === 'number' && (
											<span>Nodes: {meta.nodeCount}</span>
										)}

										{typeof meta.edgeCount === 'number' && (
											<span>Edges: {meta.edgeCount}</span>
										)}
									</div>
								))}
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
									disabled={isLoading || !hasPermission}
									size='sm'
									variant='outline'
									className={cn(
										'h-6 px-2 text-xs gap-1',
										'bg-white/5 border-white/10 text-white/87',
										'hover:border-white/20 hover:bg-white/10',
										!hasPermission && 'cursor-not-allowed opacity-50'
									)}
									title={
										!hasPermission
											? 'You do not have permission to revert this change'
											: 'Revert to this state'
									}
									onClick={(e) => {
										e.stopPropagation();
										handleRevert();
									}}
								>
									{!hasPermission && <Lock className='h-3 w-3' />}
									Revert
								</Button>
							)}

							{isCurrent && (
								<span className='text-xs font-semibold text-teal-400'>
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
					/>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
