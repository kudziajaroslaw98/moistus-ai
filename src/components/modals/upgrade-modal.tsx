'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	PaymentForm,
	stripePromise,
} from '@/components/onboarding/steps/payment-step';
import { cn } from '@/lib/utils';
import { Elements } from '@stripe/react-stripe-js';
import { ArrowLeft, Crown, Infinity, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface UpgradeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDismiss?: () => void;
	onSuccess?: () => void;
}

type Step = 'pitch' | 'payment';
type BillingCycle = 'monthly' | 'yearly';

// Animation variants following animation-guidelines.md
const stepVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 300 : -300,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction < 0 ? 300 : -300,
		opacity: 0,
	}),
};

const transition = {
	duration: 0.25,
	ease: [0.215, 0.61, 0.355, 1] as const, // ease-out-cubic
};

// Billing cycle toggle button styles
const cycleButtonClass = (isActive: boolean) =>
	cn(
		'px-4 py-2 text-sm transition-all duration-200',
		isActive
			? 'bg-primary-600 text-white'
			: 'bg-surface-elevated text-text-secondary hover:text-text-primary'
	);

export function UpgradeModal({
	open,
	onOpenChange,
	onDismiss,
	onSuccess,
}: UpgradeModalProps) {
	const [step, setStep] = useState<Step>('pitch');
	const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
	const [direction, setDirection] = useState(0);

	const handleMaybeLater = () => {
		onOpenChange(false);
		onDismiss?.();
		// Reset state for next open
		setTimeout(() => {
			setStep('pitch');
			setDirection(0);
		}, 200);
	};

	const handleStartTrial = () => {
		setDirection(1);
		setStep('payment');
	};

	const handleBackToPitch = () => {
		setDirection(-1);
		setStep('pitch');
	};

	const handlePaymentComplete = () => {
		onOpenChange(false);
		onSuccess?.();
		// Reset state for next open
		setTimeout(() => {
			setStep('pitch');
			setDirection(0);
		}, 200);
	};

	// Get price based on billing cycle
	const price = billingCycle === 'monthly' ? 12 : 120;
	const savings = billingCycle === 'yearly' ? '17%' : null;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className='sm:max-w-[500px] overflow-hidden'>
				<AnimatePresence custom={direction} initial={false} mode='wait'>
					{step === 'pitch' ? (
						<motion.div
							key='pitch'
							animate='center'
							custom={direction}
							exit='exit'
							initial='enter'
							transition={transition}
							variants={stepVariants}
						>
							<DialogHeader>
								<DialogTitle className='flex items-center gap-2 text-2xl'>
									<Crown className='h-6 w-6 text-primary-500' />
									Upgrade to Pro
								</DialogTitle>

								<DialogDescription className='text-base'>
									Unlock unlimited potential with Pro.
								</DialogDescription>
							</DialogHeader>

							<div className='space-y-4 py-4'>
								<div className='flex items-start gap-3'>
									<Infinity className='h-5 w-5 text-primary-500 mt-0.5 shrink-0' />

									<div>
										<p className='font-medium'>Unlimited Everything</p>

										<p className='text-sm text-muted-foreground'>
											Create unlimited mind maps, nodes, and AI suggestions
										</p>
									</div>
								</div>

								<div className='flex items-start gap-3'>
									<Zap className='h-5 w-5 text-primary-500 mt-0.5 shrink-0' />

									<div>
										<p className='font-medium'>AI-Powered Features</p>

										<p className='text-sm text-muted-foreground'>
											Unlimited AI suggestions, content generation, and smart
											connections
										</p>
									</div>
								</div>

								<div className='flex items-start gap-3'>
									<Sparkles className='h-5 w-5 text-primary-500 mt-0.5 shrink-0' />

									<div>
										<p className='font-medium'>Real-time Collaboration</p>

										<p className='text-sm text-muted-foreground'>
											Work together with your team in real-time
										</p>
									</div>
								</div>

								{/* Billing Cycle Toggle */}
								<div className='flex justify-center gap-2 pt-2'>
									<Button
										className={cycleButtonClass(billingCycle === 'monthly')}
										onClick={() => setBillingCycle('monthly')}
										size='sm'
										variant={billingCycle === 'monthly' ? 'default' : 'outline'}
									>
										Monthly
									</Button>

									<Button
										className={cycleButtonClass(billingCycle === 'yearly')}
										onClick={() => setBillingCycle('yearly')}
										size='sm'
										variant={billingCycle === 'yearly' ? 'default' : 'outline'}
									>
										Yearly
										{savings && (
											<span className='ml-1 text-xs text-success-400'>
												-{savings}
											</span>
										)}
									</Button>
								</div>

								<div className='rounded-lg bg-primary-500/10 border border-primary-500/20 p-4 text-center'>
									<p className='text-3xl font-bold text-primary-600'>
										${price}/{billingCycle === 'monthly' ? 'month' : 'year'}
									</p>

									{billingCycle === 'yearly' && (
										<p className='text-sm text-muted-foreground'>
											$10/month billed annually
										</p>
									)}

									<p className='text-sm font-medium text-primary-600 mt-2'>
										✨ 14-day free trial included
									</p>
								</div>
							</div>

							<DialogFooter className='gap-2 sm:gap-0'>
								<Button onClick={handleMaybeLater} variant='outline'>
									Maybe Later
								</Button>

								<Button
									className='bg-primary-600 hover:bg-primary-700'
									onClick={handleStartTrial}
								>
									Start Free Trial
								</Button>
							</DialogFooter>
						</motion.div>
					) : (
						<motion.div
							key='payment'
							animate='center'
							custom={direction}
							exit='exit'
							initial='enter'
							transition={transition}
							variants={stepVariants}
						>
							<DialogHeader>
								<DialogTitle className='flex items-center gap-2 text-xl'>
									<Button
										className='mr-2 h-8 w-8 p-0'
										onClick={handleBackToPitch}
										variant='ghost'
									>
										<ArrowLeft className='h-4 w-4' />
									</Button>
									Complete Your Subscription
								</DialogTitle>

								<DialogDescription className='text-sm'>
									Start your 14-day free trial of Pro (
									{billingCycle === 'monthly' ? '$12/mo' : '$120/yr'})
								</DialogDescription>
							</DialogHeader>

							<div className='py-4'>
								<Elements stripe={stripePromise}>
									<PaymentForm
										billingCycle={billingCycle}
										onComplete={handlePaymentComplete}
										selectedPlan='pro'
										showBackButton={false}
									/>
								</Elements>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	);
}
