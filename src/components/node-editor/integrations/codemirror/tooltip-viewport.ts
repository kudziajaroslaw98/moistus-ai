import type { EditorView, Rect } from '@codemirror/view';

const MOBILE_TOOLTIP_BREAKPOINT = 768;
const MOBILE_TOOLTIP_BOTTOM_PADDING = 12;

type TooltipVisualViewport = Pick<
	VisualViewport,
	'height' | 'offsetLeft' | 'offsetTop' | 'width'
>;

interface TooltipSpaceMetrics {
	documentClientHeight: number;
	documentClientWidth: number;
	innerHeight: number;
	innerWidth: number;
	visualViewport?: TooltipVisualViewport | null;
}

function createRect({ bottom, left, right, top }: Rect): Rect {
	return { bottom, left, right, top };
}

/**
 * Computes the visible bounding rect available to CodeMirror tooltips.
 *
 * @param metrics.documentClientHeight - Document viewport height from `documentElement.clientHeight`.
 * @param metrics.documentClientWidth - Document viewport width from `documentElement.clientWidth`.
 * @param metrics.innerHeight - Window inner height fallback.
 * @param metrics.innerWidth - Window inner width used for desktop/mobile branching.
 * @param metrics.visualViewport - Optional visual viewport metrics for mobile keyboard-safe positioning.
 * @returns A `Rect` describing the clamped tooltip space.
 * @behavior Uses the full document rect when `innerWidth` is at least `MOBILE_TOOLTIP_BREAKPOINT` or `visualViewport` is missing; otherwise clamps a mobile rect to `visualViewport.offsetTop/offsetLeft/width/height`, subtracts `MOBILE_TOOLTIP_BOTTOM_PADDING`, and returns it through `createRect`.
 */
export function getTooltipSpaceRect({
	documentClientHeight,
	documentClientWidth,
	innerHeight,
	innerWidth,
	visualViewport,
}: TooltipSpaceMetrics): Rect {
	const fallbackWidth = documentClientWidth || innerWidth;
	const fallbackHeight = documentClientHeight || innerHeight;

	if (innerWidth >= MOBILE_TOOLTIP_BREAKPOINT || !visualViewport) {
		return createRect({
			top: 0,
			left: 0,
			right: fallbackWidth,
			bottom: fallbackHeight,
		});
	}

	const top = Math.max(0, visualViewport.offsetTop);
	const left = Math.max(0, visualViewport.offsetLeft);
	const right = Math.min(fallbackWidth, left + visualViewport.width);
	const bottom = Math.max(
		top,
		Math.min(
			fallbackHeight,
			top + visualViewport.height - MOBILE_TOOLTIP_BOTTOM_PADDING
		)
	);

	return createRect({ top, left, right, bottom });
}

export function getTooltipSpace(view: EditorView): Rect {
	const ownerDocument = view.dom.ownerDocument;
	const ownerWindow = ownerDocument.defaultView;
	const documentElement = ownerDocument.documentElement;

	return getTooltipSpaceRect({
		documentClientHeight: documentElement.clientHeight,
		documentClientWidth: documentElement.clientWidth,
		innerHeight: ownerWindow?.innerHeight ?? documentElement.clientHeight,
		innerWidth: ownerWindow?.innerWidth ?? documentElement.clientWidth,
		visualViewport: ownerWindow?.visualViewport ?? null,
	});
}
