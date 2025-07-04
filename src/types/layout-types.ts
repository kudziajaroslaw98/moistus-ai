export type LayoutAlgorithm =
	| 'dagre-tb'
	| 'dagre-lr'
	| 'dagre-bt'
	| 'dagre-rl'
	| 'force-directed'
	| 'circular'
	| 'hierarchical'
	| 'grid'
	| 'radial'
	| 'tree'
	| 'elk.layered'
	| 'elk.force'
	| 'elk.radial'
	| 'org.eclipse.elk.circular'
	| 'elk.box'
	| 'elk.mrtree'
	| 'elk.stress'
	| 'elk.random';

export type ELKAlgorithm =
	| 'elk.layered'
	| 'elk.force'
	| 'elk.radial'
	| 'org.eclipse.elk.circular'
	| 'elk.box'
	| 'elk.mrtree'
	| 'elk.stress'
	| 'elk.random';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

// ELK.js specific interfaces
export interface ELKNode {
	id: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	children?: ELKNode[];
	edges?: ELKEdge[];
	layoutOptions?: Record<string, any>;
}

export interface ELKEdge {
	id: string;
	sources: string[];
	targets: string[];
	layoutOptions?: Record<string, any>;
}

export interface ELKGraph extends ELKNode {
	children: ELKNode[];
	edges: ELKEdge[];
}

export interface LayoutConfig {
	algorithm: LayoutAlgorithm;
	direction?: LayoutDirection;
	nodeSpacing?: number;
	rankSpacing?: number;
	edgeSpacing?: number;
	iterations?: number;
	animationDuration?: number;
	preserveAspectRatio?: boolean;
}

export interface DagreLayoutConfig extends LayoutConfig {
	algorithm: 'dagre-tb' | 'dagre-lr' | 'dagre-bt' | 'dagre-rl';
	nodeSpacing: number;
	rankSpacing: number;
	marginX?: number;
	marginY?: number;
}

export interface ForceDirectedLayoutConfig extends LayoutConfig {
	algorithm: 'force-directed';
	iterations: number;
	strength?: number;
	distance?: number;
	alpha?: number;
	alphaDecay?: number;
	velocityDecay?: number;
}

export interface CircularLayoutConfig extends LayoutConfig {
	algorithm: 'circular';
	radius?: number;
	startAngle?: number;
	endAngle?: number;
	sortNodes?: boolean;
}

export interface HierarchicalLayoutConfig extends LayoutConfig {
	algorithm: 'hierarchical';
	levelSeparation?: number;
	nodeSeparation?: number;
	treeSpacing?: number;
	blockShifting?: boolean;
	edgeMinimization?: boolean;
	parentCentralization?: boolean;
}

export interface GridLayoutConfig extends LayoutConfig {
	algorithm: 'grid';
	columns?: number;
	rows?: number;
	cellWidth?: number;
	cellHeight?: number;
	sortNodes?: boolean;
}

export interface RadialLayoutConfig extends LayoutConfig {
	algorithm: 'radial';
	centerNode?: string;
	maxRadius?: number;
	preventOverlap?: boolean;
	nodeSpacing: number;
}

export interface TreeLayoutConfig extends LayoutConfig {
	algorithm: 'tree';
	direction: LayoutDirection;
	levelSeparation?: number;
	siblingSpacing?: number;
	subtreeSpacing?: number;
}

export interface ELKLayoutConfig extends LayoutConfig {
	algorithm: ELKAlgorithm;
	layoutOptions: Record<string, any>;
}

export type SpecificLayoutConfig =
	| DagreLayoutConfig
	| ForceDirectedLayoutConfig
	| CircularLayoutConfig
	| HierarchicalLayoutConfig
	| GridLayoutConfig
	| RadialLayoutConfig
	| TreeLayoutConfig
	| ELKLayoutConfig;

export interface LayoutPreset {
	id: string;
	name: string;
	description: string;
	config: SpecificLayoutConfig;
	icon?: string;
	category: 'hierarchical' | 'force' | 'geometric' | 'custom';
}

export interface LayoutResult {
	nodes: Array<{
		id: string;
		position: { x: number; y: number };
	}>;
	edges: Array<{
		id: string;
		source: string;
		target: string;
	}>;
	bounds?: {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	};
}

export interface LayoutAnimation {
	duration: number;
	easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
	staggerNodes?: boolean;
	staggerDelay?: number;
}
