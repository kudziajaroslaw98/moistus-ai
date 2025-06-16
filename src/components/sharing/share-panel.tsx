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
import { Textarea } from '@/components/ui/textarea';
import useAppStore from '@/contexts/mind-map/mind-map-store';
import {
	CreateShareRequest,
	SharePanelProps,
	ShareRole,
} from '@/types/sharing-types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Link2,
	Loader2,
	Mail,
	QrCode,
	Send,
	Shield,
	Trash2,
	Users,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useShallow } from 'zustand/shallow';
import { RoomCodeDisplay } from './room-code-display';

const createShareSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	role: z.enum(['editor', 'commenter', 'viewer', 'owner']),
	message: z.string().optional(),
});

type CreateShareFormData = z.infer<typeof createShareSchema>;

export function SharePanel({
	currentShares = [],
	onShareCreated,
	onShareUpdated,
	onShareDeleted,
}: SharePanelProps) {
	const [activeTab, setActiveTab] = useState<
		'room-code' | 'direct-share' | 'manage'
	>('room-code');
	const [isGeneratingCode, setIsGeneratingCode] = useState(false);
	const [isSendingInvite, setIsSendingInvite] = useState(false);

	const {
		shareTokens,
		activeToken,
		createRoomCode,
		refreshRoomCode,
		revokeRoomCode,
		refreshTokens,
		subscribeToSharingUpdates,
		unsubscribeFromSharing,
		currentUser,
		setPopoverOpen,
		popoverOpen,
		mindMap,
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
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
	} = useForm<CreateShareFormData>({
		resolver: zodResolver(createShareSchema),
		defaultValues: {
			role: 'viewer',
		},
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

	const handleDirectShare = async (data: {
		email: string;
		role: 'owner' | 'editor' | 'commenter' | 'viewer';
		message?: string;
	}) => {
		setIsSendingInvite(true);

		try {
			const response = await fetch('/api/share/create-direct-share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					map_id: mapId,
					user_email: data.email,
					role: data.role,
					message: data.message,
					send_notification: true,
				} as CreateShareRequest),
			});

			if (!response.ok) {
				throw new Error('Failed to send invitation');
			}

			const share = await response.json();
			onShareCreated?.(share);
			toast.success(`Invitation sent to ${data.email}`);
			reset();
		} catch (error) {
			console.error('Failed to send invitation:', error);
			toast.error('Failed to send invitation. Please try again.');
		} finally {
			setIsSendingInvite(false);
		}
	};

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

	const getRoleBadgeVariant = (role: ShareRole) => {
		switch (role) {
			case 'owner':
				return 'default';
			case 'editor':
				return 'secondary';
			case 'commenter':
				return 'outline';
			case 'viewer':
				return 'ghost';
			default:
				return 'ghost';
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className='fixed inset-0 z-50 bg-black/50'
					onClick={handleOnClose}
				>
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 20 }}
						className='absolute right-0 h-full w-full max-w-md bg-background shadow-xl'
						onClick={(e) => e.stopPropagation()}
					>
						<div className='flex h-full flex-col'>
							{/* Header */}
							<div className='flex items-center justify-between border-b p-4'>
								<div>
									<h2 className='text-lg font-semibold'>
										Share {`"${mindMap?.title}"` || 'Untitled Map'}
									</h2>

									<p className='text-sm text-muted-foreground'>
										Collaborate with others on this mind map
									</p>
								</div>

								<Button
									variant='ghost'
									size='icon'
									onClick={handleOnClose}
									className='shrink-0'
								>
									<X className='h-4 w-4' />
								</Button>
							</div>

							{/* Tabs */}
							<Tabs
								value={activeTab}
								onValueChange={(v) => setActiveTab(v as any)}
								className='flex-1 max-h-screen overflow-y-auto'
							>
								<TabsList className='grid w-full grid-cols-3'>
									<TabsTrigger value='room-code'>
										<Link2 className='mr-2 h-4 w-4' />
										Room Code
									</TabsTrigger>

									<TabsTrigger value='direct-share'>
										<Mail className='mr-2 h-4 w-4' />
										Direct Share
									</TabsTrigger>

									<TabsTrigger value='manage'>
										<Users className='mr-2 h-4 w-4' />
										Manage
									</TabsTrigger>
								</TabsList>

								{/* Room Code Tab */}
								<TabsContent value='room-code' className='flex-1 p-4'>
									<div className='space-y-6'>
										{mapRoomCodes.length > 0 ? (
											<div className='space-y-4'>
												{mapRoomCodes.map((token) => (
													<RoomCodeDisplay
														key={token.id}
														token={token}
														onRefresh={handleRefreshCode}
														onRevoke={handleRevokeCode}
														showQRCode
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
													Generate a room code to allow others to join without
													an account
												</p>
											</div>
										)}

										<div className='space-y-4 rounded-lg border p-4'>
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
													type='number'
													min={1}
													max={100}
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
												onClick={handleGenerateRoomCode}
												disabled={isGeneratingCode}
												className='w-full'
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
									</div>
								</TabsContent>

								{/* Direct Share Tab */}
								<TabsContent value='direct-share' className='flex-1 p-4'>
									<form
										onSubmit={handleSubmit(handleDirectShare)}
										className='space-y-4'
									>
										<div className='space-y-2'>
											<Label htmlFor='email'>Email Address</Label>

											<Input
												id='email'
												type='email'
												placeholder='colleague@example.com'
												{...register('email')}
											/>

											{errors.email && (
												<p className='text-sm text-destructive'>
													{errors.email.message}
												</p>
											)}
										</div>

										<div className='space-y-2'>
											<Label htmlFor='role'>Permission Level</Label>

											<Select
												value={roomCodeSettings.role}
												onValueChange={(v) => setValue('role', v as ShareRole)}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value='viewer'>
														Viewer - Can view only
													</SelectItem>

													<SelectItem value='commenter'>
														Commenter - Can view and comment
													</SelectItem>

													<SelectItem value='editor'>
														Editor - Can edit content
													</SelectItem>
												</SelectContent>
											</Select>
										</div>

										<div className='space-y-2'>
											<Label htmlFor='message'>
												Personal Message (optional)
											</Label>

											<Textarea
												id='message'
												placeholder="Hey! I'd love your input on this mind map..."
												rows={3}
												{...register('message')}
											/>
										</div>

										<Button
											type='submit'
											disabled={isSendingInvite}
											className='w-full'
										>
											{isSendingInvite ? (
												<>
													<Loader2 className='mr-2 h-4 w-4 animate-spin' />
													Sending...
												</>
											) : (
												<>
													<Send className='mr-2 h-4 w-4' />
													Send Invitation
												</>
											)}
										</Button>
									</form>
								</TabsContent>

								{/* Manage Access Tab */}
								<TabsContent value='manage' className='flex-1'>
									<ScrollArea className='h-full'>
										<div className='space-y-4 p-4'>
											{currentShares.length === 0 ? (
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
															key={share.id}
															className='flex items-center justify-between rounded-lg border p-3'
														>
															<div className='flex items-center gap-3'>
																<Avatar className='h-8 w-8'>
																	<AvatarImage src={share.avatar_url} />

																	<AvatarFallback>
																		{share.name.charAt(0).toUpperCase()}
																	</AvatarFallback>
																</Avatar>

																<div>
																	<p className='text-sm font-medium'>
																		{share.name}
																	</p>

																	<p className='text-xs text-muted-foreground'>
																		{share.email}
																	</p>
																</div>
															</div>

															<div className='flex items-center gap-2'>
																<Select
																	value={share.share.role}
																	onValueChange={(v) =>
																		handleUpdateShareRole(
																			share.share.id,
																			v as ShareRole
																		)
																	}
																	disabled={share.share.role === 'owner'}
																>
																	<SelectTrigger className='h-8 w-[110px]'>
																		<SelectValue />
																	</SelectTrigger>

																	<SelectContent>
																		<SelectItem value='viewer'>
																			Viewer
																		</SelectItem>

																		<SelectItem value='commenter'>
																			Commenter
																		</SelectItem>

																		<SelectItem value='editor'>
																			Editor
																		</SelectItem>

																		{share.share.role === 'owner' && (
																			<SelectItem value='owner' disabled>
																				Owner
																			</SelectItem>
																		)}
																	</SelectContent>
																</Select>

																{share.share.role !== 'owner' && (
																	<Button
																		variant='ghost'
																		size='icon'
																		onClick={() =>
																			handleDeleteShare(share.share.id)
																		}
																		className='h-8 w-8'
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
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
