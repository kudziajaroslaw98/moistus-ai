'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Panel,
	PanelField,
	PanelRow,
	PanelSection,
	PanelTab,
	PanelTabsList,
	panelButtonClass,
	panelInputClass,
	panelSelectClass,
} from '@/components/ui/panel';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { SharePanelProps, ShareRole } from '@/types/sharing-types';
import { cn } from '@/utils/cn';
import {
	AlertCircle,
	Link2,
	Loader2,
	QrCode,
	Trash2,
	Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useShallow } from 'zustand/shallow';
import { RoomCodeDisplay } from './room-code-display';

const createShareSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	role: z.enum(['editor', 'commentator', 'viewer', 'owner']),
	message: z.string().optional(),
});

type CreateShareFormData = z.infer<typeof createShareSchema>;


export function SharePanel({
	onClose,
	onShareUpdated,
	onShareDeleted,
}: SharePanelProps) {
	const [activeTab, setActiveTab] = useState<
		'room-code' | 'direct-share' | 'manage'
	>('room-code');
	const [isGeneratingCode, setIsGeneratingCode] = useState(false);

	const {
		shareTokens,
		createRoomCode,
		refreshRoomCode,
		revokeRoomCode,
		refreshTokens,
		subscribeToSharingUpdates,
		unsubscribeFromSharing,
		subscribeToCollaboratorUpdates,
		unsubscribeFromCollaboratorUpdates,
		setPopoverOpen,
		popoverOpen,
		mindMap,
		getCurrentShareUsers,
		currentShares,
		deleteShare,
		updateShareRole,
	} = useAppStore(
		useShallow((state) => ({
			shareTokens: state.shareTokens,
			createRoomCode: state.createRoomCode,
			refreshRoomCode: state.refreshRoomCode,
			revokeRoomCode: state.revokeRoomCode,
			refreshTokens: state.refreshTokens,
			subscribeToSharingUpdates: state.subscribeToSharingUpdates,
			unsubscribeFromSharing: state.unsubscribeFromSharing,
			subscribeToCollaboratorUpdates: state.subscribeToCollaboratorUpdates,
			unsubscribeFromCollaboratorUpdates:
				state.unsubscribeFromCollaboratorUpdates,
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			mindMap: state.mindMap,
			getCurrentShareUsers: state.getCurrentShareUsers,
			currentShares: state.currentShares,
			deleteShare: state.deleteShare,
			updateShareRole: state.updateShareRole,
		}))
	);

	const isOpen = popoverOpen.sharePanel;
	const mapId = mindMap?.id;

	// Check collaborator limits
	const { isAtLimit, usage, limits } = useSubscriptionLimits();
	const collaboratorCount = currentShares?.length || 0;
	const isAtCollaboratorLimit =
		limits.collaboratorsPerMap !== -1 &&
		collaboratorCount >= limits.collaboratorsPerMap;
	const collaboratorLimitInfo =
		limits.collaboratorsPerMap !== -1
			? { current: collaboratorCount, max: limits.collaboratorsPerMap }
			: undefined;

	// Calculate max users limit for room code based on subscription tier
	const maxUsersLimit =
		limits.collaboratorsPerMap === -1 ? 100 : limits.collaboratorsPerMap;
	const isFreeWithLimit = limits.collaboratorsPerMap !== -1;

	// Room code generation settings (default maxUsers to 3 - safe for both free and pro tiers)
	const [roomCodeSettings, setRoomCodeSettings] = useState({
		role: 'viewer' as ShareRole,
		maxUsers: 3,
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
			void subscribeToCollaboratorUpdates(mapId);
			getCurrentShareUsers();
		}

		return () => {
			// Always cleanup on unmount to prevent memory leaks
			unsubscribeFromSharing();
			unsubscribeFromCollaboratorUpdates();
		};
	}, [
		isOpen,
		mapId,
		subscribeToSharingUpdates,
		unsubscribeFromSharing,
		subscribeToCollaboratorUpdates,
		unsubscribeFromCollaboratorUpdates,
		getCurrentShareUsers,
	]);

	// Get active room codes for this map (computed before early return for hook usage)
	const mapRoomCodes = shareTokens.filter(
		(token) =>
			token.map_id === mapId &&
			token.token_type === 'room_code' &&
			token.is_active
	);
	const hasRoomCodes = mapRoomCodes.length > 0;

	if (!mapId) return null;

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

	const handleUpdateShareRole = async (shareId: string, newRole: ShareRole) => {
		try {
			await updateShareRole(shareId, newRole);
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
		<Tabs
			className='contents'
			onValueChange={(v) => setActiveTab(v as typeof activeTab)}
			value={activeTab}
		>
			<Panel
				data-testid='share-panel'
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
				open={isOpen}
				subtitle={mindMap?.title || 'Untitled map'}
				title='Share'
				tabs={
					<PanelTabsList>
						<PanelTab value='room-code'>Room code</PanelTab>

						<PanelTab value='manage'>
							Manage
							{collaboratorCount > 0 && (
								<span className='text-xs tabular-nums text-text-tertiary'>
									{collaboratorCount}
								</span>
							)}
						</PanelTab>
					</PanelTabsList>
				}
			>
				<TabsContent className='pt-4' value='room-code'>
					<PanelSection
						description='Anyone with the code can join with the permission you pick.'
						label='New room code'
					>
						<PanelField htmlFor='room-code-role' label='Default permission'>
							<Select
								data-testid='role-selector'
								value={roomCodeSettings.role}
								onValueChange={(v) =>
									setRoomCodeSettings((prev) => ({
										...prev,
										role: v as ShareRole,
									}))
								}
							>
								<SelectTrigger
									className={panelSelectClass}
									data-testid='role-selector-trigger'
									id='room-code-role'
								>
									<SelectValue />
								</SelectTrigger>

								<SelectContent>
									<SelectItem value='viewer'>Viewer - Can view only</SelectItem>

									<SelectItem value='commentator'>
										Commentator - Can view and comment
									</SelectItem>

									<SelectItem value='editor'>Editor - Can edit content</SelectItem>
								</SelectContent>
							</Select>
						</PanelField>

						<div className='mt-3.5 grid grid-cols-2 gap-3'>
							<PanelField
								className='mt-0'
								htmlFor='room-code-max-users'
								label='Max users'
							>
								<Input
									className={panelInputClass}
									data-testid='max-users-input'
									id='room-code-max-users'
									max={maxUsersLimit}
									min={1}
									type='number'
									value={roomCodeSettings.maxUsers}
									onChange={(e) =>
										setRoomCodeSettings((prev) => ({
											...prev,
											maxUsers: Math.min(
												maxUsersLimit,
												Math.max(1, parseInt(e.target.value) || 3)
											),
										}))
									}
								/>
							</PanelField>

							<PanelField className='mt-0' htmlFor='room-code-expires' label='Expires after'>
								<Select
									value={roomCodeSettings.expiresInHours.toString()}
									onValueChange={(v) =>
										setRoomCodeSettings((prev) => ({
											...prev,
											expiresInHours: parseInt(v),
										}))
									}
								>
									<SelectTrigger
										className={panelSelectClass}
										id='room-code-expires'
									>
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
							</PanelField>
						</div>

						{/* Free tier limit indicator - only show if NOT at limit */}
						{isFreeWithLimit && !isAtCollaboratorLimit && (
							<button
								className='group mt-4 flex w-full items-center gap-3 rounded-xl border border-warning-500/20 bg-warning-500/10 p-3 text-left text-warning-300 transition-colors duration-200 ease hover:bg-warning-500/15'
								onClick={() => setPopoverOpen({ upgradeUser: true })}
								type='button'
							>
								<Users aria-hidden className='size-4 shrink-0' />

								<span className='min-w-0 flex-1'>
									<span className='block text-xs font-medium'>
										Max {maxUsersLimit} users on Free plan
									</span>

									<span className='block text-xs opacity-80 group-hover:underline'>
										Upgrade to Pro for unlimited →
									</span>
								</span>
							</button>
						)}

						{/* Collaborator limit warning */}
						{isAtCollaboratorLimit && collaboratorLimitInfo && (
							<div className='mt-4 flex items-center gap-3 rounded-xl border border-warning-500/20 bg-warning-500/10 p-3 text-warning-300'>
								<AlertCircle aria-hidden className='size-4 shrink-0' />

								<span className='text-xs'>
									Collaborator limit reached ({collaboratorLimitInfo.current}/
									{collaboratorLimitInfo.max}). Upgrade to Pro for more.
								</span>
							</div>
						)}

						<Button
							className={cn(panelButtonClass, 'mt-4 h-10 w-full gap-2')}
							data-testid='generate-room-code-btn'
							disabled={isGeneratingCode || isAtCollaboratorLimit}
							onClick={handleGenerateRoomCode}
						>
							{isGeneratingCode ? (
								<>
									<Loader2 className='size-4 animate-spin' />
									Generating...
								</>
							) : (
								<>
									<Link2 className='size-4' />
									Generate room code
								</>
							)}
						</Button>
					</PanelSection>

					<PanelSection
						label='Active codes'
						meta={hasRoomCodes ? mapRoomCodes.length : undefined}
						metaAlign='icon'
					>
						{hasRoomCodes ? (
							mapRoomCodes.map((token, index) => (
								<RoomCodeDisplay
									defaultExpanded={index === 0}
									key={token.id}
									onRefresh={handleRefreshCode}
									onRevoke={handleRevokeCode}
									showQRCode
									token={token}
								/>
							))
						) : (
							<div className='flex flex-col items-center gap-1.5 py-8 text-center'>
								<QrCode aria-hidden className='size-8 text-text-disabled' />

								<h4 className='mt-2 text-sm font-medium text-text-primary'>
									No active room codes
								</h4>

								<p className='max-w-64 text-xs text-text-tertiary'>
									Generate a room code to let others join without an account.
								</p>
							</div>
						)}
					</PanelSection>
				</TabsContent>

				<TabsContent className='pt-4' value='manage'>
					<PanelSection
						label='People with access'
						meta={collaboratorCount > 0 ? collaboratorCount : undefined}
						metaAlign='icon'
					>
						{!currentShares || currentShares.length === 0 ? (
							<div className='flex flex-col items-center gap-1.5 py-8 text-center'>
								<Users aria-hidden className='size-8 text-text-disabled' />

								<h4 className='mt-2 text-sm font-medium text-text-primary'>
									No one else has access
								</h4>

								<p className='max-w-64 text-xs text-text-tertiary'>
									Share this mind map to start collaborating.
								</p>
							</div>
						) : (
							currentShares.map((share) => (
								<PanelRow
									description={share.email}
									key={share.id}
									title={share.name}
									leading={
										<Avatar className='size-8 shrink-0'>
											<AvatarImage src={share.avatar_url} />

											<AvatarFallback>
												{share.name?.charAt(0)?.toUpperCase() ?? '?'}
											</AvatarFallback>
										</Avatar>
									}
									trailing={
										<>
											<Select
												disabled={share.share.role === 'owner'}
												value={share.share.role}
												onValueChange={(v) =>
													handleUpdateShareRole(share.share.id, v as ShareRole)
												}
											>
												<SelectTrigger className={cn(panelSelectClass, 'w-[116px]')} size='sm'>
													<SelectValue />
												</SelectTrigger>

												<SelectContent>
													<SelectItem value='viewer'>Viewer</SelectItem>
													<SelectItem value='commentator'>Commentator</SelectItem>
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
													aria-label='Remove user access'
													className='-mr-2 size-8 text-text-secondary hover:bg-error-500/10 hover:text-error-300'
													onClick={() => handleDeleteShare(share.share.id)}
													size='icon'
													variant='ghost'
												>
													<Trash2 className='size-4' />
												</Button>
											)}
										</>
									}
								/>
							))
						)}
					</PanelSection>
				</TabsContent>
			</Panel>
		</Tabs>
	);
}
