import { createClient } from '@supabase/supabase-js';

// Type definition for the share_access_with_profiles view
export interface ShareAccessWithProfile {
  // Share access fields
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  share_token_id: string | null;
  last_access: string | null;
  max_sessions: number | null;
  status: string | null;
  map_id: string | null;

  // User profile fields (flattened)
  profile_user_id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_anonymous: boolean;
  email: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  job_title: string | null;

  // Share token fields
  share_token: string | null;
  token_type: string | null;
  token_max_users: number | null;
  token_expires_at: string | null;
  token_is_active: boolean | null;
  token_created_by: string | null;
  token_current_users: number | null;

  // Permissions (from share_tokens)
  role: 'viewer' | 'editor' | 'admin' | string | null;
  can_view: boolean;
  can_edit: boolean;
  can_comment: boolean;
}

// Database type definition for Supabase client
export type Database = {
  public: {
    Views: {
      share_access_with_profiles: {
        Row: ShareAccessWithProfile;
      };
    };
  };
};

/**
 * Get all share access records for a specific map with user profiles and permissions
 */
export async function getShareAccessForMap(
  supabase: ReturnType<typeof createClient>,
  mapId: string
): Promise<{ data: ShareAccessWithProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('share_access_with_profiles')
    .select('*')
    .eq('map_id', mapId)
    .eq('status', 'active')
    .order('last_access', { ascending: false });

  return { data, error };
}

/**
 * Get active editors for a map (users with edit permissions)
 */
export async function getActiveEditorsForMap(
  supabase: ReturnType<typeof createClient>,
  mapId: string
): Promise<{ data: ShareAccessWithProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('share_access_with_profiles')
    .select('*')
    .eq('map_id', mapId)
    .eq('status', 'active')
    .eq('can_edit', true)
    .order('last_access', { ascending: false });

  return { data, error };
}

/**
 * Get share access with specific role
 */
export async function getShareAccessByRole(
  supabase: ReturnType<typeof createClient>,
  mapId: string,
  role: 'viewer' | 'editor' | 'admin'
): Promise<{ data: ShareAccessWithProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('share_access_with_profiles')
    .select('*')
    .eq('map_id', mapId)
    .eq('role', role)
    .eq('status', 'active');

  return { data, error };
}

/**
 * Get non-anonymous users with access to a map
 */
export async function getRegisteredUsersWithAccess(
  supabase: ReturnType<typeof createClient>,
  mapId: string
): Promise<{ data: ShareAccessWithProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('share_access_with_profiles')
    .select('*')
    .eq('map_id', mapId)
    .eq('is_anonymous', false)
    .eq('status', 'active')
    .not('email', 'is', null);

  return { data, error };
}

/**
 * Get share access by token with user count validation
 */
export async function getShareAccessByToken(
  supabase: ReturnType<typeof createClient>,
  shareToken: string
): Promise<{ data: ShareAccessWithProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('share_access_with_profiles')
    .select('*')
    .eq('share_token', shareToken)
    .eq('token_is_active', true)
    .eq('status', 'active');

  return { data, error };
}

/**
 * Check if a share token has capacity for more users
 */
export async function checkShareTokenCapacity(
  supabase: ReturnType<typeof createClient>,
  shareToken: string
): Promise<{ hasCapacity: boolean; currentUsers: number; maxUsers: number }> {
  const { data, error } = await supabase
    .from('share_access_with_profiles')
    .select('token_current_users, token_max_users')
    .eq('share_token', shareToken)
    .eq('token_is_active', true)
    .single();

  if (error || !data) {
    return { hasCapacity: false, currentUsers: 0, maxUsers: 0 };
  }

  const currentUsers = data.token_current_users || 0;
  const maxUsers = data.token_max_users || 0;

  return {
    hasCapacity: currentUsers < maxUsers,
    currentUsers,
    maxUsers
  };
}

/**
 * Example usage in a React component
 */
export function ShareAccessExample() {
  // Example of how to use the data in your component
  const displayShareAccess = (access: ShareAccessWithProfile) => {
    return (
      <div key={access.id}>
        <div className="flex items-center gap-2">
          {access.avatar_url && (
            <img
              src={access.avatar_url}
              alt={access.display_name || 'User'}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">
              {access.display_name || access.full_name || 'Anonymous User'}
            </p>
            <p className="text-sm text-gray-500">
              Role: {access.role} |
              {access.can_edit ? ' Can Edit' : ''}
              {access.can_comment ? ' Can Comment' : ''}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Last access: {new Date(access.last_access || '').toLocaleString()}
        </p>
      </div>
    );
  };

  return null; // Component implementation
}

/**
 * Utility function to check user permissions
 */
export function hasPermission(
  access: ShareAccessWithProfile,
  permission: 'view' | 'edit' | 'comment'
): boolean {
  switch (permission) {
    case 'view':
      return access.can_view;
    case 'edit':
      return access.can_edit;
    case 'comment':
      return access.can_comment;
    default:
      return false;
  }
}

/**
 * Get permission summary for UI display
 */
export function getPermissionSummary(access: ShareAccessWithProfile): string {
  const permissions = [];
  if (access.can_view) permissions.push('View');
  if (access.can_edit) permissions.push('Edit');
  if (access.can_comment) permissions.push('Comment');

  return permissions.join(', ') || 'No permissions';
}
