/**
 * Export Utilities for Mind Map Canvas
 * Handles PNG and SVG export using html-to-image
 *
 * CORS Handling:
 * External images can cause canvas tainting, which breaks export.
 * We solve this by swapping external images with placeholders during export.
 */

import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toBlob, toSvg } from 'html-to-image';
import type { Options } from 'html-to-image/lib/types';
import type { AppNode } from '@/types/app-node';

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json';
export type ExportScale = 1 | 2 | 3 | 4;

export interface ExportOptions {
	/** Export scale multiplier for higher resolution */
	scale?: number;
	/** Include background color or transparent */
	includeBackground?: boolean;
	/** Background color when includeBackground is true */
	backgroundColor?: string;
	/** Quality for PNG export (0-1) */
	quality?: number;
	/** React Flow nodes for content-aware bounds calculation */
	nodes?: AppNode[];
}

export interface ExportResult {
	blob: Blob;
	width: number;
	height: number;
}

/**
 * Track original styles for restoration after export
 */
interface OriginalStyles {
	element: HTMLElement;
	display: string;
}

let exportStylesBackup: OriginalStyles[] = [];

/**
 * Prepare the DOM for export by swapping external images with placeholders
 * This prevents canvas tainting from CORS-restricted images
 */
function prepareForExport(): void {
	exportStylesBackup = [];

	// Find all export image containers
	const containers = document.querySelectorAll('[data-export-image-container]');

	containers.forEach((container) => {
		// Hide the actual images
		const images = container.querySelectorAll('[data-export-image]');
		images.forEach((img) => {
			const htmlImg = img as HTMLElement;
			exportStylesBackup.push({
				element: htmlImg,
				display: htmlImg.style.display,
			});
			htmlImg.style.display = 'none';
		});

		// Show the placeholders
		const placeholders = container.querySelectorAll('[data-export-placeholder]');
		placeholders.forEach((placeholder) => {
			const htmlPlaceholder = placeholder as HTMLElement;
			exportStylesBackup.push({
				element: htmlPlaceholder,
				display: htmlPlaceholder.style.display,
			});
			htmlPlaceholder.style.display = 'flex';
		});
	});
}

/**
 * Restore the DOM after export by reverting style changes
 */
function restoreAfterExport(): void {
	exportStylesBackup.forEach(({ element, display }) => {
		element.style.display = display;
	});
	exportStylesBackup = [];
}

/**
 * Filter function to exclude ghost nodes and other temporary elements from export
 */
function createExportFilter(): (node: HTMLElement) => boolean {
	return (node: HTMLElement) => {
		// Exclude ghost nodes (AI suggestions)
		if (node.getAttribute?.('data-node-type') === 'ghostNode') {
			return false;
		}
		// Exclude elements with specific export-exclude class
		if (node.classList?.contains('export-exclude')) {
			return false;
		}
		// Exclude React Flow controls and minimap
		if (
			node.classList?.contains('react-flow__controls') ||
			node.classList?.contains('react-flow__minimap') ||
			node.classList?.contains('react-flow__panel')
		) {
			return false;
		}
		return true;
	};
}

/**
 * Get the ReactFlow viewport element for export
 */
export function getExportElement(): HTMLElement | null {
	const viewport = document.querySelector(
		'.react-flow__viewport'
	) as HTMLElement | null;
	if (viewport) return viewport;

	const container = document.querySelector('.react-flow') as HTMLElement | null;
	return container;
}

/** Padding (in flow coordinates) around content bounds for export */
const EXPORT_PADDING = 50;

/**
 * Export the mind map canvas to PNG.
 * When `nodes` is provided, computes content-aware bounds so the exported
 * image matches the content aspect ratio instead of the browser window.
 */
export async function exportToPng(
	options: ExportOptions = {}
): Promise<ExportResult> {
	const {
		scale = 2,
		includeBackground = true,
		backgroundColor = '#0d0d0d',
		nodes,
	} = options;

	const viewportEl = getExportElement();
	if (!viewportEl) {
		throw new Error('Could not find ReactFlow element for export');
	}

	// Filter out ghost nodes for bounds calculation
	const visibleNodes = nodes?.filter((n) => n.type !== 'ghostNode');
	const useContentBounds = visibleNodes && visibleNodes.length > 0;

	// Compute content-aware dimensions
	let imageWidth: number;
	let imageHeight: number;
	let savedTransform: string | undefined;

	if (useContentBounds) {
		const bounds = getNodesBounds(visibleNodes);
		// Add padding around content
		const paddedBounds = {
			x: bounds.x - EXPORT_PADDING,
			y: bounds.y - EXPORT_PADDING,
			width: bounds.width + EXPORT_PADDING * 2,
			height: bounds.height + EXPORT_PADDING * 2,
		};

		imageWidth = paddedBounds.width;
		imageHeight = paddedBounds.height;

		// Compute the viewport transform that fits content into the image dimensions
		const viewport = getViewportForBounds(
			paddedBounds,
			imageWidth,
			imageHeight,
			0.5,
			2,
			0
		);

		// Temporarily override viewport transform so html-to-image captures
		// exactly the content area at the right position
		savedTransform = viewportEl.style.transform;
		viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
	} else {
		const rect = viewportEl.getBoundingClientRect();
		imageWidth = rect.width;
		imageHeight = rect.height;
	}

	const htmlToImageOptions: Partial<Options> = {
		width: imageWidth,
		height: imageHeight,
		pixelRatio: scale,
		filter: createExportFilter(),
		cacheBust: true,
		skipAutoScale: true,
	};

	if (includeBackground) {
		htmlToImageOptions.backgroundColor = backgroundColor;
	}

	prepareForExport();

	let blob: Blob | null = null;
	try {
		blob = await toBlob(viewportEl, htmlToImageOptions);
	} finally {
		restoreAfterExport();
		// Restore original transform
		if (savedTransform !== undefined) {
			viewportEl.style.transform = savedTransform;
		}
	}

	if (!blob) {
		throw new Error('Failed to generate PNG blob');
	}

	return {
		blob,
		width: imageWidth * scale,
		height: imageHeight * scale,
	};
}

/**
 * Export the mind map canvas to SVG.
 * When `nodes` is provided, computes content-aware bounds.
 */
export async function exportToSvg(
	options: ExportOptions = {}
): Promise<ExportResult> {
	const {
		includeBackground = true,
		backgroundColor = '#0d0d0d',
		nodes,
	} = options;

	const viewportEl = getExportElement();
	if (!viewportEl) {
		throw new Error('Could not find ReactFlow element for export');
	}

	const visibleNodes = nodes?.filter((n) => n.type !== 'ghostNode');
	const useContentBounds = visibleNodes && visibleNodes.length > 0;

	let imageWidth: number;
	let imageHeight: number;
	let savedTransform: string | undefined;

	if (useContentBounds) {
		const bounds = getNodesBounds(visibleNodes);
		const paddedBounds = {
			x: bounds.x - EXPORT_PADDING,
			y: bounds.y - EXPORT_PADDING,
			width: bounds.width + EXPORT_PADDING * 2,
			height: bounds.height + EXPORT_PADDING * 2,
		};

		imageWidth = paddedBounds.width;
		imageHeight = paddedBounds.height;

		const viewport = getViewportForBounds(
			paddedBounds,
			imageWidth,
			imageHeight,
			0.5,
			2,
			0
		);

		savedTransform = viewportEl.style.transform;
		viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
	} else {
		const rect = viewportEl.getBoundingClientRect();
		imageWidth = rect.width;
		imageHeight = rect.height;
	}

	const htmlToImageOptions: Partial<Options> = {
		width: imageWidth,
		height: imageHeight,
		filter: createExportFilter(),
		cacheBust: true,
	};

	if (includeBackground) {
		htmlToImageOptions.backgroundColor = backgroundColor;
	}

	prepareForExport();

	let svgDataUrl: string;
	try {
		svgDataUrl = await toSvg(viewportEl, htmlToImageOptions);
	} finally {
		restoreAfterExport();
		if (savedTransform !== undefined) {
			viewportEl.style.transform = savedTransform;
		}
	}

	const response = await fetch(svgDataUrl);
	const blob = await response.blob();

	return {
		blob,
		width: imageWidth,
		height: imageHeight,
	};
}

/**
 * Download a blob as a file
 */
export function downloadFile(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Generate a filename for export with timestamp
 */
export function generateExportFilename(
	mapTitle: string | undefined,
	format: ExportFormat
): string {
	const title = mapTitle || 'mind-map';
	const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
	const timestamp = new Date().toISOString().slice(0, 10);
	return `${sanitizedTitle}-${timestamp}.${format}`;
}

/** Internal data keys to strip from JSON export */
const INTERNAL_DATA_KEYS = new Set([
	'id', 'map_id', 'user_id', 'node_type',
	'position_x', 'position_y',
	'aiData',
]);

/** Internal metadata keys to strip from JSON export */
const INTERNAL_METADATA_KEYS = new Set([
	'isFetchingMetadata', 'metadataFetchError', 'metadataFetchedAt',
	'embedding', 'isSearchResult', 'confidence',
	'suggestedContent', 'suggestedType', 'context', 'sourceNodeName',
]);

/**
 * Export current map nodes and edges as a clean JSON blob.
 * Strips internal DB fields, React Flow internals, and AI/fetch state.
 */
export function exportToJson(
	nodes: { id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }[],
	edges: { id: string; source: string; target: string; type?: string; data?: Record<string, unknown> }[]
): Blob {
	const strippedNodes = nodes
		.filter((n) => n.type !== 'ghostNode')
		.map(({ id, type, position, data }) => {
			// Strip internal keys from data
			const cleanData: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(data)) {
				if (INTERNAL_DATA_KEYS.has(key)) continue;
				if (key === 'metadata' && value && typeof value === 'object') {
					// Strip internal metadata keys
					const cleanMeta: Record<string, unknown> = {};
					for (const [mk, mv] of Object.entries(value as Record<string, unknown>)) {
						if (!INTERNAL_METADATA_KEYS.has(mk)) {
							cleanMeta[mk] = mv;
						}
					}
					if (Object.keys(cleanMeta).length > 0) {
						cleanData.metadata = cleanMeta;
					}
				} else {
					cleanData[key] = value;
				}
			}
			return { id, type, position, data: cleanData };
		});

	const strippedEdges = edges.map(({ id, source, target, type }) => ({
		id, source, target, type,
	}));

	const json = JSON.stringify({ nodes: strippedNodes, edges: strippedEdges }, null, 2);
	return new Blob([json], { type: 'application/json' });
}
