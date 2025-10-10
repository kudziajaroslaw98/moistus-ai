'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect } from 'react';
import { BenefitsStep } from './steps/benefits-step';
import { PaymentStep } from './steps/payment-step';
import { PricingStep } from './steps/pricing-step';
import { WelcomeStep } from './steps/welcome-step';

const stepVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 1000 : -1000,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction < 0 ? 1000 : -1000,
		opacity: 0,
	}),
};

const transition = {
	type: 'spring' as const,
	duration: 0.3,
	bounce: 0,
};

export function OnboardingModal() {
	const {
		showOnboarding,
		onboardingStep,
		onboardingDirection,
		onboardingData,
		setShowOnboarding,
		nextOnboardingStep,
		previousOnboardingStep,
		skipOnboarding,
		shouldShowOnboarding,
		isAnimating,
	} = useAppStore();

	// Check if we should show onboarding on mount
	useEffect(() => {
		// Small delay to ensure auth state is loaded
		const timer = setTimeout(() => {
			shouldShowOnboarding();
		}, 500);

		return () => clearTimeout(timer);
	}, [shouldShowOnboarding]);

	const handleClose = useCallback(() => {
		if (!isAnimating) {
			setShowOnboarding(false);
		}
	}, [isAnimating, setShowOnboarding]);

	const handleSkip = useCallback(() => {
		if (!isAnimating) {
			skipOnboarding();
		}
	}, [isAnimating, skipOnboarding]);

	const renderStep = () => {
		switch (onboardingStep) {
			case 0:
				return (
					<WelcomeStep
						onContinue={nextOnboardingStep}
						userName={useAppStore.getState().userProfile?.display_name}
					/>
				);
			case 1:
				return (
					<BenefitsStep
						onContinue={nextOnboardingStep}
						onBack={previousOnboardingStep}
					/>
				);
			case 2:
				return (
					<PricingStep
						onContinue={nextOnboardingStep}
						onBack={previousOnboardingStep}
						selectedPlan={onboardingData.selectedPlan || null}
						billingCycle={onboardingData.billingCycle || 'monthly'}
					/>
				);
			case 3:
				// Only show payment step if a paid plan was selected
				if (
					onboardingData.selectedPlan &&
					onboardingData.selectedPlan !== 'free'
				) {
					return (
						<PaymentStep
							onComplete={nextOnboardingStep}
							onBack={previousOnboardingStep}
							selectedPlan={onboardingData.selectedPlan}
							billingCycle={onboardingData.billingCycle || 'monthly'}
						/>
					);
				}

				// If free plan or no plan selected, complete onboarding
				// This should complete automatically
				nextOnboardingStep();
				return null;
			default:
				return null;
		}
	};

	return (
		<Dialog open={showOnboarding} onOpenChange={handleClose}>
			<DialogContent
				className='flex !w-full !max-w-4xl bg-zinc-900 border-zinc-800 p-0 overflow-hidden'
				showCloseButton={false}
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
			>
				<div className='relative h-auto w-full flex flex-col'>
					{/* Skip button */}
					<button
						onClick={handleSkip}
						className='absolute top-4 right-4 z-10 text-zinc-400 hover:text-zinc-300 text-sm transition-colors'
						disabled={isAnimating}
					>
						Skip for now
					</button>

					{/* Step content */}
					<div className='flex p-4 overflow-x-clip'>
						<AnimatePresence
							initial={false}
							mode='popLayout'
							custom={onboardingDirection}
						>
							<motion.div
								key={onboardingStep}
								custom={onboardingDirection}
								variants={stepVariants}
								initial='enter'
								animate='center'
								exit='exit'
								transition={transition}
								className='flex flex-col w-full h-full'
							>
								{renderStep()}
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Step indicator */}
					<div className='p-6 border-t border-zinc-800'>
						<div className='flex items-center justify-center gap-2'>
							{[0, 1, 2].map((step) => (
								<div
									key={step}
									className={`h-2 transition-all duration-300 ${
										step === onboardingStep
											? 'w-8 bg-teal-500'
											: step < onboardingStep
												? 'w-2 bg-teal-600'
												: 'w-2 bg-zinc-700'
									} rounded-full`}
								/>
							))}

							{onboardingData.selectedPlan &&
								onboardingData.selectedPlan !== 'free' && (
									<div
										className={`h-2 w-2 transition-all duration-300 ${
											onboardingStep === 3
												? 'bg-teal-500'
												: onboardingStep > 3
													? 'bg-teal-600'
													: 'bg-zinc-700'
										} rounded-full`}
									/>
								)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
