import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	ELKAlgorithm,
	LayoutDirection,
	LayoutResult,
	SpecificLayoutConfig,
} from '@/types/layout-types';
import { layoutWithELK } from './elk-graph-utils';

export class LayoutAlgorithms {
	// Map legacy algorithm names to ELK.js equivalents
	private static mapAlgorithmToELK(algorithm: string): ELKAlgorithm {
		switch (algorithm) {
			case 'dagre-tb':
			case 'dagre-lr':
			case 'dagre-bt':
			case 'dagre-rl':
			case 'hierarchical':
				return 'elk.layered';
			case 'force-directed':
				return 'elk.force';
			case 'circular':
				return 'org.eclipse.elk.circular';
			case 'radial':
				return 'elk.radial';
			case 'tree':
				return 'elk.mrtree';
			case 'grid':
				return 'elk.box'; // Use box packing for grid-like layout
			default:
				return 'elk.layered';
		}
	}

	// Map legacy direction to ELK direction
	private static mapDirectionToELK(
		algorithm: string,
		direction?: string
	): LayoutDirection {
		if (algorithm === 'dagre-tb') return 'TB';
		if (algorithm === 'dagre-lr') return 'LR';
		if (algorithm === 'dagre-bt') return 'BT';
		if (algorithm === 'dagre-rl') return 'RL';

		return (direction as LayoutDirection) || 'TB';
	}

	// Apply ELK layered layout (replaces dagre layouts)
	private static async applyELKLayeredLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		direction: LayoutDirection = 'TB',
		nodeSpacing: number = 80,
		rankSpacing: number = 150
	): Promise<LayoutResult> {
		return layoutWithELK(nodes, edges, {
			algorithm: 'elk.layered',
			direction,
			layoutOptions: {
				'elk.layered.spacing.nodeNodeBetweenLayers': rankSpacing,
				'elk.layered.spacing.nodeNode': nodeSpacing,
				'elk.spacing.nodeNode': nodeSpacing,
				'elk.spacing.edgeNode': 40,
			},
			useWorker: false,
		});
	}

	// Apply ELK force-directed layout
	private static async applyELKForceLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		config: { iterations?: number; strength?: number; distance?: number } = {}
	): Promise<LayoutResult> {
		const { iterations = 300, strength = 0.5 } = config;

		return layoutWithELK(nodes, edges, {
			algorithm: 'elk.force',
			layoutOptions: {
				'elk.force.iterations': iterations,
				'elk.force.repulsivePower': strength,
				'elk.force.temperature': 0.001,
				'elk.spacing.nodeNode': 80,
			},
			useWorker: false,
		});
	}

	// Apply ELK circular layout
	private static async applyELKCircularLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		config: { radius?: number; startAngle?: number; sortNodes?: boolean } = {}
	): Promise<LayoutResult> {
		return layoutWithELK(nodes, edges, {
			algorithm: 'org.eclipse.elk.circular',
			layoutOptions: {
				'elk.spacing.nodeNode': 80,
			},
			useWorker: false,
		});
	}

	// Apply ELK box layout (replaces grid layout)
	private static async applyELKBoxLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		config: { columns?: number; cellWidth?: number; cellHeight?: number } = {}
	): Promise<LayoutResult> {
		return layoutWithELK(nodes, edges, {
			algorithm: 'elk.box',
			layoutOptions: {
				'elk.box.packingMode': 'SIMPLE',
				'elk.spacing.nodeNode': 20,
			},
			useWorker: false,
		});
	}

	// Apply ELK radial layout
	private static async applyELKRadialLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		config: {
			centerNode?: string;
			maxRadius?: number;
			nodeSpacing?: number;
		} = {}
	): Promise<LayoutResult> {
		const { nodeSpacing = 80 } = config;

		return layoutWithELK(nodes, edges, {
			algorithm: 'elk.radial',
			layoutOptions: {
				'elk.radial.radius': config.maxRadius || 200,
				'elk.radial.compactor': 'NONE',
				'elk.spacing.nodeNode': nodeSpacing,
			},
			useWorker: false,
		});
	}

	// Apply ELK tree layout (using mrtree)
	private static async applyELKTreeLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		config: {
			direction?: string;
			levelSeparation?: number;
			siblingSpacing?: number;
		} = {}
	): Promise<LayoutResult> {
		const { levelSeparation = 150, siblingSpacing = 100 } = config;

		return layoutWithELK(nodes, edges, {
			algorithm: 'elk.mrtree',
			direction: (config.direction as LayoutDirection) || 'TB',
			layoutOptions: {
				'elk.mrtree.searchOrder': 'DFS',
				'elk.spacing.nodeNode': siblingSpacing,
				'elk.spacing.nodeNodeBetweenLayers': levelSeparation,
			},
			useWorker: false,
		});
	}

	// Main layout application method
	public static async applyLayout(
		nodes: AppNode[],
		edges: AppEdge[],
		config: SpecificLayoutConfig
	): Promise<LayoutResult> {
		if (!nodes || nodes.length === 0) {
			return { nodes: [], edges: [] };
		}

		try {
			switch (config.algorithm) {
				case 'dagre-tb':
					return this.applyELKLayeredLayout(
						nodes,
						edges,
						'TB',
						config.nodeSpacing || 80,
						config.rankSpacing || 150
					);

				case 'dagre-lr':
					return this.applyELKLayeredLayout(
						nodes,
						edges,
						'LR',
						config.nodeSpacing || 80,
						config.rankSpacing || 150
					);

				case 'dagre-bt':
					return this.applyELKLayeredLayout(
						nodes,
						edges,
						'BT',
						config.nodeSpacing || 80,
						config.rankSpacing || 150
					);

				case 'dagre-rl':
					return this.applyELKLayeredLayout(
						nodes,
						edges,
						'RL',
						config.nodeSpacing || 80,
						config.rankSpacing || 150
					);

				case 'force-directed':
					return this.applyELKForceLayout(nodes, edges, {
						iterations: config.iterations || 300,
						strength: (config as any).strength,
						distance: (config as any).distance,
					});

				case 'circular':
					return this.applyELKCircularLayout(nodes, edges, {
						radius: (config as any).radius,
						startAngle: (config as any).startAngle,
						sortNodes: (config as any).sortNodes,
					});

				case 'grid':
					return this.applyELKBoxLayout(nodes, edges, {
						columns: (config as any).columns,
						cellWidth: (config as any).cellWidth,
						cellHeight: (config as any).cellHeight,
					});

				case 'radial':
					return this.applyELKRadialLayout(nodes, edges, {
						centerNode: (config as any).centerNode,
						maxRadius: (config as any).maxRadius,
						nodeSpacing: config.nodeSpacing || 80,
					});

				case 'tree':
					return this.applyELKTreeLayout(nodes, edges, {
						direction: config.direction,
						levelSeparation: (config as any).levelSeparation,
						siblingSpacing: (config as any).siblingSpacing,
					});

				case 'hierarchical':
					return this.applyELKLayeredLayout(
						nodes,
						edges,
						config.direction || 'TB',
						config.nodeSpacing || 80,
						config.rankSpacing || 150
					);

				default:
					// Default to ELK layered layout
					return this.applyELKLayeredLayout(nodes, edges);
			}
		} catch (error) {
			console.error('Layout application failed:', error);
			// Return original positions on error
			return {
				nodes: nodes.map((node) => ({
					id: node.id,
					position: node.position,
				})),
				edges: edges.map((edge) => ({
					id: edge.id,
					source: edge.source,
					target: edge.target,
				})),
			};
		}
	}

	// Get layout presets - now returns ELK.js based presets
	public static getLayoutPresets() {
		return [
			{
				id: 'dagre-tb',
				name: 'Top to Bottom',
				description: 'Hierarchical layout flowing from top to bottom',
				category: 'hierarchical' as const,
				config: {
					algorithm: 'dagre-tb' as const,
					nodeSpacing: 80,
					rankSpacing: 150,
				},
			},
			{
				id: 'dagre-lr',
				name: 'Left to Right',
				description: 'Hierarchical layout flowing from left to right',
				category: 'hierarchical' as const,
				config: {
					algorithm: 'dagre-lr' as const,
					nodeSpacing: 80,
					rankSpacing: 150,
				},
			},
			{
				id: 'dagre-bt',
				name: 'Bottom to Top',
				description: 'Hierarchical layout flowing from bottom to top',
				category: 'hierarchical' as const,
				config: {
					algorithm: 'dagre-bt' as const,
					nodeSpacing: 80,
					rankSpacing: 150,
				},
			},
			{
				id: 'dagre-rl',
				name: 'Right to Left',
				description: 'Hierarchical layout flowing from right to left',
				category: 'hierarchical' as const,
				config: {
					algorithm: 'dagre-rl' as const,
					nodeSpacing: 80,
					rankSpacing: 150,
				},
			},
			{
				id: 'force-directed',
				name: 'Force Directed',
				description: 'Physics-based organic layout using ELK force simulation',
				category: 'force' as const,
				config: {
					algorithm: 'force-directed' as const,
					iterations: 300,
				},
			},
			{
				id: 'circular',
				name: 'Circular',
				description: 'Arrange nodes in a circle using ELK circular algorithm',
				category: 'geometric' as const,
				config: {
					algorithm: 'circular' as const,
				},
			},
			{
				id: 'radial',
				name: 'Radial',
				description:
					'Radial layout from center node using ELK radial algorithm',
				category: 'hierarchical' as const,
				config: {
					algorithm: 'radial' as const,
					nodeSpacing: 80,
				},
			},
			{
				id: 'grid',
				name: 'Grid',
				description: 'Box packing layout for efficient space usage',
				category: 'geometric' as const,
				config: {
					algorithm: 'grid' as const,
				},
			},
			{
				id: 'tree',
				name: 'Tree',
				description: 'Multi-root tree layout using ELK mrtree algorithm',
				category: 'hierarchical' as const,
				config: {
					algorithm: 'tree' as const,
					direction: 'TB' as const,
				},
			},
		];
	}

	// Utility method to get ELK algorithm from legacy algorithm name
	public static getELKAlgorithm(algorithm: string): ELKAlgorithm {
		return this.mapAlgorithmToELK(algorithm);
	}

	// Utility method to check if an algorithm is supported
	public static isAlgorithmSupported(algorithm: string): boolean {
		const supportedAlgorithms = [
			'dagre-tb',
			'dagre-lr',
			'dagre-bt',
			'dagre-rl',
			'force-directed',
			'circular',
			'grid',
			'radial',
			'tree',
			'hierarchical',
		];
		return supportedAlgorithms.includes(algorithm);
	}
}
