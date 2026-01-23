'use client';

import {
	DeleteAccountDialog,
	DeleteAccountImpactStats,
} from '@/components/account/delete-account-dialog';
import { NodeTypeSelector } from '@/components/settings/node-type-selector';
import { SidePanel } from '@/components/side-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { UserProfileFormData } from '@/types/user-profile-types';
import {
	AlertTriangle,
	BarChart3,
	CreditCard,
	ExternalLink,
	Palette,
	PenTool,
	Save,
	Settings,
	Shield,
	Star,
	Trash2,
	User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

interface UsageStats {
	mindMapsCount: number;
	collaboratorsCount: number;
	storageUsedMB: number;
	aiSuggestionsCount: number;
	billingPeriod?: {
		start: string;
		end: string;
	};
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
	const router = useRouter();

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
		isTrialing,
		getTrialDaysRemaining,
		setPopoverOpen,
		resetStore,
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
			isTrialing: state.isTrialing,
			getTrialDaysRemaining: state.getTrialDaysRemaining,
			setPopoverOpen: state.setPopoverOpen,
			resetStore: state.reset,
		}))
	);

	const [isSaving, setIsSaving] = useState(false);
	const [activeTab, setActiveTab] = useState(defaultTab);

	// Delete account state
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeletingAccount, setIsDeletingAccount] = useState(false);
	const [deleteImpactStats, setDeleteImpactStats] =
		useState<DeleteAccountImpactStats | null>(null);

	// Get limits with proper free tier fallback
	const { limits: planLimits } = useSubscriptionLimits();

	// Billing State
	const [usage, setUsage] = useState<UsageStats | null>(null);
	const [isLoadingUsage, setIsLoadingUsage] = useState(false);
	const [usageLoaded, setUsageLoaded] = useState(false);
	const [isCanceling, setIsCanceling] = useState(false);
	const [isOpeningPortal, setIsOpeningPortal] = useState(false);

	// Refs to track loading state without triggering effect re-runs
	const isLoadingUsageRef = useRef(false);

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

	// Reset billing state when panel closes
	useEffect(() => {
		if (!isOpen) {
			setUsageLoaded(false);
			setUsage(null);
			isLoadingUsageRef.current = false;
		}
	}, [isOpen]);

	// Load billing data when billing tab is active
	useEffect(() => {
		if (!isOpen || activeTab !== 'billing') return;

		fetchUserSubscription();
		fetchAvailablePlans();

		const loadUsage = async () => {
			// Skip if already loaded or currently loading (use ref to avoid race condition)
			if (usageLoaded || isLoadingUsageRef.current) return;

			isLoadingUsageRef.current = true;
			setIsLoadingUsage(true);

			try {
				const response = await fetch('/api/user/billing/usage');

				if (!response.ok) throw new Error('Failed to fetch usage');
				const result = await response.json();

				setUsage(result.data);
				setUsageLoaded(true);
			} catch (error) {
				console.error('Error loading usage:', error);
				toast.error('Failed to load usage statistics');
			} finally {
				// Always reset loading ref so retries can happen
				isLoadingUsageRef.current = false;
				setIsLoadingUsage(false);
			}
		};

		loadUsage();
	}, [
		isOpen,
		activeTab,
		fetchUserSubscription,
		fetchAvailablePlans,
		usageLoaded,
		// Note: isLoadingUsage removed from deps to avoid race condition
		// Using refs instead to track loading state without triggering effect re-runs
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
					defaultNodeType:
						userProfile.preferences?.defaultNodeType || 'defaultNode',
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
		setPopoverOpen({ upgradeUser: true });
	};

	const handleOpenBillingPortal = () => {
		setIsOpeningPortal(true);
		// SDK's CustomerPortal handles redirect automatically
		window.location.href = '/api/user/billing/portal';
	};

	const handleOpenDeleteDialog = async () => {
		// Fetch impact stats for the dialog
		try {
			const response = await fetch('/api/user/billing/usage');
			if (response.ok) {
				const result = await response.json();
				setDeleteImpactStats({
					mindMapsCount: result.data?.mindMapsCount ?? 0,
					hasActiveSubscription:
						currentSubscription?.status === 'active' ||
						currentSubscription?.status === 'trialing',
				});
			} else {
				// Use defaults if fetch fails
				setDeleteImpactStats({
					mindMapsCount: 0,
					hasActiveSubscription:
						currentSubscription?.status === 'active' ||
						currentSubscription?.status === 'trialing',
				});
			}
		} catch {
			// Use defaults on error
			setDeleteImpactStats({
				mindMapsCount: 0,
				hasActiveSubscription:
					currentSubscription?.status === 'active' ||
					currentSubscription?.status === 'trialing',
			});
		}
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteAccount = async () => {
		if (!userProfile?.email) {
			toast.error('Unable to delete account', {
				description: 'No email address found for your account.',
			});
			return;
		}

		setIsDeletingAccount(true);

		try {
			const response = await fetch('/api/user/delete', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ confirmEmail: userProfile.email }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete account');
			}

			// Successfully deleted - clean up and redirect
			resetStore();
			await mutate(() => true, undefined, { revalidate: false });
			router.push('/');
			toast.success('Account deleted', {
				description: 'Your account has been permanently deleted.',
			});
		} catch (error) {
			console.error('Account deletion failed:', error);
			toast.error('Failed to delete account', {
				description:
					error instanceof Error
						? error.message
						: 'Please try again or contact support.',
			});
		} finally {
			setIsDeletingAccount(false);
			setIsDeleteDialogOpen(false);
		}
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
							<TabsContent value='settings' className='space-y-8 mt-0'>
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
									<div className='space-y-4'>
										{/* Avatar - Generated from user ID */}
										<div className='flex items-center gap-6'>
											<UserAvatar size='2xl' user={userProfile} />
											<div className='space-y-1'>
												<p className='text-sm font-medium text-text-primary'>
													Profile Avatar
												</p>
												<p className='text-xs text-text-secondary'>
													Your avatar is automatically generated based on your
													account.
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

								<Separator className='bg-border-subtle/50' />

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
								</motion.section>

								<Separator className='bg-border-subtle/50' />

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
									<div className='space-y-4'>
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

								<Separator className='bg-border-subtle/50' />

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
									<div className='space-y-2'>
										<Label>Default Node Type</Label>
										<p className='text-xs text-text-secondary'>
											The default type for new nodes when using the node editor
										</p>
										<NodeTypeSelector
											disabled={isSaving || isLoadingProfile}
											value={formData.preferences.defaultNodeType}
											onChange={(value) =>
												updateNestedFormData(
													'preferences',
													'defaultNodeType',
													value
												)
											}
										/>
									</div>
								</motion.section>

								<Separator className='bg-border-subtle/50' />

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
									<div className='space-y-4'>
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

										<div className='flex items-center justify-between p-3 bg-error-900/10 rounded-lg border border-error-900/20'>
											<div>
												<Label className='text-error-500'>Delete Account</Label>
												<p className='text-xs text-error-500/70'>
													Permanently delete data
												</p>
											</div>
											<Button
												size='sm'
												variant='destructive'
												className='bg-error-600 hover:bg-error-700'
												onClick={handleOpenDeleteDialog}
											>
												<Trash2 className='size-4 mr-2' />
												Delete
											</Button>
										</div>
									</div>
								</motion.section>
							</TabsContent>

							{/* BILLING TAB */}
							<TabsContent value='billing' className='space-y-8 mt-0'>
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
											<div className='space-y-4'>
												<div className='flex items-center justify-between'>
													<div className='flex items-center gap-4'>
														<div>
															<p className='text-lg font-semibold text-primary'>
																{!currentSubscription
																	? 'Free'
																	: currentSubscription.plan?.displayName ||
																		'Unknown'}
															</p>
															<p className='text-sm text-text-secondary'>
																{!currentSubscription ? (
																	'$0/month'
																) : currentSubscription.plan?.priceMonthly ? (
																	<>
																		${currentSubscription.plan.priceMonthly}
																		/month
																	</>
																) : (
																	'Custom pricing'
																)}
															</p>
														</div>
														{currentSubscription &&
															getStatusBadge(currentSubscription.status)}
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
														<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
															<div>
																<span className='text-text-secondary'>
																	Billing period:
																</span>
																<p className='text-text-primary flex gap-1'>
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
																<span className='text-text-secondary'>
																	Next billing date:
																</span>
																<p className='text-text-primary'>
																	{currentSubscription.currentPeriodEnd
																		? new Date(
																				currentSubscription.currentPeriodEnd
																			).toLocaleDateString()
																		: 'N/A'}
																</p>
															</div>
														</div>

														{currentSubscription.cancelAtPeriodEnd && (
															<div className='p-3 bg-warning-900/30 border border-warning-800/30 rounded-lg flex items-center gap-2'>
																<AlertTriangle className='size-4 text-warning-400' />
																<span className='text-warning-200 text-sm flex gap-1'>
																	<span>
																		Your subscription will be canceled on
																	</span>
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
													</>
												)}
											</div>
										</motion.section>

										<Separator className='bg-border-subtle/50' />

										{/* Trial Indicator */}
										{isTrialing() && (
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className='p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-3'
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.05, duration: 0.3 }}
											>
												<Star className='size-5 text-primary shrink-0' />
												<div className='flex-1'>
													<p className='text-primary font-medium text-sm'>
														Trial Active
													</p>
													<p className='text-primary/70 text-xs'>
														{(() => {
															const days = getTrialDaysRemaining();
															if (days === null) return 'Trial period active';
															if (days === 0) return 'Trial ends today';
															if (days === 1) return 'Trial ends tomorrow';
															return `${days} days remaining`;
														})()}
													</p>
												</div>
												{getTrialDaysRemaining() !== null &&
													getTrialDaysRemaining()! <= 3 && (
														<Badge className='bg-warning-900/50 text-warning-200 border-warning-700/50'>
															Ending Soon
														</Badge>
													)}
											</motion.div>
										)}

										{/* Usage */}
										<motion.section
											animate={{ opacity: 1, y: 0 }}
											className='space-y-4'
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.1, duration: 0.3 }}
										>
											<div className='flex items-center justify-between'>
												<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
													<BarChart3 className='size-5 text-primary' />
													Usage
												</h3>
												{usage?.billingPeriod && (
													<span className='text-xs text-text-secondary'>
														Resets{' '}
														{new Date(
															usage.billingPeriod.end
														).toLocaleDateString()}
													</span>
												)}
											</div>
											<div className='space-y-4'>
												{isLoadingUsage ? (
													<div className='flex items-center justify-center py-8'>
														<div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary' />
													</div>
												) : usage ? (
													<>
														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>
																	Mind Maps
																</span>
																<span className='text-text-secondary flex gap-1'>
																	<span>{usage.mindMapsCount} </span>
																	<span>
																		{planLimits.mindMaps === -1
																			? '/ ∞'
																			: `/ ${planLimits.mindMaps}`}
																	</span>
																</span>
															</div>
															{planLimits.mindMaps !== -1 && (
																<Progress
																	value={getUsagePercentage(
																		usage.mindMapsCount,
																		planLimits.mindMaps
																	)}
																/>
															)}
														</div>

														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>
																	Collaborators per Map
																</span>
																<span className='text-text-secondary flex gap-1'>
																	<span>{usage.collaboratorsCount}</span>
																	<span>
																		{planLimits.collaboratorsPerMap === -1
																			? '/ ∞'
																			: `/ ${planLimits.collaboratorsPerMap}`}
																	</span>
																</span>
															</div>
															{planLimits.collaboratorsPerMap !== -1 && (
																<Progress
																	value={getUsagePercentage(
																		usage.collaboratorsCount,
																		planLimits.collaboratorsPerMap
																	)}
																/>
															)}
														</div>


														<div>
															<div className='flex items-center justify-between mb-2'>
																<span className='text-text-primary'>
																	AI Suggestions
																</span>
																{planLimits.aiSuggestions === 0 ? (
																	<span className='text-text-tertiary text-sm'>
																		Not available on Free
																	</span>
																) : (
																	<span className='text-text-secondary gap-1 flex'>
																		<span>{usage.aiSuggestionsCount}</span>
																		<span>
																			{planLimits.aiSuggestions === -1
																				? '/ ∞'
																				: `/ ${planLimits.aiSuggestions}`}
																		</span>
																	</span>
																)}
															</div>
															{planLimits.aiSuggestions !== -1 &&
																planLimits.aiSuggestions > 0 && (
																	<Progress
																		value={getUsagePercentage(
																			usage.aiSuggestionsCount,
																			planLimits.aiSuggestions
																		)}
																	/>
																)}
														</div>
													</>
												) : (
													<div className='text-center py-6 text-text-secondary'>
														<BarChart3 className='size-8 mx-auto mb-2 opacity-50' />
														<p>Unable to load usage data</p>
													</div>
												)}
											</div>
										</motion.section>

										<Separator className='bg-border-subtle/50' />

										{/* Manage Billing */}
										{currentSubscription && (
											<motion.section
												animate={{ opacity: 1, y: 0 }}
												className='space-y-4'
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.25, duration: 0.3 }}
											>
												<div>
													<Button
														className='w-full'
														variant='outline'
														onClick={handleOpenBillingPortal}
														disabled={isOpeningPortal}
													>
														{isOpeningPortal ? (
															<>
																<div className='size-4 mr-2 animate-spin rounded-full border-2 border-text-secondary border-t-transparent' />
																Opening...
															</>
														) : (
															<>
																<CreditCard className='size-4 mr-2' />
																Manage Billing
															</>
														)}
													</Button>
													<p className='text-xs text-text-secondary mt-2 text-center'>
														Update payment methods, view invoices, and manage
														subscription
													</p>
												</div>
											</motion.section>
										)}

										{/* Cancel Subscription */}
										{currentSubscription &&
											currentSubscription.status === 'active' &&
											!currentSubscription.cancelAtPeriodEnd && (
												<>
													<Separator className='bg-border-subtle/50' />
													<motion.section
														animate={{ opacity: 1, y: 0 }}
														className='space-y-4'
														initial={{ opacity: 0, y: 10 }}
														transition={{ delay: 0.3, duration: 0.3 }}
													>
														<h3 className='text-lg font-semibold text-error-500'>
															Cancel Subscription
														</h3>
														<div className='flex items-center justify-between p-4 bg-error-950/20 rounded-lg border border-error-800/30'>
															<div>
																<p className='text-error-200 font-medium'>
																	Cancel your subscription
																</p>
																<p className='text-sm text-error-300/70'>
																	You&apos;ll keep access until the end of your
																	billing period
																</p>
															</div>
															<Button
																disabled={isCanceling}
																onClick={handleCancelSubscription}
																size='sm'
																variant='destructive'
															>
																{isCanceling
																	? 'Canceling...'
																	: 'Cancel Subscription'}
															</Button>
														</div>
													</motion.section>
												</>
											)}
									</>
								)}
							</TabsContent>
						</>
					)}
				</div>
			</Tabs>

			{/* Delete Account Dialog */}
			<DeleteAccountDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				onConfirm={handleDeleteAccount}
				userEmail={userProfile?.email || ''}
				isDeleting={isDeletingAccount}
				impactStats={deleteImpactStats}
			/>
		</SidePanel>
	);
}
