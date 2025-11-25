export interface UserProfile {
	id: string;
	user_id: string;
	full_name: string;
	display_name?: string;
	avatar_url?: string;
	bio?: string;
	isAnonymous?: boolean;
	color?: {
		hsl: string;
		hex: string;
	};
	preferences?: {
		theme?: 'light' | 'dark' | 'system';
		accentColor?: string;
		reducedMotion?: boolean;
		privacy?: {
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
	color?: {
		hsl: string;
		hex: string;
	};
	preferences?: {
		theme?: 'light' | 'dark' | 'system';
		accentColor?: string;
		reducedMotion?: boolean;
		privacy?: {
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
	isAnonymous?: boolean;
	color?: {
		hsl: string;
		hex: string;
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
	preferences: {
		theme: 'light' | 'dark' | 'system';
		accentColor: string;
		reducedMotion: boolean;
		privacy: {
			profile_visibility: 'public' | 'private' | 'connections';
		};
	};
}
