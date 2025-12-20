/**
 * Export Utilities for Mind Map Canvas
 * Handles PNG and SVG export using html-to-image
 *
 * CORS Handling:
 * External images can cause canvas tainting, which breaks export.
 * We solve this by swapping external images with placeholders during export.
 */

import { toBlob, toSvg } from 'html-to-image';
import type { Options } from 'html-to-image/lib/types';

export type ExportFormat = 'png' | 'svg' | 'pdf';
export type ExportScale = 1 | 2 | 3 | 4;

export interface ExportOptions {
	/** Export scale multiplier for higher resolution */
	scale?: number;
	/** Include background color or transparent */
	includeBackground?: boolean;
	/** Background color when includeBackground is true */
	backgroundColor?: string;
	/** Fit all nodes in view before export */
	fitView?: boolean;
	/** Quality for PNG export (0-1) */
	quality?: number;
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
	// Try to get the viewport first for better export
	const viewport = document.querySelector(
		'.react-flow__viewport'
	) as HTMLElement | null;
	if (viewport) return viewport;

	// Fallback to the main ReactFlow container
	const container = document.querySelector('.react-flow') as HTMLElement | null;
	return container;
}

/**
 * Calculate the bounding box of all visible nodes
 */
export function calculateNodesBoundingBox(): {
	x: number;
	y: number;
	width: number;
	height: number;
} | null {
	const nodes = document.querySelectorAll('.react-flow__node');
	if (nodes.length === 0) return null;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	nodes.forEach((node) => {
		// Skip ghost nodes
		if (node.getAttribute('data-node-type') === 'ghostNode') return;

		const rect = node.getBoundingClientRect();
		const transform = (node as HTMLElement).style.transform;
		const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);

		if (match) {
			const x = parseFloat(match[1]);
			const y = parseFloat(match[2]);
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x + rect.width);
			maxY = Math.max(maxY, y + rect.height);
		}
	});

	if (minX === Infinity) return null;

	// Add padding
	const padding = 50;
	return {
		x: minX - padding,
		y: minY - padding,
		width: maxX - minX + padding * 2,
		height: maxY - minY + padding * 2,
	};
}

/**
 * Export the mind map canvas to PNG
 */
export async function exportToPng(
	options: ExportOptions = {}
): Promise<ExportResult> {
	const {
		scale = 2,
		includeBackground = true,
		backgroundColor = '#0d0d0d',
	} = options;

	const element = getExportElement();
	if (!element) {
		throw new Error('Could not find ReactFlow element for export');
	}

	const htmlToImageOptions: Partial<Options> = {
		pixelRatio: scale,
		filter: createExportFilter(),
		cacheBust: true,
		skipAutoScale: true,
	};

	if (includeBackground) {
		htmlToImageOptions.backgroundColor = backgroundColor;
	}

	// Swap external images with placeholders to avoid CORS issues
	prepareForExport();

	let blob: Blob | null = null;
	try {
		blob = await toBlob(element, htmlToImageOptions);
	} finally {
		// Always restore DOM state, even if export fails
		restoreAfterExport();
	}

	if (!blob) {
		throw new Error('Failed to generate PNG blob');
	}

	// Get dimensions from the element
	const rect = element.getBoundingClientRect();

	return {
		blob,
		width: rect.width * scale,
		height: rect.height * scale,
	};
}

/**
 * Export the mind map canvas to SVG
 */
export async function exportToSvg(
	options: ExportOptions = {}
): Promise<ExportResult> {
	const { includeBackground = true, backgroundColor = '#0d0d0d' } = options;

	const element = getExportElement();
	if (!element) {
		throw new Error('Could not find ReactFlow element for export');
	}

	const htmlToImageOptions: Partial<Options> = {
		filter: createExportFilter(),
		cacheBust: true,
	};

	if (includeBackground) {
		htmlToImageOptions.backgroundColor = backgroundColor;
	}

	// Swap external images with placeholders to avoid CORS issues
	prepareForExport();

	let svgDataUrl: string;
	try {
		svgDataUrl = await toSvg(element, htmlToImageOptions);
	} finally {
		// Always restore DOM state, even if export fails
		restoreAfterExport();
	}

	// Convert data URL to blob
	const response = await fetch(svgDataUrl);
	const blob = await response.blob();

	// Get dimensions from the element
	const rect = element.getBoundingClientRect();

	return {
		blob,
		width: rect.width,
		height: rect.height,
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
