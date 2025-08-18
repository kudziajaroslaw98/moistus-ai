import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client instance for all store slices
 *
 * This ensures that all parts of the application use the same client instance,
 * which is crucial for maintaining session state consistency, especially for
 * anonymous authentication and sharing functionality.
 *
 * Using a single client instance prevents issues where:
 * - Anonymous authentication in one slice isn't recognized by another slice
 * - Session state gets out of sync between different parts of the app
 * - Multiple clients have different authentication contexts
 */
let sharedSupabaseClient: SupabaseClient | null = null;

export function getSharedSupabaseClient(): SupabaseClient {
	if (!sharedSupabaseClient) {
		sharedSupabaseClient = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				auth: {
					// Persist session in localStorage for consistency across tabs
					persistSession: true,
					// Automatically refresh tokens when they expire
					autoRefreshToken: true,
					// Detect session changes (important for anonymous users)
					detectSessionInUrl: true,
				},
				// Enable real-time features for collaboration
				realtime: {
					params: {
						eventsPerSecond: 10,
					},
				},
			}
		);

		// Add session state change listener for debugging
		if (process.env.NODE_ENV === 'development') {
			sharedSupabaseClient.auth.onAuthStateChange((event, session) => {
				console.log('Shared Supabase Client - Auth State Change:', {
					event,
					user_id: session?.user?.id,
					is_anonymous: session?.user?.is_anonymous,
					timestamp: new Date().toISOString(),
				});
			});
		}
	}

	return sharedSupabaseClient;
}

/**
 * Reset the shared client instance
 * Useful for testing or when you need to reinitialize the client
 */
export function resetSharedSupabaseClient(): void {
	if (sharedSupabaseClient) {
		// Clean up any subscriptions before resetting
		sharedSupabaseClient.removeAllChannels();
	}

	sharedSupabaseClient = null;
}

/**
 * Check if the shared client is initialized
 */
export function isSharedClientInitialized(): boolean {
	return sharedSupabaseClient !== null;
}

/**
 * Export the shared client as default for backward compatibility
 * This allows existing imports to work without changes
 */
export default getSharedSupabaseClient;
