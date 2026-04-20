import type { ElkLabelLayout } from '@/types/edge-data';

const EDGE_LABEL_FONT = '12px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const EDGE_LABEL_MIN_HEIGHT_PX = 24;
const EDGE_LABEL_HORIZONTAL_PADDING_PX = 16;
const EDGE_LABEL_FALLBACK_CHARACTER_WIDTH_PX = 7;

export type ElkEdgeLabelSize = Pick<ElkLabelLayout, 'width' | 'height'>;

function measureTextWidth(text: string): number {
	if (typeof document === 'undefined') {
		return text.length * EDGE_LABEL_FALLBACK_CHARACTER_WIDTH_PX;
	}

	if (
		typeof navigator !== 'undefined' &&
		navigator.userAgent.toLowerCase().includes('jsdom')
	) {
		return text.length * EDGE_LABEL_FALLBACK_CHARACTER_WIDTH_PX;
	}

	try {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) {
			return text.length * EDGE_LABEL_FALLBACK_CHARACTER_WIDTH_PX;
		}

		context.font = EDGE_LABEL_FONT;
		return context.measureText(text).width;
	} catch {
		return text.length * EDGE_LABEL_FALLBACK_CHARACTER_WIDTH_PX;
	}
}

export function measureElkEdgeLabel(text: string): ElkEdgeLabelSize {
	const measuredWidth = measureTextWidth(text);

	return {
		width: Math.max(
			Math.ceil(measuredWidth + EDGE_LABEL_HORIZONTAL_PADDING_PX * 2),
			EDGE_LABEL_HORIZONTAL_PADDING_PX * 2
		),
		height: EDGE_LABEL_MIN_HEIGHT_PX,
	};
}
