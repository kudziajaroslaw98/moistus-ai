'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAppStore from '@/store/mind-map-store';
import {
	CardElement,
	Elements,
	useElements,
	useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertCircle, CreditCard, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

interface PaymentFormProps {
	onComplete: () => void;
	onBack?: () => void;
	selectedPlan: 'pro';
	billingCycle: 'monthly' | 'yearly';
	showBackButton?: boolean;
}

interface PaymentStepProps extends PaymentFormProps {
	onBack: () => void; // Required for PaymentStep (onboarding flow)
}

// Stripe configuration - exported for reuse in UpgradeModal
export const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export const CARD_ELEMENT_OPTIONS = {
	style: {
		base: {
			color: 'rgba(255, 255, 255, 0.87)', // text-text-primary
			fontFamily: '"Inter", sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: 'rgba(255, 255, 255, 0.38)', // text-text-disabled
			},
		},
		invalid: {
			color: '#EF4444', // error-500
			iconColor: '#EF4444',
		},
	},
};

export function PaymentForm({
	onComplete,
	onBack,
	selectedPlan,
	billingCycle,
	showBackButton = true,
}: PaymentFormProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [email, setEmail] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [succeeded, setSucceeded] = useState(false);

	const { createSubscription, availablePlans, currentUser } = useAppStore();

	useEffect(() => {
		// Prefill email if user is logged in
		if (currentUser?.email) {
			setEmail(currentUser.email);
		}
	}, [currentUser]);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		setIsProcessing(true);
		setError(null);

		try {
			// Get the card element
			const cardElement = elements.getElement(CardElement);

			if (!cardElement) {
				throw new Error('Card element not found');
			}

			// Create payment method
			const { error: methodError, paymentMethod } =
				await stripe.createPaymentMethod({
					type: 'card',
					card: cardElement,
					billing_details: {
						email,
					},
				});

			if (methodError) {
				throw new Error(methodError.message);
			}

			// Get the selected plan details
			const plan = availablePlans.find((p) => p.name === selectedPlan);

			if (!plan) {
				throw new Error('Selected plan not found');
			}

			// Get the appropriate price ID
			const priceId =
				billingCycle === 'monthly'
					? plan.stripePriceIdMonthly
					: plan.stripePriceIdYearly;

			if (!priceId) {
				throw new Error('Price ID not configured for this plan');
			}

			// Create subscription
			const result = await createSubscription(
				plan.id,
				priceId,
				paymentMethod.id
			);

			if (result.error) {
				throw new Error(result.error);
			}

			// Handle additional confirmation if client secret is provided
			if (result.clientSecret) {
				// Determine intent type by prefix:
				// - 'seti_' = SetupIntent (trial subscription, verify card only)
				// - 'pi_' = PaymentIntent (immediate payment subscription, charge card)
				if (result.clientSecret.startsWith('seti_')) {
					// Trial subscription: confirm setup intent (verify card, no charge)
					const { error: confirmError } = await stripe.confirmCardSetup(
						result.clientSecret
					);

					if (confirmError) {
						throw new Error(confirmError.message);
					}
				} else if (result.clientSecret.startsWith('pi_')) {
					// Immediate payment: confirm payment intent (charge card now)
					const { error: confirmError } = await stripe.confirmCardPayment(
						result.clientSecret
					);

					if (confirmError) {
						throw new Error(confirmError.message);
					}
				}
			}

			setSucceeded(true);
			setTimeout(() => {
				onComplete();
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Payment failed');
			setIsProcessing(false);
		}
	};

	// Try to get price from database plans first, fallback to hardcoded constants
	const dbPlanPrice =
		availablePlans.find((p) => p.name === selectedPlan)?.[
			billingCycle === 'monthly' ? 'priceMonthly' : 'priceYearly'
		];

	// Fallback to hardcoded pricing if database query failed
	const planPrice =
		dbPlanPrice ??
		(selectedPlan === 'pro'
			? billingCycle === 'monthly'
				? 12
				: 120
			: 0);

	return (
		<form className='space-y-6' onSubmit={handleSubmit}>
			<div>
				<Label htmlFor='email' className='text-text-primary'>
					Email Address
				</Label>

				<Input
					required
					className='mt-1 bg-surface border-border-subtle text-text-primary'
					disabled={isProcessing || succeeded}
					id='email'
					onChange={(e) => setEmail(e.target.value)}
					placeholder='you@example.com'
					type='email'
					value={email}
				/>
			</div>

			<div>
				<Label className='mb-2 block text-text-primary'>Card Information</Label>

				<div className='p-3 rounded-md bg-surface border border-border-subtle'>
					<CardElement
						onChange={() => setError(null)}
						options={CARD_ELEMENT_OPTIONS}
					/>
				</div>
			</div>

			{error && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='flex items-center gap-2 text-sm text-error-500'
					initial={{ opacity: 0, y: -10 }}
					transition={{
						duration: 0.2,
						ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
					}}
				>
					<AlertCircle className='w-4 h-4' />

					<span>{error}</span>
				</motion.div>
			)}

			{succeeded && (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center py-4'
					initial={{ opacity: 0, scale: 0.8 }}
					transition={{
						duration: 0.3,
						ease: [0.165, 0.84, 0.44, 1],
					}}
				>
					<div className='w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-primary-500/20'>
						<motion.div
							animate={{ scale: 1 }}
							initial={{ scale: 0 }}
							transition={{
								delay: 0.2,
								duration: 0.3,
								ease: [0.34, 1.56, 0.64, 1], // ease-spring from theme
							}}
						>
							<CreditCard className='w-8 h-8 text-success-500' />
						</motion.div>
					</div>

					<p className='font-medium text-success-500'>
						Payment successful!
					</p>
				</motion.div>
			)}

			<div className={`flex items-center pt-4 ${showBackButton ? 'justify-between' : 'justify-end'}`}>
				{showBackButton && onBack && (
					<Button
						className='text-text-secondary hover:text-text-primary transition-colors duration-200'
						disabled={isProcessing || succeeded}
						onClick={onBack}
						type='button'
						variant='ghost'
					>
						Back
					</Button>
				)}

				<Button
					className={`font-semibold px-8 bg-primary-600 hover:bg-primary-500 text-base transition-all duration-200 ${!stripe || isProcessing || succeeded ? 'opacity-50' : 'hover:-translate-y-0.5'}`}
					disabled={!stripe || isProcessing || succeeded}
					type='submit'
				>
					{isProcessing ? (
						<span className='flex items-center gap-2'>
							<motion.div
								animate={{ rotate: 360 }}
								className='w-4 h-4 rounded-full border-2 border-base border-t-transparent'
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							/>
							Processing...
						</span>
					) : (
						`Subscribe - $${planPrice}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`
					)}
				</Button>
			</div>
		</form>
	);
}

export function PaymentStep(props: PaymentStepProps) {
	return (
		<div className='flex flex-col h-full p-12'>
			{/* Header */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-8'
				initial={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
				}}
			>
				<h2 className='text-3xl font-bold mb-4 text-text-primary'>
					Complete Your Subscription
				</h2>

				<p className='text-lg text-text-secondary'>
					Start your {props.selectedPlan} plan today
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
					<PaymentForm {...props} />
				</Elements>
			</motion.div>

			{/* Security badges */}
			<motion.div
				animate={{ opacity: 1 }}
				className='flex items-center justify-center gap-4 text-sm mt-8 text-text-disabled'
				initial={{ opacity: 0 }}
				transition={{ duration: 0.3, delay: 0.3 }}
			>
				<div className='flex items-center gap-2'>
					<Lock className='w-4 h-4' />

					<span>Secure payment</span>
				</div>

				<span>•</span>

				<span>Powered by Stripe</span>

				<span>•</span>

				<span>Cancel anytime</span>
			</motion.div>
		</div>
	);
}
