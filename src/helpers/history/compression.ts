import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';

/**
 * Compression utilities for history storage.
 * For now, we use JSON stringify/parse (minified). Swap out for gzip/LZ if needed.
 */
export function compressJSON(data: unknown): string {
	return JSON.stringify(data);
}

export function decompressJSON<T = unknown>(compressed: string): T {
	return JSON.parse(compressed);
}

export function estimateStateSize(state: {
	nodes: AppNode[];
	edges: AppEdge[];
}): number {
	const json = JSON.stringify(state);
	return new Blob([json]).size;
}

export function exceedsSizeLimit(
	state: { nodes: AppNode[]; edges: AppEdge[] },
	limitBytes: number
): boolean {
	return estimateStateSize(state) > limitBytes;
}
