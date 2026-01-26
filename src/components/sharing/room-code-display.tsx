'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareToken } from '@/types/sharing-types';
import { cn } from '@/utils/cn';
import {
	ChevronDown,
	Clock,
	Copy,
	ExternalLink,
	QrCode,
	RefreshCw,
	Users,
	X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { toast } from 'sonner';

interface RoomCodeDisplayProps {
	token: ShareToken;
	showQRCode?: boolean;
	className?: string;
	defaultExpanded?: boolean;
	onRefresh?: (tokenId: string) => Promise<void>;
	onRevoke?: (tokenId: string) => Promise<void>;
	onCopy?: (token: string) => void;
}

// Animation easing following guidelines: ease-out-quad for user-initiated actions
const easeOutQuad = [0.25, 0.46, 0.45, 0.94] as const;

/**
 * Safe error logging helper - only logs in development and redacts sensitive data
 * Prevents PII leakage in production logs
 */
const logSafeError = (context: string, error: unknown): void => {
	if (process.env.NODE_ENV !== 'development') return;

	const safeMessage = error instanceof Error ? error.message : 'Unknown error';

	// Redact potential tokens/codes from message
	const redactedMessage = safeMessage.replace(/[A-Z0-9]{6,}/gi, '[REDACTED]');

	console.error(`[RoomCodeDisplay] ${context}:`, redactedMessage);
};

export function RoomCodeDisplay({
	token,
	onRefresh,
	onRevoke,
	onCopy,
	showQRCode = true,
	defaultExpanded = false,
	className,
}: RoomCodeDisplayProps) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [showQR, setShowQR] = useState(false);
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const shouldReduceMotion = useReducedMotion();
	const expandableContentId = useId();

	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: easeOutQuad };

	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(token.token);
			toast.success('Room code copied!');
			onCopy?.(token.token);
		} catch (error) {
			logSafeError('Failed to copy room code', error);
			toast.error('Failed to copy room code');
		}
	};

	const handleCopyLink = async () => {
		try {
			const shareUrl = `${window.location.origin}/join/${token.token}`;
			await navigator.clipboard.writeText(shareUrl);
			toast.success('Share link copied!');
		} catch (error) {
			logSafeError('Failed to copy share link', error);
			toast.error('Failed to copy share link');
		}
	};

	const handleRefresh = async () => {
		if (!onRefresh) return;

		setIsRefreshing(true);

		try {
			await onRefresh(token.id);
		} catch (error) {
			logSafeError('Failed to refresh room code', error);
			toast.error('Failed to refresh room code');
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleRevoke = async () => {
		if (!onRevoke) return;

		try {
			await onRevoke(token.id);
		} catch (error) {
			logSafeError('Failed to revoke room code', error);
			toast.error('Failed to revoke room code');
		}
	};

	const formatTimeRemaining = (expiresAt?: string) => {
		if (!expiresAt) return 'Never expires';

		const expiry = new Date(expiresAt);
		const now = new Date();
		const diff = expiry.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 24) {
			const days = Math.floor(hours / 24);
			return `${days}d remaining`;
		}

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}

		return `${minutes}m`;
	};

	const isExpired = token.expires_at
		? new Date(token.expires_at) < new Date()
		: false;
	const usagePercentage = (token.current_users / token.max_users) * 100;

	const roleColorClass =
		token.permissions.role === 'editor'
			? 'border-green-500/50 text-green-400 bg-green-500/10'
			: token.permissions.role === 'commenter'
				? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
				: 'border-blue-500/50 text-blue-400 bg-blue-500/10';

	return (
		<motion.div
			layout
			className={cn(
				'rounded-lg border border-zinc-700/80 bg-elevated overflow-hidden',
				'hover:border-zinc-600 transition-colors duration-200 ease',
				className
			)}
			transition={transition}
		>
			{/* Compact Header - Always Visible */}
			<div className='flex items-center justify-between gap-2 p-3'>
				{/* Left: Code + Badges */}
				<div className='flex items-center gap-2 min-w-0 flex-1'>
					<code
						className='font-mono font-bold text-primary-400 tracking-wider shrink-0'
						data-testid='room-code-value'
					>
						{token.token}
					</code>

					<Badge
						variant='outline'
						className={cn(
							'text-[10px] px-1.5 py-0 h-5 shrink-0',
							roleColorClass
						)}
					>
						{token.permissions.role}
					</Badge>

					{isExpired && (
						<Badge
							variant='destructive'
							className='text-[10px] px-1.5 py-0 h-5 shrink-0'
						>
							Expired
						</Badge>
					)}
				</div>

				{/* Right: Primary Actions + Expand Toggle */}
				<div className='flex items-center gap-0.5 shrink-0'>
					<Button
						className='h-7 w-7 p-0'
						onClick={handleCopyCode}
						size='sm'
						title='Copy room code'
						variant='ghost'
					>
						<Copy className='h-3.5 w-3.5' />
					</Button>

					{onRevoke && (
						<Button
							aria-label='Revoke room code'
							className='h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10'
							data-testid='revoke-room-code-btn'
							onClick={handleRevoke}
							size='sm'
							title='Revoke room code'
							variant='ghost'
						>
							<X className='h-3.5 w-3.5' />
						</Button>
					)}

					<Button
						aria-controls={expandableContentId}
						aria-expanded={isExpanded}
						className='h-7 w-7 p-0 ml-0.5'
						onClick={() => setIsExpanded(!isExpanded)}
						size='sm'
						title={isExpanded ? 'Collapse' : 'Expand'}
						variant='ghost'
					>
						<ChevronDown
							className={cn(
								'h-4 w-4 transition-transform duration-200 ease-out',
								isExpanded && 'rotate-180'
							)}
						/>
					</Button>
				</div>
			</div>

			{/* Expandable Content */}
			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						id={expandableContentId}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={transition}
						className='overflow-hidden'
					>
						<div className='px-3 pb-3 space-y-3 border-t border-zinc-700/50 pt-3'>
							{/* Stats Row */}
							<div className='flex items-center gap-4 text-xs'>
								{/* Users */}
								<div className='flex items-center gap-2 flex-1'>
									<Users className='h-3.5 w-3.5 text-zinc-400 shrink-0' />
									<span className='text-zinc-300'>
										{token.current_users}/{token.max_users}
									</span>
									<div className='flex-1 max-w-16 bg-zinc-700 rounded-full h-1'>
										<div
											style={{ width: `${Math.min(usagePercentage, 100)}%` }}
											className={cn(
												'h-1 rounded-full transition-all duration-300',
												usagePercentage > 80
													? 'bg-red-500'
													: usagePercentage > 60
														? 'bg-yellow-500'
														: 'bg-green-500'
											)}
										/>
									</div>
								</div>

								{/* Time */}
								<div className='flex items-center gap-2'>
									<Clock className='h-3.5 w-3.5 text-zinc-400 shrink-0' />
									<span
										className={cn('text-zinc-300', isExpired && 'text-red-400')}
									>
										{formatTimeRemaining(token.expires_at)}
									</span>
								</div>
							</div>

							{/* Permissions Row */}
							<div className='flex items-center gap-1.5'>
								{token.permissions.can_view && (
									<Badge
										variant='secondary'
										className='text-[10px] px-1.5 py-0 h-5 bg-zinc-700/50'
									>
										View
									</Badge>
								)}
								{token.permissions.can_comment && (
									<Badge
										variant='secondary'
										className='text-[10px] px-1.5 py-0 h-5 bg-zinc-700/50'
									>
										Comment
									</Badge>
								)}
								{token.permissions.can_edit && (
									<Badge
										variant='secondary'
										className='text-[10px] px-1.5 py-0 h-5 bg-zinc-700/50'
									>
										Edit
									</Badge>
								)}
							</div>

							{/* Share URL */}
							<div className='flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700/50'>
								<code className='flex-1 text-[11px] text-zinc-400 truncate'>
									{`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${token.token}`}
								</code>
								<Button
									className='h-6 w-6 p-0 shrink-0'
									onClick={handleCopyLink}
									size='sm'
									title='Copy share link'
									variant='ghost'
								>
									<ExternalLink className='h-3 w-3' />
								</Button>
							</div>

							{/* Secondary Actions */}
							<div className='flex items-center gap-2'>
								{onRefresh && (
									<Button
										className='h-7 text-xs gap-1.5 flex-1'
										disabled={isRefreshing || isExpired}
										onClick={handleRefresh}
										size='sm'
										variant='outline'
									>
										<RefreshCw
											className={cn('h-3 w-3', isRefreshing && 'animate-spin')}
										/>
										Refresh
									</Button>
								)}

								{showQRCode && (
									<Button
										className='h-7 text-xs gap-1.5 flex-1'
										onClick={() => setShowQR(!showQR)}
										size='sm'
										variant='outline'
									>
										<QrCode className='h-3 w-3' />
										{showQR ? 'Hide QR' : 'QR Code'}
									</Button>
								)}
							</div>

							{/* QR Code (nested expandable) */}
							<AnimatePresence>
								{showQR && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={transition}
										className='overflow-hidden'
									>
										<div className='text-center pt-2'>
											<div className='w-28 h-28 bg-zinc-900 border border-zinc-700 rounded-lg mx-auto flex items-center justify-center'>
												<QrCode className='h-8 w-8 text-zinc-500' />
											</div>
											<p className='text-[10px] text-zinc-500 mt-2'>
												Scan to join on mobile
											</p>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
