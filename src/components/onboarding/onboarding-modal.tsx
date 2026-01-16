'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import { BenefitsStep } from './steps/benefits-step';
import { PricingStep } from './steps/pricing-step';
import { WelcomeStep } from './steps/welcome-step';

// Using animation guidelines: ease-out-cubic for screen transitions
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
	duration: 0.3,
	ease: [0.215, 0.61, 0.355, 1] as const, // ease-out-cubic from animation guidelines
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
		isAnimating,
	} = useAppStore();

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
						onBack={previousOnboardingStep}
						onContinue={nextOnboardingStep}
					/>
				);
			case 2:
				return (
					<PricingStep
						billingCycle={onboardingData.billingCycle || 'monthly'}
						onBack={previousOnboardingStep}
						onContinue={nextOnboardingStep}
						selectedPlan={onboardingData.selectedPlan || null}
					/>
				);
			default:
				return null;
		}
	};

	// Don't render anything if onboarding shouldn't be shown
	if (!showOnboarding) {
		return null;
	}

	return (
		<Dialog dismissible={false} onOpenChange={handleClose} open={true}>
			<DialogContent
				className='flex !w-full !max-w-4xl p-0 overflow-hidden bg-surface border-border-subtle'
				showCloseButton={false}
			>
				<motion.div
					className='relative h-auto w-full flex flex-col'
					layout='size'
				>
					{/* Skip button */}
					<button
						className='absolute top-4 right-4 z-10 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200'
						disabled={isAnimating}
						onClick={handleSkip}
					>
						Skip for now
					</button>

					{/* Step content */}
					<div className='flex p-4 overflow-hidden'>
						<AnimatePresence
							custom={onboardingDirection}
							initial={false}
							mode='popLayout'
						>
							<motion.div
								animate='center'
								className='flex flex-col w-full h-full overflow-hidden'
								custom={onboardingDirection}
								exit='exit'
								initial='enter'
								key={onboardingStep}
								transition={transition}
								variants={stepVariants}
							>
								{renderStep()}
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Step indicator - simplified to 3 steps */}
					<div className='p-6 border-t border-border-subtle'>
						<div className='flex items-center justify-center gap-2'>
							{[0, 1, 2].map((step) => (
								<div
									className={`h-2 rounded-full transition-all duration-300 ease-out ${
										step === onboardingStep
											? 'bg-primary-500 w-8'
											: step < onboardingStep
												? 'bg-primary-600/80 w-2'
												: 'bg-elevated w-2'
									}`}
									key={step}
								/>
							))}
						</div>
					</div>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
