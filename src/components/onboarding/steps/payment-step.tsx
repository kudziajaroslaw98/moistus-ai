'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
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
import { useEffect, useState } from 'react';

interface PaymentStepProps {
	onComplete: () => void;
	onBack: () => void;
	selectedPlan: 'pro';
	billingCycle: 'monthly' | 'yearly';
}

// Stripe configuration
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const CARD_ELEMENT_OPTIONS = {
	style: {
		base: {
			color: GlassmorphismTheme.text.high,
			fontFamily: '"Inter", sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: GlassmorphismTheme.text.disabled,
			},
		},
		invalid: {
			color: GlassmorphismTheme.indicators.status.error,
			iconColor: GlassmorphismTheme.indicators.status.error,
		},
	},
};

function PaymentForm({
	onComplete,
	onBack,
	selectedPlan,
	billingCycle,
}: PaymentStepProps) {
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

	const handleSubmit = async (e: React.FormEvent) => {
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
		<form onSubmit={handleSubmit} className='space-y-6'>
			<div>
				<Label
					htmlFor='email'
					style={{ color: GlassmorphismTheme.text.high }}
				>
					Email Address
				</Label>

				<Input
					id='email'
					type='email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder='you@example.com'
					required
					disabled={isProcessing || succeeded}
					className='mt-1'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[2],
						borderColor: GlassmorphismTheme.borders.default,
						color: GlassmorphismTheme.text.high,
					}}
				/>
			</div>

			<div>
				<Label
					className='mb-2 block'
					style={{ color: GlassmorphismTheme.text.high }}
				>
					Card Information
				</Label>

				<div
					className='p-3 rounded-md'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[2],
						border: `1px solid ${GlassmorphismTheme.borders.default}`,
					}}
				>
					<CardElement
						options={CARD_ELEMENT_OPTIONS}
						onChange={() => setError(null)}
					/>
				</div>
			</div>

			{error && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.2,
						ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
					}}
					className='flex items-center gap-2 text-sm'
					style={{ color: GlassmorphismTheme.indicators.status.error }}
				>
					<AlertCircle className='w-4 h-4' />

					<span>{error}</span>
				</motion.div>
			)}

			{succeeded && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{
						duration: 0.3,
						ease: [0.165, 0.84, 0.44, 1],
					}}
					className='text-center py-4'
				>
					<div
						className='w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3'
						style={{
							backgroundColor: 'rgba(52, 211, 153, 0.2)',
						}}
					>
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								delay: 0.2,
								duration: 0.3,
								ease: [0.34, 1.56, 0.64, 1], // ease-spring from theme
							}}
						>
							<CreditCard
								className='w-8 h-8'
								style={{ color: GlassmorphismTheme.indicators.status.complete }}
							/>
						</motion.div>
					</div>

					<p
						className='font-medium'
						style={{ color: GlassmorphismTheme.indicators.status.complete }}
					>
						Payment successful!
					</p>
				</motion.div>
			)}

			<div className='flex items-center justify-between pt-4'>
				<Button
					type='button'
					onClick={onBack}
					variant='ghost'
					disabled={isProcessing || succeeded}
					className='transition-colors'
					style={{
						color: GlassmorphismTheme.text.medium,
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
					}}
					onMouseEnter={(e) => {
						if (!isProcessing && !succeeded) {
							e.currentTarget.style.color = GlassmorphismTheme.text.high;
						}
					}}
					onMouseLeave={(e) => {
						if (!isProcessing && !succeeded) {
							e.currentTarget.style.color = GlassmorphismTheme.text.medium;
						}
					}}
				>
					Back
				</Button>

				<Button
					type='submit'
					disabled={!stripe || isProcessing || succeeded}
					className='font-semibold px-8 transition-all'
					style={{
						backgroundColor: 'rgba(52, 211, 153, 0.8)',
						color: GlassmorphismTheme.elevation[0],
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
						opacity: !stripe || isProcessing || succeeded ? 0.5 : 1,
					}}
					onMouseEnter={(e) => {
						if (stripe && !isProcessing && !succeeded) {
							e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 1)';
							e.currentTarget.style.transform = 'translateY(-2px)';
						}
					}}
					onMouseLeave={(e) => {
						if (stripe && !isProcessing && !succeeded) {
							e.currentTarget.style.backgroundColor =
								'rgba(52, 211, 153, 0.8)';
							e.currentTarget.style.transform = 'translateY(0)';
						}
					}}
				>
					{isProcessing ? (
						<span className='flex items-center gap-2'>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
								className='w-4 h-4 rounded-full'
								style={{
									border: `2px solid ${GlassmorphismTheme.elevation[0]}`,
									borderTopColor: 'transparent',
								}}
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
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
				}}
				className='text-center mb-8'
			>
				<h2
					className='text-3xl font-bold mb-4'
					style={{ color: GlassmorphismTheme.text.high }}
				>
					Complete Your Subscription
				</h2>

				<p
					className='text-lg'
					style={{ color: GlassmorphismTheme.text.medium }}
				>
					Start your {props.selectedPlan} plan today
				</p>
			</motion.div>

			{/* Payment Form */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.1,
				}}
				className='max-w-md mx-auto w-full flex-1'
			>
				<Elements stripe={stripePromise}>
					<PaymentForm {...props} />
				</Elements>
			</motion.div>

			{/* Security badges */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3, delay: 0.3 }}
				className='flex items-center justify-center gap-4 text-sm mt-8'
				style={{ color: GlassmorphismTheme.text.disabled }}
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
