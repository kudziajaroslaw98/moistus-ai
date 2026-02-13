/**
 * Export Slice
 * Manages export state and options for PNG, SVG, and PDF export
 */

import {
	downloadFile,
	exportToPng,
	exportToSvg,
	generateExportFilename,
	type ExportFormat,
	type ExportOptions,
	type ExportScale,
} from '@/utils/export-utils';
import {
	exportToPdf,
	type PageOrientation,
	type PageSize,
	type PdfExportOptions,
} from '@/utils/pdf-export-utils';
import type { StateCreator } from 'zustand';
import type { AppState, ExportSlice, ExportState } from '../app-state';

const initialExportState: ExportState = {
	isExporting: false,
	exportFormat: 'png',
	exportScale: 2,
	exportBackground: true,
	exportFitView: true,
	pdfPageSize: 'a4',
	pdfOrientation: 'landscape',
	pdfIncludeTitle: true,
	pdfIncludeMetadata: true,
	exportError: null,
};

export const createExportSlice: StateCreator<AppState, [], [], ExportSlice> = (
	set,
	get
) => ({
	...initialExportState,

	setExportFormat: (format: ExportFormat) => {
		set({ exportFormat: format });
	},

	setExportScale: (scale: ExportScale) => {
		set({ exportScale: scale });
	},

	setExportBackground: (include: boolean) => {
		set({ exportBackground: include });
	},

	setExportFitView: (fitView: boolean) => {
		set({ exportFitView: fitView });
	},

	setPdfPageSize: (size: PageSize) => {
		set({ pdfPageSize: size });
	},

	setPdfOrientation: (orientation: PageOrientation) => {
		set({ pdfOrientation: orientation });
	},

	setPdfIncludeTitle: (include: boolean) => {
		set({ pdfIncludeTitle: include });
	},

	setPdfIncludeMetadata: (include: boolean) => {
		set({ pdfIncludeMetadata: include });
	},

	startExport: async () => {
		const state = get();
		const {
			exportFormat,
			exportScale,
			exportBackground,
			exportFitView,
			pdfPageSize,
			pdfOrientation,
			pdfIncludeTitle,
			pdfIncludeMetadata,
			mindMap,
			reactFlowInstance,
			currentUser,
		} = state;

		set({ isExporting: true, exportError: null });

		try {
			// JSON export — fully server-side (subscription + data generation)
			if (exportFormat === 'json') {
				const res = await fetch('/api/export/json', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mapId: mindMap?.id }),
				});

				if (!res.ok) {
					const body = await res.json().catch(() => null);
					const message = body?.error || 'JSON export failed';
					console.warn('[Export] JSON export blocked:', { status: res.status });
					set({ isExporting: false, exportError: message });
					return;
				}

				const blob = await res.blob();
				const disposition = res.headers.get('Content-Disposition');
				const filename = disposition?.match(/filename="(.+)"/)?.[1]
					|| generateExportFilename(mindMap?.title, 'json');
				downloadFile(blob, filename);
				set({ isExporting: false });
				return;
			}

			// PDF requires Pro subscription — validated server-side
			if (exportFormat === 'pdf') {
				const res = await fetch('/api/export/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ format: 'pdf' }),
				});

				if (!res.ok) {
					const body = await res.json().catch(() => null);
					const message = body?.error || 'Pro subscription required for this export format';
					console.warn('[Export] Unauthorized export attempt blocked:', { format: exportFormat, status: res.status });
					set({ isExporting: false, exportError: message });
					return;
				}
			}

			// Fit view if requested
			if (exportFitView && reactFlowInstance) {
				reactFlowInstance.fitView({
					padding: 0.1,
					duration: 200,
				});
				// Wait for animation to complete
				await new Promise((resolve) => setTimeout(resolve, 250));
			}

			// Calculate zoom-compensated scale
			// When zoomed out (e.g., 0.1), we need higher pixelRatio to maintain resolution
			const currentZoom = reactFlowInstance?.getZoom() ?? 1;
			const zoomCompensatedScale = exportScale / currentZoom;
			// Cap at 10x to prevent memory issues with extremely large exports
			const finalScale = Math.min(zoomCompensatedScale, 10);

			const exportOptions: ExportOptions = {
				scale: finalScale,
				includeBackground: exportBackground,
				backgroundColor: '#0d0d0d',
			};

			const mapTitle = mindMap?.title;

			if (exportFormat === 'png') {
				const result = await exportToPng(exportOptions);
				const filename = generateExportFilename(mapTitle, 'png');
				downloadFile(result.blob, filename);
			} else if (exportFormat === 'svg') {
				const result = await exportToSvg(exportOptions);
				const filename = generateExportFilename(mapTitle, 'svg');
				downloadFile(result.blob, filename);
			} else if (exportFormat === 'pdf') {
				// First export to PNG for PDF embedding
				const pngResult = await exportToPng({
					...exportOptions,
					scale: 2, // Always use 2x for PDF for good quality
				});

				const pdfOptions: PdfExportOptions = {
					pageSize: pdfPageSize,
					orientation: pdfOrientation,
					includeTitle: pdfIncludeTitle,
					includeMetadata: pdfIncludeMetadata,
					mapTitle,
					authorName: currentUser?.email || undefined,
				};

				const pdfResult = await exportToPdf(
					pngResult.blob,
					pngResult.width,
					pngResult.height,
					pdfOptions
				);
				const filename = generateExportFilename(mapTitle, 'pdf');
				downloadFile(pdfResult.blob, filename);
			}

			set({ isExporting: false });
		} catch (error) {
			console.error('Export failed:', error);
			set({
				isExporting: false,
				exportError: error instanceof Error ? error.message : 'Export failed',
			});
		}
	},

	completeExport: () => {
		set({ isExporting: false, exportError: null });
	},

	resetExportState: () => {
		set(initialExportState);
	},
});
