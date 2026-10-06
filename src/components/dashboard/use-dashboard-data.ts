'use client';

import {
	MAX_PREVIEW_MAP_IDS,
	type MapPreview,
} from '@/helpers/dashboard/map-preview';
import type { DashboardMap } from '@/types/dashboard-map';
import useSWR from 'swr';

export const DASHBOARD_MAPS_KEY = '/api/maps';

const EMPTY_MAPS: { maps: DashboardMap[] } = { maps: [] };

async function getJson<T>(url: string): Promise<T> {
	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (!response.ok) {
		throw new Error('Failed to fetch data');
	}

	const { data } = await response.json();
	return data as T;
}

/** The viewer's maps (owned + shared). Shared by the map grid and the sidebar. */
export function useDashboardMaps() {
	const { data = EMPTY_MAPS, isLoading } = useSWR<{ maps: DashboardMap[] }>(
		DASHBOARD_MAPS_KEY,
		getJson,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 5000,
		}
	);

	return { maps: data.maps, isLoading };
}

export interface DashboardTemplate {
	id: string;
	templateId: string;
	name: string;
	description: string | null;
	nodeCount: number;
}

// The templates page and template picker share this SWR key and cache the raw
// `{ data: { templates } }` body, so this fetcher must store the same shape.
const getTemplatesResponse = async (
	url: string
): Promise<{ data: { templates: DashboardTemplate[] } }> => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch templates');
	return response.json();
};

/** Most-used templates first (the API sorts by usage). */
export function useDashboardTemplates() {
	const { data } = useSWR('/api/templates', getTemplatesResponse, {
		revalidateOnFocus: false,
		dedupingInterval: 60000,
	});

	return data?.data?.templates ?? [];
}

async function fetchPreviews(
	ids: string[]
): Promise<Record<string, MapPreview>> {
	const chunks: string[][] = [];
	for (let i = 0; i < ids.length; i += MAX_PREVIEW_MAP_IDS) {
		chunks.push(ids.slice(i, i + MAX_PREVIEW_MAP_IDS));
	}

	const results = await Promise.all(
		chunks.map(async (chunk) => {
			const response = await fetch('/api/maps/previews', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: chunk }),
			});

			if (!response.ok) throw new Error('Failed to fetch map previews');

			const { data } = await response.json();
			return data.previews as Record<string, MapPreview>;
		})
	);

	return Object.assign({}, ...results);
}

/**
 * Structure previews for the given maps, loaded after the list so cards
 * render first. Sorted IDs keep the cache key stable across re-sorts.
 */
export function useMapPreviews(ids: string[]) {
	const sortedIds = [...new Set(ids)].sort();
	const { data, isLoading } = useSWR(
		sortedIds.length > 0 ? ['/api/maps/previews', sortedIds.join(',')] : null,
		() => fetchPreviews(sortedIds),
		{ revalidateOnFocus: false, keepPreviousData: true }
	);

	return { previews: data ?? {}, isLoading };
}
