'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
	AlertTriangle,
	Calendar,
	Check,
	CreditCard,
	Download,
	ExternalLink,
	Star,
	Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Subscription {
	id: string;
	plan: 'free' | 'pro' | 'team' | 'enterprise';
	status: 'active' | 'canceled' | 'past_due' | 'trialing';
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	trialEnd?: string;
}

interface Usage {
	mindMaps: { used: number; limit: number };
	collaborators: { used: number; limit: number };
	storage: { used: number; limit: number }; // in MB
	exports: { used: number; limit: number };
}

interface PaymentMethod {
	id: string;
	type: 'card' | 'paypal';
	last4?: string;
	brand?: string;
	expiryMonth?: number;
	expiryYear?: number;
	isDefault: boolean;
}

interface Invoice {
	id: string;
	number: string;
	amount: number;
	currency: string;
	status: 'paid' | 'pending' | 'failed';
	date: string;
	downloadUrl: string;
}

const planFeatures = {
	free: {
		name: 'Free',
		price: 0,
		features: [
			'5 mind maps',
			'1 collaborator',
			'100MB storage',
			'Basic templates',
		],
		color: 'text-zinc-400',
	},
	pro: {
		name: 'Pro',
		price: 9.99,
		features: [
			'Unlimited mind maps',
			'5 collaborators',
			'5GB storage',
			'Advanced templates',
			'Priority support',
		],
		color: 'text-sky-400',
	},
	team: {
		name: 'Team',
		price: 19.99,
		features: [
			'Unlimited mind maps',
			'25 collaborators',
			'25GB storage',
			'Team management',
			'Advanced analytics',
			'Priority support',
		],
		color: 'text-purple-400',
	},
	enterprise: {
		name: 'Enterprise',
		price: null,
		features: [
			'Unlimited everything',
			'Unlimited collaborators',
			'Unlimited storage',
			'Custom integrations',
			'Dedicated support',
			'SLA guarantee',
		],
		color: 'text-amber-400',
	},
};

export default function BillingSettingsPage() {
	const [isLoading, setIsLoading] = useState(false);

	// Mock data
	const subscription : Subscription={
		id: 'sub_123',
		plan: 'pro',
		status: 'active',
		currentPeriodStart: '2024-03-01',
		currentPeriodEnd: '2024-04-01',
		cancelAtPeriodEnd: false,
	};

	const usage: Usage = {
		mindMaps: { used: 23, limit: -1 }, // -1 means unlimited
		collaborators: { used: 3, limit: 5 },
		storage: { used: 1250, limit: 5120 }, // in MB
		exports: { used: 45, limit: 100 },
	};

	const paymentMethods : PaymentMethod[]=[
		{
			id: 'pm_123',
			type: 'card',
			brand: 'visa',
			last4: '4242',
			expiryMonth: 12,
			expiryYear: 2025,
			isDefault: true,
		},
		{
			id: 'pm_456',
			type: 'paypal',
			isDefault: false,
		},
	];

	const invoices:Invoice[]=[
		{
			id: 'inv_123',
			number: 'INV-2024-001',
			amount: 9.99,
			currency: 'USD',
			status: 'paid',
			date: '2024-03-01',
			downloadUrl: '#',
		},
		{
			id: 'inv_124',
			number: 'INV-2024-002',
			amount: 9.99,
			currency: 'USD',
			status: 'paid',
			date: '2024-02-01',
			downloadUrl: '#',
		},
	];

	const handleCancelSubscription = async () => {
		setIsLoading(true);

		try {
			// TODO: Implement subscription cancellation
			toast.success(
				'Subscription will be canceled at the end of the billing period'
			);
		} catch {
			toast.error('Failed to cancel subscription');
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpgrade = (plan: string) => {
		// TODO: Implement upgrade flow
		toast.success(`Upgrading to ${plan} plan...`);
	};

	const formatStorageSize = (mb: number) => {
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)}GB`;
		}

		return `${mb}MB`;
	};

	const getUsagePercentage = (used: number, limit: number) => {
		if (limit === -1) return 0; // Unlimited
		return Math.min((used / limit) * 100, 100);
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			active: {
				color: 'bg-green-900/50 text-green-200 border-green-700/50',
				label: 'Active',
			},
			canceled: {
				color: 'bg-red-900/50 text-red-200 border-red-700/50',
				label: 'Canceled',
			},
			past_due: {
				color: 'bg-orange-900/50 text-orange-200 border-orange-700/50',
				label: 'Past Due',
			},
			trialing: {
				color: 'bg-blue-900/50 text-blue-200 border-blue-700/50',
				label: 'Trial',
			},
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
		return <Badge className={config.color}>{config.label}</Badge>;
	};

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div>
				<h2 className='text-2xl font-bold text-white'>
					Billing & Subscription
				</h2>

				<p className='text-zinc-400 mt-1'>
					Manage your subscription, usage, and billing information
				</p>
			</div>

			{/* Current Plan */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Star className='size-5' />
						Current Plan
					</CardTitle>

					<CardDescription>
						Your current subscription and billing status
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<div>
								<h3
									className={`text-lg font-semibold ${planFeatures[subscription.plan].color}`}
								>
									{planFeatures[subscription.plan].name}
								</h3>

								<p className='text-zinc-400'>
									{planFeatures[subscription.plan].price ? (
										<>${planFeatures[subscription.plan].price}/month</>
									) : (
										'Custom pricing'
									)}
								</p>
							</div>

							{getStatusBadge(subscription.status)}
						</div>

						{subscription.plan !== 'enterprise' && (
							<Button
								onClick={() => handleUpgrade('team')}
								className='bg-sky-600 hover:bg-sky-700'
							>
								<Zap className='size-4 mr-2' />
								Upgrade
							</Button>
						)}
					</div>

					<Separator className='bg-zinc-700' />

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
						<div>
							<span className='text-zinc-400'>Billing period:</span>

							<p className='text-white flex gap-1'>
								<span>
									{new Date(
										subscription.currentPeriodStart
									).toLocaleDateString()}
								</span>

								<span>-</span>

								<span>
									{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
								</span>
							</p>
						</div>

						<div>
							<span className='text-zinc-400'>Next billing date:</span>

							<p className='text-white'>
								{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
							</p>
						</div>
					</div>

					{subscription.cancelAtPeriodEnd && (
						<div className='p-3 bg-orange-950/30 border border-orange-800/30 rounded-lg flex items-center gap-2'>
							<AlertTriangle className='size-4 text-orange-400' />

							<span className='text-orange-200 text-sm flex gap-1'>
								<span>Your subscription will be canceled on</span>

								<span>
									{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
								</span>
							</span>
						</div>
					)}

					<div className='flex flex-wrap gap-2'>
						{planFeatures[subscription.plan].features.map((feature, index) => (
							<Badge
								key={index}
								variant='secondary'
								className='bg-zinc-800 text-zinc-300'
							>
								<Check className='size-3 mr-1' />

								{feature}
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Usage */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>Usage</CardTitle>

					<CardDescription>
						Your current usage for this billing period
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-6'>
					<div className='space-y-4'>
						<div>
							<div className='flex items-center justify-between mb-2'>
								<span className='text-white'>Mind Maps</span>

								<span className='text-zinc-400 flex gap-1'>
									<span>{usage.mindMaps.used} </span>

									<span>
										{usage.mindMaps.limit === -1
											? ''
											: `/ ${usage.mindMaps.limit}`}
									</span>
								</span>
							</div>

							{usage.mindMaps.limit !== -1 && (
								<Progress
									value={getUsagePercentage(
										usage.mindMaps.used,
										usage.mindMaps.limit
									)}
								/>
							)}
						</div>

						<div>
							<div className='flex items-center justify-between mb-2'>
								<span className='text-white'>Collaborators</span>

								<span className='text-zinc-400'>
									{usage.collaborators.used} /{' '}

									{usage.collaborators.limit}
								</span>
							</div>

							<Progress
								value={getUsagePercentage(
									usage.collaborators.used,
									usage.collaborators.limit
								)}
							/>
						</div>

						<div>
							<div className='flex items-center justify-between mb-2'>
								<span className='text-white'>Storage</span>

								<span className='text-zinc-400 flex gap-1'>
									<span>{formatStorageSize(usage.storage.used)}</span>

									<span>/</span>

									<span>{formatStorageSize(usage.storage.limit)}</span>
								</span>
							</div>

							<Progress
								value={getUsagePercentage(
									usage.storage.used,
									usage.storage.limit
								)}
							/>
						</div>

						<div>
							<div className='flex items-center justify-between mb-2'>
								<span className='text-white'>Exports this month</span>

								<span className='text-zinc-400 gap-1 flex'>
									<span>{usage.exports.used}</span>

									<span>/</span>

									<span>{usage.exports.limit}</span>
								</span>
							</div>

							<Progress
								value={getUsagePercentage(
									usage.exports.used,
									usage.exports.limit
								)}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Payment Methods */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<CreditCard className='size-5' />

						<span>Payment Methods</span>
					</CardTitle>

					<CardDescription>Manage your payment methods</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					{paymentMethods.map((method) => (
						<div
							key={method.id}
							className='flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg'
						>
							<div className='flex items-center gap-3'>
								{method.type === 'card' ? (
									<CreditCard className='size-5 text-zinc-400' />
								) : (
									<div className='size-5 bg-blue-600 rounded' />
								)}

								<div>
									{method.type === 'card' ? (
										<>
											<p className='text-white'>
												•••• •••• •••• {method.last4}
											</p>

											<p className='text-sm text-zinc-400 flex gap-1'>
												<span>{method.brand?.toUpperCase()}</span>

												<span>• Expires</span>

												<span className='flex gap-1'>
													<span>{method.expiryMonth}</span>

													<span>/</span>

													<span>{method.expiryYear}</span>
												</span>
											</p>
										</>
									) : (
										<>
											<p className='text-white'>PayPal</p>

											<p className='text-sm text-zinc-400'>
												Connected payment method
											</p>
										</>
									)}
								</div>
							</div>

							<div className='flex items-center gap-2'>
								{method.isDefault && (
									<Badge
										variant='secondary'
										className='bg-sky-900/50 text-sky-200 border-sky-700/50'
									>
										Default
									</Badge>
								)}

								<Button variant='outline' size='sm'>
									Edit
								</Button>
							</div>
						</div>
					))}

					<Button variant='outline' className='w-full'>
						Add Payment Method
					</Button>
				</CardContent>
			</Card>

			{/* Billing History */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Calendar className='size-5' />

						<span>Billing History</span>
					</CardTitle>

					<CardDescription>
						Download your invoices and view payment history
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					{invoices.map((invoice) => (
						<div
							key={invoice.id}
							className='flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg'
						>
							<div className='flex items-center gap-4'>
								<div>
									<p className='text-white font-medium'>{invoice.number}</p>

									<p className='text-sm text-zinc-400'>
										{new Date(invoice.date).toLocaleDateString()}
									</p>
								</div>

								<Badge
									className={
										invoice.status === 'paid'
											? 'bg-green-900/50 text-green-200 border-green-700/50'
											: invoice.status === 'pending'
												? 'bg-yellow-900/50 text-yellow-200 border-yellow-700/50'
												: 'bg-red-900/50 text-red-200 border-red-700/50'
									}
								>
									{invoice.status}
								</Badge>
							</div>

							<div className='flex items-center gap-4'>
								<span className='text-white font-medium'>
									<span className='flex gap-1'>
										<span>${invoice.amount}</span>

										<span>{invoice.currency}</span>
									</span>
								</span>

								<Button variant='outline' size='sm'>
									<Download className='size-4 mr-2' />
									Download
								</Button>
							</div>
						</div>
					))}

					<Button variant='outline' className='w-full'>
						<ExternalLink className='size-4 mr-2' />
						View All Invoices
					</Button>
				</CardContent>
			</Card>

			{/* Cancel Subscription */}
			{subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
				<Card className='bg-zinc-900 border-zinc-700'>
					<CardHeader>
						<CardTitle className='text-red-400'>Cancel Subscription</CardTitle>

						<CardDescription>
							Cancel your subscription and downgrade to the free plan
						</CardDescription>
					</CardHeader>

					<CardContent>
						<div className='flex items-center justify-between p-4 bg-red-950/20 rounded-lg border border-red-800/30'>
							<div>
								<p className='text-red-200 font-medium'>
									Cancel your subscription
								</p>

								<p className='text-sm text-red-300/70'>
									You&apos;ll keep access until the end of your billing period
								</p>
							</div>

							<Button
								variant='destructive'
								size='sm'
								onClick={handleCancelSubscription}
								disabled={isLoading}
							>
								{isLoading ? 'Canceling...' : 'Cancel Subscription'}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
