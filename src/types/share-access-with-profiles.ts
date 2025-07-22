/**
 * Type definition for the share_access_with_profiles database view
 * This view aggregates data from share_access, user_profiles, and share_tokens tables
 */

import { ShareRole } from './sharing-types';

export interface ShareAccessWithProfile {
	// Share access base columns
	id: number;
	created_at: string;
	updated_at: string;
	user_id: string;
	share_token_id: string;
	last_access: string;
	max_sessions: number;
	status: string;
	map_id: string;

	// User profile columns (flattened)
	profile_user_id: string;
	full_name: string | null;
	display_name: string;
	avatar_url: string | null;
	is_anonymous: boolean;
	email: string | null;
	bio: string | null;
	location: string | null;
	company: string | null;
	job_title: string | null;

	// Share token columns
	share_token: string;
	token_type: string;
	token_max_users: number;
	token_expires_at: string;
	token_is_active: boolean;
	token_created_by: string;
	token_current_users: number;

	// Permission columns (extracted from JSONB)
	role: ShareRole;
	can_view: boolean;
	can_edit: boolean;
	can_comment: boolean;
}
