import { fetchResourceMetadata } from '@/helpers/fetch-resource-metadata';
import useAppStore from '@/store/mind-map-store';
import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

/** Type guard to validate that a value is a string */
function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Hook for manually refetching resource node metadata.
 * Used by the refetch button in the resource node toolbar.
 *
 * @param nodeId - The ID of the resource node
 * @returns Object with refetchMetadata function and isFetching state
 */
export function useResourceMetadataFetch(nodeId: string) {
	const [isFetching, setIsFetching] = useState(false);
	const { updateNode, getNode } = useAppStore(
		useShallow((state) => ({ updateNode: state.updateNode, getNode: state.getNode }))
	);

	const refetchMetadata = useCallback(async () => {
		const node = getNode(nodeId);
		const rawUrl = node?.data?.metadata?.url;
		const url: string | undefined = isString(rawUrl) ? rawUrl : undefined;

		if (!url) {
			toast.error('No URL found for this resource');
			return;
		}

		setIsFetching(true);
		const toastId = toast.loading('Fetching metadata...');

		try {
			// Mark node as fetching
			await updateNode({
				nodeId,
				data: {
					metadata: {
						isFetchingMetadata: true,
						metadataFetchError: null,
					},
				},
			});

			// Fetch metadata
			const metadata = await fetchResourceMetadata(url, true);

			// Update node with fetched metadata
			await updateNode({
				nodeId,
				data: {
					metadata: {
						title: metadata.title || undefined,
						imageUrl: metadata.imageUrl || undefined,
						summary: metadata.summary || undefined,
						showThumbnail: !!metadata.imageUrl,
						showSummary: !!metadata.summary,
						isFetchingMetadata: false,
						metadataFetchedAt: new Date().toISOString(),
						metadataFetchError: null,
					},
				},
			});

			toast.success('Metadata refreshed!', { id: toastId });
		} catch (error) {
			// Update error state
			await updateNode({
				nodeId,
				data: {
					metadata: {
						isFetchingMetadata: false,
						metadataFetchError:
							error instanceof Error ? error.message : 'Failed to fetch',
					},
				},
			});

			toast.error(
				error instanceof Error ? error.message : 'Failed to fetch metadata',
				{ id: toastId }
			);
		} finally {
			setIsFetching(false);
		}
	}, [nodeId, getNode, updateNode]);

	return { refetchMetadata, isFetching };
}
