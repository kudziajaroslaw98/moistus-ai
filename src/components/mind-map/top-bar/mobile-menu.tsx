'use client';

import { RealtimeAvatarStack } from '@/components/realtime/realtime-avatar-stack';
import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
import { motion, useReducedMotion } from 'motion/react';
import { History, Redo, Settings, Undo, Users } from 'lucide-react';

interface MobileMenuProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canEdit: boolean;
	canUndo: boolean;
	canRedo: boolean;
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
	canUndo,
	canRedo,
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
	const getAnimation = (delay: number = 0) =>
		shouldReduceMotion
			? {}
			: {
					initial: { opacity: 0, y: 10 },
					animate: { opacity: 1, y: 0 },
					transition: { duration: 0.3, delay },
				};

	return (
		<SidePanel
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title='Menu'
			className='w-full max-w-sm'
		>
			<div className='flex flex-col gap-6 p-6'>
				{/* Collaborators Section */}
				<motion.section className='space-y-4' {...getAnimation(0)}>
					<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
						<Users className='size-5 text-primary' />
						Collaborators
					</h3>
					<div className='bg-surface rounded-lg p-4 border border-border-subtle'>
						<RealtimeAvatarStack
							activityState={activityState}
							mapOwnerId={mapOwnerId}
							roomName={`mind_map:${mapId}:users`}
						/>
						<p className='text-sm text-text-secondary mt-2'>
							People currently viewing this map
						</p>
					</div>
				</motion.section>

				{/* Edit Actions */}
				{canEdit && (
					<motion.section className='space-y-4' {...getAnimation(0.1)}>
						<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
							<History className='size-5 text-primary' />
							Edit Actions
						</h3>
						<div className='bg-surface rounded-lg p-4 border border-border-subtle space-y-2'>
							{/* TODO: Enable when optimized history is implemented */}
							<Button
								disabled={!canUndo}
								variant='ghost'
								className='w-full justify-start gap-3 h-11 text-base'
							>
								<Undo className='size-5' />
								Undo
							</Button>
							<Button
								disabled={!canRedo}
								variant='ghost'
								className='w-full justify-start gap-3 h-11 text-base'
							>
								<Redo className='size-5' />
								Redo
							</Button>
							<div className='border-t border-border-subtle my-2' />
							<Button
								onClick={() => handleAction(onToggleHistory)}
								variant='ghost'
								className='w-full justify-start gap-3 h-11 text-base'
							>
								<History className='size-5' />
								View History
							</Button>
						</div>
					</motion.section>
				)}

				{/* Settings (Owner only) */}
				{isMapOwner && (
					<motion.section
						className='space-y-4'
						{...getAnimation(canEdit ? 0.2 : 0.1)}
					>
						<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
							<Settings className='size-5 text-primary' />
							Map Settings
						</h3>
						<div className='bg-surface rounded-lg p-4 border border-border-subtle'>
							<Button
								onClick={() => handleAction(onToggleSettings)}
								variant={isSettingsActive ? 'default' : 'ghost'}
								className='w-full justify-start gap-3 h-11 text-base'
							>
								<Settings className='size-5' />
								Open Settings
							</Button>
							<p className='text-sm text-text-secondary mt-3'>
								Configure map visibility, permissions, and more
							</p>
						</div>
					</motion.section>
				)}
			</div>
		</SidePanel>
	);
}
