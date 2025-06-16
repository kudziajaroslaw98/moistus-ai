import { createClient } from '@/helpers/supabase/client';
import { useEffect, useState } from 'react';

// DiceBear avatar styles - you can easily switch between different visual styles
const AVATAR_STYLES = [
	'avataaars', // Pixar-style characters
	'avataaars-neutral', // Neutral Pixar-style characters
	'personas', // Professional illustrations
	'fun-emoji', // Fun emoji faces
	'bottts', // Robot avatars
	'bottts-neutral',
	'lorelei', // Illustrated portraits
	'adventurer', // Adventure-themed
] as const;

type AvatarStyle = (typeof AVATAR_STYLES)[number];

interface AvatarOptions {
	style?: AvatarStyle;
	backgroundColor?: string;
}

const generateFallbackAvatar = (seed: string, options: AvatarOptions = {}) => {
	const { style = 'bottts-neutral', backgroundColor = '09090b' } = options;

	const baseUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
	const params = new URLSearchParams();

	// Set background color (use predefined or custom hex)
	if (backgroundColor) {
		params.set('backgroundColor', backgroundColor.replace('#', ''));
	}

	return `${baseUrl}&${params.toString()}`;
};

export const useCurrentUserImage = (backgroundColor?: string) => {
	const [image, setImage] = useState<string>(
		generateFallbackAvatar('User', {
			style: 'lorelei',
			backgroundColor,
		})
	);

	useEffect(() => {
		const fetchUserImage = async () => {
			const { data, error } = await createClient().auth.getSession();
			if (error) {
				console.error(error);
			}

			const user = data.session?.user;
			const avatarUrl = user?.user_metadata.avatar_url;

			if (avatarUrl) {
				setImage(avatarUrl);
			} else {
				// Generate fallback avatar based on user email or ID
				const seed = user?.email || user?.id || 'Anonymous';
				const fallbackUrl = generateFallbackAvatar(seed, {
					style: 'lorelei',
					backgroundColor,
				});
				setImage(fallbackUrl);
			}
		};
		fetchUserImage();
	}, [backgroundColor]);

	return image;
};
