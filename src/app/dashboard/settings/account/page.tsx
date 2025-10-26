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
import useAppStore from '@/store/mind-map-store';
import { Eye, Globe, Lock, Save, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

interface AccountSettings {
	profileVisibility: 'public' | 'connections' | 'private';
}

export default function AccountSettingsPage() {
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		updatePreferences,
		clearProfileError,
		unsubscribeFromProfileChanges,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			updatePreferences: state.updatePreferences,
			clearProfileError: state.clearProfileError,
			unsubscribeFromProfileChanges: state.unsubscribeFromProfileChanges,
		}))
	);

	const [isSaving, setIsSaving] = useState(false);
	const [settings, setSettings] = useState<AccountSettings>({
		profileVisibility: 'private',
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
			setSettings({
				profileVisibility:
					userProfile.preferences?.privacy?.profile_visibility || 'public',
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
			// Update privacy preferences in database
			await updatePreferences({
				privacy: {
					profile_visibility: settings.profileVisibility,
				},
			});

			toast.success('Account settings updated successfully!');
		} catch (error) {
			console.error('Failed to save account settings:', error);
			toast.error('Failed to save account settings');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteAccount = async () => {
		// TODO: Implement account deletion with confirmation dialog
		toast.error('Account deletion is not yet implemented');
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
					<h2 className='text-2xl font-bold text-white'>Account Settings</h2>

					<p className='text-zinc-400 mt-1'>
						Manage your account privacy and security
					</p>
				</div>

				<Button
					className='bg-sky-600 hover:bg-sky-700'
					disabled={isSaving}
					onClick={handleSave}
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
							value={settings.profileVisibility}
							onValueChange={(value: 'public' | 'connections' | 'private') =>
								setSettings((prev) => ({ ...prev, profileVisibility: value }))
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

						<p className='text-sm text-zinc-500 mt-2'>
							This setting controls the visibility of your profile information
							including your name, bio, and other details you&apos;ve added.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Account Deletion */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-red-400'>Danger Zone</CardTitle>

					<CardDescription>
						Irreversible and destructive actions
					</CardDescription>
				</CardHeader>

				<CardContent>
					<Separator className='bg-zinc-700 mb-4' />

					<div className='flex items-center justify-between p-4 bg-red-950/20 rounded-lg border border-red-800/30'>
						<div>
							<Label className='text-red-400'>Delete Account</Label>

							<p className='text-sm text-red-300/70'>
								Permanently delete your account and all associated data. This
								action cannot be undone.
							</p>
						</div>

						<Button
							size='sm'
							variant='destructive'
							onClick={handleDeleteAccount}
						>
							<Trash2 className='size-4 mr-2' />
							Delete Account
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
