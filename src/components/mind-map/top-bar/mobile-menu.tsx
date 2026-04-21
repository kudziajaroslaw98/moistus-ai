'use client';

import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import {
	type AccountMenuUser,
	useAccountMenuActions,
} from '@/components/common/use-account-menu-actions';
import {
	formatRelativeNotificationTime,
	type UseNotificationsResult,
} from '@/components/notifications/use-notifications';
import { RealtimeAvatarStack } from '@/components/realtime/realtime-avatar-stack';
import { Button } from '@/components/ui/button';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
} from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/user-avatar';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import { runWithViewTransition } from '@/lib/view-transitions';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

interface MobileMenuProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canEdit: boolean;
	isMapReady: boolean;
	isMapOwner: boolean;
	activityState?: ActivityState;
	mapId: string;
	mapTitle?: string;
	mapOwnerId?: string;
	user: AccountMenuUser;
	isSettingsActive: boolean;
	onToggleHistory: () => void;
	onToggleSettings: () => void;
	onToggleSharePanel: () => void;
	onOpenSettings: (tab: 'account' | 'billing') => void;
	notifications: UseNotificationsResult;
}

export function MobileMenu({
	open,
	onOpenChange,
	canEdit,
	isMapReady,
	isMapOwner,
	activityState,
	mapId,
	mapTitle,
	mapOwnerId,
	user,
	isSettingsActive,
	onToggleHistory,
	onToggleSettings,
	onToggleSharePanel,
	onOpenSettings,
	notifications,
}: MobileMenuProps) {
	const router = useRouter();
	const {
		name,
		subtitle,
		isAnonymous,
		isPro,
		hasResolvedSubscription,
		isLoggingOut,
		showUpgradeAnonymous,
		handleRestartOnboarding,
		handleUpgradeToPro,
		handleLogout,
		openUpgradeAnonymousPrompt,
		closeUpgradeAnonymousPrompt,
		handleAnonymousUpgradeSuccess,
	} = useAccountMenuActions(user);
	const { currentShares, currentUserId, getCurrentShareUsers } = useAppStore(
		useShallow((state) => ({
			currentShares: state.currentShares ?? [],
			currentUserId: state.currentUser?.id,
			getCurrentShareUsers: state.getCurrentShareUsers,
		}))
	);
	const {
		visibleNotifications,
		visibleUnreadCount,
		error,
		refreshNotifications,
		markAllAsRead,
		markNotificationAsRead,
	} = notifications;

	useEffect(() => {
		if (!open) {
			return;
		}

		void refreshNotifications();

		if (currentShares.length > 0) {
			return;
		}

		void getCurrentShareUsers().catch((error) => {
			console.error('[MobileMenu] Failed to refresh collaborators:', error);
		});
	}, [currentShares.length, getCurrentShareUsers, open, refreshNotifications]);

	const collaboratorAvatars = useMemo(() => {
		const seenUserIds = new Set<string>();

		return currentShares
			.filter((share) => {
				if (!share.user_id || share.user_id === currentUserId) {
					return false;
				}

				if (seenUserIds.has(share.user_id)) {
					return false;
				}

				seenUserIds.add(share.user_id);
				return true;
			})
			.map((share) => ({
				image: share.avatar_url,
				name: share.name || share.profile?.display_name || 'Collaborator',
			}));
	}, [currentShares, currentUserId]);

	const activityPreview = useMemo(
		() => visibleNotifications.slice(0, 2),
		[visibleNotifications]
	);

	const collaboratorSummary =
		collaboratorAvatars.length > 0
			? `${collaboratorAvatars.length} collaborator${
					collaboratorAvatars.length === 1 ? '' : 's'
				} on this map`
			: 'Just you for now';

	const unreadSummary =
		visibleUnreadCount > 0 ? `${visibleUnreadCount} unread` : 'All caught up';
	const drawerTitle = useMemo(() => {
		const rawTitle = mapTitle?.trim() || 'Menu';

		if (rawTitle.length <= 24) {
			return rawTitle;
		}

		return `${rawTitle.slice(0, 21).trimEnd()}...`;
	}, [mapTitle]);

	const closeMenu = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	const runMenuAction = useCallback(
		(action: () => void) => {
			action();
			closeMenu();
		},
		[closeMenu]
	);

	const handleNotificationClick = useCallback(
		async (notificationId: string, notificationMapId: string | null) => {
			await markNotificationAsRead(notificationId);
			closeMenu();

			if (notificationMapId && notificationMapId !== mapId) {
				runWithViewTransition(() => {
					router.push(`/mind-map/${notificationMapId}`);
				});
			}
		},
		[closeMenu, mapId, markNotificationAsRead, router]
	);

	const handleMarkAllAsRead = useCallback(() => {
		void markAllAsRead();
	}, [markAllAsRead]);

	const handleOpenAccount = useCallback(() => {
		runMenuAction(() => onOpenSettings('account'));
	}, [onOpenSettings, runMenuAction]);

	const handleOpenBilling = useCallback(() => {
		runMenuAction(() => onOpenSettings('billing'));
	}, [onOpenSettings, runMenuAction]);

	const handleShareMap = useCallback(() => {
		runMenuAction(onToggleSharePanel);
	}, [onToggleSharePanel, runMenuAction]);

	const handleViewHistory = useCallback(() => {
		runMenuAction(onToggleHistory);
	}, [onToggleHistory, runMenuAction]);

	const handleOpenMapSettings = useCallback(() => {
		runMenuAction(onToggleSettings);
	}, [onToggleSettings, runMenuAction]);

	const handleRestartWalkthrough = useCallback(() => {
		runMenuAction(handleRestartOnboarding);
	}, [handleRestartOnboarding, runMenuAction]);

	const handleUpgradeAccount = useCallback(() => {
		closeMenu();
		openUpgradeAnonymousPrompt();
	}, [closeMenu, openUpgradeAnonymousPrompt]);

	const handleUpgradePro = useCallback(() => {
		runMenuAction(handleUpgradeToPro);
	}, [handleUpgradeToPro, runMenuAction]);

	const handleSignOut = useCallback(() => {
		closeMenu();
		void handleLogout();
	}, [closeMenu, handleLogout]);

	return (
		<>
			<Sheet onOpenChange={onOpenChange} open={open}>
				<SheetContent
					className='w-full max-w-[min(92vw,24rem)] gap-0 border-l border-white/10 p-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_32%),linear-gradient(180deg,rgba(14,14,18,0.98),rgba(8,8,10,0.99))] [&>button:last-child]:hidden'
					side='right'
				>
					<div className='flex h-full flex-col'>
						<div className='sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-white/8 bg-base/90 px-4 py-2 backdrop-blur-xl'>
							<SheetTitle
								className='min-w-0 truncate text-[1.5rem] font-semibold tracking-[-0.04em] text-text-primary'
								title={mapTitle || 'Menu'}
							>
								{drawerTitle}
							</SheetTitle>

							<SheetClose className='inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-transparent text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'>
								<X className='size-5' />
								<span className='sr-only'>Close menu</span>
							</SheetClose>
						</div>

						<div className='flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]'>
							<section className='pt-4'>
								<div className='grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5'>
									<UserAvatar
										className='row-span-2 size-12'
										size='md'
										user={user}
									/>
									<p className='truncate text-[0.95rem] font-semibold text-text-primary'>
										{name}
									</p>

									<div className='shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-text-secondary'>
										{unreadSummary}
									</div>

									<p className='truncate text-[13px] text-text-secondary'>
										{subtitle}
									</p>
								</div>

								{isAnonymous && (
									<p
										className={cn(
											'mt-2 text-[11px] leading-4 text-primary-300'
										)}
									>
										Upgrade to keep this workspace.
									</p>
								)}
							</section>

							<div>
								<section className='mt-5 border-t border-white/8 pt-4'>
									<SectionHeading title='Collaboration' />

									<div className='mt-1.5 space-y-2.5'>
										{isMapReady && isMapOwner && (
											<MenuRow
												description='Invite people into this map.'
												label='Share map'
												onClick={handleShareMap}
											/>
										)}

										<div className='flex items-center gap-3'>
											<RealtimeAvatarStack
												activityState={activityState}
												fallbackAvatars={collaboratorAvatars}
												mapOwnerId={mapOwnerId}
												roomName={getMindMapRoomName(mapId, 'presence')}
											/>
											<p className='min-w-0 text-[12px] leading-4 text-text-secondary'>
												{collaboratorAvatars.length > 0
													? collaboratorSummary
													: 'Only you are here right now.'}
											</p>
										</div>
									</div>
								</section>

								<section className='mt-5 border-t border-white/8 pt-4'>
									<SectionHeading
										meta={unreadSummary}
										title='Recent activity'
									/>

									{error ? (
										<p className='mt-2 text-[12px] leading-4 text-red-400'>
											{error}
										</p>
									) : activityPreview.length === 0 ? (
										<p className='mt-2 text-[12px] leading-4 text-text-secondary'>
											No activity on this map yet.
										</p>
									) : (
										<ul className='mt-2 divide-y divide-white/8 border-y border-white/8'>
											{activityPreview.map((notification) => (
												<li key={notification.id}>
													<div className='flex items-start gap-2.5 py-2.5'>
														<span
															className={cn(
																'mt-1 size-2 rounded-full',
																notification.is_read
																	? 'bg-white/10'
																	: 'bg-primary-400 shadow-[0_0_14px_rgba(59,130,246,0.65)]'
															)}
														/>

														<button
															type='button'
															className='flex min-w-0 flex-1 items-start justify-between gap-3 rounded-2xl pr-1 text-left transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
															onClick={() =>
																void handleNotificationClick(
																	notification.id,
																	notification.map_id
																)
															}
														>
															<div className='min-w-0'>
																<p className='truncate text-[13px] font-medium text-text-primary'>
																	{notification.title}
																</p>
																<p className='mt-0.5 line-clamp-2 text-[12px] leading-4 text-text-secondary'>
																	{notification.body}
																</p>
															</div>

															<div className='shrink-0 pt-0.5 text-right'>
																<p className='text-[10px] uppercase tracking-[0.16em] text-text-disabled'>
																	{formatRelativeNotificationTime(
																		notification.created_at
																	)}
																</p>
																{notification.map_id && (
																	<p className='mt-1.5 text-[10px] uppercase tracking-[0.14em] text-text-secondary'>
																		Open
																	</p>
																)}
															</div>
														</button>
													</div>
												</li>
											))}
										</ul>
									)}

									{visibleUnreadCount > 0 && (
										<Button
											className='mt-2 h-8 px-0 text-[12px] text-text-secondary hover:text-text-primary'
											onClick={handleMarkAllAsRead}
											variant='ghost'
										>
											Mark all as read
										</Button>
									)}
								</section>

								<section className='mt-5 border-t border-white/8 pt-4'>
									<SectionHeading title='Workspace' />

									<div className='mt-1.5 space-y-0.5'>
										{isMapReady && canEdit && (
											<MenuRow
												description='Browse the map timeline.'
												label='View history'
												onClick={handleViewHistory}
											/>
										)}

										{isMapReady && isMapOwner && (
											<MenuRow
												description={
													isSettingsActive
														? 'Settings are already open.'
														: 'Access map permissions and metadata.'
												}
												label='Map settings'
												onClick={handleOpenMapSettings}
											/>
										)}

										{!isAnonymous && (
											<MenuRow
												description='Replay the editor walkthrough.'
												label='Restart walkthrough'
												onClick={handleRestartWalkthrough}
											/>
										)}
									</div>
								</section>

								<section className='mt-5 border-t border-white/8 pt-4'>
									<SectionHeading title='Account' />

									<div className='mt-1.5 space-y-0.5'>
										<MenuRow
											description='Profile details and preferences.'
											label='Account'
											onClick={handleOpenAccount}
										/>

										{!isAnonymous && (
											<MenuRow
												description='Plans, invoices, and billing.'
												label='Billing'
												onClick={handleOpenBilling}
											/>
										)}

										{isAnonymous ? (
											<MenuRow
												description='Save this temporary account.'
												label='Upgrade Account'
												onClick={handleUpgradeAccount}
												tone='accent'
											/>
										) : hasResolvedSubscription && !isPro ? (
											<MenuRow
												description='Unlock higher limits and deeper tools.'
												label='Upgrade to Pro'
												onClick={handleUpgradePro}
												tone='accent'
											/>
										) : null}

										<MenuRow
											description='Leave this session.'
											label={isLoggingOut ? 'Signing out...' : 'Sign out'}
											onClick={handleSignOut}
											tone='danger'
										/>
									</div>
								</section>
							</div>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{showUpgradeAnonymous && (
				<UpgradeAnonymousPrompt
					autoShowDelay={0}
					isAnonymous={true}
					onDismiss={closeUpgradeAnonymousPrompt}
					onUpgradeSuccess={handleAnonymousUpgradeSuccess}
					userDisplayName={user?.display_name || user?.full_name}
				/>
			)}
		</>
	);
}

function SectionHeading({ title, meta }: { title: string; meta?: string }) {
	return (
		<div className='flex items-center justify-between gap-3'>
			<p className='text-[10px] font-medium uppercase tracking-[0.22em] text-text-disabled'>
				{title}
			</p>
			{meta ? (
				<span className='text-[10px] uppercase tracking-[0.18em] text-text-disabled'>
					{meta}
				</span>
			) : null}
		</div>
	);
}

function MenuRow({
	label,
	description,
	onClick,
	tone = 'default',
}: {
	label: string;
	description: string;
	onClick: () => void;
	tone?: 'default' | 'accent' | 'danger';
}) {
	return (
		<button
			type='button'
			className={cn(
				'flex w-full items-center justify-between gap-3 rounded-[18px] py-2.5 pr-1 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
				tone === 'accent' && 'text-primary-300 hover:text-primary-200',
				tone === 'danger' && 'text-red-300 hover:text-red-200'
			)}
			onClick={onClick}
		>
			<div className='min-w-0'>
				<p className='text-[15px] font-medium leading-5'>{label}</p>
				<p className='mt-0.5 text-[12px] leading-4 text-text-secondary'>
					{description}
				</p>
			</div>
			<ChevronRight className='size-4 shrink-0 text-text-disabled' />
		</button>
	);
}
