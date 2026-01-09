'use client';

import { RealtimeAvatarStack } from '@/components/realtime/realtime-avatar-stack';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/common/user-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
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
	handleToggleHistorySidebar: () => void;
	handleToggleMapSettings: () => void;
	handleToggleSharePanel: () => void;
	handleOpenSettings: (tab: 'settings' | 'billing') => void;
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
						roomName={`mind_map:${mapId}:users`}
					/>
				)}

				{/* Owner controls */}
				{isMapOwner && (
					<div className='flex gap-2'>
						{/* Desktop only: Settings button */}
						{!isMobile && (
							<Button
								aria-label='Map Settings'
								onClick={handleToggleMapSettings}
								size='icon'
								title='Map Settings'
								variant={popoverOpen.mapSettings ? 'default' : 'secondary'}
							>
								<Settings className='h-4 w-4' />
							</Button>
						)}

						{/* Always visible: Share button */}
						<Button
							aria-label='Share Mind Map'
							className='gap-2'
							data-testid='share-button'
							onClick={handleToggleSharePanel}
							title='Share Mind Map'
							variant={popoverOpen.sharePanel ? 'default' : 'secondary'}
							size={isMobile ? 'icon' : 'default'}
						>
							{isMobile ? (
								<Share2 className='size-4' />
							) : (
								<>
									Share <Share2 className='size-3' />
								</>
							)}
						</Button>
					</div>
				)}

				{/* Always visible: User Menu */}
				<UserMenu
					showBackToDashboard
					user={userProfile}
					onOpenSettings={handleOpenSettings}
				/>

				{/* Mobile only: Hamburger menu */}
				{isMobile && (
					<Button
						aria-label='Open menu'
						onClick={() => setMobileMenuOpen(true)}
						size='icon'
						variant='ghost'
					>
						<Menu className='size-5' />
					</Button>
				)}
			</div>
		</Panel>
	);
}
