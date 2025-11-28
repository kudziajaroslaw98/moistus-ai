'use client';

import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'anonymous_banner_dismissed';

export function AnonymousUserBanner() {
	const [isDismissed, setIsDismissed] = useState(true);
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const userProfile = useAppStore((state) => state.userProfile);

	useEffect(() => {
		// Only show for anonymous users
		if (!userProfile?.isAnonymous) {
			setIsDismissed(true);
			return;
		}

		// Check if user has dismissed the banner
		const dismissed = localStorage.getItem(STORAGE_KEY);
		setIsDismissed(dismissed === 'true');
	}, [userProfile?.isAnonymous]);

	const handleDismiss = () => {
		setIsDismissed(true);
		localStorage.setItem(STORAGE_KEY, 'true');
	};

	const handleCreateAccount = () => {
		setShowUpgradeModal(true);
	};

	if (!userProfile?.isAnonymous || isDismissed) {
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
					className='fixed top-0 left-0 right-0 z-50 pointer-events-none'
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

			{/* Upgrade Modal */}
			{showUpgradeModal && (
				<div className='fixed inset-0 z-[100]'>
					{/* Using dynamic import to avoid circular dependencies */}
					<UpgradeAnonymousPromptLazy
						onClose={() => setShowUpgradeModal(false)}
					/>
				</div>
			)}
		</>
	);
}

// Lazy load to avoid circular dependency issues
function UpgradeAnonymousPromptLazy({ onClose }: { onClose: () => void }) {
	const [Component, setComponent] = useState<any>(null);

	useEffect(() => {
		import('@/components/auth/upgrade-anonymous').then((mod) => {
			setComponent(() => mod.UpgradeAnonymousPrompt);
		});
	}, []);

	if (!Component) return null;

	return <Component onClose={onClose} />;
}
