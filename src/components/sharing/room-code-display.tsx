'use client';

import { Button } from '@/components/ui/button';
import { PanelBadge, panelButtonSmClass } from '@/components/ui/panel';
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

	const roleTone =
		token.permissions.role === 'editor'
			? 'ok'
			: token.permissions.role === 'commentator'
				? 'warn'
				: 'default';
	const iconButtonClass =
		'size-8 shrink-0 p-0 text-text-secondary hover:text-text-primary';

	return (
		<motion.div className={cn('-mx-2 px-2', className)} layout transition={transition}>
			{/* Compact row: always visible */}
			<div className='flex min-h-[52px] items-center justify-between gap-2 py-2'>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					<code
						className='shrink-0 font-mono text-sm font-medium tracking-[0.02em] text-text-primary'
						data-testid='room-code-value'
					>
						{token.token}
					</code>

					<PanelBadge tone={roleTone}>{token.permissions.role}</PanelBadge>

					{isExpired && <PanelBadge tone='error'>Expired</PanelBadge>}
				</div>

				<div className='flex shrink-0 items-center gap-0.5'>
					<Button
						aria-label='Copy room code'
						className={iconButtonClass}
						onClick={handleCopyCode}
						size='icon'
						title='Copy room code'
						variant='ghost'
					>
						<Copy className='size-4' />
					</Button>

					{onRevoke && (
						<Button
							aria-label='Revoke room code'
							className={cn(iconButtonClass, 'hover:bg-error-500/10 hover:text-error-300')}
							data-testid='revoke-room-code-btn'
							onClick={handleRevoke}
							size='icon'
							title='Revoke room code'
							variant='ghost'
						>
							<X className='size-4' />
						</Button>
					)}

					<Button
						aria-controls={expandableContentId}
						aria-expanded={isExpanded}
						aria-label={isExpanded ? 'Collapse room code' : 'Expand room code'}
						className={iconButtonClass}
						onClick={() => setIsExpanded(!isExpanded)}
						size='icon'
						title={isExpanded ? 'Collapse' : 'Expand'}
						variant='ghost'
					>
						<ChevronDown
							className={cn(
								'size-4 transition-transform duration-200 ease-out',
								isExpanded && 'rotate-180'
							)}
						/>
					</Button>
				</div>
			</div>

			{/* Details */}
			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						animate={{ height: 'auto', opacity: 1 }}
						className='overflow-hidden'
						exit={{ height: 0, opacity: 0 }}
						id={expandableContentId}
						initial={{ height: 0, opacity: 0 }}
						transition={transition}
					>
						<div className='space-y-3 pb-3 pt-1'>
							<div className='flex items-center justify-between gap-3 text-[12.5px] text-text-secondary'>
								<span className='inline-flex items-center gap-2.5'>
									<Users aria-hidden className='size-3.5 shrink-0' />

									<span className='tabular-nums'>
										{token.current_users} / {token.max_users} people
									</span>

									<span
										aria-hidden
										className='h-1 w-16 overflow-hidden rounded-full bg-white/10'
									>
										<span
											className={cn(
												'block h-full rounded-full transition-[width] duration-300',
												usagePercentage > 80
													? 'bg-error-400'
													: usagePercentage > 60
														? 'bg-warning-400'
														: 'bg-primary-400'
											)}
											style={{ width: `${Math.min(usagePercentage, 100)}%` }}
										/>
									</span>
								</span>

								<span
									className={cn(
										'inline-flex items-center gap-1.5',
										isExpired && 'text-error-300'
									)}
								>
									<Clock aria-hidden className='size-3.5 shrink-0' />
									{formatTimeRemaining(token.expires_at)}
								</span>
							</div>

							<div className='flex items-center gap-1.5'>
								{token.permissions.can_view && <PanelBadge>View</PanelBadge>}
								{token.permissions.can_comment && <PanelBadge>Comment</PanelBadge>}
								{token.permissions.can_edit && <PanelBadge>Edit</PanelBadge>}
							</div>

							<div className='flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.04] pl-3 pr-1'>
								<code className='min-w-0 flex-1 truncate font-mono text-[12.5px] text-text-secondary'>
									{`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${token.token}`}
								</code>

								<Button
									aria-label='Copy share link'
									className='size-7 shrink-0 p-0 text-text-secondary hover:text-text-primary'
									onClick={handleCopyLink}
									size='icon'
									title='Copy share link'
									variant='ghost'
								>
									<ExternalLink className='size-3.5' />
								</Button>
							</div>

							<div className='flex items-center gap-2'>
								{onRefresh && (
									<Button
										className={cn(panelButtonSmClass, 'flex-1 gap-1.5 border-white/12 bg-white/[0.03]')}
										disabled={isRefreshing || isExpired}
										onClick={handleRefresh}
										variant='outline'
									>
										<RefreshCw
											className={cn('size-3.5', isRefreshing && 'animate-spin')}
										/>
										Refresh
									</Button>
								)}

								{showQRCode && (
									<Button
										className={cn(panelButtonSmClass, 'flex-1 gap-1.5 border-white/12 bg-white/[0.03]')}
										onClick={() => setShowQR(!showQR)}
										variant='outline'
									>
										<QrCode className='size-3.5' />
										{showQR ? 'Hide QR' : 'QR Code'}
									</Button>
								)}
							</div>

							<AnimatePresence>
								{showQR && (
									<motion.div
										animate={{ height: 'auto', opacity: 1 }}
										className='overflow-hidden'
										exit={{ height: 0, opacity: 0 }}
										initial={{ height: 0, opacity: 0 }}
										transition={transition}
									>
										<div className='pt-2 text-center'>
											<div className='mx-auto flex size-28 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]'>
												<QrCode className='size-8 text-text-tertiary' />
											</div>

											<p className='mt-2 text-xs text-text-tertiary'>
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
