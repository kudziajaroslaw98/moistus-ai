'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
} from '@/components/ui/dialog';
import {
	PaymentForm,
	stripePromise,
} from '@/components/onboarding/steps/payment-step';
import { Elements } from '@stripe/react-stripe-js';
import { ArrowLeft, Check, Crown, Sparkles, Users, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

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
	ease: [0.165, 0.84, 0.44, 1] as const, // ease-out-quart
};

const features = [
	{
		icon: Zap,
		title: 'AI Thinking Partner',
		description: 'Unlimited AI suggestions, content generation, and smart connections',
	},
	{
		icon: Sparkles,
		title: 'Unlimited Everything',
		description: 'No limits on projects, nodes, or ideas',
	},
	{
		icon: Users,
		title: 'Real-time Collaboration',
		description: 'Work together with your team in real-time',
	},
];

export function UpgradeModal({
	open,
	onOpenChange,
	onDismiss,
	onSuccess,
}: UpgradeModalProps) {
	const [step, setStep] = useState<Step>('pitch');
	const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
	const [direction, setDirection] = useState(0);
	const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (resetTimeoutRef.current) {
				clearTimeout(resetTimeoutRef.current);
			}
		};
	}, []);

	const handleMaybeLater = () => {
		onOpenChange(false);
		onDismiss?.();
		if (resetTimeoutRef.current) {
			clearTimeout(resetTimeoutRef.current);
		}
		resetTimeoutRef.current = setTimeout(() => {
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
		if (resetTimeoutRef.current) {
			clearTimeout(resetTimeoutRef.current);
		}
		resetTimeoutRef.current = setTimeout(() => {
			setStep('pitch');
			setDirection(0);
		}, 200);
	};

	const price = billingCycle === 'monthly' ? 12 : 120;
	const monthlyEquivalent = billingCycle === 'yearly' ? 10 : 12;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className='flex !w-full !max-w-3xl p-0 overflow-hidden bg-surface border-border-subtle'
				showCloseButton={false}
			>
				<motion.div
					className='relative w-full flex flex-col'
					layout='size'
				>
					{/* Skip button */}
					<button
						className='absolute top-4 right-4 z-10 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200'
						onClick={handleMaybeLater}
					>
						Maybe later
					</button>

					{/* Step content */}
					<div className='flex overflow-hidden'>
						<AnimatePresence
							custom={direction}
							initial={false}
							mode='popLayout'
						>
							{step === 'pitch' ? (
								<motion.div
									key='pitch'
									animate='center'
									className='flex flex-col w-full h-full overflow-hidden'
									custom={direction}
									exit='exit'
									initial='enter'
									transition={transition}
									variants={stepVariants}
								>
									<div className='flex flex-col h-full p-12'>
										{/* Header */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className='text-center mb-8'
											initial={{ opacity: 0, y: -20 }}
											transition={{
												duration: 0.3,
												ease: [0.165, 0.84, 0.44, 1],
											}}
										>
											<div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500/10 mb-4'>
												<Crown className='w-7 h-7 text-primary-500' />
											</div>

											<h2 className='text-3xl font-bold mb-3 text-text-primary'>
												Upgrade to Pro
											</h2>

											<p className='text-lg text-text-secondary'>
												Unlock your full potential with unlimited access
											</p>
										</motion.div>

										{/* Features */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className='space-y-4 mb-8'
											initial={{ opacity: 0, y: 20 }}
											transition={{
												duration: 0.3,
												ease: [0.165, 0.84, 0.44, 1],
												delay: 0.1,
											}}
										>
											{features.map((feature, index) => (
												<motion.div
													key={feature.title}
													className='flex items-start gap-4 p-4 rounded-xl bg-elevated/50 border border-border-subtle'
													initial={{ opacity: 0, x: -20 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{
														duration: 0.25,
														ease: [0.165, 0.84, 0.44, 1],
														delay: 0.15 + index * 0.05,
													}}
												>
													<div className='flex items-center justify-center w-10 h-10 rounded-lg bg-primary-500/10 shrink-0'>
														<feature.icon className='w-5 h-5 text-primary-500' />
													</div>

													<div>
														<p className='font-medium text-text-primary'>
															{feature.title}
														</p>
														<p className='text-sm text-text-secondary'>
															{feature.description}
														</p>
													</div>
												</motion.div>
											))}
										</motion.div>

										{/* Pricing section */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className='mb-8'
											initial={{ opacity: 0, y: 20 }}
											transition={{
												duration: 0.3,
												ease: [0.165, 0.84, 0.44, 1],
												delay: 0.25,
											}}
										>
											{/* Billing toggle */}
											<div className='flex justify-center mb-6'>
												<div className='inline-flex items-center gap-1 p-1 rounded-lg bg-elevated'>
													<button
														className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
															billingCycle === 'monthly'
																? 'bg-surface text-text-primary shadow-sm'
																: 'bg-transparent text-text-secondary hover:text-text-primary'
														}`}
														onClick={() => setBillingCycle('monthly')}
													>
														Monthly
													</button>

													<button
														className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
															billingCycle === 'yearly'
																? 'bg-surface text-text-primary shadow-sm'
																: 'bg-transparent text-text-secondary hover:text-text-primary'
														}`}
														onClick={() => setBillingCycle('yearly')}
													>
														Yearly
														<span className='ml-2 text-xs text-success-500'>
															Save 17%
														</span>
													</button>
												</div>
											</div>

											{/* Price display */}
											<div className='text-center'>
												<div className='flex items-baseline justify-center gap-1'>
													<span className='text-4xl font-bold text-text-primary'>
														${monthlyEquivalent}
													</span>
													<span className='text-text-secondary'>/month</span>
												</div>

												<p className={`text-sm mt-1 text-text-disabled ${billingCycle === 'yearly' ? 'visible' : 'invisible'}`}>
												${price} billed annually
											</p>

												<div className='flex items-center justify-center gap-2 mt-3'>
													<Check className='w-4 h-4 text-success-500' />
													<span className='text-sm text-success-500 font-medium'>
														14-day free trial included
													</span>
												</div>
											</div>
										</motion.div>

										{/* CTA */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className='flex justify-center'
											initial={{ opacity: 0, y: 20 }}
											transition={{
												duration: 0.3,
												ease: [0.165, 0.84, 0.44, 1],
												delay: 0.35,
											}}
										>
											<Button
												className='font-semibold px-12 py-6 text-base bg-primary-600 hover:bg-primary-500 transition-all duration-200 hover:-translate-y-0.5'
												onClick={handleStartTrial}
												size='lg'
											>
												Start Free Trial
											</Button>
										</motion.div>
									</div>
								</motion.div>
							) : (
								<motion.div
									key='payment'
									animate='center'
									className='flex flex-col w-full h-full overflow-hidden'
									custom={direction}
									exit='exit'
									initial='enter'
									transition={transition}
									variants={stepVariants}
								>
									<div className='flex flex-col h-full p-12'>
										{/* Header */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className='mb-8'
											initial={{ opacity: 0, y: -20 }}
											transition={{
												duration: 0.3,
												ease: [0.165, 0.84, 0.44, 1],
											}}
										>
											<button
												className='flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 mb-6'
												onClick={handleBackToPitch}
											>
												<ArrowLeft className='w-4 h-4' />
												Back
											</button>

											<h2 className='text-3xl font-bold mb-3 text-text-primary'>
												Complete Your Subscription
											</h2>

											<p className='text-lg text-text-secondary'>
												Start your 14-day free trial of Pro
												<span className='text-text-disabled ml-1'>
													({billingCycle === 'monthly' ? '$12/mo' : '$120/yr'})
												</span>
											</p>
										</motion.div>

										{/* Payment Form */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className='max-w-md mx-auto w-full flex-1'
											initial={{ opacity: 0, y: 20 }}
											transition={{
												duration: 0.3,
												ease: [0.165, 0.84, 0.44, 1],
												delay: 0.1,
											}}
										>
											<Elements stripe={stripePromise}>
												<PaymentForm
													billingCycle={billingCycle}
													onComplete={handlePaymentComplete}
													selectedPlan='pro'
													showBackButton={false}
												/>
											</Elements>
										</motion.div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
