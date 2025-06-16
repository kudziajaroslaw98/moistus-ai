import { createClient } from '@/helpers/supabase/client';
import { useEffect, useState } from 'react';

// Fun fallback name generator
const adjectives = [
	'Adventurous',
	'Brave',
	'Creative',
	'Daring',
	'Energetic',
	'Friendly',
	'Gentle',
	'Happy',
	'Inspiring',
	'Joyful',
	'Kind',
	'Lively',
	'Mighty',
	'Noble',
	'Optimistic',
	'Playful',
	'Quick',
	'Radiant',
	'Spirited',
	'Thoughtful',
	'Unique',
	'Vibrant',
	'Wise',
	'Zesty',
];

const animals = [
	'Panda',
	'Dolphin',
	'Tiger',
	'Eagle',
	'Fox',
	'Wolf',
	'Bear',
	'Lion',
	'Owl',
	'Hawk',
	'Deer',
	'Rabbit',
	'Koala',
	'Penguin',
	'Otter',
	'Seal',
	'Falcon',
	'Jaguar',
	'Leopard',
	'Cheetah',
	'Flamingo',
	'Peacock',
	'Butterfly',
	'Dragonfly',
];

const generateFunName = (seed?: string): string => {
	if (!seed) seed = 'anonymous';

	// Simple hash function to make it deterministic
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	const adjIndex = Math.abs(hash) % adjectives.length;
	const animalIndex = Math.abs(hash >> 16) % animals.length;

	return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
};

export const useCurrentUserName = () => {
	const [name, setName] = useState<string | null>(null);

	useEffect(() => {
		const fetchProfileName = async () => {
			const { data, error } = await createClient().auth.getSession();
			if (error) {
				console.error(error);
			}

			const user = data.session?.user;
			const fallbackName = generateFunName(user?.email || user?.id);

			setName(
				user?.user_metadata.full_name ??
					user?.user_metadata.display_name ??
					user?.email ??
					fallbackName
			);
		};

		fetchProfileName();
	}, []);

	return name || 'Mysterious Explorer';
};
