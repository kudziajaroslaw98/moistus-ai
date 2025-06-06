'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ConflictInfo, NodeLock } from '@/lib/collaboration/node-lock-manager';
import { cn } from '@/lib/utils';
import {
	AlertCircle,
	Clock,
	Edit3,
	Eye,
	GitMerge,
	Loader2,
	Lock,
	MessageSquare,
	Shield,
	Timer,
	XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getUserCursorColor } from './user-cursor';

interface ConflictModalProps {
	conflict: ConflictInfo | null;
	isOpen: boolean;
	onClose: () => void;
	onResolve: (resolution: 'wait' | 'merge' | 'override' | 'cancel') => void;
	onWaitComplete?: () => void;
}

// Get activity icon and label
function getActivityInfo(type: NodeLock['type']) {
	switch (type) {
		case 'edit':
			return { icon: Edit3, label: 'Editing', color: 'text-blue-400' };
		case 'comment':
			return {
				icon: MessageSquare,
				label: 'Commenting',
				color: 'text-yellow-400',
			};
		case 'view':
			return { icon: Eye, label: 'Viewing', color: 'text-purple-400' };
		default:
			return { icon: Eye, label: 'Viewing', color: 'text-zinc-400' };
	}
}

// Format time remaining
function formatTimeRemaining(expiresAt: number): string {
	const now = Date.now();
	const remaining = expiresAt - now;

	if (remaining <= 0) return 'Expired';

	const seconds = Math.floor(remaining / 1000);
	const minutes = Math.floor(seconds / 60);

	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}

	return `${seconds}s`;
}

export function ConflictModal({
	conflict,
	isOpen,
	onClose,
	onResolve,
	onWaitComplete,
}: ConflictModalProps) {
	const [isWaiting, setIsWaiting] = useState(false);
	const [waitProgress, setWaitProgress] = useState(0);
	const [timeRemaining, setTimeRemaining] = useState('');
	const [selectedResolution, setSelectedResolution] = useState<string | null>(
		null
	);

	// Update time remaining
	useEffect(() => {
		if (!conflict || !isWaiting) return;

		const updateTimer = () => {
			const remaining = formatTimeRemaining(
				conflict.currentLockHolder.expiresAt
			);
			setTimeRemaining(remaining);

			// Calculate progress
			const total =
				conflict.currentLockHolder.expiresAt -
				conflict.currentLockHolder.timestamp;
			const elapsed = Date.now() - conflict.currentLockHolder.timestamp;
			const progress = Math.min((elapsed / total) * 100, 100);
			setWaitProgress(progress);

			// Check if wait is complete
			if (remaining === 'Expired') {
				setIsWaiting(false);
				onWaitComplete?.();
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 100);

		return () => clearInterval(interval);
	}, [conflict, isWaiting, onWaitComplete]);

	if (!conflict) return null;

	const currentHolder = conflict.currentLockHolder;
	const currentActivity = getActivityInfo(currentHolder.type);
	const requestedActivity = getActivityInfo(conflict.conflictingRequest.type);
	const userColor = getUserCursorColor(currentHolder.userId);

	const handleResolve = (resolution: typeof selectedResolution) => {
		if (resolution === 'wait') {
			setIsWaiting(true);
			setSelectedResolution('wait');
		} else {
			onResolve(resolution as any);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={() => !isWaiting && onClose()}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Lock className='h-5 w-5 text-red-400' />
						Node is Currently Locked
					</DialogTitle>

					<DialogDescription>
						Another user is currently working on this node
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					{/* Current lock holder info */}
					<div className='p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-3'>
								<Avatar
									className='h-10 w-10 ring-2'
									style={{ borderColor: userColor }}
								>
									<AvatarImage
										src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentHolder.userName || '')}`}
									/>

									<AvatarFallback style={{ backgroundColor: userColor }}>
										{(currentHolder.userName || 'User')
											.slice(0, 2)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>

								<div>
									<p className='font-medium text-zinc-100'>
										{currentHolder.userName || 'Another user'}
									</p>

									<div className='flex items-center gap-2 mt-1'>
										<currentActivity.icon
											className={cn('h-4 w-4', currentActivity.color)}
										/>

										<span className='text-sm text-zinc-400'>
											{currentActivity.label}
										</span>
									</div>
								</div>
							</div>

							<div className='text-right'>
								<div className='flex items-center gap-1 text-sm text-zinc-400'>
									<Clock className='h-4 w-4' />

									<span>
										{timeRemaining ||
											formatTimeRemaining(currentHolder.expiresAt)}
									</span>
								</div>
							</div>
						</div>

						{isWaiting && <Progress value={waitProgress} className='h-1' />}
					</div>

					{/* Conflict info */}
					<Alert className='border-yellow-900/50 bg-yellow-950/50'>
						<AlertCircle className='h-4 w-4 text-yellow-400' />

						<AlertDescription className='text-yellow-200'>
							You requested{' '}
							<strong>{requestedActivity.label.toLowerCase()}</strong> access,
							but the node is currently locked for{' '}
							<strong>{currentActivity.label.toLowerCase()}</strong>.
						</AlertDescription>
					</Alert>

					<Separator className='bg-zinc-700' />

					{/* Resolution options */}
					<div className='space-y-2'>
						<p className='text-sm text-zinc-400 mb-3'>Choose how to proceed:</p>

						<AnimatePresence mode='wait'>
							{!isWaiting ? (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									className='space-y-2'
								>
									{/* Wait option */}
									<button
										onClick={() => handleResolve('wait')}
										className={cn(
											'w-full p-3 rounded-lg border text-left transition-all',
											'hover:bg-zinc-800/50 hover:border-zinc-600',
											conflict.suggestedResolution === 'wait'
												? 'border-teal-500 bg-teal-950/20'
												: 'border-zinc-700'
										)}
									>
										<div className='flex items-start gap-3'>
											<Timer className='h-5 w-5 text-teal-400 mt-0.5' />

											<div className='flex-1'>
												<p className='font-medium text-zinc-100'>
													Wait for lock to release
												</p>

												<p className='text-xs text-zinc-400 mt-1'>
													The lock will expire in{' '}
													{formatTimeRemaining(currentHolder.expiresAt)}
												</p>
											</div>

											{conflict.suggestedResolution === 'wait' && (
												<Badge variant='secondary' className='text-xs'>
													Recommended
												</Badge>
											)}
										</div>
									</button>

									{/* Merge option (for comments) */}
									{conflict.conflictingRequest.type === 'comment' &&
										currentHolder.type === 'comment' && (
											<button
												onClick={() => handleResolve('merge')}
												className={cn(
													'w-full p-3 rounded-lg border text-left transition-all',
													'hover:bg-zinc-800/50 hover:border-zinc-600',
													conflict.suggestedResolution === 'merge'
														? 'border-green-500 bg-green-950/20'
														: 'border-zinc-700'
												)}
											>
												<div className='flex items-start gap-3'>
													<GitMerge className='h-5 w-5 text-green-400 mt-0.5' />

													<div className='flex-1'>
														<p className='font-medium text-zinc-100'>
															Collaborate together
														</p>

														<p className='text-xs text-zinc-400 mt-1'>
															Both users can add comments simultaneously
														</p>
													</div>

													{conflict.suggestedResolution === 'merge' && (
														<Badge variant='secondary' className='text-xs'>
															Recommended
														</Badge>
													)}
												</div>
											</button>
										)}

									{/* Override option (if allowed) */}
									{conflict.conflictingRequest.priority &&
										conflict.conflictingRequest.priority > 0 && (
											<button
												onClick={() => handleResolve('override')}
												className={cn(
													'w-full p-3 rounded-lg border text-left transition-all',
													'hover:bg-zinc-800/50 hover:border-zinc-600',
													'border-orange-700'
												)}
											>
												<div className='flex items-start gap-3'>
													<Shield className='h-5 w-5 text-orange-400 mt-0.5' />

													<div className='flex-1'>
														<p className='font-medium text-zinc-100'>
															Override lock
														</p>

														<p className='text-xs text-zinc-400 mt-1'>
															Force release the current lock (may cause
															conflicts)
														</p>
													</div>
												</div>
											</button>
										)}

									{/* Cancel option */}
									<button
										onClick={() => handleResolve('cancel')}
										className='w-full p-3 rounded-lg border border-zinc-700 text-left transition-all hover:bg-zinc-800/50 hover:border-zinc-600'
									>
										<div className='flex items-start gap-3'>
											<XCircle className='h-5 w-5 text-zinc-400 mt-0.5' />

											<div className='flex-1'>
												<p className='font-medium text-zinc-100'>
													Cancel request
												</p>

												<p className='text-xs text-zinc-400 mt-1'>
													Don&apos;t access this node right now
												</p>
											</div>
										</div>
									</button>
								</motion.div>
							) : (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									className='text-center py-8'
								>
									<Loader2 className='h-8 w-8 text-teal-400 animate-spin mx-auto mb-4' />

									<p className='text-zinc-300 font-medium'>
										Waiting for lock to release...
									</p>

									<p className='text-sm text-zinc-500 mt-2'>
										{timeRemaining} remaining
									</p>

									<Button
										variant='ghost'
										size='sm'
										className='mt-4'
										onClick={() => {
											setIsWaiting(false);
											setSelectedResolution(null);
										}}
									>
										Choose different option
									</Button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>

				{!isWaiting && (
					<DialogFooter>
						<Button variant='ghost' onClick={onClose}>
							Close
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
