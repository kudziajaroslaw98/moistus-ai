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
			const { selectedNodes, nodes, addNode } = get();

			if (selectedNodes.length < 2) {
				throw new Error('At least 2 nodes must be selected to create a group');
			}

			// Calculate bounds for the group using utilities
			const padding = 40;
			const bounds = calculateGroupBounds(selectedNodes, padding);
			const groupLabel = label || generateGroupName(nodes);
			const groupId = generateUuid();
			// Groups never nest, so selected groups are not members.
			const memberIds = selectedNodes
				.filter((node) => !node.data.metadata?.isGroup)
				.map((node) => node.id);

			// Create the group node. The id must go through `nodeId`: addNode
			// ignores `data.id`, which previously left members pointing at a
			// phantom group id.
			await addNode({
				parentNode: null,
				content: groupLabel,
				nodeType: 'groupNode',
				nodeId: groupId,
				position: { x: bounds.x, y: bounds.y },
				data: {
					width: bounds.width,
					height: bounds.height,
					metadata: {
						isGroup: true,
						groupChildren: memberIds,
						label: groupLabel,
						backgroundColor: 'rgba(113, 113, 122, 0.1)',
						borderColor: '#52525b',
						groupPadding: padding,
					},
				},
			});

			// Point members at this group (detaching them from any previous group)
			await get().setNodesGroup(memberIds, groupId);
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

		const groupNodes = nodes.filter((node) => node.data.metadata?.isGroup);

		// Every group that currently claims the node, via groupId or groupChildren
		// (they can disagree, e.g. phantom groupIds from older group creation).
		const getClaimingGroupIds = (nodeId: string): Set<string> => {
			const claiming = new Set<string>();
			const groupId = nodeById.get(nodeId)?.data.metadata?.groupId;

			if (groupId && nodeById.get(groupId)?.data.metadata?.isGroup) {
				claiming.add(groupId);
			}

			for (const group of groupNodes) {
				const children = (group.data.metadata?.groupChildren as string[]) || [];
				if (children.includes(nodeId)) claiming.add(group.id);
			}

			return claiming;
		};

		// Groups never nest; nodes already in the requested state are no-ops.
		const movingIds = nodeIds.filter((nodeId) => {
			const node = nodeById.get(nodeId);
			if (!node || node.data.metadata?.isGroup) return false;

			const claiming = getClaimingGroupIds(nodeId);
			const groupId = node.data.metadata?.groupId;

			if (targetGroupId === null) {
				return claiming.size > 0 || Boolean(groupId);
			}

			return (
				groupId !== targetGroupId ||
				claiming.size !== 1 ||
				!claiming.has(targetGroupId)
			);
		});

		if (movingIds.length === 0) return;

		// Batch removals per old group so each group's children are filtered once
		// (avoids stale reads when several members leave the same group).
		const removalsByGroup = new Map<string, Set<string>>();

		for (const nodeId of movingIds) {
			for (const oldGroupId of getClaimingGroupIds(nodeId)) {
				if (oldGroupId === targetGroupId) continue;

				const removals = removalsByGroup.get(oldGroupId) ?? new Set<string>();
				removals.add(nodeId);
				removalsByGroup.set(oldGroupId, removals);
			}
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
