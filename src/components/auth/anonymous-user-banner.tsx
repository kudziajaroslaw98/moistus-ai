'use client';

import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';

const STORAGE_KEY = 'anonymous_banner_dismissed';

export function AnonymousUserBanner() {
	const [isDismissed, setIsDismissed] = useState(true);
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const { userProfile, setPopoverOpen } = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			setPopoverOpen: state.setPopoverOpen,
		}))
	);

	useEffect(() => {
		// Only show for anonymous users
		if (!userProfile?.is_anonymous) {
			setIsDismissed(true);
			return;
		}

		// Check if user has dismissed the banner
		const dismissed = localStorage.getItem(STORAGE_KEY);
		setIsDismissed(dismissed === 'true');
	}, [userProfile?.is_anonymous]);

	const handleDismiss = () => {
		setIsDismissed(true);
		localStorage.setItem(STORAGE_KEY, 'true');
	};

	const handleCreateAccount = () => {
		setPopoverOpen({ upgradeUser: true });
		setShowUpgradeModal(true);
	};

	if (!userProfile?.is_anonymous || isDismissed) {
		return null;
	}

	return (
		<>
			<AnimatePresence>
				<motion.div
					initial={{ y: -100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -100, opacity: 0 }}
					transition={{
						duration: 0.3,
						ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
					}}
					className='fixed top-12 left-0 right-0 mx-auto z-50 pointer-events-none max-w-3xl'
				>
					<div className='max-w-7xl mx-auto px-4 py-3'>
						<div className='pointer-events-auto relative overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 backdrop-blur-md shadow-lg'>
							{/* Glassmorphic overlay */}
							<div className='absolute inset-0 bg-gradient-to-r from-white/5 to-transparent' />

							<div className='relative flex items-center justify-between gap-4 px-4 py-3'>
								{/* Left: Icon + Message */}
								<div className='flex items-center gap-3'>
									<div className='flex-shrink-0 rounded-full bg-amber-500/20 p-2'>
										<UserPlus className='h-5 w-5 text-amber-400' />
									</div>
									<div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2'>
										<span className='font-semibold text-amber-100'>
											Guest Mode
										</span>
										<span className='hidden sm:inline text-amber-200/60'>
											•
										</span>
										<span className='text-sm text-amber-200/80'>
											Create an account to start your own mind maps
										</span>
									</div>
								</div>

								{/* Right: CTA + Dismiss */}
								<div className='flex items-center gap-2'>
									<Button
										onClick={handleCreateAccount}
										size='sm'
										className='bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-all duration-200 ease-out'
									>
										Create Account
									</Button>
									<button
										onClick={handleDismiss}
										className='flex-shrink-0 rounded-md p-1.5 text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/10 transition-colors duration-200 ease-out'
										aria-label='Dismiss banner'
									>
										<X className='h-4 w-4' />
									</button>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</AnimatePresence>
		</>
	);
}
