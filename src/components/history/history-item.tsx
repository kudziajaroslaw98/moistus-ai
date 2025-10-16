'use client';

import GlassmorphismTheme from '@/components/nodes/themes/glassmorphism-theme';
import useAppStore from '@/store/mind-map-store';
import type {
	AttributedHistoryDelta,
	HistoryItem as HistoryMeta,
} from '@/types/history-state';
import { cn } from '@/utils/cn';
import {
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
import { motion } from 'motion/react';
import Image from 'next/image';
import { Button } from '../ui/button';

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

	// Get delta for attribution
	const historyEntry = history[originalIndex] as any;
	const delta = historyEntry?._delta as AttributedHistoryDelta | undefined;

	const handleRevert = () => {
		if (!isLoading) revertToHistoryState(originalIndex);
	};

	// Check if user has permission to revert this change
	const hasPermission = canRevertChange(delta);

	// Display user name
	const getUserDisplay = (): string => {
		if (!delta) return '';
		if (delta.userId === currentUser?.id) return 'You';
		return delta.userName || 'Unknown';
	};

	const formatTimestamp = (timestamp: number): string => {
		const date = new Date(timestamp);
		const now = Date.now();
		const diff = now - timestamp;
		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
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
			className={cn(
				'flex items-start gap-3 rounded-lg border p-3 ',
				isCurrent
					? 'border-teal-500 bg-teal-900/20 shadow-[0_0_0_1px_rgba(96,165,250,0.3)]'
					: 'border-white/6 bg-[#1E1E1E] hover:border-white/10 hover:bg-[#222222]'
			)}
			style={{
				backgroundColor: isCurrent
					? 'rgba(20, 184, 166, 0.1)'
					: GlassmorphismTheme.elevation[1],
				borderColor: isCurrent
					? GlassmorphismTheme.borders.selected
					: GlassmorphismTheme.borders.default,
			}}
		>
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

								<span className='text-xs text-white/60'>
									{formatTimestamp(meta.timestamp)}
								</span>
							</div>
						)}

						{!delta && (
							<p className='text-xs text-white/60'>
								{formatTimestamp(meta.timestamp)}
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

					{!isCurrent && (
						<Button
							disabled={isLoading || !hasPermission}
							size='sm'
							variant='outline'
							className={cn(
								'h-6 px-2 text-xs gap-1',
								'border-white/10 text-white/87',
								'hover:border-white/20 hover:bg-white/5',
								!hasPermission && 'cursor-not-allowed opacity-50'
							)}
							style={{
								backgroundColor: GlassmorphismTheme.buttons.standard.background,
								borderColor: GlassmorphismTheme.buttons.standard.border,
							}}
							onClick={handleRevert}
							title={
								!hasPermission
									? 'You do not have permission to revert this change'
									: 'Revert to this state'
							}
						>
							{!hasPermission && <Lock className='h-3 w-3' />}
							Revert
						</Button>
					)}

					{isCurrent && (
						<span className='text-xs font-semibold text-teal-400'>Current</span>
					)}
				</div>

				{meta.isMajor && (
					<div className='mt-2'>
						<span
							className='inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium'
							style={{
								backgroundColor: 'rgba(96, 165, 250, 0.15)',
								color: 'rgba(96, 165, 250, 0.87)',
							}}
						>
							<Milestone className='h-3 w-3' />
							Checkpoint
						</span>
					</div>
				)}
			</div>
		</motion.div>
	);
}
