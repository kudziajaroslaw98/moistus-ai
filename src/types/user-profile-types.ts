export type UserThemePreference = 'light' | 'dark' | 'system';

export type UserDefaultNodeTypePreference =
	| 'defaultNode'
	| 'textNode'
	| 'taskNode'
	| 'imageNode'
	| 'resourceNode'
	| 'questionNode'
	| 'codeNode'
	| 'annotationNode'
	| 'referenceNode';

export interface NotificationPreferences {
	email?: boolean;
}

export interface UserPrivacyPreferences {
	profile_visibility?: 'public' | 'private' | 'connections';
}

export interface UserPreferencesBase {
	theme?: UserThemePreference;
	accentColor?: string;
	reducedMotion?: boolean;
	notifications?: NotificationPreferences;
	defaultNodeType?: UserDefaultNodeTypePreference;
	privacy?: UserPrivacyPreferences;
}

export interface UserProfile {
	id: string;
	user_id: string;
	full_name: string;
	display_name?: string;
	avatar_url?: string;
	bio?: string;
	email?: string;
	is_anonymous?: boolean;
	color?: {
		hsl: string;
		hex: string;
	};
	preferences?: UserPreferencesBase;
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
	preferences?: UserPreferencesBase;
}

export interface PublicUserProfile {
	id: string;
	user_id: string;
	full_name: string;
	display_name?: string;
	avatar_url?: string;
	bio?: string;
	is_anonymous?: boolean;
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
	preferences: UserPreferencesBase & {
		theme: UserThemePreference;
		accentColor: string;
		reducedMotion: boolean;
		notifications: NotificationPreferences & {
			email: boolean;
		};
		defaultNodeType: UserDefaultNodeTypePreference;
		privacy: {
			profile_visibility: 'public' | 'private' | 'connections';
		};
	};
}
