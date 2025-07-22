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
			color: '#fafafa',
			fontFamily: '"Inter", sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: '#71717a',
			},
		},
		invalid: {
			color: '#ef4444',
			iconColor: '#ef4444',
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

			// If subscription requires additional action (3D Secure)
			if (result.clientSecret) {
				const { error: confirmError } = await stripe.confirmCardPayment(
					result.clientSecret
				);

				if (confirmError) {
					throw new Error(confirmError.message);
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

	const planPrice =
		availablePlans.find((p) => p.name === selectedPlan)?.[
			billingCycle === 'monthly' ? 'priceMonthly' : 'priceYearly'
		] || 0;

	return (
		<form onSubmit={handleSubmit} className='space-y-6'>
			<div>
				<Label htmlFor='email' className='text-zinc-300'>
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
					className='mt-1 bg-zinc-800 border-zinc-700 text-zinc-50'
				/>
			</div>

			<div>
				<Label className='text-zinc-300 mb-2 block'>Card Information</Label>

				<div className='p-3 bg-zinc-800 border border-zinc-700 rounded-md'>
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
					className='flex items-center gap-2 text-red-400 text-sm'
				>
					<AlertCircle className='w-4 h-4' />

					<span>{error}</span>
				</motion.div>
			)}

			{succeeded && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					className='text-center py-4'
				>
					<div className='w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3'>
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.2, type: 'spring' }}
						>
							<CreditCard className='w-8 h-8 text-teal-500' />
						</motion.div>
					</div>

					<p className='text-teal-400 font-medium'>Payment successful!</p>
				</motion.div>
			)}

			<div className='flex items-center justify-between pt-4'>
				<Button
					type='button'
					onClick={onBack}
					variant='ghost'
					disabled={isProcessing || succeeded}
					className='text-zinc-400 hover:text-zinc-300'
				>
					Back
				</Button>

				<Button
					type='submit'
					disabled={!stripe || isProcessing || succeeded}
					className='bg-teal-500 hover:bg-teal-600 text-zinc-900 font-semibold px-8'
				>
					{isProcessing ? (
						<span className='flex items-center gap-2'>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
								className='w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full'
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
				className='text-center mb-8'
			>
				<h2 className='text-3xl font-bold text-zinc-50 mb-4'>
					Complete Your Subscription
				</h2>

				<p className='text-lg text-zinc-400'>
					Start your {props.selectedPlan} plan today
				</p>
			</motion.div>

			{/* Payment Form */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
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
				transition={{ delay: 0.3 }}
				className='flex items-center justify-center gap-4 text-sm text-zinc-500 mt-8'
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
