'use client';

import { SidePanel } from '@/components/side-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/user-avatar';
import useAppStore from '@/store/mind-map-store';
import { UserProfileFormData } from '@/types/user-profile-types';
import {
	CreditCard,
	Palette,
	Save,
	Settings,
	Shield,
	Trash2,
	User,
	Star,
	Calendar,
	Download,
	ExternalLink,
	AlertTriangle,
	BarChart3,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { Progress } from '@/components/ui/progress';
import { NodeTypeSelector } from '@/components/settings/node-type-selector';
import { PenTool } from 'lucide-react';

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

interface SettingsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	defaultTab?: 'settings' | 'billing';
}

export function SettingsPanel({
	isOpen,
	onClose,
	defaultTab = 'settings',
}: SettingsPanelProps) {
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		updateUserProfile,
		clearProfileError,
		unsubscribeFromProfileChanges,
		currentSubscription,
		availablePlans,
		isLoadingSubscription,
		fetchUserSubscription,
		fetchAvailablePlans,
		cancelSubscription,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			updateUserProfile: state.updateUserProfile,
			clearProfileError: state.clearProfileError,
			unsubscribeFromProfileChanges: state.unsubscribeFromProfileChanges,
			currentSubscription: state.currentSubscription,
			availablePlans: state.availablePlans,
			isLoadingSubscription: state.isLoadingSubscription,
			fetchUserSubscription: state.fetchUserSubscription,
			fetchAvailablePlans: state.fetchAvailablePlans,
			cancelSubscription: state.cancelSubscription,
		}))
	);

	const [isSaving, setIsSaving] = useState(false);
	const [activeTab, setActiveTab] = useState(defaultTab);

	// Billing State
	const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
	const [usage, setUsage] = useState<UsageStats | null>(null);
	const [isLoadingPayments, setIsLoadingPayments] = useState(false);
	const [isLoadingUsage, setIsLoadingUsage] = useState(false);
	const [paymentsLoaded, setPaymentsLoaded] = useState(false);
	const [usageLoaded, setUsageLoaded] = useState(false);
	const [isCanceling, setIsCanceling] = useState(false);

	const [formData, setFormData] = useState<UserProfileFormData>({
		full_name: '',
		display_name: '',
		bio: '',
		preferences: {
			theme: 'system',
			accentColor: 'sky',
			reducedMotion: false,
			defaultNodeType: 'defaultNode',
			privacy: {
				profile_visibility: 'private',
			},
		},
	});

	// Load user profile on mount
	useEffect(() => {
		if (isOpen) {
			loadUserProfile();
		}
	}, [isOpen, loadUserProfile]);

	// Load billing data when billing tab is active
	useEffect(() => {
		if (!isOpen || activeTab !== 'billing') return;

		fetchUserSubscription();
		fetchAvailablePlans();

		// Use AbortController to cancel requests on unmount/re-render
		const abortController = new AbortController();

		const loadPaymentHistory = async () => {
			// Skip if already loaded or currently loading
			if (paymentsLoaded || isLoadingPayments) return;

			setIsLoadingPayments(true);

			try {
				const response = await fetch('/api/user/billing/payment-history', {
					signal: abortController.signal,
				});

				// Guard against aborted requests
				if (abortController.signal.aborted) return;

				if (!response.ok) throw new Error('Failed to fetch payment history');
				const result = await response.json();

				// Guard again before setState
				if (abortController.signal.aborted) return;

				setPaymentHistory(result.data || []);
				setPaymentsLoaded(true);
			} catch (error) {
				// Ignore abort errors
				if (error instanceof Error && error.name === 'AbortError') return;

				// Guard before showing toast/setState
				if (abortController.signal.aborted) return;

				console.error('Error loading payment history:', error);
				toast.error('Failed to load payment history');
			} finally {
				// Guard before setState
				if (!abortController.signal.aborted) {
					setIsLoadingPayments(false);
				}
			}
		};

		const loadUsage = async () => {
			// Skip if already loaded or currently loading
			if (usageLoaded || isLoadingUsage) return;

			setIsLoadingUsage(true);

			try {
				const response = await fetch('/api/user/billing/usage', {
					signal: abortController.signal,
				});

				// Guard against aborted requests
				if (abortController.signal.aborted) return;

				if (!response.ok) throw new Error('Failed to fetch usage');
				const result = await response.json();

				// Guard again before setState
				if (abortController.signal.aborted) return;

				setUsage(result.data);
				setUsageLoaded(true);
			} catch (error) {
				// Ignore abort errors
				if (error instanceof Error && error.name === 'AbortError') return;

				// Guard before showing toast/setState
				if (abortController.signal.aborted) return;

				console.error('Error loading usage:', error);
				toast.error('Failed to load usage statistics');
			} finally {
				// Guard before setState
				if (!abortController.signal.aborted) {
					setIsLoadingUsage(false);
				}
			}
		};

		loadPaymentHistory();
		loadUsage();

		// Cleanup: abort all in-flight requests
		return () => {
			abortController.abort();
		};
	}, [
		isOpen,
		activeTab,
		fetchUserSubscription,
		fetchAvailablePlans,
		paymentsLoaded,
		usageLoaded,
		isLoadingPayments,
		isLoadingUsage,
	]);

	// Update active tab when defaultTab changes
	useEffect(() => {
		if (isOpen) {
			setActiveTab(defaultTab);
		}
	}, [isOpen, defaultTab]);

	// Update form data when profile loads
	useEffect(() => {
		if (userProfile) {
			setFormData({
				full_name: userProfile.full_name,
				display_name: userProfile.display_name || '',
				bio: userProfile.bio || '',
				preferences: {
					theme: userProfile.preferences?.theme || 'system',
					accentColor: userProfile.preferences?.accentColor || 'sky',
					reducedMotion: userProfile.preferences?.reducedMotion || false,
					defaultNodeType: userProfile.preferences?.defaultNodeType || 'defaultNode',
					privacy: {
						profile_visibility:
							userProfile.preferences?.privacy?.profile_visibility || 'public',
					},
				},
			});
		}
	}, [userProfile]);

	// Show profile errors as toasts
	useEffect(() => {
		if (profileError) {
			toast.error('Profile Error', {
				description: profileError,
			});
			clearProfileError();
		}
	}, [profileError, clearProfileError]);

	// Cleanup subscription on unmount
	useEffect(() => {
		return () => {
			unsubscribeFromProfileChanges();
		};
	}, [unsubscribeFromProfileChanges]);

	const handleSave = async () => {
		if (!userProfile) {
			toast.error('No profile loaded');
			return;
		}

		setIsSaving(true);

		try {
			// Convert form data to UserProfileUpdate format
			const updates = {
				full_name: formData.full_name,
				display_name: formData.display_name,
				bio: formData.bio,
				preferences: formData.preferences,
			};

			await updateUserProfile(updates);
			toast.success('Settings updated successfully!');
		} catch (error) {
			console.error('Failed to save settings:', error);
			toast.error('Failed to save settings');
		} finally {
			setIsSaving(false);
		}
	};


	const updateFormData = (field: string, value: unknown) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const updateNestedFormData = (
		section: 'preferences',
		field: string,
		value: unknown
	) => {
		setFormData((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[field]: value,
			},
		}));
	};

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
		if (limit === -1 || limit === 0) return 0; // Unlimited or not set
		return Math.min((used / limit) * 100, 100);
	};

	const getStatusBadge = (status: string) => {
		const statusConfig: Record<string, { color: string; label: string }> = {
			active: {
				color: 'bg-success-900/50 text-success-200 border-success-700/50',
				label: 'Active',
			},
			canceled: {
				color: 'bg-error-900/50 text-error-200 border-error-700/50',
				label: 'Canceled',
			},
			past_due: {
				color: 'bg-warning-900/50 text-warning-200 border-warning-700/50',
				label: 'Past Due',
			},
			trialing: {
				color: 'bg-primary-900/50 text-primary-200 border-primary-700/50',
				label: 'Trial',
			},
		};

		const config = statusConfig[status] || statusConfig.active;
		return <Badge className={config.color}>{config.label}</Badge>;
	};

	const footer = (
		<div className='flex w-full justify-end gap-2'>
			<Button variant='ghost' onClick={onClose}>
				Cancel
			</Button>
			<Button
				className='bg-primary hover:bg-primary/90 text-primary-foreground'
				disabled={isSaving || isLoadingProfile}
				onClick={handleSave}
			>
				{isSaving ? (
					<>
						<span className='animate-spin mr-2'>⏳</span> Saving...
					</>
				) : (
					<>
						<Save className='size-4 mr-2' /> Save Changes
					</>
				)}
			</Button>
		</div>
	);

	return (
		<SidePanel
			isOpen={isOpen}
			onClose={onClose}
			title='Settings'
			footer={footer}
			className='w-full sm:max-w-2xl'
		>
			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as 'settings' | 'billing')}
				className='w-full flex flex-col h-full'
			>
				<div className='px-6 pt-4 pb-2'>
					<TabsList className='w-full grid grid-cols-2'>
						<TabsTrigger value='settings' className='flex items-center gap-2'>
							<Settings className='size-4' />
							Settings
						</TabsTrigger>
						<TabsTrigger value='billing' className='flex items-center gap-2'>
							<CreditCard className='size-4' />
							Billing
						</TabsTrigger>
					</TabsList>
				</div>

				<div className='flex-1 overflow-y-auto px-6 pb-6'>
					{isLoadingProfile ? (
						<div className='flex items-center justify-center py-12'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
						</div>
					) : (
						<>
							{/* SETTINGS TAB */}
							<TabsContent value='settings' className='space-y-6 mt-0'>
								{/* Profile Section */}
								<motion.section
									animate={{ opacity: 1, y: 0 }}
									className='space-y-4'
									initial={{ opacity: 0, y: 10 }}
									transition={{ duration: 0.3 }}
								>
									<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
										<User className='size-5 text-primary' /> Profile
									</h3>
									<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
										{/* Avatar - Generated from user ID */}
										<div className='flex items-center gap-6 pb-4 border-b border-border-subtle'>
											<UserAvatar size='2xl' user={userProfile} />
											<div className='space-y-1'>
												<p className='text-sm font-medium text-text-primary'>
													Profile Avatar
												</p>
												<p className='text-xs text-text-secondary'>
													Your avatar is automatically generated based on your account.
												</p>
											</div>
										</div>

										{/* Form Fields */}
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											<div className='space-y-2'>
												<Label htmlFor='full_name'>Full Name</Label>
												<Input
													id='full_name'
													onChange={(e) =>
														updateFormData('full_name', e.target.value)
													}
													value={formData.full_name}
												/>
											</div>
											<div className='space-y-2'>
												<Label htmlFor='display_name'>Display Name</Label>
												<Input
													id='display_name'
													onChange={(e) =>
														updateFormData('display_name', e.target.value)
													}
													value={formData.display_name}
												/>
											</div>
										</div>

										<div className='space-y-2'>
											<Label htmlFor='bio'>Bio</Label>
											<Textarea
												id='bio'
												onChange={(e) => updateFormData('bio', e.target.value)}
												placeholder='Tell us about yourself...'
												rows={3}
												value={formData.bio}
											/>
										</div>
									</div>
								</motion.section>

								{/* Privacy Section */}
								<motion.section
									animate={{ opacity: 1, y: 0 }}
									className='space-y-4'
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.1, duration: 0.3 }}
								>
									<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
										<Shield className='size-5 text-primary' /> Privacy
									</h3>
									<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
										<div className='space-y-2'>
											<Label>Profile visibility</Label>
											<Select
												value={formData.preferences.privacy.profile_visibility}
												onValueChange={(value) =>
													updateNestedFormData('preferences', 'privacy', {
														...formData.preferences.privacy,
														profile_visibility: value,
													})
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='public'>
														Public - Anyone can see your profile
													</SelectItem>
													<SelectItem value='connections'>
														Connections only
													</SelectItem>
													<SelectItem value='private'>
														Private - Only you can see your profile
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
								</motion.section>

								{/* Appearance Section */}
								<motion.section
									animate={{ opacity: 1, y: 0 }}
									className='space-y-4'
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.2, duration: 0.3 }}
								>
									<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
										<Palette className='size-5 text-primary' /> Appearance
									</h3>
									<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
										<div className='space-y-2'>
											<Label>Theme</Label>
											<Select
												value={formData.preferences.theme}
												onValueChange={(value) =>
													updateNestedFormData('preferences', 'theme', value)
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='light'>Light</SelectItem>
													<SelectItem value='dark'>Dark</SelectItem>
													<SelectItem value='system'>System</SelectItem>
												</SelectContent>
											</Select>
										</div>

										<div className='flex items-center justify-between'>
											<div className='space-y-0.5'>
												<Label>Reduced Motion</Label>
												<p className='text-xs text-text-secondary'>
													Minimize animations
												</p>
											</div>
											<Button
												variant={
													formData.preferences.reducedMotion
														? 'default'
														: 'outline'
												}
												size='sm'
												onClick={() =>
													updateNestedFormData(
														'preferences',
														'reducedMotion',
														!formData.preferences.reducedMotion
													)
												}
											>
												{formData.preferences.reducedMotion ? 'On' : 'Off'}
											</Button>
										</div>
									</div>
								</motion.section>

								{/* Editor Section */}
								<motion.section
									animate={{ opacity: 1, y: 0 }}
									className='space-y-4'
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.25, duration: 0.3 }}
								>
									<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
										<PenTool className='size-5 text-primary' /> Editor
									</h3>
									<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
										<div className='space-y-2'>
											<Label>Default Node Type</Label>
											<p className='text-xs text-text-secondary'>
												The default type for new nodes when using the node editor
											</p>
											<NodeTypeSelector
												disabled={isSaving || isLoadingProfile}
												value={formData.preferences.defaultNodeType}
												onChange={(value) =>
													updateNestedFormData('preferences', 'defaultNodeType', value)
												}
											/>
										</div>
									</div>
								</motion.section>

								{/* Security Section */}
								<motion.section
									animate={{ opacity: 1, y: 0 }}
									className='space-y-4'
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.35, duration: 0.3 }}
								>
									<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
										<Shield className='size-5 text-primary' /> Security
									</h3>
									<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
										<div className='flex items-center justify-between p-3 bg-base rounded-lg border border-border-subtle'>
											<div>
												<Label>Change Password</Label>
												<p className='text-xs text-text-secondary'>
													Update your password
												</p>
											</div>
											<Button size='sm' variant='outline'>
												Update
											</Button>
										</div>

										<div className='flex items-center justify-between p-3 bg-base rounded-lg border border-border-subtle'>
											<div>
												<Label>Two-Factor Auth</Label>
												<p className='text-xs text-text-secondary'>
													Add extra security
												</p>
											</div>
											<Button size='sm' variant='outline'>
												Enable
											</Button>
										</div>

										<Separator className='bg-border-subtle' />

										<div className='flex items-center justify-between p-3 bg-error-900/10 rounded-lg border border-error-900/20'>
											<div>
												<Label className='text-error-500'>
													Delete Account
												</Label>
												<p className='text-xs text-error-500/70'>
													Permanently delete data
												</p>
											</div>
											<Button
												size='sm'
												variant='destructive'
												className='bg-error-600 hover:bg-error-700'
											>
												<Trash2 className='size-4 mr-2' />
												Delete
											</Button>
										</div>
									</div>
								</motion.section>
							</TabsContent>

							{/* BILLING TAB */}
							<TabsContent value='billing' className='space-y-6 mt-0'>
								{isLoadingSubscription ? (
									<div className='flex items-center justify-center py-12'>
										<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
									</div>
								) : (
									<>
										{/* Current Plan */}
										<motion.section
											animate={{ opacity: 1, y: 0 }}
											className='space-y-4'
											initial={{ opacity: 0, y: 10 }}
											transition={{ duration: 0.3 }}
										>
											<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
												<Star className='size-5 text-primary' />
												Current Plan
											</h3>
											<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
												<div className='flex items-center justify-between'>
													<div className='flex items-center gap-4'>
														<div>
															<p className='text-lg font-semibold text-primary'>
																{!currentSubscription ? 'Free' : currentSubscription.plan?.displayName || 'Unknown'}
															</p>
															<p className='text-sm text-text-secondary'>
																{!currentSubscription ? (
																	'$0/month'
																) : currentSubscription.plan?.priceMonthly ? (
																	<>${currentSubscription.plan.priceMonthly}/month</>
																) : (
																	'Custom pricing'
																)}
															</p>
														</div>
														{currentSubscription && getStatusBadge(currentSubscription.status)}
													</div>
													{!currentSubscription && (
														<Button
															className='bg-primary hover:bg-primary/90'
															onClick={handleUpgrade}
														>
															<Star className='size-4 mr-2' />
															Upgrade
														</Button>
													)}
												</div>

												{currentSubscription && (
													<>
														<Separator className='bg-border-subtle' />
														<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
															<div>
																<span className='text-text-secondary'>Billing period:</span>
																<p className='text-text-primary flex gap-1'>
																	<span>
																		{currentSubscription.currentPeriodStart
																			? new Date(currentSubscription.currentPeriodStart).toLocaleDateString()
																			: 'N/A'}
																	</span>
																	<span>-</span>
																	<span>
																		{currentSubscription.currentPeriodEnd
																			? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
																			: 'N/A'}
																	</span>
																</p>
															</div>
															<div>
																<span className='text-text-secondary'>Next billing date:</span>
																<p className='text-text-primary'>
																	{currentSubscription.currentPeriodEnd
																		? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
																		: 'N/A'}
																</p>
															</div>
														</div>

														{currentSubscription.cancelAtPeriodEnd && (
															<div className='p-3 bg-warning-900/30 border border-warning-800/30 rounded-lg flex items-center gap-2'>
																<AlertTriangle className='size-4 text-warning-400' />
																<span className='text-warning-200 text-sm flex gap-1'>
																	<span>Your subscription will be canceled on</span>
																	<span>
																		{currentSubscription.currentPeriodEnd
																			? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
																			: 'N/A'}
																	</span>
																</span>
															</div>
														)}
													</>
												)}
											</div>
										</motion.section>

										{/* Usage */}
										{usage && (
											<motion.section
												animate={{ opacity: 1, y: 0 }}
												className='space-y-4'
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.1, duration: 0.3 }}
											>
												<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
													<BarChart3 className='size-5 text-primary' />
													Usage
												</h3>
												<div className='space-y-6 bg-surface rounded-lg p-4 border border-border-subtle'>
													<div className='space-y-4'>
														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>Mind Maps</span>
																<span className='text-text-secondary flex gap-1'>
																	<span>{usage.mindMapsCount} </span>
																	<span>
																		{currentSubscription?.plan?.limits?.mindMaps === -1
																			? ''
																			: `/ ${currentSubscription?.plan?.limits?.mindMaps ?? '∞'}`}
																	</span>
																</span>
															</div>
															{currentSubscription?.plan?.limits &&
																currentSubscription.plan.limits.mindMaps != null &&
																currentSubscription.plan.limits.mindMaps !== -1 && (
																	<Progress
																		value={getUsagePercentage(
																			usage.mindMapsCount,
																			currentSubscription.plan.limits.mindMaps
																		)}
																	/>
																)}
														</div>

														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>Collaborators</span>
																<span className='text-text-secondary flex gap-1'>
																	<span>{usage.collaboratorsCount}</span>
																	<span>/</span>
																	<span>∞</span>
																</span>
															</div>
														</div>

														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>Storage</span>
																<span className='text-text-secondary flex gap-1'>
																	<span>{formatStorageSize(usage.storageUsedMB)}</span>
																	<span>/</span>
																	<span>∞</span>
																</span>
															</div>
														</div>

														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>AI Suggestions Used</span>
																<span className='text-text-secondary gap-1 flex'>
																	<span>{usage.aiSuggestionsCount}</span>
																	<span>
																		{currentSubscription?.plan?.limits?.aiSuggestions === -1
																			? ''
																			: `/ ${currentSubscription?.plan?.limits?.aiSuggestions ?? '∞'}`}
																	</span>
																</span>
															</div>
															{currentSubscription?.plan?.limits &&
																currentSubscription.plan.limits.aiSuggestions != null &&
																currentSubscription.plan.limits.aiSuggestions !== -1 && (
																	<Progress
																		value={getUsagePercentage(
																			usage.aiSuggestionsCount,
																			currentSubscription.plan.limits.aiSuggestions
																		)}
																	/>
																)}
														</div>
													</div>
												</div>
											</motion.section>
										)}

										{/* Billing History */}
										{!isLoadingPayments && paymentHistory.length > 0 && (
											<motion.section
												animate={{ opacity: 1, y: 0 }}
												className='space-y-4'
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.2, duration: 0.3 }}
											>
												<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
													<Calendar className='size-5 text-primary' />
													Billing History
												</h3>
												<div className='space-y-4 bg-surface rounded-lg p-4 border border-border-subtle'>
													{paymentHistory.slice(0, 10).map((payment) => (
														<div
															className='flex items-center justify-between p-4 bg-base rounded-lg border border-border-subtle'
															key={payment.id}
														>
															<div className='flex items-center gap-4'>
																<div>
																	<p className='text-text-primary font-medium'>
																		{payment.description || 'Payment'}
																	</p>
																	<p className='text-sm text-text-secondary'>
																		{new Date(payment.created_at).toLocaleDateString()}
																	</p>
																</div>
																<Badge
																	className={
																		payment.status === 'succeeded'
																			? 'bg-success-900/50 text-success-200 border-success-700/50'
																			: payment.status === 'pending'
																				? 'bg-warning-900/50 text-warning-200 border-warning-700/50'
																				: 'bg-error-900/50 text-error-200 border-error-700/50'
																	}
																>
																	{payment.status}
																</Badge>
															</div>
															<div className='flex items-center gap-4'>
																<span className='text-text-primary font-medium'>
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
												</div>
											</motion.section>
										)}

										{/* Cancel Subscription */}
										{currentSubscription &&
											currentSubscription.status === 'active' &&
											!currentSubscription.cancelAtPeriodEnd && (
												<motion.section
													animate={{ opacity: 1, y: 0 }}
													className='space-y-4'
													initial={{ opacity: 0, y: 10 }}
													transition={{ delay: 0.3, duration: 0.3 }}
												>
													<h3 className='text-lg font-semibold text-error-500'>
														Cancel Subscription
													</h3>
													<div className='bg-surface rounded-lg p-4 border border-border-subtle'>
														<div className='flex items-center justify-between p-4 bg-error-950/20 rounded-lg border border-error-800/30'>
															<div>
																<p className='text-error-200 font-medium'>
																	Cancel your subscription
																</p>
																<p className='text-sm text-error-300/70'>
																	You&apos;ll keep access until the end of your billing period
																</p>
															</div>
															<Button
																disabled={isCanceling}
																onClick={handleCancelSubscription}
																size='sm'
																variant='destructive'
															>
																{isCanceling ? 'Canceling...' : 'Cancel Subscription'}
															</Button>
														</div>
													</div>
												</motion.section>
											)}
									</>
								)}
							</TabsContent>
						</>
					)}
				</div>
			</Tabs>
		</SidePanel>
	);
}
