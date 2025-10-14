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
			animate={{ opacity: 1, y: 0 }}
			className={`p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-4 ${className}`}
			initial={{ opacity: 0, y: 10 }}
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
							<Badge className='text-xs' variant='destructive'>
								Expired
							</Badge>
						)}
					</div>

					<p className='text-xs text-zinc-400'>Room code for easy sharing</p>
				</div>

				<div className='flex items-center gap-1'>
					<Button
						className='h-8 w-8 p-0'
						size='sm'
						title='Copy room code'
						variant='ghost'
						onClick={handleCopyCode}
					>
						<Copy className='h-4 w-4' />
					</Button>

					<Button
						className='h-8 w-8 p-0'
						size='sm'
						title='Copy share link'
						variant='ghost'
						onClick={handleCopyLink}
					>
						<ExternalLink className='h-4 w-4' />
					</Button>

					{showQRCode && (
						<Button
							className='h-8 w-8 p-0'
							size='sm'
							title='Show QR code'
							variant='ghost'
							onClick={() => setShowQR(!showQR)}
						>
							<QrCode className='h-4 w-4' />
						</Button>
					)}

					{onRefresh && (
						<Button
							className='h-8 w-8 p-0'
							disabled={isRefreshing || isExpired}
							size='sm'
							title='Refresh room code'
							variant='ghost'
							onClick={handleRefresh}
						>
							<RefreshCw
								className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
							/>
						</Button>
					)}

					{onRevoke && (
						<Button
							className='h-8 w-8 p-0 text-red-400 hover:text-red-300'
							size='sm'
							title='Revoke room code'
							variant='ghost'
							onClick={handleRevoke}
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

						<span className='text-sm text-zinc-300 flex gap-1'>
							<span>{token.current_users}</span>

							<span>/</span>

							<span>{token.max_users}</span>
						</span>
					</div>

					<div className='w-full bg-zinc-700 rounded-full h-1.5'>
						<div
							style={{ width: `${Math.min(usagePercentage, 100)}%` }}
							className={`h-1.5 rounded-full transition-all duration-300 ${
								usagePercentage > 80
									? 'bg-red-500'
									: usagePercentage > 60
										? 'bg-yellow-500'
										: 'bg-green-500'
							}`}
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
						<Badge className='text-xs' variant='secondary'>
							View
						</Badge>
					)}

					{token.permissions.can_comment && (
						<Badge className='text-xs' variant='secondary'>
							Comment
						</Badge>
					)}

					{token.permissions.can_edit && (
						<Badge className='text-xs' variant='secondary'>
							Edit
						</Badge>
					)}
				</div>
			</div>

			{/* QR Code placeholder */}
			{showQR && (
				<motion.div
					animate={{ opacity: 1, height: 'auto' }}
					className='space-y-2'
					exit={{ opacity: 0, height: 0 }}
					initial={{ opacity: 0, height: 0 }}
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
						className='h-6 w-6 p-0 flex-shrink-0'
						size='sm'
						variant='ghost'
						onClick={handleCopyLink}
					>
						<Copy className='h-3 w-3' />
					</Button>
				</div>
			</div>
		</motion.div>
	);
}
