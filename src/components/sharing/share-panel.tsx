'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAppStore from '@/store/mind-map-store';
import { SharePanelProps, ShareRole } from '@/types/sharing-types';
import { cn } from '@/utils/cn';
import {
	ChevronDown,
	Link2,
	Loader2,
	QrCode,
	Settings,
	Shield,
	Trash2,
	Users,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useShallow } from 'zustand/shallow';
import { SidePanel } from '../side-panel';
import { RoomCodeDisplay } from './room-code-display';

const createShareSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	role: z.enum(['editor', 'commenter', 'viewer', 'owner']),
	message: z.string().optional(),
});

type CreateShareFormData = z.infer<typeof createShareSchema>;

// Animation easing following guidelines
const easeOutQuad = [0.25, 0.46, 0.45, 0.94] as const;

export function SharePanel({
	onClose,
	onShareUpdated,
	onShareDeleted,
}: SharePanelProps) {
	const [activeTab, setActiveTab] = useState<
		'room-code' | 'direct-share' | 'manage'
	>('room-code');
	const [isGeneratingCode, setIsGeneratingCode] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(true);
	const shouldReduceMotion = useReducedMotion();
	const settingsContentId = useId();

	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: easeOutQuad };

	const {
		shareTokens,
		createRoomCode,
		refreshRoomCode,
		revokeRoomCode,
		refreshTokens,
		subscribeToSharingUpdates,
		unsubscribeFromSharing,
		setPopoverOpen,
		popoverOpen,
		mindMap,
		getCurrentShareUsers,
		currentShares,
		deleteShare,
	} = useAppStore(
		useShallow((state) => ({
			shareTokens: state.shareTokens,
			createRoomCode: state.createRoomCode,
			refreshRoomCode: state.refreshRoomCode,
			revokeRoomCode: state.revokeRoomCode,
			refreshTokens: state.refreshTokens,
			subscribeToSharingUpdates: state.subscribeToSharingUpdates,
			unsubscribeFromSharing: state.unsubscribeFromSharing,
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			mindMap: state.mindMap,
			getCurrentShareUsers: state.getCurrentShareUsers,
			currentShares: state.currentShares,
			deleteShare: state.deleteShare,
		}))
	);

	const isOpen = popoverOpen.sharePanel;
	const mapId = mindMap?.id;

	// Room code generation settings
	const [roomCodeSettings, setRoomCodeSettings] = useState({
		role: 'viewer' as ShareRole,
		maxUsers: 50,
		expiresInHours: 24,
	});

	// Load existing tokens when panel opens
	useEffect(() => {
		if (isOpen && mapId) {
			refreshTokens();
		}
	}, [isOpen, mapId, refreshTokens]);

	// Subscribe to real-time updates when panel opens
	useEffect(() => {
		if (isOpen && mapId) {
			subscribeToSharingUpdates(mapId);
			getCurrentShareUsers();
		}

		return () => {
			// Always cleanup on unmount to prevent memory leaks
			unsubscribeFromSharing();
		};
	}, [isOpen, mapId, subscribeToSharingUpdates, unsubscribeFromSharing, getCurrentShareUsers]);

	// Get active room codes for this map (computed before early return for hook usage)
	const mapRoomCodes = shareTokens.filter(
		(token) =>
			token.map_id === mapId &&
			token.token_type === 'room_code' &&
			token.is_active
	);

	// Auto-collapse settings when room codes exist
	// Must be called unconditionally before any early returns
	useEffect(() => {
		if (mapRoomCodes.length > 0) {
			setSettingsOpen(false);
		} else {
			setSettingsOpen(true);
		}
	}, [mapRoomCodes.length]);

	if (!mapId) return null;

	const handleOnClose = () => {
		setPopoverOpen({ ...popoverOpen, sharePanel: false });
	};

	const handleGenerateRoomCode = async () => {
		setIsGeneratingCode(true);

		try {
			await createRoomCode(mapId, {
				role: roomCodeSettings.role,
				maxUsers: roomCodeSettings.maxUsers,
				expiresAt: new Date(
					Date.now() + roomCodeSettings.expiresInHours * 60 * 60 * 1000
				).toISOString(),
			});
			toast.success('Room code generated successfully!');
		} catch (error) {
			console.error('Failed to generate room code:', error);
			toast.error('Failed to generate room code. Please try again.');
		} finally {
			setIsGeneratingCode(false);
		}
	};

	const handleRefreshCode = async (tokenId: string) => {
		try {
			await refreshRoomCode(tokenId);
			toast.success('Room code refreshed!');
		} catch (error) {
			console.error('Failed to refresh room code:', error);
			toast.error('Failed to refresh room code.');
		}
	};

	const handleRevokeCode = async (tokenId: string) => {
		try {
			await revokeRoomCode(tokenId);
			toast.success('Room code revoked.');
		} catch (error) {
			console.error('Failed to revoke room code:', error);
			toast.error('Failed to revoke room code.');
		}
	};

	// TODO: Implement backend logic
	const handleUpdateShareRole = async (shareId: string, newRole: ShareRole) => {
		try {
			const response = await fetch(`/api/share/update-share/${shareId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: newRole }),
			});

			if (!response.ok) {
				throw new Error('Failed to update share');
			}

			const updatedShare = await response.json();
			onShareUpdated?.(updatedShare);
			toast.success('Share permissions updated');
		} catch (error) {
			console.error('Failed to update share:', error);
			toast.error('Failed to update permissions');
		}
	};

	const handleDeleteShare = async (shareId: string) => {
		try {
			await deleteShare(shareId);
			onShareDeleted?.(shareId);
			toast.success('User access removed');
		} catch (error) {
			console.error('Failed to delete share:', error);
			toast.error('Failed to remove user access');
		}
	};

	return (
		<SidePanel
			className='w-[400px]'
			isOpen={isOpen}
			onClose={onClose}
			title={`Share ${mindMap?.title || 'Untitled Map'}`}
		>
			<div className='flex h-full flex-col min-h-0'>
				{/* Tabs */}
				<Tabs
					className='flex-1 flex flex-col min-h-0'
					onValueChange={(v) => setActiveTab(v as typeof activeTab)}
					value={activeTab}
				>
					<TabsList className='grid w-full grid-cols-2 mx-4 mt-2 gap-1 flex-shrink-0' style={{ width: 'calc(100% - 2rem)' }}>
						<TabsTrigger value='room-code'>
							<Link2 className='mr-2 h-4 w-4' />
							Room Code
						</TabsTrigger>

						<TabsTrigger value='manage'>
							<Users className='mr-2 h-4 w-4' />
							Manage
						</TabsTrigger>
					</TabsList>

					{/* Room Code Tab */}
					<TabsContent className='flex-1 flex flex-col min-h-0 px-4 mt-4' value='room-code'>
						{/* Collapsible Settings Section */}
						<div className='flex-shrink-0'>
							<button
								type='button'
								aria-controls={settingsContentId}
								aria-expanded={settingsOpen}
								onClick={() => setSettingsOpen(!settingsOpen)}
								className='flex items-center justify-between w-full p-3 bg-surface rounded-lg hover:bg-surface/80 transition-colors duration-200 ease group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900'
							>
								<div className='flex items-center gap-2'>
									<Settings className='h-4 w-4 text-zinc-400' />
									<span className='text-sm font-medium text-zinc-200'>
										Room Code Settings
									</span>
								</div>
								<ChevronDown
									className={cn(
										'h-4 w-4 text-zinc-400 transition-transform duration-200 ease-out',
										settingsOpen && 'rotate-180'
									)}
								/>
							</button>

							<AnimatePresence initial={false}>
								{settingsOpen && (
									<motion.div
										id={settingsContentId}
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={transition}
										className='overflow-hidden'
									>
										<div className='space-y-4 bg-surface rounded-b-lg p-4 -mt-1 border-t border-zinc-700/30'>
											<div className='space-y-2'>
												<Label className='text-xs text-zinc-400'>Default Permission</Label>

												<Select
													value={roomCodeSettings.role}
													onValueChange={(v) =>
														setRoomCodeSettings((prev) => ({
															...prev,
															role: v as ShareRole,
														}))
													}
												>
													<SelectTrigger className='h-9'>
														<SelectValue />
													</SelectTrigger>

													<SelectContent>
														<SelectItem value='viewer'>
															<div className='flex items-center gap-2'>
																<Shield className='h-3.5 w-3.5' />
																<span>Viewer - Can view only</span>
															</div>
														</SelectItem>

														<SelectItem value='commenter'>
															<div className='flex items-center gap-2'>
																<Shield className='h-3.5 w-3.5' />
																<span>Commenter - Can view and comment</span>
															</div>
														</SelectItem>

														<SelectItem value='editor'>
															<div className='flex items-center gap-2'>
																<Shield className='h-3.5 w-3.5' />
																<span>Editor - Can edit content</span>
															</div>
														</SelectItem>
													</SelectContent>
												</Select>
											</div>

											<div className='grid grid-cols-2 gap-3'>
												<div className='space-y-2'>
													<Label className='text-xs text-zinc-400'>Max Users</Label>

													<Input
														className='h-9'
														max={100}
														min={1}
														type='number'
														value={roomCodeSettings.maxUsers}
														onChange={(e) =>
															setRoomCodeSettings((prev) => ({
																...prev,
																maxUsers: parseInt(e.target.value) || 50,
															}))
														}
													/>
												</div>

												<div className='space-y-2'>
													<Label className='text-xs text-zinc-400'>Expires After</Label>

													<Select
														value={roomCodeSettings.expiresInHours.toString()}
														onValueChange={(v) =>
															setRoomCodeSettings((prev) => ({
																...prev,
																expiresInHours: parseInt(v),
															}))
														}
													>
														<SelectTrigger className='h-9'>
															<SelectValue />
														</SelectTrigger>

														<SelectContent>
															<SelectItem value='1'>1 hour</SelectItem>
															<SelectItem value='6'>6 hours</SelectItem>
															<SelectItem value='24'>24 hours</SelectItem>
															<SelectItem value='72'>3 days</SelectItem>
															<SelectItem value='168'>1 week</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>

											<Button
												className='w-full h-9'
												disabled={isGeneratingCode}
												onClick={handleGenerateRoomCode}
											>
												{isGeneratingCode ? (
													<>
														<Loader2 className='mr-2 h-4 w-4 animate-spin' />
														Generating...
													</>
												) : (
													<>
														<Link2 className='mr-2 h-4 w-4' />
														Generate Room Code
													</>
												)}
											</Button>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						{/* Room Codes List - Scrollable */}
						<div className='flex-1 min-h-0 mt-4'>
							{mapRoomCodes.length > 0 ? (
								<ScrollArea className='h-full -mx-4 px-4'>
									<div className='space-y-3 pb-4'>
										{mapRoomCodes.map((token, index) => (
											<motion.div
												key={token.id}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{
													...transition,
													delay: shouldReduceMotion ? 0 : index * 0.05,
												}}
											>
												<RoomCodeDisplay
													showQRCode
													token={token}
													defaultExpanded={index === 0}
													onRefresh={handleRefreshCode}
													onRevoke={handleRevokeCode}
												/>
											</motion.div>
										))}
									</div>
								</ScrollArea>
							) : (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={transition}
									className='rounded-lg border-2 border-dashed border-zinc-700/50 p-8 text-center'
								>
									<QrCode className='mx-auto h-10 w-10 text-zinc-600' />

									<h3 className='mt-4 text-sm font-medium text-zinc-300'>
										No active room codes
									</h3>

									<p className='mt-2 text-xs text-zinc-500'>
										Generate a room code to allow others to join without an
										account
									</p>
								</motion.div>
							)}
						</div>
					</TabsContent>

					{/* Manage Access Tab */}
					<TabsContent className='flex-1 min-h-0 px-4 mt-4' value='manage'>
						<ScrollArea className='h-full -mx-4 px-4'>
							<div className='space-y-4 pb-4'>
								{!currentShares || currentShares.length === 0 ? (
									<div className='rounded-lg border-2 border-dashed border-zinc-700/50 p-8 text-center'>
										<Users className='mx-auto h-10 w-10 text-zinc-600' />

										<h3 className='mt-4 text-sm font-medium text-zinc-300'>
											No one else has access
										</h3>

										<p className='mt-2 text-xs text-zinc-500'>
											Share this mind map to start collaborating
										</p>
									</div>
								) : (
									<div className='space-y-2'>
										{currentShares.map((share) => (
											<div
												className='flex items-center justify-between rounded-lg border border-zinc-700/50 p-3 bg-surface'
												key={share.id}
											>
												<div className='flex items-center gap-3'>
													<Avatar className='h-8 w-8 ring-border-strong'>
														<AvatarImage src={share.avatar_url} />

														<AvatarFallback>
															{share.profile?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
														</AvatarFallback>
													</Avatar>

													<div>
														<p className='text-sm font-medium'>{share.name}</p>

														<p className='text-xs text-muted-foreground'>
															{share.email}
														</p>
													</div>
												</div>

												<div className='flex items-center gap-2'>
													<Select
														disabled={share.share.role === 'owner'}
														value={share.share.role}
														onValueChange={(v) =>
															handleUpdateShareRole(
																share.share.id,
																v as ShareRole
															)
														}
													>
														<SelectTrigger className='h-8 w-[100px]'>
															<SelectValue />
														</SelectTrigger>

														<SelectContent>
															<SelectItem value='viewer'>Viewer</SelectItem>

															<SelectItem value='commenter'>
																Commenter
															</SelectItem>

															<SelectItem value='editor'>Editor</SelectItem>

															{share.share.role === 'owner' && (
																<SelectItem disabled value='owner'>
																	Owner
																</SelectItem>
															)}
														</SelectContent>
													</Select>

													{share.share.role !== 'owner' && (
														<Button
															className='h-8 w-8'
															onClick={() => handleDeleteShare(share.share.id)}
															size='icon'
															variant='ghost'
														>
															<Trash2 className='h-4 w-4' />
														</Button>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</div>
		</SidePanel>
	);
}
