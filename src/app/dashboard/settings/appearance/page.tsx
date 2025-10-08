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
import useAppStore from '@/store/mind-map-store';
import { Clock, Monitor, Moon, Palette, Save, Sun, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

interface AppearanceSettings {
	theme: 'light' | 'dark' | 'system';
	accentColor: string;
	timezone: string;
	animations: boolean;
	reducedMotion: boolean;
	canvas: {
		gridVisible: boolean;
		snapToGrid: boolean;
	};
}

const accentColors = [
	{ name: 'Sky', value: 'sky', color: 'bg-sky-500' },
	{ name: 'Blue', value: 'blue', color: 'bg-blue-500' },
	{ name: 'Indigo', value: 'indigo', color: 'bg-indigo-500' },
	{ name: 'Purple', value: 'purple', color: 'bg-purple-500' },
	{ name: 'Pink', value: 'pink', color: 'bg-pink-500' },
	{ name: 'Rose', value: 'rose', color: 'bg-rose-500' },
	{ name: 'Orange', value: 'orange', color: 'bg-orange-500' },
	{ name: 'Amber', value: 'amber', color: 'bg-amber-500' },
	{ name: 'Yellow', value: 'yellow', color: 'bg-yellow-500' },
	{ name: 'Lime', value: 'lime', color: 'bg-lime-500' },
	{ name: 'Green', value: 'green', color: 'bg-green-500' },
	{ name: 'Emerald', value: 'emerald', color: 'bg-emerald-500' },
	{ name: 'Teal', value: 'teal', color: 'bg-teal-500' },
	{ name: 'Cyan', value: 'cyan', color: 'bg-cyan-500' },
];

// Removed languages - no i18n system implemented yet

const timezones = [
	{ value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
	{ value: 'America/New_York', label: 'Eastern Time (ET)' },
	{ value: 'America/Chicago', label: 'Central Time (CT)' },
	{ value: 'America/Denver', label: 'Mountain Time (MT)' },
	{ value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
	{ value: 'Europe/London', label: 'London (GMT/BST)' },
	{ value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
	{ value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
	{ value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
	{ value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
	{ value: 'Asia/Dubai', label: 'Dubai (GST)' },
	{ value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

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
		accentColor: 'sky',
		timezone: 'UTC',
		animations: false,
		reducedMotion: false,
		canvas: {
			gridVisible: false,
			snapToGrid: false,
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
			setSettings({
				theme: userProfile.preferences?.theme || 'system',
				accentColor: userProfile.preferences?.accentColor || 'sky',
				timezone: userProfile.preferences?.timezone || 'UTC',
				animations: true, // Default - not stored in DB yet
				reducedMotion: false, // Default - not stored in DB yet
				canvas: {
					gridVisible: true, // Default - hardcoded in component
					snapToGrid: true, // Default - hardcoded in component
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
			// Update appearance preferences in database
			await updatePreferences({
				theme: settings.theme,
				accentColor: settings.accentColor,
				timezone: settings.timezone,
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

	const updateCanvasSetting = <K extends keyof AppearanceSettings['canvas']>(
		key: K,
		value: AppearanceSettings['canvas'][K]
	) => {
		setSettings((prev) => ({
			...prev,
			canvas: {
				...prev.canvas,
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
					<h2 className='text-2xl font-bold text-white'>Appearance Settings</h2>

					<p className='text-zinc-400 mt-1'>
						Customize the look and feel of your workspace
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
								onClick={() => updateSetting('theme', 'light')}
								className={`p-4 rounded-lg border-2 transition-colors ${
									settings.theme === 'light'
										? 'border-sky-500 bg-sky-500/10'
										: 'border-zinc-700 hover:border-zinc-600'
								}`}
							>
								<div className='flex flex-col items-center gap-2'>
									<Sun className='size-5 text-yellow-500' />

									<span className='text-sm font-medium text-white'>Light</span>
								</div>
							</button>

							<button
								onClick={() => updateSetting('theme', 'dark')}
								className={`p-4 rounded-lg border-2 transition-colors ${
									settings.theme === 'dark'
										? 'border-sky-500 bg-sky-500/10'
										: 'border-zinc-700 hover:border-zinc-600'
								}`}
							>
								<div className='flex flex-col items-center gap-2'>
									<Moon className='size-5 text-blue-500' />

									<span className='text-sm font-medium text-white'>Dark</span>
								</div>
							</button>

							<button
								onClick={() => updateSetting('theme', 'system')}
								className={`p-4 rounded-lg border-2 transition-colors ${
									settings.theme === 'system'
										? 'border-sky-500 bg-sky-500/10'
										: 'border-zinc-700 hover:border-zinc-600'
								}`}
							>
								<div className='flex flex-col items-center gap-2'>
									<Monitor className='size-5 text-zinc-400' />

									<span className='text-sm font-medium text-white'>System</span>
								</div>
							</button>
						</div>
					</div>

					<Separator className='bg-zinc-700' />

					<div className='space-y-3'>
						<Label>Accent color</Label>

						<div className='grid grid-cols-7 gap-2'>
							{accentColors.map((color) => (
								<button
									key={color.value}
									onClick={() => updateSetting('accentColor', color.value)}
									className={`w-10 h-10 rounded-lg ${color.color} border-2 transition-all ${
										settings.accentColor === color.value
											? 'border-white scale-110'
											: 'border-transparent hover:scale-105'
									}`}
									title={color.name}
								/>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Timezone */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Clock className='size-5' />
						Region
					</CardTitle>

					<CardDescription>Set your timezone preference</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label>
							<Clock className='size-4 inline mr-1' />
							Timezone
						</Label>

						<Select
							value={settings.timezone}
							onValueChange={(value) => updateSetting('timezone', value)}
						>
							<SelectTrigger className='bg-zinc-800 border-zinc-600'>
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								{timezones.map((tz) => (
									<SelectItem key={tz.value} value={tz.value}>
										{tz.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Display Settings */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Monitor className='size-5' />
						Display
					</CardTitle>

					<CardDescription>
						Customize the display and interface options
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-6'>
					{/* Note: Font size and compact mode removed - not functional without major architecture changes */}

					<div className='flex items-center justify-between'>
						<div>
							<Label>Animations</Label>

							<p className='text-sm text-zinc-400'>
								Enable smooth transitions and animations
							</p>
						</div>

						<Switch
							checked={settings.animations}
							onCheckedChange={(checked) =>
								updateSetting('animations', checked)
							}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Reduce motion</Label>

							<p className='text-sm text-zinc-400'>
								Minimize motion for accessibility (overrides animations)
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

			{/* Canvas Settings */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Zap className='size-5' />
						Mind Map Canvas
					</CardTitle>

					<CardDescription>
						Customize the mind map editing experience
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-6'>
					<div className='flex items-center justify-between'>
						<div>
							<Label>Show grid</Label>

							<p className='text-sm text-zinc-400'>
								Display a grid overlay on the canvas
							</p>
						</div>

						<Switch
							checked={settings.canvas.gridVisible}
							onCheckedChange={(checked) =>
								updateCanvasSetting('gridVisible', checked)
							}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<div>
							<Label>Snap to grid</Label>

							<p className='text-sm text-zinc-400'>
								Automatically align nodes to the grid
							</p>
						</div>

						<Switch
							checked={settings.canvas.snapToGrid}
							onCheckedChange={(checked) =>
								updateCanvasSetting('snapToGrid', checked)
							}
						/>
					</div>

					{/* Note: Zoom settings removed - hardcoded in ReactFlow component (minZoom={0.1}, fitView={true}) */}
					<p className='text-sm text-zinc-500 italic'>
						Note: Grid and snap settings are currently hardcoded in the canvas
						component. Future updates will make these settings functional.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
