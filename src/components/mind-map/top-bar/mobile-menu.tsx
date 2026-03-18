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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/user-avatar';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

interface MobileMenuProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canEdit: boolean;
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
		() => visibleNotifications.slice(0, 3),
		[visibleNotifications]
	);

	const collaboratorSummary =
		collaboratorAvatars.length > 0
			? `${collaboratorAvatars.length} collaborator${
					collaboratorAvatars.length === 1 ? '' : 's'
			  } on this map`
			: 'Just you for now';

	const unreadSummary =
		visibleUnreadCount > 0
			? `${visibleUnreadCount} unread`
			: 'All caught up';

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
				router.push(`/mind-map/${notificationMapId}`);
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
					className='w-full max-w-[min(92vw,24rem)] gap-0 p-0 border-l border-white/10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_32%),linear-gradient(180deg,rgba(14,14,18,0.98),rgba(8,8,10,0.99))]'
					side='right'
				>
					<div className='flex h-full flex-col'>
						<div className='sticky top-0 z-10 border-b border-white/8 bg-base/90 px-6 pt-6 pb-5 backdrop-blur-xl'>
							<SheetTitle className='pr-12 text-[1.9rem] font-semibold tracking-[-0.04em] text-text-primary'>
								{mapTitle || 'Menu'}
							</SheetTitle>
							<p className='mt-1 text-sm text-text-secondary'>
								Everything that supports the canvas lives here.
							</p>
						</div>

						<div className='flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]'>
							<section className='pt-6'>
								<div className='flex items-start justify-between gap-4'>
									<div className='flex min-w-0 items-center gap-4'>
										<UserAvatar className='size-14' size='lg' user={user} />
										<div className='min-w-0'>
											<p className='truncate text-base font-semibold text-text-primary'>
												{name}
											</p>
											<p className='truncate text-sm text-text-secondary'>
												{subtitle}
											</p>
											{isAnonymous && (
												<p className='mt-1 text-xs text-primary-300'>
													Upgrade to keep this workspace.
												</p>
											)}
										</div>
									</div>

									<div className='shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-secondary'>
										{unreadSummary}
									</div>
								</div>
							</section>

							{isMapOwner && (
								<section className='mt-6 border-t border-white/8 pt-6'>
									<MenuRow
										description='Invite collaborators when the map is ready for feedback.'
										label='Share map'
										onClick={handleShareMap}
									/>
								</section>
							)}

							<section className='mt-6 border-t border-white/8 pt-6'>
								<SectionHeading
									meta={unreadSummary}
									title='Recent activity'
								/>

								{error ? (
									<p className='mt-4 text-sm text-red-400'>
										{error}
									</p>
								) : activityPreview.length === 0 ? (
									<p className='mt-4 text-sm text-text-secondary'>
										No notifications on this map yet.
									</p>
								) : (
									<ul className='mt-4 divide-y divide-white/8 border-y border-white/8'>
										{activityPreview.map((notification) => (
											<li key={notification.id}>
												<div className='flex items-start gap-3 py-3'>
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
														className='flex min-w-0 flex-1 items-start justify-between gap-3 rounded-2xl px-1 text-left transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
														onClick={() =>
															void handleNotificationClick(
																notification.id,
																notification.map_id
															)
														}
													>
														<div className='min-w-0'>
															<p className='truncate text-sm font-medium text-text-primary'>
																{notification.title}
															</p>
															<p className='mt-1 line-clamp-2 text-sm text-text-secondary'>
																{notification.body}
															</p>
														</div>

														<div className='shrink-0 pt-0.5 text-right'>
															<p className='text-[11px] uppercase tracking-[0.16em] text-text-disabled'>
																{formatRelativeNotificationTime(
																	notification.created_at
																)}
															</p>
															{notification.map_id && (
																<p className='mt-2 text-xs text-text-secondary'>
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
										className='mt-4 h-9 px-0 text-sm text-text-secondary hover:text-text-primary'
										onClick={handleMarkAllAsRead}
										variant='ghost'
									>
										Mark all as read
									</Button>
								)}
							</section>

							<section className='mt-6 border-t border-white/8 pt-6'>
								<SectionHeading meta={collaboratorSummary} title='Collaborators' />

								<div className='mt-4 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4'>
									<RealtimeAvatarStack
										activityState={activityState}
										fallbackAvatars={collaboratorAvatars}
										mapOwnerId={mapOwnerId}
										roomName={getMindMapRoomName(mapId, 'presence')}
									/>

									<p className='mt-3 text-sm text-text-secondary'>
										{collaboratorAvatars.length > 0
											? 'See who is in the map before you open sharing or presentation tools.'
											: 'Share the map to bring other people into the session.'}
									</p>
								</div>
							</section>

							<section className='mt-6 border-t border-white/8 pt-6'>
								<SectionHeading title='Workspace' />

								<div className='mt-2 space-y-1'>
									{canEdit && (
										<MenuRow
											description='Open the map timeline and jump through saved states.'
											label='View history'
											onClick={handleViewHistory}
										/>
									)}

									{isMapOwner && (
										<MenuRow
											description={
												isSettingsActive
													? 'Settings are already open.'
													: 'Adjust map access, metadata, and owner controls.'
											}
											label='Map settings'
											onClick={handleOpenMapSettings}
										/>
									)}

									{!isAnonymous && (
										<MenuRow
											description='Replay the getting-started walkthrough inside the editor.'
											label='Restart walkthrough'
											onClick={handleRestartWalkthrough}
										/>
									)}
								</div>
							</section>

							<section className='mt-6 border-t border-white/8 pt-6'>
								<SectionHeading title='Account' />

								<div className='mt-2 space-y-1'>
									<MenuRow
										description='Profile details and preferences.'
										label='Account'
										onClick={handleOpenAccount}
									/>

									{!isAnonymous && (
										<MenuRow
											description='Billing, invoices, and plan settings.'
											label='Billing'
											onClick={handleOpenBilling}
										/>
									)}

									{isAnonymous ? (
										<MenuRow
											description='Convert this temporary account into a saved profile.'
											label='Upgrade Account'
											onClick={handleUpgradeAccount}
											tone='accent'
										/>
									) : !isPro ? (
										<MenuRow
											description='Unlock higher limits and deeper collaboration features.'
											label='Upgrade to Pro'
											onClick={handleUpgradePro}
											tone='accent'
										/>
									) : null}

									<MenuRow
										description='Leave this session and clear the local editor state.'
										label={isLoggingOut ? 'Signing out...' : 'Sign out'}
										onClick={handleSignOut}
										tone='danger'
									/>
								</div>
							</section>
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

function SectionHeading({
	title,
	meta,
}: {
	title: string;
	meta?: string;
}) {
	return (
		<div className='flex items-center justify-between gap-3'>
			<p className='text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary'>
				{title}
			</p>
			{meta ? (
				<span className='text-[11px] uppercase tracking-[0.16em] text-text-disabled'>
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
				'flex w-full items-center justify-between gap-4 rounded-[20px] px-3 py-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
				tone === 'accent' && 'text-primary-300 hover:text-primary-200',
				tone === 'danger' && 'text-red-300 hover:text-red-200'
			)}
			onClick={onClick}
		>
			<div className='min-w-0'>
				<p className='text-sm font-medium'>{label}</p>
				<p className='mt-1 text-sm text-text-secondary'>{description}</p>
			</div>
			<ChevronRight className='size-4 shrink-0 text-text-disabled' />
		</button>
	);
}
