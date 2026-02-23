'use client';

import { RealtimeAvatarStack } from '@/components/realtime/realtime-avatar-stack';
import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import { motion, useReducedMotion } from 'motion/react';
import { History, Settings, Users } from 'lucide-react';

interface MobileMenuProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canEdit: boolean;
	isMapOwner: boolean;
	activityState?: ActivityState;
	mapId: string;
	mapOwnerId?: string;
	isSettingsActive: boolean;
	onToggleHistory: () => void;
	onToggleSettings: () => void;
}

export function MobileMenu({
	open,
	onOpenChange,
	canEdit,
	isMapOwner,
	activityState,
	mapId,
	mapOwnerId,
	isSettingsActive,
	onToggleHistory,
	onToggleSettings,
}: MobileMenuProps) {
	const shouldReduceMotion = useReducedMotion();

	// Close panel after action
	const handleAction = (action: () => void) => {
		action();
		onOpenChange(false);
	};

	// Animation config matching other panels
	const sectionAnimation = shouldReduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 10 },
				animate: { opacity: 1, y: 0 },
				transition: { duration: 0.3 },
			};

	return (
		<SidePanel
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title='Menu'
			className='max-w-xs'
		>
			<div className='flex flex-col gap-6 p-4'>
				{/* Collaborators Section */}
				<motion.section className='space-y-3' {...sectionAnimation}>
					<h3 className='text-sm font-semibold text-text-primary flex items-center gap-2'>
						<Users className='size-4 text-primary' />
						Collaborators
					</h3>
					<div className='bg-surface rounded-lg p-3 border border-border-subtle'>
						<RealtimeAvatarStack
							activityState={activityState}
							mapOwnerId={mapOwnerId}
							roomName={getMindMapRoomName(mapId, 'presence')}
						/>
					</div>
				</motion.section>

				{/* History (for editors) */}
				{canEdit && (
					<motion.section
						className='space-y-3'
						{...sectionAnimation}
						transition={
							shouldReduceMotion
								? undefined
								: { duration: 0.3, delay: 0.1 }
						}
					>
						<h3 className='text-sm font-semibold text-text-primary flex items-center gap-2'>
							<History className='size-4 text-primary' />
							History
						</h3>
						<div className='bg-surface rounded-lg p-3 border border-border-subtle'>
							<Button
								onClick={() => handleAction(onToggleHistory)}
								variant='ghost'
								className='w-full justify-start gap-3 h-10'
							>
								<History className='size-4' />
								View History
							</Button>
						</div>
					</motion.section>
				)}

				{/* Settings (Owner only) */}
				{isMapOwner && (
					<motion.section
						className='space-y-3'
						{...sectionAnimation}
						transition={
							shouldReduceMotion
								? undefined
								: { duration: 0.3, delay: canEdit ? 0.2 : 0.1 }
						}
					>
						<h3 className='text-sm font-semibold text-text-primary flex items-center gap-2'>
							<Settings className='size-4 text-primary' />
							Map Settings
						</h3>
						<div className='bg-surface rounded-lg p-3 border border-border-subtle'>
							<Button
								onClick={() => handleAction(onToggleSettings)}
								variant={isSettingsActive ? 'default' : 'ghost'}
								className='w-full justify-start gap-3 h-10'
							>
								<Settings className='size-4' />
								Map Settings
							</Button>
						</div>
					</motion.section>
				)}
			</div>
		</SidePanel>
	);
}
