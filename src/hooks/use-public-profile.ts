'use client';

import type { PublicUserProfile } from '@/types/user-profile-types';
import useSWR from 'swr';

interface UsePublicProfileResult {
	profile: PublicUserProfile | null;
	isLoading: boolean;
	error: Error | null;
}

const fetcher = async (url: string): Promise<PublicUserProfile> => {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('Failed to fetch profile');
	}

	const data = await response.json();
	return data.data;
};

export function usePublicProfile(userId: string | undefined): UsePublicProfileResult {
	const { data, error, isLoading } = useSWR<PublicUserProfile>(
		userId ? `/api/user/${userId}/public-profile` : null,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			dedupingInterval: 300000, // 5 minutes
			errorRetryCount: 2,
		}
	);

	return {
		profile: data ?? null,
		isLoading,
		error: error ?? null,
	};
}
