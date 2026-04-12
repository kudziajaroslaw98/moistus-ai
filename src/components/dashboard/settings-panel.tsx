'use client';

import {
	DeleteAccountDialog,
	DeleteAccountImpactStats,
} from '@/components/account/delete-account-dialog';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';
import { CancelSubscriptionDialog } from '@/components/dashboard/cancel-subscription-dialog';
import { DiscardAccountSettingsChangesDialog } from '@/components/dashboard/discard-account-settings-changes-dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import type {
	UserProfile,
	UserProfileFormData,
} from '@/types/user-profile-types';
import {
	AlertTriangle,
	BarChart3,
	CreditCard,
	Download,
	Loader2,
	Mail,
	Palette,
	PenTool,
	Save,
	Settings,
	Shield,
	Star,
	Trash2,
	User,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

const FULL_NAME_MAX_LENGTH = 255;
const DISPLAY_NAME_MAX_LENGTH = 100;
const BIO_MAX_LENGTH = 500;

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
	defaultTab?: 'account' | 'billing';
}

interface SectionMotionProps {
	initial: false | { opacity: number; y?: number };
	animate: { opacity: number; y?: number };
	transition: { delay: number; duration: number; ease?: 'easeOut' };
}

function normalizeText(value: string | null | undefined): string {
	return (value || '').trim();
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; i += 1) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray.buffer as ArrayBuffer;
}

function createFormDataFromProfile(profile: UserProfile): UserProfileFormData {
	return {
		full_name: profile.full_name || '',
		display_name: profile.display_name || '',
		bio: profile.bio || '',
		preferences: {
			theme: profile.preferences?.theme || 'system',
			accentColor: profile.preferences?.accentColor || 'sky',
			reducedMotion: profile.preferences?.reducedMotion || false,
			notifications: {
				email: profile.preferences?.notifications?.email ?? true,
				push: profile.preferences?.notifications?.push ?? false,
				push_comments: profile.preferences?.notifications?.push_comments ?? true,
				push_mentions: profile.preferences?.notifications?.push_mentions ?? true,
				push_reactions: profile.preferences?.notifications?.push_reactions ?? true,
			},
			defaultNodeType: profile.preferences?.defaultNodeType || 'defaultNode',
			privacy: {
				profile_visibility:
					profile.preferences?.privacy?.profile_visibility || 'public',
			},
		},
	};
}

export function SettingsPanel({
	isOpen,
	onClose,
	defaultTab = 'account',
}: SettingsPanelProps) {
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		updateUserProfile,
		clearProfileError,
		unsubscribeFromProfileChanges,
		isLoggingOut,
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
			isLoggingOut: state.isLoggingOut,
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
	const [isPushToggleBusy, setIsPushToggleBusy] = useState(false);
	const [activeTab, setActiveTab] = useState(defaultTab);
	const [showDiscardDialog, setShowDiscardDialog] = useState(false);

	// Delete account state
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeletingAccount, setIsDeletingAccount] = useState(false);
	const [deleteImpactStats, setDeleteImpactStats] =
		useState<DeleteAccountImpactStats | null>(null);

	// Change password modal state
	const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

	// Data export state
	const [isExporting, setIsExporting] = useState(false);

	// Billing State
	const [usage, setUsage] = useState<UsageStats | null>(null);
	const [isLoadingUsage, setIsLoadingUsage] = useState(false);
	const [usageLoaded, setUsageLoaded] = useState(false);
	const [isCanceling, setIsCanceling] = useState(false);
	const [isOpeningPortal, setIsOpeningPortal] = useState(false);
	const [showCancelSubscriptionDialog, setShowCancelSubscriptionDialog] =
		useState(false);

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
			notifications: {
				email: true,
				push: false,
				push_comments: true,
				push_mentions: true,
				push_reactions: true,
			},
			defaultNodeType: 'defaultNode',
			privacy: {
				profile_visibility: 'private',
			},
		},
	});

	const [hasChanges, setHasChanges] = useState(false);
	const [fullNameTouched, setFullNameTouched] = useState(false);
	const [displayNameTouched, setDisplayNameTouched] = useState(false);
	const [bioTouched, setBioTouched] = useState(false);

	// Get limits with proper free tier fallback
	const { limits: planLimits } = useSubscriptionLimits();

	const fullNameCharCount = formData.full_name.length;
	const displayNameCharCount = formData.display_name.length;
	const bioCharCount = formData.bio.length;

	const normalizedFullName = normalizeText(formData.full_name);
	const normalizedDisplayName = normalizeText(formData.display_name);
	const normalizedBio = normalizeText(formData.bio);

	const isFullNameValid =
		normalizedFullName.length > 0 &&
		normalizedFullName.length <= FULL_NAME_MAX_LENGTH;
	const isDisplayNameValid =
		normalizedDisplayName.length <= DISPLAY_NAME_MAX_LENGTH;
	const isBioValid = normalizedBio.length <= BIO_MAX_LENGTH;
	const isFormValid = isFullNameValid && isDisplayNameValid && isBioValid;

	const fullNameError =
		normalizedFullName.length === 0
			? 'Full name is required'
			: `Full name must be ${FULL_NAME_MAX_LENGTH} characters or less`;
	const displayNameError = `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or less`;
	const bioError = `Bio must be ${BIO_MAX_LENGTH} characters or less`;

	const getSectionMotionProps = (delay: number): SectionMotionProps => {
		if (shouldReduceMotion) {
			return {
				initial: { opacity: 1 },
				animate: { opacity: 1 },
				transition: { delay: 0, duration: 0 },
			};
		}

		return {
			initial: { opacity: 0, y: 10 },
			animate: { opacity: 1, y: 0 },
			transition: { delay, duration: 0.25, ease: 'easeOut' },
		};
	};

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
			setFormData(createFormDataFromProfile(userProfile));
			setHasChanges(false);
			setShowDiscardDialog(false);
			setFullNameTouched(false);
			setDisplayNameTouched(false);
			setBioTouched(false);
		}
	}, [userProfile]);

	// Track account form changes
	useEffect(() => {
		if (!userProfile) {
			setHasChanges(false);
			return;
		}

		const baselineFormData = createFormDataFromProfile(userProfile);
		const hasChanged =
			normalizedFullName !== normalizeText(baselineFormData.full_name) ||
			normalizedDisplayName !== normalizeText(baselineFormData.display_name) ||
			normalizedBio !== normalizeText(baselineFormData.bio) ||
			JSON.stringify(formData.preferences) !==
				JSON.stringify(baselineFormData.preferences);

		setHasChanges(hasChanged);
	}, [
		formData.preferences,
		normalizedBio,
		normalizedDisplayName,
		normalizedFullName,
		userProfile,
	]);

	// Show profile errors as toasts (suppress during logout to prevent spam)
	useEffect(() => {
		if (profileError && !isLoggingOut) {
			toast.error('Profile Error', {
				description: profileError,
			});
			clearProfileError();
		}
	}, [profileError, clearProfileError, isLoggingOut]);

	// Cleanup subscription on unmount
	useEffect(() => {
		return () => {
			unsubscribeFromProfileChanges();
		};
	}, [unsubscribeFromProfileChanges]);

	const requestClose = () => {
		if (isSaving) return;
		if (hasChanges) {
			setShowDiscardDialog(true);
			return;
		}
		onClose();
	};

	const handleDiscardChanges = () => {
		if (userProfile) {
			setFormData(createFormDataFromProfile(userProfile));
		}
		setHasChanges(false);
		setFullNameTouched(false);
		setDisplayNameTouched(false);
		setBioTouched(false);
		setShowDiscardDialog(false);
		onClose();
	};

	const handleSave = async () => {
		if (!userProfile) {
			toast.error('No profile loaded');
			return;
		}

		setFullNameTouched(true);
		setDisplayNameTouched(true);
		setBioTouched(true);

		if (!isFormValid || !hasChanges || isSaving) return;

		const baselineFormData = createFormDataFromProfile(userProfile);
		const updates: {
			full_name?: string;
			display_name?: string;
			bio?: string;
			preferences?: UserProfileFormData['preferences'];
		} = {};

		if (normalizedFullName !== normalizeText(baselineFormData.full_name)) {
			updates.full_name = normalizedFullName;
		}

		if (
			normalizedDisplayName !== normalizeText(baselineFormData.display_name)
		) {
			updates.display_name = normalizedDisplayName;
		}

		if (normalizedBio !== normalizeText(baselineFormData.bio)) {
			updates.bio = normalizedBio;
		}

		if (
			JSON.stringify(formData.preferences) !==
			JSON.stringify(baselineFormData.preferences)
		) {
			updates.preferences = formData.preferences;
		}

		if (Object.keys(updates).length === 0) {
			setHasChanges(false);
			return;
		}

		setIsSaving(true);

		try {
			await updateUserProfile(updates);
			setFormData((prev) => ({
				...prev,
				full_name: normalizedFullName,
				display_name: normalizedDisplayName,
				bio: normalizedBio,
			}));
			setHasChanges(false);
			toast.success('Settings updated successfully!');
		} catch (error) {
			console.error('Failed to save settings:', error);
			toast.error('Failed to save settings');
		} finally {
			setIsSaving(false);
		}
	};

	const enablePushNotifications = async (): Promise<boolean> => {
		if (typeof window === 'undefined') {
			return false;
		}
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			toast.error('Push notifications are not supported in this browser.');
			return false;
		}

		const keyResponse = await fetch('/api/push/public-key');
		if (!keyResponse.ok) {
			toast.error('Push notifications are not configured for this environment.');
			return false;
		}
		const keyPayload = (await keyResponse.json()) as {
			data?: { publicKey?: string };
		};
		const publicKey = keyPayload.data?.publicKey;
		if (!publicKey) {
			toast.error('Push public key is missing.');
			return false;
		}

		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			toast.error('Notification permission was not granted.');
			return false;
		}

		const registration = await navigator.serviceWorker.ready;
		const existingSubscription = await registration.pushManager.getSubscription();
		const subscription =
				existingSubscription ??
				(await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToArrayBuffer(publicKey),
				}));

		const response = await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				subscription: subscription.toJSON(),
			}),
		});

		if (!response.ok) {
			toast.error('Failed to register push subscription.');
			return false;
		}

		return true;
	};

	const disablePushNotifications = async (): Promise<boolean> => {
		if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
			return true;
		}

		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			return true;
		}

		const endpoint = subscription.endpoint;
		const response = await fetch('/api/push/subscribe', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				endpoint,
			}),
		});

		const unsubscribeResult = await subscription.unsubscribe();
		if (!response.ok) {
			toast.error('Failed to remove push subscription on server.');
			return false;
		}

		return unsubscribeResult;
	};

	const updateFormData = (
		field: 'full_name' | 'display_name' | 'bio',
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const updateNestedFormData = <
		K extends keyof UserProfileFormData['preferences'],
	>(
		section: 'preferences',
		field: K,
		value: UserProfileFormData['preferences'][K]
	) => {
		setFormData((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[field]: value,
			} as UserProfileFormData['preferences'],
		}));
	};

	const openCancelSubscriptionDialog = () => {
		if (isCanceling) return;
		setShowCancelSubscriptionDialog(true);
	};

	const handleCancelSubscription = async () => {
		if (!currentSubscription || isCanceling) return;

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
			setShowCancelSubscriptionDialog(false);
		}
	};

	const handleUpgrade = () => {
		setPopoverOpen({ upgradeUser: true });
	};

	const handleOpenBillingPortal = () => {
		setIsOpeningPortal(true);
		window.location.href = '/api/user/billing/portal';
	};

	const handleOpenDeleteDialog = async () => {
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
				setDeleteImpactStats({
					mindMapsCount: 0,
					hasActiveSubscription:
						currentSubscription?.status === 'active' ||
						currentSubscription?.status === 'trialing',
				});
			}
		} catch {
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

			let result: { error?: string } = {};
			const contentType = response.headers.get('content-type');
			const hasJsonContent = contentType?.includes('application/json');

			if (response.status !== 204 && hasJsonContent) {
				try {
					result = await response.json();
				} catch {
					result = {};
				}
			}

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete account');
			}

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

	const handleExportData = async () => {
		setIsExporting(true);
		try {
			const response = await fetch('/api/user/export');
			if (!response.ok) {
				const result = await response.json().catch(() => ({}));
				throw new Error(
					(result as { error?: string }).error || 'Export failed'
				);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download =
				response.headers
					.get('Content-Disposition')
					?.match(/filename="(.+)"/)?.[1] || 'shiko-data-export.json';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success('Data exported successfully');
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to export data'
			);
		} finally {
			setIsExporting(false);
		}
	};

	const getUsagePercentage = (used: number, limit: number) => {
		if (limit === -1 || limit === 0) return 0;
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

	const footerStatus = hasChanges
		? isFormValid
			? 'You have unsaved account changes'
			: 'Fix account validation errors to save changes'
		: 'All account changes are saved';

	const footer = (
		<div className='flex w-full items-center justify-between gap-3'>
			<p className='text-xs text-text-secondary'>{footerStatus}</p>
			<div className='flex gap-2'>
				<Button disabled={isSaving} onClick={requestClose} variant='ghost'>
					Cancel
				</Button>
				<Button
					className='bg-primary text-primary-foreground hover:bg-primary/90'
					disabled={isSaving || isLoadingProfile || !hasChanges || !isFormValid}
					onClick={handleSave}
				>
					{isSaving ? (
						<>
							<Loader2 className='mr-2 size-4 animate-spin' /> Saving...
						</>
					) : (
						<>
							<Save className='mr-2 size-4' /> Save Changes
						</>
					)}
				</Button>
			</div>
		</div>
	);

	return (
		<>
			<SidePanel
				className='w-full sm:max-w-sm md:max-w-md'
				footer={footer}
				isOpen={isOpen}
				onClose={requestClose}
				title='Account'
			>
				<Tabs
					className='flex h-full w-full flex-col'
					onValueChange={(v) => setActiveTab(v as 'account' | 'billing')}
					value={activeTab}
				>
					<div className='px-6 pb-2 pt-4'>
						<TabsList className='grid w-full grid-cols-2'>
							<TabsTrigger className='flex items-center gap-2' value='account'>
								<Settings className='size-4' />
								Account
							</TabsTrigger>
							<TabsTrigger className='flex items-center gap-2' value='billing'>
								<CreditCard className='size-4' />
								Billing
							</TabsTrigger>
						</TabsList>
					</div>

					<div className='flex-1 overflow-y-auto px-6 pb-6'>
						{isLoadingProfile ? (
							<div className='flex items-center justify-center py-12'>
								<div className='h-8 w-8 animate-spin rounded-full border-b-2 border-primary' />
							</div>
						) : (
							<>
								<TabsContent className='mt-0 space-y-4' value='account'>
									<motion.section
										{...getSectionMotionProps(0)}
										className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
									>
										<div className='space-y-1'>
											<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
												<User className='size-5 text-primary' /> Profile
											</h3>
											<p className='text-xs text-text-secondary'>
												Manage your identity and public profile details.
											</p>
										</div>

										<div className='flex items-center gap-6 rounded-lg border border-border-subtle bg-base p-3'>
											<UserAvatar size='2xl' user={userProfile} />
											<div className='space-y-1'>
												<p className='text-sm font-medium text-text-primary'>
													Profile Avatar
												</p>
												<p className='text-xs text-text-secondary'>
													Automatically generated based on your account.
												</p>
											</div>
										</div>

										<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
											<div className='space-y-2'>
												<div className='flex items-center justify-between gap-3'>
													<Label htmlFor='full_name'>Full Name</Label>
													<span
														className={`text-xs tabular-nums ${
															fullNameCharCount > FULL_NAME_MAX_LENGTH
																? 'text-error-500'
																: 'text-text-secondary'
														}`}
													>
														{fullNameCharCount}/{FULL_NAME_MAX_LENGTH}
													</span>
												</div>
												<Input
													disabled={isSaving || isLoadingProfile}
													error={fullNameTouched && !isFullNameValid}
													id='full_name'
													onBlur={() => setFullNameTouched(true)}
													onChange={(e) =>
														updateFormData('full_name', e.target.value)
													}
													value={formData.full_name}
												/>
												{fullNameTouched && !isFullNameValid && (
													<p className='text-xs text-error-500' role='alert'>
														{fullNameError}
													</p>
												)}
											</div>

											<div className='space-y-2'>
												<div className='flex items-center justify-between gap-3'>
													<Label htmlFor='display_name'>Display Name</Label>
													<span
														className={`text-xs tabular-nums ${
															displayNameCharCount > DISPLAY_NAME_MAX_LENGTH
																? 'text-error-500'
																: 'text-text-secondary'
														}`}
													>
														{displayNameCharCount}/{DISPLAY_NAME_MAX_LENGTH}
													</span>
												</div>
												<Input
													disabled={isSaving || isLoadingProfile}
													error={displayNameTouched && !isDisplayNameValid}
													id='display_name'
													onBlur={() => setDisplayNameTouched(true)}
													onChange={(e) =>
														updateFormData('display_name', e.target.value)
													}
													value={formData.display_name}
												/>
												{displayNameTouched && !isDisplayNameValid && (
													<p className='text-xs text-error-500' role='alert'>
														{displayNameError}
													</p>
												)}
											</div>
										</div>

										<div className='space-y-2'>
											<div className='flex items-center justify-between gap-3'>
												<Label htmlFor='bio'>Bio</Label>
												<span
													className={`text-xs tabular-nums ${
														bioCharCount > BIO_MAX_LENGTH
															? 'text-error-500'
															: 'text-text-secondary'
													}`}
												>
													{bioCharCount}/{BIO_MAX_LENGTH}
												</span>
											</div>
											<Textarea
												disabled={isSaving || isLoadingProfile}
												error={bioTouched && !isBioValid}
												id='bio'
												onBlur={() => setBioTouched(true)}
												onChange={(e) => updateFormData('bio', e.target.value)}
												placeholder='Tell us about yourself...'
												rows={3}
												value={formData.bio}
											/>
											<p className='text-xs text-text-secondary'>
												Optional short bio displayed on shared profile surfaces.
											</p>
											{bioTouched && !isBioValid && (
												<p className='text-xs text-error-500' role='alert'>
													{bioError}
												</p>
											)}
										</div>
									</motion.section>

									<motion.section
										{...getSectionMotionProps(0.05)}
										className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
									>
										<div className='space-y-1'>
											<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
												<Shield className='size-5 text-primary' /> Privacy
											</h3>
											<p className='text-xs text-text-secondary'>
												Control who can view your profile information.
											</p>
										</div>
										<div className='space-y-2'>
											<Label>Profile visibility</Label>
											<Select
												disabled={isSaving || isLoadingProfile}
												onValueChange={(value) => {
													if (isSaving || isLoadingProfile) return;
													updateNestedFormData('preferences', 'privacy', {
														...formData.preferences.privacy,
														profile_visibility: value as NonNullable<
															UserProfileFormData['preferences']['privacy']
														>['profile_visibility'],
													});
												}}
												value={formData.preferences.privacy.profile_visibility}
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

									<motion.section
										{...getSectionMotionProps(0.1)}
										className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
									>
										<div className='space-y-1'>
											<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
												<Palette className='size-5 text-primary' /> Appearance
											</h3>
											<p className='text-xs text-text-secondary'>
												Set your interface defaults and motion preferences.
											</p>
										</div>
										<div className='space-y-4'>
											<div className='space-y-2'>
												<Label>Theme</Label>
												<Select
													disabled={isSaving || isLoadingProfile}
													onValueChange={(value) => {
														if (isSaving || isLoadingProfile) return;
														updateNestedFormData(
															'preferences',
															'theme',
															value as UserProfileFormData['preferences']['theme']
														);
													}}
													value={formData.preferences.theme}
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

											<div className='flex items-center justify-between rounded-lg border border-border-subtle bg-base p-3'>
												<div className='space-y-0.5'>
													<Label>Reduced Motion</Label>
													<p className='text-xs text-text-secondary'>
														Minimize animations
													</p>
												</div>
												<Button
													aria-label={`Reduce motion ${formData.preferences.reducedMotion ? 'on' : 'off'}`}
													aria-pressed={formData.preferences.reducedMotion}
													disabled={isSaving || isLoadingProfile}
													onClick={() => {
														if (isSaving || isLoadingProfile) return;
														updateNestedFormData(
															'preferences',
															'reducedMotion',
															!formData.preferences.reducedMotion
														);
													}}
													size='sm'
													variant={
														formData.preferences.reducedMotion
															? 'default'
															: 'outline'
													}
												>
													{formData.preferences.reducedMotion ? 'On' : 'Off'}
												</Button>
											</div>
										</div>
									</motion.section>

									<motion.section
										{...getSectionMotionProps(0.15)}
										className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
									>
										<div className='space-y-1'>
											<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
												<Mail className='size-5 text-primary' /> Notifications
											</h3>
											<p className='text-xs text-text-secondary'>
												Choose which account updates should reach your inbox.
											</p>
										</div>
										<div className='space-y-3'>
											<div className='flex items-center justify-between rounded-lg border border-border-subtle bg-base p-3'>
												<div className='space-y-0.5'>
													<Label>Email notifications</Label>
													<p className='text-xs text-text-secondary'>
														Send mention/access/comment activity updates to your
														email.
													</p>
												</div>
												<Button
													aria-label={`Email notifications ${formData.preferences.notifications.email ? 'on' : 'off'}`}
													aria-pressed={
														formData.preferences.notifications.email
													}
													disabled={isSaving || isLoadingProfile}
													onClick={() =>
														updateNestedFormData(
															'preferences',
															'notifications',
															{
																...formData.preferences.notifications,
																email:
																	!formData.preferences.notifications.email,
															}
														)
													}
													size='sm'
													variant={
														formData.preferences.notifications.email
															? 'default'
															: 'outline'
													}
												>
													{formData.preferences.notifications.email
														? 'On'
														: 'Off'}
												</Button>
											</div>
											<div className='flex items-center justify-between rounded-lg border border-border-subtle bg-base p-3'>
												<div className='space-y-0.5'>
													<Label>Push notifications</Label>
													<p className='text-xs text-text-secondary'>
														Allow browser push notifications for workspace events.
													</p>
												</div>
												<Button
													aria-label={`Push notifications ${formData.preferences.notifications.push ? 'on' : 'off'}`}
													aria-pressed={formData.preferences.notifications.push}
													disabled={isSaving || isLoadingProfile || isPushToggleBusy}
													onClick={async () => {
														if (isSaving || isLoadingProfile || isPushToggleBusy) return;
														setIsPushToggleBusy(true);
														try {
															if (!formData.preferences.notifications.push) {
																const enabled = await enablePushNotifications();
																if (!enabled) {
																	return;
																}
																updateNestedFormData(
																	'preferences',
																	'notifications',
																	{
																		...formData.preferences.notifications,
																		push: true,
																	}
																);
																toast.success('Push notifications enabled');
															} else {
																const disabled = await disablePushNotifications();
																if (!disabled) {
																	return;
																}
																updateNestedFormData(
																	'preferences',
																	'notifications',
																	{
																		...formData.preferences.notifications,
																		push: false,
																	}
																);
																toast.success('Push notifications disabled');
															}
														} catch (error) {
															console.error('Failed to toggle push notifications', error);
															toast.error('Failed to update push notifications');
														} finally {
															setIsPushToggleBusy(false);
														}
													}}
													size='sm'
													variant={
														formData.preferences.notifications.push
															? 'default'
															: 'outline'
													}
												>
													{formData.preferences.notifications.push ? 'On' : 'Off'}
												</Button>
											</div>
											<div className='grid gap-2 rounded-lg border border-border-subtle bg-base p-3 sm:grid-cols-3'>
												<Button
													aria-label={`Push mentions ${formData.preferences.notifications.push_mentions ? 'on' : 'off'}`}
													aria-pressed={formData.preferences.notifications.push_mentions}
													disabled={
														isSaving ||
														isLoadingProfile ||
														isPushToggleBusy ||
														!formData.preferences.notifications.push
													}
													onClick={() =>
														updateNestedFormData(
															'preferences',
															'notifications',
															{
																...formData.preferences.notifications,
																push_mentions:
																	!formData.preferences.notifications.push_mentions,
															}
														)
													}
													size='sm'
													variant={
														formData.preferences.notifications.push_mentions
															? 'default'
															: 'outline'
													}
												>
													Mentions
												</Button>
												<Button
													aria-label={`Push comments ${formData.preferences.notifications.push_comments ? 'on' : 'off'}`}
													aria-pressed={formData.preferences.notifications.push_comments}
													disabled={
														isSaving ||
														isLoadingProfile ||
														isPushToggleBusy ||
														!formData.preferences.notifications.push
													}
													onClick={() =>
														updateNestedFormData(
															'preferences',
															'notifications',
															{
																...formData.preferences.notifications,
																push_comments:
																	!formData.preferences.notifications.push_comments,
															}
														)
													}
													size='sm'
													variant={
														formData.preferences.notifications.push_comments
															? 'default'
															: 'outline'
													}
												>
													Comments
												</Button>
												<Button
													aria-label={`Push reactions ${formData.preferences.notifications.push_reactions ? 'on' : 'off'}`}
													aria-pressed={formData.preferences.notifications.push_reactions}
													disabled={
														isSaving ||
														isLoadingProfile ||
														isPushToggleBusy ||
														!formData.preferences.notifications.push
													}
													onClick={() =>
														updateNestedFormData(
															'preferences',
															'notifications',
															{
																...formData.preferences.notifications,
																push_reactions:
																	!formData.preferences.notifications.push_reactions,
															}
														)
													}
													size='sm'
													variant={
														formData.preferences.notifications.push_reactions
															? 'default'
															: 'outline'
													}
												>
													Reactions
												</Button>
											</div>
										</div>
									</motion.section>

									<motion.section
										{...getSectionMotionProps(0.2)}
										className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
									>
										<div className='space-y-1'>
											<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
												<PenTool className='size-5 text-primary' /> Editor
											</h3>
											<p className='text-xs text-text-secondary'>
												Defaults applied when creating new nodes.
											</p>
										</div>
										<div className='space-y-2'>
											<Label>Default Node Type</Label>
											<NodeTypeSelector
												disabled={isSaving || isLoadingProfile}
												onChange={(value) =>
													updateNestedFormData(
														'preferences',
														'defaultNodeType',
														value
													)
												}
												value={formData.preferences.defaultNodeType}
											/>
										</div>
									</motion.section>

									<motion.section
										{...getSectionMotionProps(0.25)}
										className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
									>
										<div className='space-y-1'>
											<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
												<Shield className='size-5 text-primary' /> Security
											</h3>
											<p className='text-xs text-text-secondary'>
												Manage account security and data ownership.
											</p>
										</div>

										<div className='space-y-3'>
											<div className='flex items-center justify-between rounded-lg border border-border-subtle bg-base p-3'>
												<div>
													<Label>Change Password</Label>
													<p className='text-xs text-text-secondary'>
														Update your password
													</p>
												</div>
												<Button
													onClick={() => setIsChangePasswordOpen(true)}
													size='sm'
													variant='outline'
												>
													Update
												</Button>
											</div>

											<div className='flex items-center justify-between rounded-lg border border-border-subtle bg-base p-3'>
												<div>
													<Label>Export Your Data</Label>
													<p className='text-xs text-text-secondary'>
														Download all your data as JSON
													</p>
												</div>
												<Button
													disabled={isExporting}
													onClick={handleExportData}
													size='sm'
													variant='outline'
												>
													{isExporting ? (
														<>
															<Loader2 className='mr-2 size-4 animate-spin' />
															Exporting...
														</>
													) : (
														<>
															<Download className='mr-2 size-4' />
															Export
														</>
													)}
												</Button>
											</div>

											<div className='flex items-center justify-between rounded-lg border border-error-900/20 bg-error-900/10 p-3'>
												<div>
													<Label className='text-error-500'>
														Delete Account
													</Label>
													<p className='text-xs text-error-500/70'>
														Permanently delete data
													</p>
												</div>
												<Button
													className='bg-error-600 hover:bg-error-700'
													onClick={handleOpenDeleteDialog}
													size='sm'
													variant='destructive'
												>
													<Trash2 className='mr-2 size-4' />
													Delete
												</Button>
											</div>
										</div>
									</motion.section>
								</TabsContent>

								<TabsContent className='mt-0 space-y-4' value='billing'>
									{isLoadingSubscription ? (
										<div className='flex items-center justify-center py-12'>
											<div className='h-8 w-8 animate-spin rounded-full border-b-2 border-primary' />
										</div>
									) : (
										<>
											<motion.section
												{...getSectionMotionProps(0)}
												className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
											>
												<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
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
																<Star className='mr-2 size-4' />
																Upgrade
															</Button>
														)}
													</div>

													{currentSubscription && (
														<>
															<div className='grid grid-cols-1 gap-4 text-sm md:grid-cols-2'>
																<div>
																	<span className='text-text-secondary'>
																		Billing period:
																	</span>
																	<p className='flex gap-1 text-text-primary'>
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
																<div className='flex items-center gap-2 rounded-lg border border-warning-800/30 bg-warning-900/30 p-3'>
																	<AlertTriangle className='size-4 text-warning-400' />
																	<span className='flex gap-1 text-sm text-warning-200'>
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

											{isTrialing() && (
												<motion.div
													{...getSectionMotionProps(0.05)}
													className='flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3'
												>
													<Star className='size-5 shrink-0 text-primary' />
													<div className='flex-1'>
														<p className='text-sm font-medium text-primary'>
															Trial Active
														</p>
														<p className='text-xs text-primary/70'>
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
															<Badge className='border-warning-700/50 bg-warning-900/50 text-warning-200'>
																Ending Soon
															</Badge>
														)}
												</motion.div>
											)}

											<motion.section
												{...getSectionMotionProps(0.1)}
												className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
											>
												<div className='flex items-center justify-between'>
													<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
														<BarChart3 className='size-5 text-primary' /> Usage
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
															<div className='h-6 w-6 animate-spin rounded-full border-b-2 border-primary' />
														</div>
													) : usage ? (
														<>
															<div>
																<div className='mb-2 flex items-center justify-between'>
																	<span className='text-text-primary'>
																		Mind Maps
																	</span>
																	<span className='flex gap-1 text-text-secondary'>
																		<span>{usage.mindMapsCount}</span>
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
																<div className='mb-2 flex items-center justify-between'>
																	<span className='text-text-primary'>
																		Collaborators per Map
																	</span>
																	<span className='text-text-secondary'>
																		{planLimits.collaboratorsPerMap === -1
																			? 'Unlimited'
																			: `Up to ${planLimits.collaboratorsPerMap} per map`}
																	</span>
																</div>
																<p className='text-xs text-text-tertiary'>
																	Limit enforced per individual map
																</p>
															</div>

															<div>
																<div className='mb-2 flex items-center justify-between'>
																	<span className='text-text-primary'>
																		AI Suggestions
																	</span>
																	{planLimits.aiSuggestions === 0 ? (
																		<span className='text-sm text-text-tertiary'>
																			Not available on Free
																		</span>
																	) : (
																		<span className='flex gap-1 text-text-secondary'>
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
														<div className='py-6 text-center text-text-secondary'>
															<BarChart3 className='mx-auto mb-2 size-8 opacity-50' />
															<p>Unable to load usage data</p>
														</div>
													)}
												</div>
											</motion.section>

											{currentSubscription && (
												<motion.section
													{...getSectionMotionProps(0.15)}
													className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
												>
													<Button
														className='w-full'
														disabled={isOpeningPortal}
														onClick={handleOpenBillingPortal}
														variant='outline'
													>
														{isOpeningPortal ? (
															<>
																<div className='mr-2 size-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent' />
																Opening...
															</>
														) : (
															<>
																<CreditCard className='mr-2 size-4' />
																Manage Billing
															</>
														)}
													</Button>
													<p className='mt-2 text-center text-xs text-text-secondary'>
														Update payment methods, view invoices, and manage
														subscription
													</p>
												</motion.section>
											)}

											{currentSubscription &&
												currentSubscription.status === 'active' &&
												!currentSubscription.cancelAtPeriodEnd && (
													<motion.section
														{...getSectionMotionProps(0.2)}
														className='space-y-4 rounded-lg border border-error-800/30 bg-error-950/20 p-4'
													>
														<h3 className='text-lg font-semibold text-error-500'>
															Cancel Subscription
														</h3>
														<div className='flex flex-col justify-between gap-4'>
															<div>
																<p className='font-medium text-error-200'>
																	Cancel your subscription
																</p>
																<p className='text-sm text-error-300/70'>
																	You&apos;ll keep access until the end of your
																	billing period
																</p>
															</div>
															<Button
																disabled={isCanceling}
																onClick={openCancelSubscriptionDialog}
																size='sm'
																variant='destructive'
															>
																{isCanceling
																	? 'Canceling...'
																	: 'Cancel Subscription'}
															</Button>
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

				<DeleteAccountDialog
					impactStats={deleteImpactStats}
					isDeleting={isDeletingAccount}
					onConfirm={handleDeleteAccount}
					onOpenChange={setIsDeleteDialogOpen}
					open={isDeleteDialogOpen}
					userEmail={userProfile?.email || ''}
				/>

				<ChangePasswordModal
					onOpenChange={setIsChangePasswordOpen}
					open={isChangePasswordOpen}
				/>

				<DiscardAccountSettingsChangesDialog
					onContinueEditing={() => setShowDiscardDialog(false)}
					onDiscardChanges={handleDiscardChanges}
					onOpenChange={setShowDiscardDialog}
					open={showDiscardDialog}
				/>

				<CancelSubscriptionDialog
					isCanceling={isCanceling}
					onConfirm={handleCancelSubscription}
					onOpenChange={setShowCancelSubscriptionDialog}
					open={showCancelSubscriptionDialog}
					periodEnd={currentSubscription?.currentPeriodEnd}
				/>
			</SidePanel>
		</>
	);
}
