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
	Bell,
	BellOff,
	Mail,
	MessageSquare,
	Save,
	Smartphone,
	Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';

interface NotificationSettings {
	email: {
		enabled: boolean;
		comments: boolean;
		mentions: boolean;
		reactions: boolean;
		collaborations: boolean;
		updates: boolean;
		marketing: boolean;
	};
	push: {
		enabled: boolean;
		comments: boolean;
		mentions: boolean;
		reactions: boolean;
		collaborations: boolean;
	};
	frequency: 'instant' | 'daily' | 'weekly';
	quietHours: {
		enabled: boolean;
		start: string;
		end: string;
	};
}

export default function NotificationsSettingsPage() {
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		updatePreferences,
		clearProfileError,
		getNotificationPreferences,
		unsubscribeFromProfileChanges,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			updatePreferences: state.updatePreferences,
			clearProfileError: state.clearProfileError,
			getNotificationPreferences: state.getNotificationPreferences,
			unsubscribeFromProfileChanges: state.unsubscribeFromProfileChanges,
		}))
	);

	const [isSaving, setIsSaving] = useState(false);
	const [settings, setSettings] = useState<NotificationSettings>({
		email: {
			enabled: false,
			comments: false,
			mentions: false,
			reactions: false,
			collaborations: false,
			updates: false,
			marketing: false,
		},
		push: {
			enabled: false,
			comments: false,
			mentions: false,
			reactions: false,
			collaborations: false,
		},
		frequency: 'instant',
		quietHours: {
			enabled: false,
			start: '22:00',
			end: '08:00',
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
			const prefs = getNotificationPreferences();
			setSettings({
				email: {
					enabled: prefs.email_comments || prefs.email_mentions || prefs.email_reactions,
					comments: prefs.email_comments,
					mentions: prefs.email_mentions,
					reactions: prefs.email_reactions,
					collaborations: true, // Default
					updates: true, // Default
					marketing: false, // Default
				},
				push: {
					enabled: prefs.push_comments || prefs.push_mentions || prefs.push_reactions,
					comments: prefs.push_comments,
					mentions: prefs.push_mentions,
					reactions: prefs.push_reactions,
					collaborations: true, // Default
				},
				frequency: 'instant', // Default
				quietHours: {
					enabled: true, // Default
					start: '22:00', // Default
					end: '08:00', // Default
				},
			});
		}
	}, [userProfile, getNotificationPreferences]);

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
			// Update notifications preferences in database
			await updatePreferences({
				notifications: {
					email_comments: settings.email.comments,
					email_mentions: settings.email.mentions,
					email_reactions: settings.email.reactions,
					push_comments: settings.push.comments,
					push_mentions: settings.push.mentions,
					push_reactions: settings.push.reactions,
				},
			});

			toast.success('Notification settings updated successfully!');
		} catch (error) {
			console.error('Failed to save notification settings:', error);
			toast.error('Failed to save notification settings');
		} finally {
			setIsSaving(false);
		}
	};

	const updateEmailSetting = (key: keyof NotificationSettings['email'], value: boolean) => {
		setSettings((prev) => ({
			...prev,
			email: {
				...prev.email,
				[key]: value,
			},
		}));
	};

	const updatePushSetting = (key: keyof NotificationSettings['push'], value: boolean) => {
		setSettings((prev) => ({
			...prev,
			push: {
				...prev.push,
				[key]: value,
			},
		}));
	};

	const updateQuietHours = (key: keyof NotificationSettings['quietHours'], value: boolean | string) => {
		setSettings((prev) => ({
			...prev,
			quietHours: {
				...prev.quietHours,
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
					<h2 className='text-2xl font-bold text-white'>Notification Settings</h2>
					<p className='text-zinc-400 mt-1'>
						Configure how and when you receive notifications
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

			{/* Email Notifications */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Mail className='size-5' />
						Email Notifications
					</CardTitle>
					<CardDescription>
						Configure when you receive email notifications
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg'>
						<div>
							<Label className='text-white'>Enable email notifications</Label>
							<p className='text-sm text-zinc-400'>
								Master control for all email notifications
							</p>
						</div>
						<Switch
							checked={settings.email.enabled}
							onCheckedChange={(checked) => updateEmailSetting('enabled', checked)}
						/>
					</div>

					{settings.email.enabled && (
						<>
							<Separator className='bg-zinc-700' />
							
							<div className='flex items-center justify-between'>
								<div>
									<Label>Comments</Label>
									<p className='text-sm text-zinc-400'>
										Get notified when someone comments on your mind maps
									</p>
								</div>
								<Switch
									checked={settings.email.comments}
									onCheckedChange={(checked) => updateEmailSetting('comments', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Mentions</Label>
									<p className='text-sm text-zinc-400'>
										Get notified when someone mentions you
									</p>
								</div>
								<Switch
									checked={settings.email.mentions}
									onCheckedChange={(checked) => updateEmailSetting('mentions', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Reactions</Label>
									<p className='text-sm text-zinc-400'>
										Get notified when someone reacts to your content
									</p>
								</div>
								<Switch
									checked={settings.email.reactions}
									onCheckedChange={(checked) => updateEmailSetting('reactions', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Collaboration invites</Label>
									<p className='text-sm text-zinc-400'>
										Get notified when you're invited to collaborate
									</p>
								</div>
								<Switch
									checked={settings.email.collaborations}
									onCheckedChange={(checked) => updateEmailSetting('collaborations', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Product updates</Label>
									<p className='text-sm text-zinc-400'>
										Get notified about new features and improvements
									</p>
								</div>
								<Switch
									checked={settings.email.updates}
									onCheckedChange={(checked) => updateEmailSetting('updates', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Marketing emails</Label>
									<p className='text-sm text-zinc-400'>
										Receive tips, tutorials, and promotional content
									</p>
								</div>
								<Switch
									checked={settings.email.marketing}
									onCheckedChange={(checked) => updateEmailSetting('marketing', checked)}
								/>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Push Notifications */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Smartphone className='size-5' />
						Push Notifications
					</CardTitle>
					<CardDescription>
						Configure browser and mobile push notifications
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg'>
						<div>
							<Label className='text-white'>Enable push notifications</Label>
							<p className='text-sm text-zinc-400'>
								Master control for all push notifications
							</p>
						</div>
						<Switch
							checked={settings.push.enabled}
							onCheckedChange={(checked) => updatePushSetting('enabled', checked)}
						/>
					</div>

					{settings.push.enabled && (
						<>
							<Separator className='bg-zinc-700' />
							
							<div className='flex items-center justify-between'>
								<div>
									<Label>Comments</Label>
									<p className='text-sm text-zinc-400'>
										Get push notifications for comments
									</p>
								</div>
								<Switch
									checked={settings.push.comments}
									onCheckedChange={(checked) => updatePushSetting('comments', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Mentions</Label>
									<p className='text-sm text-zinc-400'>
										Get push notifications for mentions
									</p>
								</div>
								<Switch
									checked={settings.push.mentions}
									onCheckedChange={(checked) => updatePushSetting('mentions', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Reactions</Label>
									<p className='text-sm text-zinc-400'>
										Get push notifications for reactions
									</p>
								</div>
								<Switch
									checked={settings.push.reactions}
									onCheckedChange={(checked) => updatePushSetting('reactions', checked)}
								/>
							</div>

							<div className='flex items-center justify-between'>
								<div>
									<Label>Collaboration invites</Label>
									<p className='text-sm text-zinc-400'>
										Get push notifications for collaboration invites
									</p>
								</div>
								<Switch
									checked={settings.push.collaborations}
									onCheckedChange={(checked) => updatePushSetting('collaborations', checked)}
								/>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Notification Preferences */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white flex items-center gap-2'>
						<Bell className='size-5' />
						Notification Preferences
					</CardTitle>
					<CardDescription>
						Customize how notifications are delivered
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-6'>
					<div className='space-y-3'>
						<Label>Notification frequency</Label>
						<Select
							value={settings.frequency}
							onValueChange={(value: 'instant' | 'daily' | 'weekly') =>
								setSettings((prev) => ({ ...prev, frequency: value }))
							}
						>
							<SelectTrigger className='bg-zinc-800 border-zinc-600'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='instant'>
									<div className='flex items-center gap-2'>
										<Bell className='size-4' />
										Instant - Receive notifications immediately
									</div>
								</SelectItem>
								<SelectItem value='daily'>
									<div className='flex items-center gap-2'>
										<MessageSquare className='size-4' />
										Daily digest - Once per day summary
									</div>
								</SelectItem>
								<SelectItem value='weekly'>
									<div className='flex items-center gap-2'>
										<BellOff className='size-4' />
										Weekly digest - Once per week summary
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Separator className='bg-zinc-700' />

					<div className='space-y-4'>
						<div className='flex items-center justify-between'>
							<div>
								<Label className='text-white'>Quiet hours</Label>
								<p className='text-sm text-zinc-400'>
									Pause notifications during specific hours
								</p>
							</div>
							<Switch
								checked={settings.quietHours.enabled}
								onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
							/>
						</div>

						{settings.quietHours.enabled && (
							<div className='grid grid-cols-2 gap-4 pl-6'>
								<div className='space-y-2'>
									<Label htmlFor='quiet-start'>Start time</Label>
									<Select
										value={settings.quietHours.start}
										onValueChange={(value) => updateQuietHours('start', value)}
									>
										<SelectTrigger className='bg-zinc-800 border-zinc-600'>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Array.from({ length: 24 }, (_, i) => {
												const hour = i.toString().padStart(2, '0');
												return (
													<SelectItem key={i} value={`${hour}:00`}>
														{hour}:00
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='quiet-end'>End time</Label>
									<Select
										value={settings.quietHours.end}
										onValueChange={(value) => updateQuietHours('end', value)}
									>
										<SelectTrigger className='bg-zinc-800 border-zinc-600'>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Array.from({ length: 24 }, (_, i) => {
												const hour = i.toString().padStart(2, '0');
												return (
													<SelectItem key={i} value={`${hour}:00`}>
														{hour}:00
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}