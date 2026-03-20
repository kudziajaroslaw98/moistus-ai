'use client';

import { RealtimeAvatarStack } from '@/components/realtime/realtime-avatar-stack';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/common/user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import type { PublicUserProfile } from '@/types/user-profile-types';
import { Panel } from '@xyflow/react';
import { Menu, Settings, Share2 } from 'lucide-react';

import { TopBarActions } from './top-bar-actions';
import { TopBarBreadcrumb } from './top-bar-breadcrumb';

// Re-export MobileMenu for use in parent component
export { MobileMenu } from './mobile-menu';

interface MindMapTopBarProps {
	mapId: string;
	mindMap: { title?: string; user_id?: string } | null;
	currentUser: { id: string } | null;
	userProfile: (PublicUserProfile & { email?: string; is_anonymous?: boolean }) | null;
	activityState?: ActivityState;
	popoverOpen: { mapSettings: boolean; sharePanel: boolean };
	canEdit: boolean;
	mobileUnreadCount: number;
	handleToggleHistorySidebar: () => void;
	handleToggleMapSettings: () => void;
	handleToggleSharePanel: () => void;
	handleOpenSettings: (tab: 'account' | 'billing') => void;
	// Mobile menu state lifted to parent
	mobileMenuOpen: boolean;
	setMobileMenuOpen: (open: boolean) => void;
}

export function MindMapTopBar({
	mapId,
	mindMap,
	currentUser,
	userProfile,
	activityState,
	popoverOpen,
	canEdit,
	mobileUnreadCount,
	handleToggleHistorySidebar,
	handleToggleMapSettings,
	handleToggleSharePanel,
	handleOpenSettings,
	mobileMenuOpen,
	setMobileMenuOpen,
}: MindMapTopBarProps) {
	const isMobile = useIsMobile();

	const isMapOwner = mindMap?.user_id === currentUser?.id;

	return (
		<Panel
			className='!m-0 p-2 px-4 md:px-8 right-0 flex justify-between bg-base/80 backdrop-blur-xs'
			position='top-left'
		>
			{/* LEFT SECTION */}
			<div className='flex items-center gap-4 md:gap-8'>
				<TopBarBreadcrumb title={mindMap?.title} isMobile={isMobile} />

				{/* Desktop only: History */}
				{!isMobile && canEdit && (
					<TopBarActions onToggleHistory={handleToggleHistorySidebar} />
				)}
			</div>

			{/* RIGHT SECTION */}
			<div className='flex items-center gap-4 md:gap-8'>
				{/* Desktop only: Avatar Stack */}
				{!isMobile && (
					<RealtimeAvatarStack
						activityState={activityState}
						mapOwnerId={mindMap?.user_id}
						roomName={getMindMapRoomName(mapId, 'presence')}
					/>
				)}

				{/* Owner controls */}
				{isMapOwner && !isMobile && (
					<div className='flex gap-2'>
						{/* Desktop only: Settings button */}
						<Button
							aria-label='Map Settings'
							onClick={handleToggleMapSettings}
							size='icon'
							title='Map Settings'
							variant={popoverOpen.mapSettings ? 'default' : 'secondary'}
						>
							<Settings className='h-4 w-4' />
						</Button>

						<Button
							aria-label='Share Mind Map'
							className='gap-2'
							data-onboarding-target='share'
							data-testid='share-button'
							onClick={handleToggleSharePanel}
							title='Share Mind Map'
							variant={popoverOpen.sharePanel ? 'default' : 'secondary'}
							size='default'
						>
							<>
								Share <Share2 className='size-3' />
							</>
						</Button>
					</div>
				)}

				{/* Desktop account controls */}
				{!isMobile && (
					<>
						<NotificationBell filterMapId={mapId} />

						<UserMenu
							showRestartWalkthrough
							showBackToDashboard
							user={userProfile}
							onOpenSettings={handleOpenSettings}
						/>
					</>
				)}

				{/* Mobile only: Hamburger menu */}
				{isMobile && (
					<Button
						aria-label='Open menu'
						className='relative text-text-secondary hover:text-text-primary'
						data-onboarding-target='mobile-menu'
						onClick={() => setMobileMenuOpen(true)}
						size='icon'
						variant='ghost'
					>
						<Menu className='size-5' />
						{mobileUnreadCount > 0 && (
							<span className='absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-primary-500 px-1 text-[10px] leading-4 text-white'>
								{mobileUnreadCount > 99 ? '99+' : mobileUnreadCount}
							</span>
						)}
					</Button>
				)}
			</div>
		</Panel>
	);
}
