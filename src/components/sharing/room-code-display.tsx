'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShareToken } from '@/types/sharing-types';
import {
	Clock,
	Copy,
	ExternalLink,
	QrCode,
	RefreshCw,
	Users,
	X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RoomCodeDisplayProps {
	token: ShareToken;
	showQRCode?: boolean;
	className?: string;
	onRefresh?: (tokenId: string) => Promise<void>;
	onRevoke?: (tokenId: string) => Promise<void>;
	onCopy?: (token: string) => void;
}

export function RoomCodeDisplay({
	token,
	onRefresh,
	onRevoke,
	onCopy,
	showQRCode = true,
	className,
}: RoomCodeDisplayProps) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [showQR, setShowQR] = useState(false);

	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(token.token);
			toast.success('Room code copied!');
			onCopy?.(token.token);
		} catch (error) {
			toast.error('Failed to copy room code');
		}
	};

	const handleCopyLink = async () => {
		try {
			const shareUrl = `${window.location.origin}/join/${token.token}`;
			await navigator.clipboard.writeText(shareUrl);
			toast.success('Share link copied!');
		} catch (error) {
			toast.error('Failed to copy share link');
		}
	};

	const handleRefresh = async () => {
		if (!onRefresh) return;

		setIsRefreshing(true);

		try {
			await onRefresh(token.id);
			toast.success('Room code refreshed!');
		} catch (error) {
			toast.error('Failed to refresh room code');
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleRevoke = async () => {
		if (!onRevoke) return;

		try {
			await onRevoke(token.id);
			toast.success('Room code revoked');
		} catch (error) {
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

		if (hours > 0) {
			return `${hours}h ${minutes}m remaining`;
		}

		return `${minutes}m remaining`;
	};

	const isExpired = token.expires_at
		? new Date(token.expires_at) < new Date()
		: false;
	const usagePercentage = (token.current_users / token.max_users) * 100;

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className={`p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-4 ${className}`}
		>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='space-y-1'>
					<div className='flex items-center gap-2'>
						<code className='text-lg font-mono font-bold text-teal-400 bg-zinc-900 px-3 py-1.5 rounded tracking-wider'>
							{token.token}
						</code>

						<Badge
							variant='outline'
							className={`text-xs ${
								token.permissions.role === 'editor'
									? 'border-green-500 text-green-400'
									: token.permissions.role === 'commenter'
										? 'border-yellow-500 text-yellow-400'
										: 'border-blue-500 text-blue-400'
							}`}
						>
							{token.permissions.role}
						</Badge>

						{isExpired && (
							<Badge variant='destructive' className='text-xs'>
								Expired
							</Badge>
						)}
					</div>

					<p className='text-xs text-zinc-400'>Room code for easy sharing</p>
				</div>

				<div className='flex items-center gap-1'>
					<Button
						size='sm'
						variant='ghost'
						onClick={handleCopyCode}
						className='h-8 w-8 p-0'
						title='Copy room code'
					>
						<Copy className='h-4 w-4' />
					</Button>

					<Button
						size='sm'
						variant='ghost'
						onClick={handleCopyLink}
						className='h-8 w-8 p-0'
						title='Copy share link'
					>
						<ExternalLink className='h-4 w-4' />
					</Button>

					{showQRCode && (
						<Button
							size='sm'
							variant='ghost'
							onClick={() => setShowQR(!showQR)}
							className='h-8 w-8 p-0'
							title='Show QR code'
						>
							<QrCode className='h-4 w-4' />
						</Button>
					)}

					{onRefresh && (
						<Button
							size='sm'
							variant='ghost'
							onClick={handleRefresh}
							disabled={isRefreshing || isExpired}
							className='h-8 w-8 p-0'
							title='Refresh room code'
						>
							<RefreshCw
								className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
							/>
						</Button>
					)}

					{onRevoke && (
						<Button
							size='sm'
							variant='ghost'
							onClick={handleRevoke}
							className='h-8 w-8 p-0 text-red-400 hover:text-red-300'
							title='Revoke room code'
						>
							<X className='h-4 w-4' />
						</Button>
					)}
				</div>
			</div>

			<Separator className='bg-zinc-700' />

			{/* Stats */}
			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-1'>
					<div className='flex items-center gap-2'>
						<Users className='h-4 w-4 text-zinc-400' />

						<span className='text-sm text-zinc-300'>
							{token.current_users} / {token.max_users}
						</span>
					</div>

					<div className='w-full bg-zinc-700 rounded-full h-1.5'>
						<div
							className={`h-1.5 rounded-full transition-all duration-300 ${
								usagePercentage > 80
									? 'bg-red-500'
									: usagePercentage > 60
										? 'bg-yellow-500'
										: 'bg-green-500'
							}`}
							style={{ width: `${Math.min(usagePercentage, 100)}%` }}
						/>
					</div>
				</div>

				<div className='space-y-1'>
					<div className='flex items-center gap-2'>
						<Clock className='h-4 w-4 text-zinc-400' />

						<span className='text-sm text-zinc-300'>
							{token.expires_at ? 'Expires' : 'Duration'}
						</span>
					</div>

					<p
						className={`text-xs ${isExpired ? 'text-red-400' : 'text-zinc-400'}`}
					>
						{formatTimeRemaining(token.expires_at)}
					</p>
				</div>
			</div>

			{/* Permissions */}
			<div className='space-y-2'>
				<p className='text-xs text-zinc-400'>Permissions</p>

				<div className='flex flex-wrap gap-2'>
					{token.permissions.can_view && (
						<Badge variant='secondary' className='text-xs'>
							View
						</Badge>
					)}

					{token.permissions.can_comment && (
						<Badge variant='secondary' className='text-xs'>
							Comment
						</Badge>
					)}

					{token.permissions.can_edit && (
						<Badge variant='secondary' className='text-xs'>
							Edit
						</Badge>
					)}
				</div>
			</div>

			{/* QR Code placeholder */}
			{showQR && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className='space-y-2'
				>
					<Separator className='bg-zinc-700' />

					<div className='text-center space-y-2'>
						<div className='w-32 h-32 bg-zinc-900 border border-zinc-700 rounded-lg mx-auto flex items-center justify-center'>
							<QrCode className='h-8 w-8 text-zinc-500' />
						</div>

						<p className='text-xs text-zinc-500'>QR code for mobile access</p>
					</div>
				</motion.div>
			)}

			{/* Share URL */}
			<div className='space-y-2'>
				<p className='text-xs text-zinc-400'>Share URL</p>

				<div className='flex items-center gap-2 p-2 bg-zinc-900 rounded border border-zinc-700'>
					<code className='flex-1 text-xs text-zinc-300 truncate'>
						{`${window.location.origin}/join/${token.token}`}
					</code>

					<Button
						size='sm'
						variant='ghost'
						onClick={handleCopyLink}
						className='h-6 w-6 p-0 flex-shrink-0'
					>
						<Copy className='h-3 w-3' />
					</Button>
				</div>
			</div>
		</motion.div>
	);
}
