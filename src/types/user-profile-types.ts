export interface UserProfile {
	id: string;
	user_id: string;
	full_name: string;
	display_name?: string;
	avatar_url?: string;
	bio?: string;
	location?: string;
	website?: string;
	company?: string;
	job_title?: string;
	skills?: string[];
	social_links?: {
		twitter?: string;
		linkedin?: string;
		github?: string;
		discord?: string;
	};
	preferences?: {
		theme?: 'light' | 'dark' | 'system';
		accentColor?: string;
		language?: string;
		timezone?: string;
		notifications?: {
			email_comments?: boolean;
			email_mentions?: boolean;
			email_reactions?: boolean;
			push_comments?: boolean;
			push_mentions?: boolean;
			push_reactions?: boolean;
		};
		privacy?: {
			show_email?: boolean;
			show_location?: boolean;
			show_company?: boolean;
			profile_visibility?: 'public' | 'private' | 'connections';
		};
	};
	created_at: string;
	updated_at: string;
}

export interface UserProfileUpdate {
	full_name?: string;
	display_name?: string;
	avatar_url?: string;
	bio?: string;
	location?: string;
	website?: string;
	company?: string;
	job_title?: string;
	skills?: string[];
	social_links?: {
		twitter?: string;
		linkedin?: string;
		github?: string;
		discord?: string;
	};
	preferences?: {
		theme?: 'light' | 'dark' | 'system';
		accentColor?: string;
		language?: string;
		timezone?: string;
		notifications?: {
			email_comments?: boolean;
			email_mentions?: boolean;
			email_reactions?: boolean;
			push_comments?: boolean;
			push_mentions?: boolean;
			push_reactions?: boolean;
		};
		privacy?: {
			show_email?: boolean;
			show_location?: boolean;
			show_company?: boolean;
			profile_visibility?: 'public' | 'private' | 'connections';
		};
	};
}

export interface PublicUserProfile {
	id: string;
	user_id: string;
	full_name: string;
	display_name?: string;
	avatar_url?: string;
	bio?: string;
	location?: string;
	website?: string;
	company?: string;
	job_title?: string;
	skills?: string[];
	social_links?: {
		twitter?: string;
		linkedin?: string;
		github?: string;
		discord?: string;
	};
	created_at: string;
}

export interface AvatarUploadResult {
	url: string;
	public_id?: string;
	width?: number;
	height?: number;
	format?: string;
	size?: number;
}

export interface UserProfileFormData {
	full_name: string;
	display_name: string;
	bio: string;
	location: string;
	website: string;
	company: string;
	job_title: string;
	skills: string[];
	social_links: {
		twitter: string;
		linkedin: string;
		github: string;
		discord: string;
	};
	preferences: {
		theme: 'light' | 'dark' | 'system';
		accentColor: string;
		language: string;
		timezone: string;
		notifications: {
			email_comments: boolean;
			email_mentions: boolean;
			email_reactions: boolean;
			push_comments: boolean;
			push_mentions: boolean;
			push_reactions: boolean;
		};
		privacy: {
			show_email: boolean;
			show_location: boolean;
			show_company: boolean;
			profile_visibility: 'public' | 'private' | 'connections';
		};
	};
}
