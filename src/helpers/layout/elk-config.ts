/**
 * ELK.js Configuration Builder
 * Creates layout options for different layout directions
 */

import type {
	ElkLayoutOptions,
	LayoutConfig,
	LayoutDirection,
	LayoutPresetId,
} from '@/types/layout-types';
import type { WaypointCurveType } from '@/types/path-types';

// Direction mapping from our types to ELK directions
const DIRECTION_MAP: Record<LayoutDirection, ElkLayoutOptions> = {
	LEFT_RIGHT: {
		'elk.direction': 'RIGHT',
	},
	TOP_BOTTOM: {
		'elk.direction': 'DOWN',
	},
};

type ElkPresetAlgorithm =
	| 'org.eclipse.elk.layered'
	| 'org.eclipse.elk.mrtree'
	| 'org.eclipse.elk.radial'
	| 'org.eclipse.elk.force';

type EdgeLabelStrategy = 'elk' | 'path';

export interface LayoutPresetDescriptor {
	id: LayoutPresetId;
	label: string;
	description: string;
}

interface LayoutPresetDefinition extends LayoutPresetDescriptor {
	algorithm: ElkPresetAlgorithm;
	curveType: WaypointCurveType;
	edgeLabelStrategy: EdgeLabelStrategy;
	buildOptions: (config: LayoutConfig) => ElkLayoutOptions;
}

const DEFAULT_GRAPH_PADDING = '[left=50, top=50, right=50, bottom=50]';
const ROOMY_NODE_SPACING = 96;
const ROOMY_LAYER_SPACING = 160;
const TREE_NODE_SPACING = 90;
const TREE_LAYER_SPACING = 150;
const RADIAL_NODE_SPACING = 100;
const RADIAL_RADIUS = 180;
const FORCE_NODE_SPACING = 140;

const LAYOUT_PRESET_DEFINITIONS: readonly LayoutPresetDefinition[] = [
	{
		id: 'roomy-branches',
		label: 'Roomy Branches',
		description: 'Layered layout with wider branch spacing',
		algorithm: 'org.eclipse.elk.layered',
		curveType: 'smoothstep',
		edgeLabelStrategy: 'elk',
		buildOptions: (config) => ({
			...buildLayeredLayoutOptions({
				direction: config.direction,
				nodeSpacing: Math.max(config.nodeSpacing, ROOMY_NODE_SPACING),
				layerSpacing: Math.max(config.layerSpacing, ROOMY_LAYER_SPACING),
			}),
			'elk.spacing.componentComponent': '80',
			'elk.layered.highDegreeNodes.treatment': 'true',
			'elk.layered.highDegreeNodes.threshold': '6',
			'elk.layered.highDegreeNodes.treeHeight': '4',
		}),
	},
	{
		id: 'tree-right',
		label: 'Tree Right',
		description: 'Tree layout flowing left to right',
		algorithm: 'org.eclipse.elk.mrtree',
		curveType: 'linear',
		edgeLabelStrategy: 'path',
		buildOptions: (config) =>
			buildTreeLayoutOptions({
				direction: 'RIGHT',
				nodeSpacing: Math.max(config.nodeSpacing, TREE_NODE_SPACING),
				layerSpacing: Math.max(config.layerSpacing, TREE_LAYER_SPACING),
			}),
	},
	{
		id: 'tree-down',
		label: 'Tree Down',
		description: 'Tree layout flowing top to bottom',
		algorithm: 'org.eclipse.elk.mrtree',
		curveType: 'linear',
		edgeLabelStrategy: 'path',
		buildOptions: (config) =>
			buildTreeLayoutOptions({
				direction: 'DOWN',
				nodeSpacing: Math.max(config.nodeSpacing, TREE_NODE_SPACING),
				layerSpacing: Math.max(config.layerSpacing, TREE_LAYER_SPACING),
			}),
	},
	{
		id: 'radial-tree',
		label: 'Radial Tree',
		description: 'Radial tree layout around a root',
		algorithm: 'org.eclipse.elk.radial',
		curveType: 'linear',
		edgeLabelStrategy: 'path',
		buildOptions: (config) => ({
			'elk.algorithm': 'org.eclipse.elk.radial',
			'elk.spacing.nodeNode': String(
				Math.max(config.nodeSpacing, RADIAL_NODE_SPACING)
			),
			'elk.spacing.componentComponent': '90',
			'elk.padding': DEFAULT_GRAPH_PADDING,
			'elk.radial.radius': String(Math.max(config.layerSpacing, RADIAL_RADIUS)),
		}),
	},
	{
		id: 'organic-spread',
		label: 'Organic Spread',
		description: 'Force layout for a loose graph overview',
		algorithm: 'org.eclipse.elk.force',
		curveType: 'linear',
		edgeLabelStrategy: 'path',
		buildOptions: (config) => ({
			'elk.algorithm': 'org.eclipse.elk.force',
			'elk.spacing.nodeNode': String(
				Math.max(config.nodeSpacing, FORCE_NODE_SPACING)
			),
			'elk.spacing.componentComponent': '120',
			'elk.padding': DEFAULT_GRAPH_PADDING,
			'elk.force.iterations': '500',
			'elk.randomSeed': '1',
			'elk.separateConnectedComponents': 'true',
		}),
	},
];

export const LAYOUT_PRESETS: readonly LayoutPresetDescriptor[] =
	LAYOUT_PRESET_DEFINITIONS.map(({ id, label, description }) => ({
		id,
		label,
		description,
	}));

function getLayoutPresetDefinition(
	presetId: LayoutPresetId | undefined
): LayoutPresetDefinition | null {
	if (!presetId) {
		return null;
	}

	return (
		LAYOUT_PRESET_DEFINITIONS.find((preset) => preset.id === presetId) ?? null
	);
}

/**
 * Build ELK layout options from our LayoutConfig
 * Note: ELK options must all be strings
 */
export function buildLayoutOptions(config: LayoutConfig): ElkLayoutOptions {
	const preset = getLayoutPresetDefinition(config.presetId);
	if (preset) {
		return preset.buildOptions(config);
	}

	return buildLayeredLayoutOptions(config);
}

function buildLayeredLayoutOptions({
	direction,
	nodeSpacing,
	layerSpacing,
}: Pick<
	LayoutConfig,
	'direction' | 'nodeSpacing' | 'layerSpacing'
>): ElkLayoutOptions {
	const baseOptions: ElkLayoutOptions = {
		'elk.algorithm': 'org.eclipse.elk.layered',

		// Spacing configuration
		'elk.spacing.nodeNode': String(nodeSpacing),
		'elk.spacing.edgeNode': '20',
		'elk.spacing.edgeEdge': '15',

		// Padding around the entire graph
		'elk.padding': DEFAULT_GRAPH_PADDING,

		// Edge routing - orthogonal creates clean right-angle edges
		'elk.edgeRouting': 'ORTHOGONAL',
	};

	const layeredOptions: ElkLayoutOptions = {
		'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
		'elk.layered.spacing.edgeNodeBetweenLayers': '30',
		'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
		'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
		'elk.layered.edgeRouting.selfLoopDistribution': 'NORTH',
		'elk.layered.edgeRouting.splines.mode': 'CONSERVATIVE',
		'elk.layered.edgeLabels.centerLabelPlacementStrategy': 'MEDIAN_LAYER',
	};

	// Merge direction-specific options
	const directionOptions = DIRECTION_MAP[direction];

	return { ...baseOptions, ...layeredOptions, ...directionOptions };
}

function buildTreeLayoutOptions({
	direction,
	nodeSpacing,
	layerSpacing,
}: {
	direction: 'RIGHT' | 'DOWN';
	nodeSpacing: number;
	layerSpacing: number;
}): ElkLayoutOptions {
	const effectiveNodeSpacing = Math.max(
		nodeSpacing,
		Math.round(layerSpacing * 0.6)
	);

	return {
		'elk.algorithm': 'org.eclipse.elk.mrtree',
		'elk.direction': direction,
		'elk.spacing.nodeNode': String(effectiveNodeSpacing),
		'elk.spacing.edgeNode': '20',
		'elk.spacing.componentComponent': '80',
		'elk.padding': DEFAULT_GRAPH_PADDING,
		'elk.mrtree.edgeRoutingMode': 'AVOID_OVERLAP',
		'elk.mrtree.searchOrder': 'BFS',
	};
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

export function buildEdgeLabelLayoutOptions(): ElkLayoutOptions {
	return {
		'elk.edgeLabels.placement': 'CENTER',
		'elk.edgeLabels.inline': 'true',
	};
}

export function getLayoutPresetLabel(presetId: LayoutPresetId): string {
	return getLayoutPresetDefinition(presetId)?.label ?? 'Layout Preset';
}

export function usesElkEdgeLabels(config: LayoutConfig): boolean {
	return getLayoutPresetDefinition(config.presetId)?.edgeLabelStrategy !== 'path';
}

/**
 * Get recommended curve type based on layout direction
 * Different directions look better with different curve types
 */
export function getRecommendedCurveType(
	config: LayoutConfig
): WaypointCurveType {
	return getLayoutPresetDefinition(config.presetId)?.curveType ?? 'smoothstep';
}
