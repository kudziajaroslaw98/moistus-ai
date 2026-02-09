import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';
import type { UserProfile, UserProfileUpdate } from '@/types/user-profile-types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { generateFallbackAvatar } from '@/helpers/user-profile-helpers';
import { NodeRegistry, type AvailableNodeTypes } from '@/registry/node-registry';

export interface UserProfileSlice {
	// State
	userProfile: UserProfile | null;
	isLoadingProfile: boolean;
	profileError: string | null;
	profileSubscription: RealtimeChannel | null;
	isLoggingOut: boolean;

	// Actions
	setLoggingOut: (value: boolean) => void;
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
	getNotificationPreferences: () => {
		email_comments: boolean;
		email_mentions: boolean;
		email_reactions: boolean;
		push_comments: boolean;
		push_mentions: boolean;
		push_reactions: boolean;
	};
	getPrivacyPreferences: () => NonNullable<UserProfile['preferences']>['privacy'];
	getDefaultNodeType: () => AvailableNodeTypes;
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
	isLoggingOut: false,

	setLoggingOut: (value: boolean) => {
		set({ isLoggingOut: value });
	},

	// Load user profile from database
	loadUserProfile: async () => {
		const { supabase, isLoggingOut } = get();

		// Don't attempt to load profile during logout
		if (isLoggingOut) return;

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

			// Determine avatar: OAuth avatar > existing avatar > DiceBear fallback
			const oauthAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
			const fallbackAvatar = generateFallbackAvatar(user.id);

			// If no profile exists, create one with defaults
			if (!existingProfile) {
				const avatarUrl = oauthAvatar || fallbackAvatar;
				const { data: newProfile, error: createError } = await supabase
					.from('user_profiles')
					.insert({
						user_id: user.id,
						full_name: user.user_metadata?.full_name || '',
						display_name:
							user.user_metadata?.display_name ||
							user.user_metadata?.full_name ||
							user.user_metadata?.name ||
							'',
						avatar_url: avatarUrl,
						email: user.email || null,
						is_anonymous: user.is_anonymous ?? false,
						preferences: {
							theme: 'system',
							accentColor: 'sky',
							reducedMotion: false,
							defaultNodeType: 'defaultNode',
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
				// Ensure avatar_url and email exist
				const profileWithDefaults = {
					...existingProfile,
					avatar_url: existingProfile.avatar_url || oauthAvatar || fallbackAvatar,
					email: existingProfile.email || user.email || null,
				};

				// If email was missing, update it in the database
				if (!existingProfile.email && user.email) {
					supabase
						.from('user_profiles')
						.update({ email: user.email })
						.eq('user_id', user.id)
						.then(({ error }) => {
							if (error) {
								console.error('Failed to sync email to profile:', error);
							}
						});
				}

				set({ userProfile: profileWithDefaults, isLoadingProfile: false });
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

		// Filter out avatar_url from updates - avatars are auto-generated from user ID
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { avatar_url: _avatarUrl, ...filteredUpdates } = updates as UserProfileUpdate & { avatar_url?: string };

		// Optimistic update (keep existing avatar_url)
		const optimisticProfile = { ...userProfile, ...filteredUpdates };
		set({ userProfile: optimisticProfile, profileError: null });

		try {
			const { data, error } = await supabase
				.from('user_profiles')
				.update(filteredUpdates)
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
			isLoggingOut: false,
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

	getDefaultNodeType: () => {
		const { userProfile } = get();
		const savedType = userProfile?.preferences?.defaultNodeType;

		// Validate saved type is still creatable
		if (savedType && NodeRegistry.isCreatableType(savedType)) {
			return savedType as AvailableNodeTypes;
		}
		return 'defaultNode';
	},
});