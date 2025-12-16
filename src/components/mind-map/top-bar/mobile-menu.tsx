'use client';

import { RealtimeAvatarStack } from '@/components/realtime/realtime-avatar-stack';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { useReducedMotion } from '@/components/ui/sidebar-theme';
import { type ActivityState } from '@/hooks/realtime/use-realtime-presence-room';
import { motion } from 'motion/react';
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

// Animation variants following animation-guidelines.md
const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, x: 20 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: 0.2,
			ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
		},
	},
};

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
	const prefersReducedMotion = useReducedMotion();

	// Close sheet after action
	const handleAction = (action: () => void) => {
		action();
		onOpenChange(false);
	};

	// Conditionally apply motion or static rendering
	const MotionDiv = prefersReducedMotion ? 'div' : motion.div;
	const motionProps = prefersReducedMotion
		? {}
		: { variants: containerVariants, initial: 'hidden', animate: 'visible' };
	const itemMotionProps = prefersReducedMotion ? {} : { variants: itemVariants };

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side='right' className='w-72'>
				<SheetHeader>
					<SheetTitle>Menu</SheetTitle>
					<SheetDescription className='sr-only'>
						Additional map controls
					</SheetDescription>
				</SheetHeader>

				<MotionDiv className='flex flex-col gap-4 mt-6' {...motionProps}>
					{/* Collaborators Section */}
					<MotionDiv {...itemMotionProps}>
						<h3 className='text-sm font-medium text-text-secondary mb-3 flex items-center gap-2'>
							<Users className='size-4' />
							Collaborators
						</h3>
						<RealtimeAvatarStack
							activityState={activityState}
							mapOwnerId={mapOwnerId}
							roomName={`mind_map:${mapId}:users`}
						/>
					</MotionDiv>

					<Separator />

					{/* Edit Actions */}
					{canEdit && (
						<>
							<MotionDiv {...itemMotionProps}>
								<h3 className='text-sm font-medium text-text-secondary mb-3'>
									Edit Actions
								</h3>
								<div className='flex flex-col gap-2'>
									{/* TODO: Uncomment redo/undo when optimized history implemented */}
									<Button
										// onClick={() => handleAction(handleUndo)}
										disabled={!canUndo}
										variant='secondary'
										className='justify-start gap-3'
									>
										<Undo className='size-4' />
										Undo
									</Button>
									<Button
										// onClick={() => handleAction(handleRedo)}
										disabled={!canRedo}
										variant='secondary'
										className='justify-start gap-3'
									>
										<Redo className='size-4' />
										Redo
									</Button>
									<Button
										onClick={() => handleAction(onToggleHistory)}
										variant='secondary'
										className='justify-start gap-3'
									>
										<History className='size-4' />
										History
									</Button>
								</div>
							</MotionDiv>

							<Separator />
						</>
					)}

					{/* Settings (Owner only) */}
					{isMapOwner && (
						<MotionDiv {...itemMotionProps}>
							<h3 className='text-sm font-medium text-text-secondary mb-3'>
								Map Settings
							</h3>
							<Button
								onClick={() => handleAction(onToggleSettings)}
								variant={isSettingsActive ? 'default' : 'secondary'}
								className='w-full justify-start gap-3'
							>
								<Settings className='size-4' />
								Settings
							</Button>
						</MotionDiv>
					)}
				</MotionDiv>
			</SheetContent>
		</Sheet>
	);
}
