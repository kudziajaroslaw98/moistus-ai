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
import useAppStore from '@/store/mind-map-store';
import {
	AlertTriangle,
	Calendar,
	Check,
	Download,
	ExternalLink,
	Star,
	Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

interface PaymentHistoryItem {
	id: string;
	stripe_payment_intent_id: string | null;
	amount: number;
	currency: string;
	status: string;
	description: string | null;
	created_at: string;
}

interface UsageStats {
	mindMapsCount: number;
	collaboratorsCount: number;
	storageUsedMB: number;
	aiSuggestionsCount: number;
}

export default function BillingSettingsPage() {
	const {
		currentSubscription,
		availablePlans,
		isLoadingSubscription,
		fetchUserSubscription,
		fetchAvailablePlans,
		cancelSubscription,
	} = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			availablePlans: state.availablePlans,
			isLoadingSubscription: state.isLoadingSubscription,
			fetchUserSubscription: state.fetchUserSubscription,
			fetchAvailablePlans: state.fetchAvailablePlans,
			cancelSubscription: state.cancelSubscription,
		}))
	);

	const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
		[]
	);
	const [usage, setUsage] = useState<UsageStats | null>(null);
	const [isLoadingPayments, setIsLoadingPayments] = useState(true);
	const [isLoadingUsage, setIsLoadingUsage] = useState(true);
	const [isCanceling, setIsCanceling] = useState(false);

	// Load subscription and plans data
	useEffect(() => {
		fetchUserSubscription();
		fetchAvailablePlans();
	}, [fetchUserSubscription, fetchAvailablePlans]);

	// Load payment history
	useEffect(() => {
		const loadPaymentHistory = async () => {
			try {
				const response = await fetch('/api/user/billing/payment-history');
				if (!response.ok) throw new Error('Failed to fetch payment history');

				const result = await response.json();
				setPaymentHistory(result.data || []);
			} catch (error) {
				console.error('Error loading payment history:', error);
				toast.error('Failed to load payment history');
			} finally {
				setIsLoadingPayments(false);
			}
		};

		loadPaymentHistory();
	}, []);

	// Load usage statistics
	useEffect(() => {
		const loadUsage = async () => {
			try {
				const response = await fetch('/api/user/billing/usage');
				if (!response.ok) throw new Error('Failed to fetch usage');

				const result = await response.json();
				setUsage(result.data);
			} catch (error) {
				console.error('Error loading usage:', error);
				toast.error('Failed to load usage statistics');
			} finally {
				setIsLoadingUsage(false);
			}
		};

		loadUsage();
	}, []);

	const handleCancelSubscription = async () => {
		if (!currentSubscription) return;

		setIsCanceling(true);

		try {
			await cancelSubscription(currentSubscription.id);
			toast.success(
				'Subscription will be canceled at the end of the billing period'
			);
		} catch {
			toast.error('Failed to cancel subscription');
		} finally {
			setIsCanceling(false);
		}
	};

	const handleUpgrade = () => {
		// TODO: Implement upgrade flow with Stripe
		toast.info('Upgrade flow coming soon!');
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
		const statusConfig: Record<
			string,
			{ color: string; label: string }
		> = {
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

		const config = statusConfig[status] || statusConfig.active;
		return <Badge className={config.color}>{config.label}</Badge>;
	};

	if (isLoadingSubscription || isLoadingUsage) {
		return (
			<div className='flex items-center justify-center min-h-96'>
				<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500' />
			</div>
		);
	}

	// Get current plan details
	const currentPlan = currentSubscription?.plan;
	const isFreeTier = !currentSubscription;

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
								<h3 className='text-lg font-semibold text-sky-400'>
									{isFreeTier ? 'Free' : currentPlan?.displayName || 'Unknown'}
								</h3>

								<p className='text-zinc-400'>
									{isFreeTier ? (
										'$0/month'
									) : currentPlan?.priceMonthly ? (
										<>${currentPlan.priceMonthly}/month</>
									) : (
										'Custom pricing'
									)}
								</p>
							</div>

							{currentSubscription && getStatusBadge(currentSubscription.status)}
						</div>

						{isFreeTier && (
							<Button
								className='bg-sky-600 hover:bg-sky-700'
								onClick={handleUpgrade}
							>
								<Zap className='size-4 mr-2' />
								Upgrade
							</Button>
						)}
					</div>

					{currentSubscription && (
						<>
							<Separator className='bg-zinc-700' />

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
								<div>
									<span className='text-zinc-400'>Billing period:</span>

									<p className='text-white flex gap-1'>
										<span>
											{currentSubscription.currentPeriodStart
												? new Date(
														currentSubscription.currentPeriodStart
													).toLocaleDateString()
												: 'N/A'}
										</span>

										<span>-</span>

										<span>
											{currentSubscription.currentPeriodEnd
												? new Date(
														currentSubscription.currentPeriodEnd
													).toLocaleDateString()
												: 'N/A'}
										</span>
									</p>
								</div>

								<div>
									<span className='text-zinc-400'>Next billing date:</span>

									<p className='text-white'>
										{currentSubscription.currentPeriodEnd
											? new Date(
													currentSubscription.currentPeriodEnd
												).toLocaleDateString()
											: 'N/A'}
									</p>
								</div>
							</div>

							{currentSubscription.cancelAtPeriodEnd && (
								<div className='p-3 bg-orange-950/30 border border-orange-800/30 rounded-lg flex items-center gap-2'>
									<AlertTriangle className='size-4 text-orange-400' />

									<span className='text-orange-200 text-sm flex gap-1'>
										<span>Your subscription will be canceled on</span>

										<span>
											{currentSubscription.currentPeriodEnd
												? new Date(
														currentSubscription.currentPeriodEnd
													).toLocaleDateString()
												: 'N/A'}
										</span>
									</span>
								</div>
							)}

							{currentPlan?.features && currentPlan.features.length > 0 && (
								<div className='flex flex-wrap gap-2'>
									{currentPlan.features.map((feature, index) => (
										<Badge
											className='bg-zinc-800 text-zinc-300'
											key={index}
											variant='secondary'
										>
											<Check className='size-3 mr-1' />

											{feature}
										</Badge>
									))}
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Usage */}
			{usage && (
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
										<span>{usage.mindMapsCount} </span>

										<span>
											{currentPlan?.limits?.mindMaps === -1
												? ''
												: `/ ${currentPlan?.limits?.mindMaps ?? '∞'}`}
										</span>
									</span>
								</div>

								{currentPlan?.limits?.mindMaps !== -1 && (
									<Progress
										value={getUsagePercentage(
											usage.mindMapsCount,
											currentPlan?.limits?.mindMaps ?? 0
										)}
									/>
								)}
							</div>

							<div>
								<div className='flex items-center justify-between mb-2'>
									<span className='text-white'>Collaborators</span>

									<span className='text-zinc-400 flex gap-1'>
										<span>{usage.collaboratorsCount}</span>

										<span>/</span>

										<span>∞</span>
									</span>
								</div>
							</div>

							<div>
								<div className='flex items-center justify-between mb-2'>
									<span className='text-white'>Storage</span>

									<span className='text-zinc-400 flex gap-1'>
										<span>{formatStorageSize(usage.storageUsedMB)}</span>

										<span>/</span>

										<span>∞</span>
									</span>
								</div>
							</div>

							<div>
								<div className='flex items-center justify-between mb-2'>
									<span className='text-white'>AI Suggestions Used</span>

									<span className='text-zinc-400 gap-1 flex'>
										<span>{usage.aiSuggestionsCount}</span>

										<span>
											{currentPlan?.limits?.aiSuggestions === -1
												? ''
												: `/ ${currentPlan?.limits?.aiSuggestions ?? '∞'}`}
										</span>
									</span>
								</div>

								{currentPlan?.limits?.aiSuggestions !== -1 && (
									<Progress
										value={getUsagePercentage(
											usage.aiSuggestionsCount,
											currentPlan?.limits?.aiSuggestions ?? 0
										)}
									/>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Billing History */}
			{!isLoadingPayments && paymentHistory.length > 0 && (
				<Card className='bg-zinc-900 border-zinc-700'>
					<CardHeader>
						<CardTitle className='text-white flex items-center gap-2'>
							<Calendar className='size-5' />

							<span>Billing History</span>
						</CardTitle>

						<CardDescription>
							Your recent payment transactions
						</CardDescription>
					</CardHeader>

					<CardContent className='space-y-4'>
						{paymentHistory.slice(0, 10).map((payment) => (
							<div
								className='flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg'
								key={payment.id}
							>
								<div className='flex items-center gap-4'>
									<div>
										<p className='text-white font-medium'>
											{payment.description || 'Payment'}
										</p>

										<p className='text-sm text-zinc-400'>
											{new Date(payment.created_at).toLocaleDateString()}
										</p>
									</div>

									<Badge
										className={
											payment.status === 'succeeded'
												? 'bg-green-900/50 text-green-200 border-green-700/50'
												: payment.status === 'pending'
													? 'bg-yellow-900/50 text-yellow-200 border-yellow-700/50'
													: 'bg-red-900/50 text-red-200 border-red-700/50'
										}
									>
										{payment.status}
									</Badge>
								</div>

								<div className='flex items-center gap-4'>
									<span className='text-white font-medium'>
										<span className='flex gap-1'>
											<span>${payment.amount.toFixed(2)}</span>

											<span>{payment.currency.toUpperCase()}</span>
										</span>
									</span>

									<Button size='sm' variant='outline'>
										<Download className='size-4 mr-2' />
										Invoice
									</Button>
								</div>
							</div>
						))}

						{paymentHistory.length > 10 && (
							<Button className='w-full' variant='outline'>
								<ExternalLink className='size-4 mr-2' />
								View All Transactions
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{/* Cancel Subscription */}
			{currentSubscription &&
				currentSubscription.status === 'active' &&
				!currentSubscription.cancelAtPeriodEnd && (
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
									disabled={isCanceling}
									size='sm'
									variant='destructive'
									onClick={handleCancelSubscription}
								>
									{isCanceling ? 'Canceling...' : 'Cancel Subscription'}
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
		</div>
	);
}
