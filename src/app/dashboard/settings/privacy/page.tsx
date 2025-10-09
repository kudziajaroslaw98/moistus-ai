'use client';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
	Download,
	Eye,
	EyeOff,
	Globe,
	Lock,
	Save,
	Shield,
	Trash2,
	Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';

interface PrivacySettings {
	profile: {
		visibility: 'public' | 'connections' | 'private';
		showEmail: boolean;
		showLocation: boolean;
		showCompany: boolean;
		showActivity: boolean;
	};
	mindMaps: {
		defaultVisibility: 'public' | 'private' | 'unlisted';
		allowSearchIndexing: boolean;
		allowComments: boolean;
		allowReactions: boolean;
	};
	data: {
		allowAnalytics: boolean;
		allowImprovement: boolean;
		allowMarketing: boolean;
	};
	sessions: {
		activeCount: number;
		lastActivity: string;
	};
}

export default function PrivacySettingsPage() {
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		updatePreferences,
		clearProfileError,
		getPrivacyPreferences,
		unsubscribeFromProfileChanges,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			updatePreferences: state.updatePreferences,
			clearProfileError: state.clearProfileError,
			getPrivacyPreferences: state.getPrivacyPreferences,
			unsubscribeFromProfileChanges: state.unsubscribeFromProfileChanges,
		}))
	);

	const [isSaving, setIsSaving] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [settings, setSettings] = useState<PrivacySettings>({
		profile: {
			visibility: 'private',
			showEmail: false,
			showLocation: false,
			showCompany: false,
			showActivity: false,
		},
		mindMaps: {
			defaultVisibility: 'private',
			allowSearchIndexing: false,
			allowComments: false,
			allowReactions: false,
		},
		data: {
			allowAnalytics: false,
			allowImprovement: false,
			allowMarketing: false,
		},
		sessions: {
			activeCount: 0,
			lastActivity: 'Loading...',
		},
	});

	// Load user profile on mount
	useEffect(() => {
		if (!userProfile) {
			loadUserProfile();
		}
	}, [userProfile, loadUserProfile]);

	// Update settings when profile loads
	useEffect(() => {
		if (userProfile) {
			const prefs = getPrivacyPreferences();
			setSettings((prev) => ({
				...prev,
				profile: {
					...prev.profile,
					visibility: prefs?.profile_visibility || 'public',
					showEmail: prefs?.show_email ?? false,
					showLocation: prefs?.show_location ?? true,
					showCompany: prefs?.show_company ?? true,
				},
			}));
		}
	}, [userProfile, getPrivacyPreferences]);

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
		setIsSaving(true);

		try {
			// Update privacy preferences in database
			await updatePreferences({
				privacy: {
					show_email: settings.profile.showEmail,
					show_location: settings.profile.showLocation,
					show_company: settings.profile.showCompany,
					profile_visibility: settings.profile.visibility,
				},
			});

			toast.success('Privacy settings updated successfully!');
		} catch (error) {
			console.error('Failed to save privacy settings:', error);
			toast.error('Failed to save privacy settings');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDataExport = async () => {
		setIsExporting(true);

		try {
			// TODO: Implement data export
			// const response = await fetch('/api/user/export', {
			//   method: 'POST',
			// });

			// Mock export for now
			await new Promise((resolve) => setTimeout(resolve, 2000));

			toast.success('Data export started! You\'ll receive an email when it\'s ready.');
		} catch (error) {
			console.error('Failed to start data export:', error);
			toast.error('Failed to start data export');
		} finally {
			setIsExporting(false);
		}
	};

	const updateProfileSetting = (key: keyof PrivacySettings['profile'], value: boolean | string) => {
		setSettings((prev) => ({
			...prev,
			profile: {
				...prev.profile,
				[key]: value,
			},
		}));
	};

	const updateMindMapSetting = (key: keyof PrivacySettings['mindMaps'], value: boolean | string) => {
		setSettings((prev) => ({
			...prev,
			mindMaps: {
				...prev.mindMaps,
				[key]: value,
			},
		}));
	};

	const updateDataSetting = (key: keyof PrivacySettings['data'], value: boolean) => {
		setSettings((prev) => ({
			...prev,
			data: {
				...prev.data,
				[key]: value,
			},
		}));
	};

	if (isLoadingProfile) {
		return (
			<div className='flex items-center justify-center min-h-96'>
				<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500' />
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-2xl font-bold text-white'>Privacy Settings</h2>

					<p className='text-zinc-400 mt-1'>
						Control your data visibility and privacy preferences
					</p>
				</div>

				<Button
					onClick={handleSave}
					disabled={isSaving}
					className='bg-sky-600 hover:bg-sky-700'
				>
					<Save className='size-4 mr-2' />

					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>

			{/* Profile Privacy */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Eye className='size-5' />
						Profile Visibility
					</CardTitle>

					<CardDescription>
						Control who can see your profile information
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label>Profile visibility</Label>

						<Select
							value={settings.profile.visibility}
							onValueChange={(value: 'public' | 'connections' | 'private') =>
								updateProfileSetting('visibility', value)
							}
						>
							<SelectTrigger className='bg-zinc-800 border-zinc-600'>
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value='public'>
									<div className='flex items-center gap-2'>
										<Globe className='size-4' />
										Public - Anyone can see your profile
									</div>
								</SelectItem>

								<SelectItem value='connections'>
									<div className='flex items-center gap-2'>
										<Users className='size-4' />
										Connections only - Only people you collaborate with
									</div>
								</SelectItem>

								<SelectItem value='private'>
									<div className='flex items-center gap-2'>
										<Lock className='size-4' />
										Private - Only you can see your profile
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{settings.profile.visibility !== 'private' && (
						<>
							<Separator className='bg-zinc-700' />

							<div className='flex items-center justify-between'>
								<div>
									<Label>Show email address</Label>

									<p className='text-sm text-zinc-400'>
										Display your email on your public profile
									</p>
								</div>

								<Switch
									checked={settings.profile.showEmail}
									onCheckedChange={(checked) => updateProfileSetting('showEmail', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Show location</Label>

									<p className='text-sm text-zinc-400'>
										Display your location on your public profile
									</p>
								</div>

								<Switch
									checked={settings.profile.showLocation}
									onCheckedChange={(checked) => updateProfileSetting('showLocation', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Show company</Label>

									<p className='text-sm text-zinc-400'>
										Display your company information on your profile
									</p>
								</div>

								<Switch
									checked={settings.profile.showCompany}
									onCheckedChange={(checked) => updateProfileSetting('showCompany', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Show activity</Label>

									<p className='text-sm text-zinc-400'>
										Display your recent activity and mind maps
									</p>
								</div>

								<Switch
									checked={settings.profile.showActivity}
									onCheckedChange={(checked) => updateProfileSetting('showActivity', checked)}
								/>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Mind Map Privacy */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Shield className='size-5' />
						Mind Map Privacy
					</CardTitle>

					<CardDescription>
						Control the default privacy settings for your mind maps
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label>Default visibility for new mind maps</Label>

						<Select
							value={settings.mindMaps.defaultVisibility}
							onValueChange={(value: 'public' | 'private' | 'unlisted') =>
								updateMindMapSetting('defaultVisibility', value)
							}
						>
							<SelectTrigger className='bg-zinc-800 border-zinc-600'>
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value='public'>
									<div className='flex items-center gap-2'>
										<Globe className='size-4' />
										Public - Visible to everyone
									</div>
								</SelectItem>

								<SelectItem value='unlisted'>
									<div className='flex items-center gap-2'>
										<EyeOff className='size-4' />
										Unlisted - Only accessible via link
									</div>
								</SelectItem>

								<SelectItem value='private'>
									<div className='flex items-center gap-2'>
										<Lock className='size-4' />
										Private - Only you can see them
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Separator className='bg-zinc-700' />

					<div className='flex items-center justify-between'>
						<div>
							<Label>Allow search engine indexing</Label>

							<p className='text-sm text-zinc-400'>
								Allow search engines to index your public mind maps
							</p>
						</div>

						<Switch
							checked={settings.mindMaps.allowSearchIndexing}
							onCheckedChange={(checked) => updateMindMapSetting('allowSearchIndexing', checked)}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Allow comments by default</Label>

							<p className='text-sm text-zinc-400'>
								Enable comments on new mind maps by default
							</p>
						</div>

						<Switch
							checked={settings.mindMaps.allowComments}
							onCheckedChange={(checked) => updateMindMapSetting('allowComments', checked)}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Allow reactions by default</Label>

							<p className='text-sm text-zinc-400'>
								Enable reactions on new mind maps by default
							</p>
						</div>

						<Switch
							checked={settings.mindMaps.allowReactions}
							onCheckedChange={(checked) => updateMindMapSetting('allowReactions', checked)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Data Usage */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Shield className='size-5' />
						Data Usage
					</CardTitle>

					<CardDescription>
						Control how your data is used to improve our services
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between'>
						<div>
							<Label>Analytics and performance</Label>

							<p className='text-sm text-zinc-400'>
								Help us understand how you use the app to improve performance
							</p>
						</div>

						<Switch
							checked={settings.data.allowAnalytics}
							onCheckedChange={(checked) => updateDataSetting('allowAnalytics', checked)}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Product improvement</Label>

							<p className='text-sm text-zinc-400'>
								Allow us to use your usage data to improve features
							</p>
						</div>

						<Switch
							checked={settings.data.allowImprovement}
							onCheckedChange={(checked) => updateDataSetting('allowImprovement', checked)}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Marketing and recommendations</Label>

							<p className='text-sm text-zinc-400'>
								Use your data to personalize content and recommendations
							</p>
						</div>

						<Switch
							checked={settings.data.allowMarketing}
							onCheckedChange={(checked) => updateDataSetting('allowMarketing', checked)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Active Sessions */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Lock className='size-5' />
						Active Sessions
					</CardTitle>

					<CardDescription>
						Manage your active login sessions across devices
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg'>
						<div>
							<Label className='text-white'>Active sessions</Label>

							<p className='text-sm text-zinc-400'>
								You have {settings.sessions.activeCount} active sessions. Last

								activity: {settings.sessions.lastActivity}
							</p>
						</div>

						<Button variant='outline' size='sm'>
							Manage Sessions
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Data Export & Deletion */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Download className='size-5' />
						Data Management
					</CardTitle>

					<CardDescription>
						Export your data or delete your account
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg'>
						<div>
							<Label className='text-white'>Export your data</Label>

							<p className='text-sm text-zinc-400'>
								Download all your mind maps, profile data, and settings
							</p>
						</div>

						<Button
							variant='outline'
							size='sm'
							onClick={handleDataExport}
							disabled={isExporting}
						>
							<Download className='size-4 mr-2' />

							{isExporting ? 'Exporting...' : 'Export Data'}
						</Button>
					</div>

					<Separator className='bg-zinc-700' />

					<div className='flex items-center justify-between p-4 bg-red-950/20 rounded-lg border border-red-800/30'>
						<div>
							<Label className='text-red-400'>Delete Account</Label>

							<p className='text-sm text-red-300/70'>
								Permanently delete your account and all associated data
							</p>
						</div>

						<Button variant='destructive' size='sm'>
							<Trash2 className='size-4 mr-2' />
							Delete Account
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}