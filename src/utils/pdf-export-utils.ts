/**
 * PDF Export Utilities for Mind Map Canvas
 * Handles PDF generation using jspdf
 */

import jsPDF from 'jspdf';

export type PageSize = 'a4' | 'letter';
export type PageOrientation = 'portrait' | 'landscape';

export interface PdfExportOptions {
	/** Page size */
	pageSize?: PageSize;
	/** Page orientation */
	orientation?: PageOrientation;
	/** Include map title as header */
	includeTitle?: boolean;
	/** Include metadata (date, author) */
	includeMetadata?: boolean;
	/** Map title for header */
	mapTitle?: string;
	/** Author/user name */
	authorName?: string;
	/** Page margin in mm */
	margin?: number;
}

export interface PdfExportResult {
	pdf: jsPDF;
	blob: Blob;
}

// Page dimensions in mm
const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
	a4: { width: 210, height: 297 },
	letter: { width: 215.9, height: 279.4 },
};

/**
 * Convert image blob to base64 data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Export mind map to PDF with optional title and metadata
 */
export async function exportToPdf(
	imageBlob: Blob,
	imageWidth: number,
	imageHeight: number,
	options: PdfExportOptions = {}
): Promise<PdfExportResult> {
	const {
		pageSize = 'a4',
		orientation = 'landscape',
		includeTitle = true,
		includeMetadata = true,
		mapTitle = 'Mind Map',
		authorName,
		margin = 15,
	} = options;

	// Get page dimensions
	const pageDims = PAGE_DIMENSIONS[pageSize];
	const pageWidth =
		orientation === 'landscape' ? pageDims.height : pageDims.width;
	const pageHeight =
		orientation === 'landscape' ? pageDims.width : pageDims.height;

	// Create PDF
	const pdf = new jsPDF({
		orientation,
		unit: 'mm',
		format: pageSize,
	});

	// Calculate content area
	const contentX = margin;
	let contentY = margin;
	const contentWidth = pageWidth - margin * 2;
	let contentHeight = pageHeight - margin * 2;

	// Add title if enabled
	if (includeTitle && mapTitle) {
		pdf.setFontSize(18);
		pdf.setTextColor(33, 33, 33);
		pdf.text(mapTitle, contentX, contentY + 6);
		contentY += 12;
		contentHeight -= 12;
	}

	// Add metadata if enabled
	if (includeMetadata) {
		pdf.setFontSize(10);
		pdf.setTextColor(100, 100, 100);
		const date = new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const metadataText = authorName ? `${date} | ${authorName}` : date;
		pdf.text(metadataText, contentX, contentY + 4);
		contentY += 8;
		contentHeight -= 8;
	}

	// Add separator line if title or metadata was added
	if (includeTitle || includeMetadata) {
		pdf.setDrawColor(200, 200, 200);
		pdf.setLineWidth(0.2);
		pdf.line(contentX, contentY, contentX + contentWidth, contentY);
		contentY += 4;
		contentHeight -= 4;
	}

	// Convert image to data URL
	const imageDataUrl = await blobToDataUrl(imageBlob);

	// Calculate image dimensions to fit in content area while maintaining aspect ratio
	const imageAspectRatio = imageWidth / imageHeight;
	const contentAspectRatio = contentWidth / contentHeight;

	let finalWidth: number;
	let finalHeight: number;
	let imageX: number;
	let imageY: number;

	if (imageAspectRatio > contentAspectRatio) {
		// Image is wider - fit to width
		finalWidth = contentWidth;
		finalHeight = contentWidth / imageAspectRatio;
		imageX = contentX;
		imageY = contentY + (contentHeight - finalHeight) / 2;
	} else {
		// Image is taller - fit to height
		finalHeight = contentHeight;
		finalWidth = contentHeight * imageAspectRatio;
		imageX = contentX + (contentWidth - finalWidth) / 2;
		imageY = contentY;
	}

	// Add image to PDF
	pdf.addImage(
		imageDataUrl,
		'PNG',
		imageX,
		imageY,
		finalWidth,
		finalHeight,
		undefined,
		'FAST'
	);

	// Generate blob
	const pdfBlob = pdf.output('blob');

	return {
		pdf,
		blob: pdfBlob,
	};
}

/**
 * Get human-readable page size label
 */
export function getPageSizeLabel(size: PageSize): string {
	switch (size) {
		case 'a4':
			return 'A4 (210 x 297 mm)';
		case 'letter':
			return 'Letter (8.5 x 11 in)';
		default:
			return size;
	}
}

/**
 * Get human-readable orientation label
 */
export function getOrientationLabel(orientation: PageOrientation): string {
	switch (orientation) {
		case 'portrait':
			return 'Portrait';
		case 'landscape':
			return 'Landscape';
		default:
			return orientation;
	}
}
