import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { LayoutDirection } from '@/types/layout-direction';
import type {
	ELKLayoutConfig,
	SpecificLayoutConfig,
} from '@/types/layout-types';
import {
	applyDirectionalLayout,
	getELKLayoutPresets,
	layoutWithELK,
} from '@/utils/elk-graph-utils';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, LayoutSlice } from '../app-state';

export const createLayoutSlice: StateCreator<AppState, [], [], LayoutSlice> = (
	set,
	get
) => ({
	// state
	currentLayoutConfig: null,
	availableLayouts: getELKLayoutPresets(),

	// setters
	setLayoutConfig: (config: SpecificLayoutConfig) => {
		set({ currentLayoutConfig: config });
	},

	// getters
	getLayoutPresets: () => {
		return getELKLayoutPresets();
	},

	// actions
	applyLayout: withLoadingAndToast(
		async (direction: LayoutDirection) => {
			const {
				nodes,
				edges,
				setNodes,
				reactFlowInstance,
				addStateToHistory,
				triggerNodeSave,
			} = get();

			if (nodes.length === 0) {
				toast.error('Nothing to layout. Add some nodes first.');
				return;
			}

			// Use ELK.js for layout computation with enhanced options
			const result = await applyDirectionalLayout(nodes, edges, direction);

			// Post-process positions to ensure better distribution
			const updatedNodes = nodes.map((node) => {
				const layoutNode = result.nodes.find((n) => n.id === node.id);
				if (!layoutNode) return node;

				// Apply the layout position with optional adjustments
				return {
					...node,
					position: {
						x: layoutNode.position.x,
						y: layoutNode.position.y
					}
				};
			});

			setNodes(updatedNodes);

			// Save and fit view
			updatedNodes.forEach((node) => triggerNodeSave(node.id));
			addStateToHistory(`applyLayout (${direction})`);

			setTimeout(() => {
				reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
			}, 50);
		},
		'isApplyingLayout',
		{
			initialMessage: 'Applying layout...',
			successMessage: 'Layout applied and node positions are being saved.',
			errorMessage: 'Failed to apply layout.',
		}
	),
	applyAdvancedLayout: withLoadingAndToast(
		async (config: SpecificLayoutConfig) => {
			const {
				nodes,
				edges,
				setNodes,
				reactFlowInstance,
				addStateToHistory,
				triggerNodeSave,
			} = get();

			if (nodes.length === 0) {
				toast.error('Nothing to layout. Add some nodes first.');
				return;
			}

			// Check if it's an ELK layout config
			if ('algorithm' in config && config.algorithm.startsWith('elk.')) {
				const elkConfig = config as ELKLayoutConfig;

				const result = await layoutWithELK(nodes, edges, {
					algorithm: elkConfig.algorithm,
					direction: elkConfig.direction,
					layoutOptions: elkConfig.layoutOptions,
					useWorker: false,
				});

				const updatedNodes = nodes.map((node) => {
					const layoutNode = result.nodes.find((ln) => ln.id === node.id);
					return layoutNode ? { ...node, position: layoutNode.position } : node;
				});

				setNodes(updatedNodes);
				updatedNodes.forEach((node) => triggerNodeSave(node.id));
				addStateToHistory('applyAdvancedLayout');

				setTimeout(() => {
					reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
				}, 50);
			} else {
				// Fallback for non-ELK configs (if any remain)
				throw new Error('Unsupported layout configuration');
			}

			set({ currentLayoutConfig: config });
		},
		'isApplyingLayout',
		{
			initialMessage: 'Applying advanced layout...',
			successMessage: 'Advanced layout applied successfully',
			errorMessage: 'Failed to apply advanced layout',
		}
	),
});
