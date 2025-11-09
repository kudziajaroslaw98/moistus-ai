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
import { Link2, Loader2, QrCode, Shield, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export function SharePanel({
	// onShareCreated,
	onClose,
	onShareUpdated,
	onShareDeleted,
}: SharePanelProps) {
	const [activeTab, setActiveTab] = useState<
		'room-code' | 'direct-share' | 'manage'
	>('room-code');
	const [isGeneratingCode, setIsGeneratingCode] = useState(false);
	// const [isSendingInvite, setIsSendingInvite] = useState(false);

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
	} = useAppStore(
		useShallow((state) => ({
			shareTokens: state.shareTokens,
			activeToken: state.activeToken,
			createRoomCode: state.createRoomCode,
			refreshRoomCode: state.refreshRoomCode,
			revokeRoomCode: state.revokeRoomCode,
			refreshTokens: state.refreshTokens,
			subscribeToSharingUpdates: state.subscribeToSharingUpdates,
			unsubscribeFromSharing: state.unsubscribeFromSharing,
			currentUser: state.currentUser,
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			mindMap: state.mindMap,
			getCurrentShareUsers: state.getCurrentShareUsers,
			currentShares: state.currentShares,
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

	// Direct share form
	// const {
	// 	register,
	// 	handleSubmit,
	// 	formState: { errors },
	// 	reset,
	// 	setValue,
	// } = useForm<CreateShareFormData>({
	// 	resolver: zodResolver(createShareSchema),
	// 	defaultValues: {
	// 		role: 'viewer',
	// 	},
	// });

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
			if (!isOpen) {
				unsubscribeFromSharing();
			}
		};
	}, [isOpen, mapId, subscribeToSharingUpdates, unsubscribeFromSharing]);

	if (!mapId) return null;

	const handleOnClose = () => {
		setPopoverOpen({ ...popoverOpen, sharePanel: false });
	};

	// Get active room codes for this map
	const mapRoomCodes = shareTokens.filter(
		(token) =>
			token.map_id === mapId &&
			token.token_type === 'room_code' &&
			token.is_active
	);

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

	// TODO: for future expansion
	// const handleDirectShare = async (data: {
	// 	email: string;
	// 	role: 'owner' | 'editor' | 'commenter' | 'viewer';
	// 	message?: string;
	// }) => {
	// 	setIsSendingInvite(true);

	// 	try {
	// 		const response = await fetch('/api/share/create-direct-share', {
	// 			method: 'POST',
	// 			headers: { 'Content-Type': 'application/json' },
	// 			body: JSON.stringify({
	// 				map_id: mapId,
	// 				user_email: data.email,
	// 				role: data.role,
	// 				message: data.message,
	// 				send_notification: true,
	// 			} as CreateShareRequest),
	// 		});

	// 		if (!response.ok) {
	// 			throw new Error('Failed to send invitation');
	// 		}

	// 		const share = await response.json();
	// 		onShareCreated?.(share);
	// 		toast.success(`Invitation sent to ${data.email}`);
	// 		reset();
	// 	} catch (error) {
	// 		console.error('Failed to send invitation:', error);
	// 		toast.error('Failed to send invitation. Please try again.');
	// 	} finally {
	// 		setIsSendingInvite(false);
	// 	}
	// };

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

	// TODO: Implement backend logic
	const handleDeleteShare = async (shareId: string) => {
		try {
			const response = await fetch(`/api/share/delete-share/${shareId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete share');
			}

			onShareDeleted?.(shareId);
			toast.success('Share removed');
		} catch (error) {
			console.error('Failed to delete share:', error);
			toast.error('Failed to remove share');
		}
	};

	return (
		<SidePanel
			isOpen={isOpen}
			onClose={onClose}
			title={`Share ${mindMap?.title || 'Untitled Map'}`}
			className='w-[400px]'
		>
			<div className='flex h-full flex-col'>
				{/* Tabs */}
				<Tabs
					className='flex-1 max-h-screen overflow-y-auto py-2'
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as any)}
				>
					<TabsList className='grid w-full grid-cols-2 px-4 gap-1'>
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
					<TabsContent className='flex-1 px-4' value='room-code'>
						<div className='space-y-6'>
							<div className='space-y-4 bg-surface rounded-lg p-4'>
								<h3 className='font-medium'>Room Code Settings</h3>

								<div className='space-y-2'>
									<Label>Default Permission</Label>

									<Select
										value={roomCodeSettings.role}
										onValueChange={(v) =>
											setRoomCodeSettings((prev) => ({
												...prev,
												role: v as ShareRole,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>

										<SelectContent>
											<SelectItem value='viewer'>
												<div className='flex items-center gap-2'>
													<Shield className='h-4 w-4' />

													<span>Viewer - Can view only</span>
												</div>
											</SelectItem>

											<SelectItem value='commenter'>
												<div className='flex items-center gap-2'>
													<Shield className='h-4 w-4' />

													<span>Commenter - Can view and comment</span>
												</div>
											</SelectItem>

											<SelectItem value='editor'>
												<div className='flex items-center gap-2'>
													<Shield className='h-4 w-4' />

													<span>Editor - Can edit content</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<Label>Maximum Users</Label>

									<Input
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
									<Label>Expires After (hours)</Label>

									<Select
										value={roomCodeSettings.expiresInHours.toString()}
										onValueChange={(v) =>
											setRoomCodeSettings((prev) => ({
												...prev,
												expiresInHours: parseInt(v),
											}))
										}
									>
										<SelectTrigger>
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

								<Button
									className='w-full'
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

							{mapRoomCodes.length > 0 ? (
								<div className='space-y-4'>
									{mapRoomCodes.map((token) => (
										<RoomCodeDisplay
											showQRCode
											key={token.id}
											token={token}
											onRefresh={handleRefreshCode}
											onRevoke={handleRevokeCode}
										/>
									))}
								</div>
							) : (
								<div className='rounded-lg border-2 border-dashed p-8 text-center'>
									<QrCode className='mx-auto h-12 w-12 text-muted-foreground' />

									<h3 className='mt-4 text-sm font-medium'>
										No active room codes
									</h3>

									<p className='mt-2 text-sm text-muted-foreground'>
										Generate a room code to allow others to join without an
										account
									</p>
								</div>
							)}
						</div>
					</TabsContent>

					{/* Manage Access Tab */}
					<TabsContent className='flex-1 px-4' value='manage'>
						<ScrollArea className='h-full'>
							<div className='space-y-4'>
								{!currentShares || currentShares.length === 0 ? (
									<div className='rounded-lg border-2 border-dashed p-8 text-center'>
										<Users className='mx-auto h-12 w-12 text-muted-foreground' />

										<h3 className='mt-4 text-sm font-medium'>
											No one else has access
										</h3>

										<p className='mt-2 text-sm text-muted-foreground'>
											Share this mind map to start collaborating
										</p>
									</div>
								) : (
									<div className='space-y-2'>
										{currentShares.map((share) => (
											<div
												className='flex items-center justify-between rounded-lg border p-3 bg-surface'
												key={share.id}
											>
												<div className='flex items-center gap-3'>
													<Avatar className='h-8 w-8 ring-border-strong'>
														<AvatarImage src={share.avatar_url} />

														<AvatarFallback>
															{share.profile?.display_name
																?.charAt(0)
																.toUpperCase()}
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
														<SelectTrigger className='h-8 w-[110px]'>
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
															size='icon'
															variant='ghost'
															onClick={() => handleDeleteShare(share.share.id)}
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
