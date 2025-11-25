'use client';

import { UserMenu } from '@/components/common/user-menu';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { NodeData } from '@/types/node-data';
import { PublicUserProfile } from '@/types/user-profile-types';
import { useCallback, useEffect, useState } from 'react';

interface UserProfile extends PublicUserProfile {
	email?: string;
	is_anonymous: boolean;
	last_activity?: string;
	metadata?: Partial<NodeData['metadata']>;
}

interface DashboardHeaderProps {
	className?: string;
	onOpenSettings?: (tab: 'settings' | 'billing') => void;
}

// Use shared Supabase client to ensure session consistency across the app
const supabase = getSharedSupabaseClient();

export function DashboardHeader({ className = '', onOpenSettings }: DashboardHeaderProps) {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch current user and profile
	const fetchUserProfile = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Get current auth user
			const { data: authData, error: authError } =
				await supabase.auth.getUser();

			if (authError || !authData.user) {
				throw new Error('No authenticated user found');
			}

			// Get user profile
			const { data: profile, error: profileError } = await supabase
				.from('user_profiles')
				.select(
					'id, user_id, full_name, display_name, email, avatar_url, is_anonymous, created_at'
				)
				.eq('user_id', authData.user.id)
				.single();

			if (profileError) {
				console.error('Failed to fetch user profile:', profileError);
				// Fallback to auth user data
				setUser({
					id: authData.user.id,
					user_id: authData.user.id,
					full_name: authData.user.email || 'User',
					display_name: authData.user.user_metadata?.display_name,
					email: authData.user.email,
					avatar_url: authData.user.user_metadata?.avatar_url,
					is_anonymous: authData.user.is_anonymous || false,
					created_at: authData.user.created_at || new Date().toISOString(),
				});
			} else {
				setUser(profile);
			}
		} catch (err) {
			console.error('Error fetching user profile:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to load user profile'
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Load user profile on mount
	useEffect(() => {
		fetchUserProfile();
	}, [fetchUserProfile]);

	// Loading state
	if (isLoading) {
		return (
			<header
				className={`border-b border-zinc-800 bg-zinc-900/50 ${className}`}
			>
				<div className='flex h-16 items-center justify-between px-6'>
					<div className='flex items-center space-x-4'>
						<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
					</div>

					<div className='flex items-center space-x-3'>
						<div className='h-8 w-8 animate-pulse rounded-full bg-zinc-700'></div>

						<div className='h-4 w-24 animate-pulse rounded bg-zinc-700'></div>
					</div>
				</div>
			</header>
		);
	}

	// Error state
	if (error) {
		return (
			<header
				className={`border-b border-zinc-800 bg-zinc-900/50 ${className}`}
			>
				<div className='flex h-16 items-center justify-between px-6'>
					<div className='flex items-center space-x-4'>
						<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
					</div>

					<div className='text-sm text-red-400'>Error: {error}</div>
				</div>
			</header>
		);
	}

	return (
		<header className={`border-b border-zinc-800 bg-zinc-900/50 ${className}`}>
			<div className='flex h-16 items-center justify-between px-6'>
				{/* Logo/Title */}
				<div className='flex items-center space-x-4'>
					<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
				</div>

				{/* User Menu */}
				<div className='flex items-center space-x-4'>
					<UserMenu user={user} onOpenSettings={onOpenSettings} />
				</div>
			</div>
		</header>
	);
}
