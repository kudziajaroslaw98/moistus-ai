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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/user-avatar';
import { UserProfile, UserProfileFormData } from '@/types/user-profile-types';
import useAppStore from '@/store/mind-map-store';
import {
	Briefcase,
	Building,
	Camera,
	Globe,
	MapPin,
	Plus,
	Save,
	Trash2,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

export default function GeneralSettingsPage() {
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		updateUserProfile,
		clearProfileError,
		unsubscribeFromProfileChanges,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			updateUserProfile: state.updateUserProfile,
			clearProfileError: state.clearProfileError,
			unsubscribeFromProfileChanges: state.unsubscribeFromProfileChanges,
		}))
	);

	const [isSaving, setIsSaving] = useState(false);
	const [newSkill, setNewSkill] = useState('');
	const [formData, setFormData] = useState<UserProfileFormData>({
		full_name: '',
		display_name: '',
		bio: '',
		location: '',
		website: '',
		company: '',
		job_title: '',
		skills: [],
		social_links: {
			twitter: '',
			linkedin: '',
			github: '',
			discord: '',
		},
		preferences: {
			theme: 'system',
			accentColor: 'sky',
			language: 'en',
			timezone: 'UTC',
			notifications: {
				email_comments: false,
				email_mentions: false,
				email_reactions: false,
				push_comments: false,
				push_mentions: false,
				push_reactions: false,
			},
			privacy: {
				show_email: false,
				show_location: false,
				show_company: false,
				profile_visibility: 'private',
			},
		},
	});

	// Load user profile on mount
	useEffect(() => {
		loadUserProfile();
	}, [loadUserProfile]);

	// Update form data when profile loads
	useEffect(() => {
		if (userProfile) {
			setFormData({
				full_name: userProfile.full_name,
				display_name: userProfile.display_name || '',
				bio: userProfile.bio || '',
				location: userProfile.location || '',
				website: userProfile.website || '',
				company: userProfile.company || '',
				job_title: userProfile.job_title || '',
				skills: userProfile.skills || [],
				social_links: {
					twitter: userProfile.social_links?.twitter || '',
					linkedin: userProfile.social_links?.linkedin || '',
					github: userProfile.social_links?.github || '',
					discord: userProfile.social_links?.discord || '',
				},
				preferences: {
					theme: userProfile.preferences?.theme || 'system',
					accentColor: userProfile.preferences?.accentColor || 'sky',
					language: userProfile.preferences?.language || 'en',
					timezone: userProfile.preferences?.timezone || 'UTC',
					notifications: {
						email_comments: userProfile.preferences?.notifications?.email_comments ?? true,
						email_mentions: userProfile.preferences?.notifications?.email_mentions ?? true,
						email_reactions: userProfile.preferences?.notifications?.email_reactions ?? false,
						push_comments: userProfile.preferences?.notifications?.push_comments ?? true,
						push_mentions: userProfile.preferences?.notifications?.push_mentions ?? true,
						push_reactions: userProfile.preferences?.notifications?.push_reactions ?? false,
					},
					privacy: {
						show_email: userProfile.preferences?.privacy?.show_email ?? false,
						show_location: userProfile.preferences?.privacy?.show_location ?? true,
						show_company: userProfile.preferences?.privacy?.show_company ?? true,
						profile_visibility: userProfile.preferences?.privacy?.profile_visibility || 'public',
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
				location: formData.location,
				website: formData.website,
				company: formData.company,
				job_title: formData.job_title,
				skills: formData.skills,
				social_links: formData.social_links,
				preferences: formData.preferences,
			};

			await updateUserProfile(updates);
			toast.success('Profile updated successfully!');
		} catch (error) {
			console.error('Failed to save profile:', error);
			toast.error('Failed to save profile');
		} finally {
			setIsSaving(false);
		}
	};

	const handleAvatarUpload = useCallback(async (file: File) => {
		try {
			// TODO: Implement avatar upload
			// const formDataUpload = new FormData();
			// formDataUpload.append('avatar', file);
			// const response = await fetch('/api/user/profile/avatar', {
			//   method: 'POST',
			//   body: formDataUpload,
			// });

			toast.success('Avatar uploaded successfully!');
		} catch (error) {
			console.error('Failed to upload avatar:', error);
			toast.error('Failed to upload avatar');
		}
	}, []);

	const addSkill = () => {
		if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
			setFormData((prev) => ({
				...prev,
				skills: [...prev.skills, newSkill.trim()],
			}));
			setNewSkill('');
		}
	};

	const removeSkill = (skillToRemove: string) => {
		setFormData((prev) => ({
			...prev,
			skills: prev.skills.filter((skill) => skill !== skillToRemove),
		}));
	};

	const updateFormData = (field: string, value: unknown) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
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
					<h2 className='text-2xl font-bold text-white'>General Settings</h2>

					<p className='text-zinc-400 mt-1'>
						Manage your account and profile information
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

			{/* Avatar Section */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>Profile Picture</CardTitle>

					<CardDescription>Update your profile picture</CardDescription>
				</CardHeader>

				<CardContent className='flex items-center gap-6'>
					<UserAvatar user={userProfile} size='2xl' />

					<div className='space-y-2'>
						<Button variant='outline' className='relative'>
							<Camera className='size-4 mr-2' />

							Upload Photo

							<input
								type='file'
								accept='image/*'
								className='absolute inset-0 opacity-0 cursor-pointer'
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleAvatarUpload(file);
								}}
							/>
						</Button>

						<p className='text-xs text-zinc-500'>
							JPG, PNG or GIF. Max size 2MB.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Basic Information */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>Basic Information</CardTitle>

					<CardDescription>Your public profile information</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='full_name'>Full Name</Label>

							<Input
								id='full_name'
								value={formData.full_name}
								onChange={(e) => updateFormData('full_name', e.target.value)}
								className='bg-zinc-800 border-zinc-600'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='display_name'>Display Name</Label>

							<Input
								id='display_name'
								value={formData.display_name}
								onChange={(e) => updateFormData('display_name', e.target.value)}
								className='bg-zinc-800 border-zinc-600'
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='bio'>Bio</Label>

						<Textarea
							id='bio'
							value={formData.bio}
							onChange={(e) => updateFormData('bio', e.target.value)}
							className='bg-zinc-800 border-zinc-600'
							rows={3}
							placeholder='Tell us about yourself...'
						/>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='location'>
								<MapPin className='size-4 inline mr-1' />
								Location
							</Label>

							<Input
								id='location'
								value={formData.location}
								onChange={(e) => updateFormData('location', e.target.value)}
								className='bg-zinc-800 border-zinc-600'
								placeholder='City, Country'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='website'>
								<Globe className='size-4 inline mr-1' />
								Website
							</Label>

							<Input
								id='website'
								type='url'
								value={formData.website}
								onChange={(e) => updateFormData('website', e.target.value)}
								className='bg-zinc-800 border-zinc-600'
								placeholder='https://example.com'
							/>
						</div>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='company'>
								<Building className='size-4 inline mr-1' />
								Company
							</Label>

							<Input
								id='company'
								value={formData.company}
								onChange={(e) => updateFormData('company', e.target.value)}
								className='bg-zinc-800 border-zinc-600'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='job_title'>
								<Briefcase className='size-4 inline mr-1' />
								Job Title
							</Label>

							<Input
								id='job_title'
								value={formData.job_title}
								onChange={(e) => updateFormData('job_title', e.target.value)}
								className='bg-zinc-800 border-zinc-600'
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Skills Section */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>Skills</CardTitle>

					<CardDescription>Add your skills and expertise</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex gap-2'>
						<Input
							value={newSkill}
							onChange={(e) => setNewSkill(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && addSkill()}
							placeholder='Add a skill...'
							className='bg-zinc-800 border-zinc-600'
						/>

						<Button onClick={addSkill} size='sm'>
							<Plus className='size-4' />
						</Button>
					</div>

					<div className='flex flex-wrap gap-2'>
						{formData.skills.map((skill) => (
							<Badge
								key={skill}
								variant='secondary'
								className='bg-sky-900/50 text-sky-200 hover:bg-sky-800 border border-sky-700/50'
							>
								{skill}

								<button
									onClick={() => removeSkill(skill)}
									className='ml-1 hover:text-red-400'
								>
									<X className='size-3' />
								</button>
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Account Management */}
			<Card className='bg-zinc-900 border-zinc-700'>
				<CardHeader>
					<CardTitle className='text-white'>Account Management</CardTitle>

					<CardDescription>
						Manage your account settings and security
					</CardDescription>
				</CardHeader>

				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg'>
						<div>
							<Label className='text-white'>Change Password</Label>

							<p className='text-sm text-zinc-400'>
								Update your account password for better security
							</p>
						</div>

						<Button variant='outline' size='sm'>
							Change Password
						</Button>
					</div>

					<div className='flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg'>
						<div>
							<Label className='text-white'>Two-Factor Authentication</Label>

							<p className='text-sm text-zinc-400'>
								Add an extra layer of security to your account
							</p>
						</div>

						<Button variant='outline' size='sm'>
							Enable 2FA
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
							Delete
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}