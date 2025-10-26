import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';
import type { UserProfile, UserProfileUpdate } from '@/types/user-profile-types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UserProfileSlice {
	// State
	userProfile: UserProfile | null;
	isLoadingProfile: boolean;
	profileError: string | null;
	profileSubscription: RealtimeChannel | null;

	// Actions
	loadUserProfile: () => Promise<void>;
	updateUserProfile: (updates: UserProfileUpdate) => Promise<void>;
	updatePreferences: (preferences: Partial<UserProfile['preferences']>) => Promise<void>;
	subscribeToProfileChanges: () => void;
	unsubscribeFromProfileChanges: () => void;
	clearProfileError: () => void;
	resetProfileState: () => void;

	// Computed getters
	getTheme: () => 'light' | 'dark' | 'system';
	getLanguage: () => string;
	getTimezone: () => string;
	getNotificationPreferences: () => NonNullable<UserProfile['preferences']>['notifications'];
	getPrivacyPreferences: () => NonNullable<UserProfile['preferences']>['privacy'];
}

export const createUserProfileSlice: StateCreator<
	AppState,
	[],
	[],
	UserProfileSlice
> = (set, get) => ({
	// Initial state
	userProfile: null,
	isLoadingProfile: false,
	profileError: null,
	profileSubscription: null,

	// Load user profile from database
	loadUserProfile: async () => {
		const { supabase } = get();

		if (!supabase) {
			set({ profileError: 'Supabase client not initialized' });
			return;
		}

		set({ isLoadingProfile: true, profileError: null });

		try {
			const { data: { user } } = await supabase.auth.getUser();

			if (!user) {
				set({ profileError: 'User not authenticated', isLoadingProfile: false });
				return;
			}

			// First try to get existing profile
			const { data: existingProfile, error: fetchError } = await supabase
				.from('user_profiles')
				.select('*')
				.eq('user_id', user.id)
				.single();

			if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
				throw fetchError;
			}

			// If no profile exists, create one with defaults
			if (!existingProfile) {
				const { data: newProfile, error: createError } = await supabase
					.from('user_profiles')
					.insert({
						user_id: user.id,
						full_name: user.user_metadata?.full_name || '',
						display_name: user.user_metadata?.full_name || '',
						preferences: {
							theme: 'system',
							accentColor: 'sky',
							reducedMotion: false,
							privacy: {
								profile_visibility: 'public',
							},
						},
					})
					.select()
					.single();

				if (createError) throw createError;
				set({ userProfile: newProfile, isLoadingProfile: false });
				// Automatically subscribe to real-time changes after creating profile
				get().subscribeToProfileChanges();
			} else {
				set({ userProfile: existingProfile, isLoadingProfile: false });
				// Automatically subscribe to real-time changes after loading profile
				get().subscribeToProfileChanges();
			}
		} catch (error) {
			console.error('Failed to load user profile:', error);
			set({ 
				profileError: error instanceof Error ? error.message : 'Failed to load profile',
				isLoadingProfile: false 
			});
		}
	},

	// Update user profile
	updateUserProfile: async (updates: UserProfileUpdate) => {
		const { supabase, userProfile } = get();

		if (!supabase || !userProfile) {
			set({ profileError: 'Supabase client or profile not available' });
			return;
		}

		// Optimistic update
		const optimisticProfile = { ...userProfile, ...updates };
		set({ userProfile: optimisticProfile, profileError: null });

		try {
			const { data, error } = await supabase
				.from('user_profiles')
				.update(updates)
				.eq('user_id', userProfile.user_id)
				.select()
				.single();

			if (error) throw error;
			set({ userProfile: data });
		} catch (error) {
			console.error('Failed to update user profile:', error);
			// Rollback optimistic update
			set({ 
				userProfile,
				profileError: error instanceof Error ? error.message : 'Failed to update profile'
			});
		}
	},

	// Update preferences specifically
	updatePreferences: async (preferences: Partial<UserProfile['preferences']>) => {
		const { supabase, userProfile } = get();

		if (!supabase || !userProfile) {
			set({ profileError: 'Supabase client or profile not available' });
			return;
		}

		const updatedPreferences = {
			...userProfile.preferences,
			...preferences,
		};

		// Optimistic update
		const optimisticProfile = {
			...userProfile,
			preferences: updatedPreferences,
		};
		set({ userProfile: optimisticProfile, profileError: null });

		try {
			const { data, error } = await supabase
				.from('user_profiles')
				.update({ preferences: updatedPreferences })
				.eq('user_id', userProfile.user_id)
				.select()
				.single();

			if (error) throw error;
			set({ userProfile: data });
		} catch (error) {
			console.error('Failed to update preferences:', error);
			// Rollback optimistic update
			set({ 
				userProfile,
				profileError: error instanceof Error ? error.message : 'Failed to update preferences'
			});
		}
	},

	// Subscribe to real-time profile changes
	subscribeToProfileChanges: () => {
		const { supabase, userProfile, profileSubscription } = get();
		if (!supabase || !userProfile || profileSubscription) return;

		const channel = supabase
			.channel('user-profile-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_profiles',
					filter: `user_id=eq.${userProfile.user_id}`,
				},
				(payload) => {
					if (payload.eventType === 'UPDATE') {
						set({ userProfile: payload.new as UserProfile });
					}
				}
			)
			.subscribe();

		set({ profileSubscription: channel });
	},

	// Unsubscribe from real-time changes
	unsubscribeFromProfileChanges: () => {
		const { profileSubscription } = get();

		if (profileSubscription) {
			profileSubscription.unsubscribe();
			set({ profileSubscription: null });
		}
	},

	// Clear error state
	clearProfileError: () => {
		set({ profileError: null });
	},

	// Reset profile state (useful for logout)
	resetProfileState: () => {
		const { profileSubscription } = get();

		if (profileSubscription) {
			profileSubscription.unsubscribe();
		}

		set({
			userProfile: null,
			isLoadingProfile: false,
			profileError: null,
			profileSubscription: null,
		});
	},

	// Computed getters for easy access to preferences
	getTheme: () => {
		const { userProfile } = get();
		return userProfile?.preferences?.theme || 'system';
	},

	getLanguage: () => {
		const { userProfile } = get();
		return 'en'; // Language removed from preferences, hardcoded to English
	},

	getTimezone: () => {
		const { userProfile } = get();
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; // Use browser timezone
	},

	getNotificationPreferences: () => {
		const { userProfile } = get();
		// Notifications removed - return empty object for backwards compatibility
		return {
			email_comments: false,
			email_mentions: false,
			email_reactions: false,
			push_comments: false,
			push_mentions: false,
			push_reactions: false,
		};
	},

	getPrivacyPreferences: () => {
		const { userProfile } = get();
		return userProfile?.preferences?.privacy || {
			profile_visibility: 'public',
		};
	},
});