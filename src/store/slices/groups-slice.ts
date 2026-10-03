import generateUuid from '@/helpers/generate-uuid';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import {
	calculateGroupBounds,
	generateGroupName,
} from '@/utils/group/group-utils';
import { StateCreator } from 'zustand';
import { AppState, GroupsSlice } from '../app-state';

export const createGroupsSlice: StateCreator<AppState, [], [], GroupsSlice> = (
	set,
	get
) => ({
	groupDragIntent: null,

	setGroupDragIntent: (intent) => {
		set({ groupDragIntent: intent });
	},

	createGroupFromSelected: withLoadingAndToast(
		async (label?: string): Promise<void> => {
			const { selectedNodes, nodes, addNode, updateNode } = get();

			if (selectedNodes.length < 2) {
				throw new Error('At least 2 nodes must be selected to create a group');
			}

			// Calculate bounds for the group using utilities
			const padding = 40;
			const bounds = calculateGroupBounds(selectedNodes, padding);
			const groupLabel = label || generateGroupName(nodes);
			const groupId = generateUuid();

			// Create the group node
			await addNode({
				parentNode: null,
				content: groupLabel,
				nodeType: 'groupNode',
				position: { x: bounds.x, y: bounds.y },
				data: {
					id: groupId,
					width: bounds.width,
					height: bounds.height,
					metadata: {
						isGroup: true,
						groupChildren: selectedNodes.map((n) => n.id),
						label: groupLabel,
						backgroundColor: 'rgba(113, 113, 122, 0.1)',
						borderColor: '#52525b',
						groupPadding: padding,
					},
				},
			});

			// Update selected nodes to reference this group
			for (const node of selectedNodes) {
				await updateNode({
					nodeId: node.id,
					data: {
						metadata: {
							...node.data.metadata,
							groupId: groupId,
						},
					},
				});
			}
		},
		'isAddingContent',
		{
			initialMessage: 'Creating group...',
			successMessage: 'Group created successfully',
			errorMessage: 'Failed to create group',
		}
	),

	setNodesGroup: async (
		nodeIds: string[],
		targetGroupId: string | null
	): Promise<void> => {
		const { nodes, updateNode } = get();
		const nodeById = new Map(nodes.map((node) => [node.id, node]));

		const targetGroup =
			targetGroupId === null ? null : nodeById.get(targetGroupId);

		if (targetGroupId !== null && !targetGroup?.data.metadata?.isGroup) {
			throw new Error('Invalid group node');
		}

		// Groups never nest; nodes already in the target are no-ops.
		const movingIds = nodeIds.filter((nodeId) => {
			const node = nodeById.get(nodeId);
			return (
				node &&
				!node.data.metadata?.isGroup &&
				node.data.metadata?.groupId !== (targetGroupId ?? undefined)
			);
		});

		if (movingIds.length === 0) return;

		// Batch removals per old group so each group's children are filtered once
		// (avoids stale reads when several members leave the same group).
		const removalsByGroup = new Map<string, Set<string>>();

		for (const nodeId of movingIds) {
			const oldGroupId = nodeById.get(nodeId)?.data.metadata?.groupId;
			if (!oldGroupId) continue;

			const removals = removalsByGroup.get(oldGroupId) ?? new Set<string>();
			removals.add(nodeId);
			removalsByGroup.set(oldGroupId, removals);
		}

		for (const [oldGroupId, removals] of removalsByGroup) {
			const oldGroup = nodeById.get(oldGroupId);
			if (!oldGroup?.data.metadata?.isGroup) continue;

			const currentChildren =
				(oldGroup.data.metadata.groupChildren as string[]) || [];

			await updateNode({
				nodeId: oldGroupId,
				data: {
					metadata: {
						groupChildren: currentChildren.filter((id) => !removals.has(id)),
					},
				},
			});
		}

		if (targetGroup && targetGroupId !== null) {
			const currentChildren =
				(targetGroup.data.metadata?.groupChildren as string[]) || [];

			await updateNode({
				nodeId: targetGroupId,
				data: {
					metadata: {
						groupChildren: [...new Set([...currentChildren, ...movingIds])],
					},
				},
			});
		}

		for (const nodeId of movingIds) {
			await updateNode({
				nodeId,
				data: {
					metadata: {
						groupId: targetGroupId ?? undefined,
					},
				},
			});
		}
	},

	addNodesToGroup: withLoadingAndToast(
		async (groupId: string, nodeIds: string[]): Promise<void> => {
			await get().setNodesGroup(nodeIds, groupId);
		},
		'isAddingContent',
		{
			initialMessage: 'Adding nodes to group...',
			successMessage: 'Nodes added to group',
			errorMessage: 'Failed to add nodes to group',
		}
	),

	removeNodesFromGroup: withLoadingAndToast(
		async (nodeIds: string[]): Promise<void> => {
			await get().setNodesGroup(nodeIds, null);
		},
		'isAddingContent',
		{
			initialMessage: 'Removing nodes from group...',
			successMessage: 'Nodes removed from group',
			errorMessage: 'Failed to remove nodes from group',
		}
	),

	deleteGroup: withLoadingAndToast(
		async (
			groupId: string,
			preserveChildren: boolean = true
		): Promise<void> => {
			const { nodes, deleteNodes, updateNode } = get();

			const groupNode = nodes.find((n) => n.id === groupId);

			if (!groupNode?.data.metadata?.isGroup) {
				throw new Error('Invalid group node');
			}

			const childNodeIds =
				(groupNode.data.metadata.groupChildren as string[]) || [];

			if (preserveChildren) {
				// Remove group reference from child nodes
				for (const nodeId of childNodeIds) {
					await updateNode({
						nodeId,
						data: {
							metadata: {
								groupId: undefined,
							},
						},
					});
				}
			} else {
				// Delete child nodes
				const childNodes = nodes.filter((n) => childNodeIds.includes(n.id));

				if (childNodes.length > 0) {
					await deleteNodes(childNodes);
				}
			}

			// Delete the group node
			await deleteNodes([groupNode]);
		},
		'isAddingContent',
		{
			initialMessage: 'Deleting group...',
			successMessage: 'Group deleted successfully',
			errorMessage: 'Failed to delete group',
		}
	),

	ungroupNodes: withLoadingAndToast(
		async (groupId: string): Promise<void> => {
			const { nodes, updateNode, deleteNodes } = get();

			const groupNode = nodes.find((n) => n.id === groupId);

			if (!groupNode?.data.metadata?.isGroup) {
				throw new Error('Invalid group node');
			}

			const childNodeIds =
				(groupNode.data.metadata.groupChildren as string[]) || [];

			// Remove group reference from all child nodes
			for (const nodeId of childNodeIds) {
				await updateNode({
					nodeId,
					data: {
						metadata: {
							groupId: undefined,
						},
					},
				});
			}

			// Delete the group node
			await deleteNodes([groupNode]);
		},
		'isAddingContent',
		{
			initialMessage: 'Ungrouping nodes...',
			successMessage: 'Nodes ungrouped successfully',
			errorMessage: 'Failed to ungroup nodes',
		}
	),
});
