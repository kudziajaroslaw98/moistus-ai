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
import { Switch } from '@/components/ui/switch';
import useAppStore from '@/store/mind-map-store';
import { Monitor, Moon, Palette, Save, Sun, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

interface AppearanceSettings {
	theme: 'light' | 'dark' | 'system';
	reducedMotion: boolean;
}

export default function AppearanceSettingsPage() {
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
	const [settings, setSettings] = useState<AppearanceSettings>({
		theme: 'system',
		reducedMotion: false,
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
				theme: userProfile.preferences?.theme || 'system',
				reducedMotion: userProfile.preferences?.reducedMotion || false,
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
			// Update appearance preferences in database
			await updatePreferences({
				theme: settings.theme,
				reducedMotion: settings.reducedMotion,
			});

			toast.success('Appearance settings updated successfully!');
		} catch (error) {
			console.error('Failed to save appearance settings:', error);
			toast.error('Failed to save appearance settings');
		} finally {
			setIsSaving(false);
		}
	};

	const updateSetting = <K extends keyof AppearanceSettings>(
		key: K,
		value: AppearanceSettings[K]
	) => {
		setSettings((prev) => ({
			...prev,
			[key]: value,
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
					<h2 className='text-2xl font-bold text-white'>Appearance Settings</h2>

					<p className='text-zinc-400 mt-1'>
						Customize the look and feel of your workspace
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

			{/* Theme Settings */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Palette className='size-5' />
						Theme
					</CardTitle>

					<CardDescription>Choose your preferred color scheme</CardDescription>
				</CardHeader>

				<CardContent className='space-y-6'>
					<div className='space-y-3'>
						<Label>Color scheme</Label>

						<div className='grid grid-cols-3 gap-3'>
							<button
								className={`p-4 rounded-lg border-2 transition-colors ${
									settings.theme === 'light'
										? 'border-sky-500 bg-sky-500/10'
										: 'border-zinc-700 hover:border-zinc-600'
								}`}
								onClick={() => updateSetting('theme', 'light')}
							>
								<div className='flex flex-col items-center gap-2'>
									<Sun className='size-5 text-yellow-500' />

									<span className='text-sm font-medium text-white'>Light</span>
								</div>
							</button>

							<button
								className={`p-4 rounded-lg border-2 transition-colors ${
									settings.theme === 'dark'
										? 'border-sky-500 bg-sky-500/10'
										: 'border-zinc-700 hover:border-zinc-600'
								}`}
								onClick={() => updateSetting('theme', 'dark')}
							>
								<div className='flex flex-col items-center gap-2'>
									<Moon className='size-5 text-blue-500' />

									<span className='text-sm font-medium text-white'>Dark</span>
								</div>
							</button>

							<button
								className={`p-4 rounded-lg border-2 transition-colors ${
									settings.theme === 'system'
										? 'border-sky-500 bg-sky-500/10'
										: 'border-zinc-700 hover:border-zinc-600'
								}`}
								onClick={() => updateSetting('theme', 'system')}
							>
								<div className='flex flex-col items-center gap-2'>
									<Monitor className='size-5 text-zinc-400' />

									<span className='text-sm font-medium text-white'>System</span>
								</div>
							</button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Accessibility Settings */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Zap className='size-5' />
						Accessibility
					</CardTitle>

					<CardDescription>
						Customize the display for better accessibility
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-6'>
					<div className='flex items-center justify-between'>
						<div>
							<Label>Reduce motion</Label>

							<p className='text-sm text-zinc-400'>
								Minimize animations and transitions for accessibility
							</p>
						</div>

						<Switch
							checked={settings.reducedMotion}
							onCheckedChange={(checked) =>
								updateSetting('reducedMotion', checked)
							}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
