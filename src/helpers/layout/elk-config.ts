/**
 * ELK.js Configuration Builder
 * Creates layout options for different layout directions
 */

import type { ElkLayoutOptions, LayoutConfig, LayoutDirection } from '@/types/layout-types';

// Direction mapping from our types to ELK directions
const DIRECTION_MAP: Record<LayoutDirection, ElkLayoutOptions> = {
	LEFT_RIGHT: {
		'elk.direction': 'RIGHT',
	},
	TOP_BOTTOM: {
		'elk.direction': 'DOWN',
	},
};

/**
 * Build ELK layout options from our LayoutConfig
 * Note: ELK options must all be strings
 */
export function buildLayoutOptions(config: LayoutConfig): ElkLayoutOptions {
	// Base options for all layouts (all values must be strings)
	const baseOptions: ElkLayoutOptions = {
		'elk.algorithm': 'org.eclipse.elk.layered',

		// Spacing configuration
		'elk.spacing.nodeNode': String(config.nodeSpacing),
		'elk.spacing.edgeNode': '20',
		'elk.spacing.edgeEdge': '15',

		// Padding around the entire graph
		'elk.padding': '[left=50, top=50, right=50, bottom=50]',

		// Edge routing - orthogonal creates clean right-angle edges
		'elk.edgeRouting': 'ORTHOGONAL',
	};

	const layeredOptions: ElkLayoutOptions = {
		'elk.layered.spacing.nodeNodeBetweenLayers': String(config.layerSpacing),
		'elk.layered.spacing.edgeNodeBetweenLayers': '30',
		'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
		'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
		'elk.layered.edgeRouting.selfLoopDistribution': 'NORTH',
		'elk.layered.edgeRouting.splines.mode': 'CONSERVATIVE',
	};

	// Merge direction-specific options
	const directionOptions = DIRECTION_MAP[config.direction];

	return { ...baseOptions, ...layeredOptions, ...directionOptions };
}

/**
 * Build options for a child/compound node (group)
 */
export function buildGroupLayoutOptions(): ElkLayoutOptions {
	return {
		'elk.padding': '[left=20, top=40, right=20, bottom=20]',
		'elk.spacing.nodeNode': '30',
	};
}

/**
 * Get recommended curve type based on layout direction
 * Different directions look better with different curve types
 */
export function getRecommendedCurveType(
	direction: LayoutDirection
): 'linear' | 'bezier' | 'catmull-rom' | 'smoothstep' {
	void direction;
	return 'smoothstep';
}
