'use client';

import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect } from 'react';
import { BenefitsStep } from './steps/benefits-step';
import { PaymentStep } from './steps/payment-step';
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
						userName={useAppStore.getState().userProfile?.display_name}
						onContinue={nextOnboardingStep}
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
						selectedPlan={onboardingData.selectedPlan || null}
						onBack={previousOnboardingStep}
						onContinue={nextOnboardingStep}
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
							billingCycle={onboardingData.billingCycle || 'monthly'}
							selectedPlan={onboardingData.selectedPlan}
							onBack={previousOnboardingStep}
							onComplete={nextOnboardingStep}
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
				className='flex !w-full !max-w-4xl p-0 overflow-hidden'
				showCloseButton={false}
				style={{
					backgroundColor: GlassmorphismTheme.elevation[2],
					borderColor: GlassmorphismTheme.borders.default,
					borderWidth: '1px',
				}}
				onInteractOutside={(e) => e.preventDefault()}
				onPointerDownOutside={(e) => e.preventDefault()}
			>
				<motion.div
					className='relative h-auto w-full flex flex-col'
					layout='size'
				>
					{/* Skip button */}
					<button
						className='absolute top-4 right-4 z-10 text-sm transition-colors'
						disabled={isAnimating}
						style={{
							color: GlassmorphismTheme.text.medium,
							transitionDuration: GlassmorphismTheme.animations.duration.normal,
						}}
						onClick={handleSkip}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = GlassmorphismTheme.text.high;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = GlassmorphismTheme.text.medium;
						}}
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

					{/* Step indicator */}
					<div
						className='p-6'
						style={{
							borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
						}}
					>
						<div className='flex items-center justify-center gap-2'>
							{[0, 1, 2].map((step) => (
								<div
									className='h-2 rounded-full'
									key={step}
									style={{
										width: step === onboardingStep ? '32px' : '8px',
										backgroundColor:
											step === onboardingStep
												? GlassmorphismTheme.indicators.status.complete
												: step < onboardingStep
													? GlassmorphismTheme.indicators.progress.fill.replace(
															/linear-gradient.*?rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\).*?rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\).*?\)/,
															'rgba(52, 211, 153, 0.8)'
														)
													: GlassmorphismTheme.elevation[4],
										transition: `all ${GlassmorphismTheme.animations.duration.slow} ${GlassmorphismTheme.animations.easing.default}`,
									}}
								/>
							))}

							{onboardingData.selectedPlan &&
								onboardingData.selectedPlan !== 'free' && (
									<div
										className='h-2 w-2 rounded-full'
										style={{
											backgroundColor:
												onboardingStep === 3
													? GlassmorphismTheme.indicators.status.complete
													: onboardingStep > 3
														? GlassmorphismTheme.indicators.progress.fill.replace(
																/linear-gradient.*?rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\).*?rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\).*?\)/,
																'rgba(52, 211, 153, 0.8)'
															)
														: GlassmorphismTheme.elevation[4],
											transition: `all ${GlassmorphismTheme.animations.duration.slow} ${GlassmorphismTheme.animations.easing.default}`,
										}}
									/>
								)}
						</div>
					</div>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
