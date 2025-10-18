import type { AttributedHistoryDelta, HistoryItem } from '@/types/history-state';

/**
 * Represents a group of related history items
 */
export interface HistoryGroup {
	type: 'group';
	id: string;
	nodeId: string;
	nodeName: string;
	items: HistoryItemWithMeta[];
	startTime: number;
	endTime: number;
	changeCount: number;
	isExpanded: boolean;
}

/**
 * Represents a single ungrouped history item
 */
export interface UngroupedHistoryItem {
	type: 'single';
	item: HistoryItemWithMeta;
}

/**
 * Union type for grouped and ungrouped items
 */
export type HistoryGroupOrItem = HistoryGroup | UngroupedHistoryItem;

/**
 * History item with additional metadata
 */
export interface HistoryItemWithMeta {
	meta: HistoryItem;
	originalIndex: number;
	isCurrent: boolean;
	delta?: AttributedHistoryDelta;
}

/**
 * Extract node ID from a history delta
 */
function extractNodeIdFromDelta(delta?: AttributedHistoryDelta): string | null {
	if (!delta || !delta.changes || !Array.isArray(delta.changes)) {
		return null;
	}

	// Look for a node operation in the changes
	const nodeChange = delta.changes.find((change: any) => change.type === 'node');
	if (!nodeChange) {
		return null;
	}

	// Extract node ID from the change
	const nodeData = (nodeChange.value || nodeChange.removedValue) as any;
	return nodeData?.id || null;
}

/**
 * Extract node name/label from a history delta
 */
function extractNodeNameFromDelta(delta?: AttributedHistoryDelta): string {
	if (!delta || !delta.changes || !Array.isArray(delta.changes)) {
		return 'Untitled';
	}

	const nodeChange = delta.changes.find((change: any) => change.type === 'node');
	if (!nodeChange) {
		return 'Untitled';
	}

	const nodeData = (nodeChange.value || nodeChange.removedValue) as any;
	const data = nodeData?.data as any;

	// Try various label sources
	if (data?.label) return data.label;
	if (data?.content) {
		const content = String(data.content);
		return content.length > 30 ? content.slice(0, 27) + '...' : content;
	}
	if (data?.title) return data.title;

	return 'Untitled';
}

/**
 * Groups consecutive history items by node ID
 * @param items History items with metadata
 * @param maxTimeGapMs Maximum time gap to consider items as part of same group (default: 5 minutes)
 * @param initialExpandState Initial expansion state for groups (default: auto-expand groups with ≤ 3 items)
 * @returns Array of grouped and ungrouped items
 */
export function groupHistoryItems(
	items: HistoryItemWithMeta[],
	maxTimeGapMs: number = 5 * 60 * 1000, // 5 minutes
	initialExpandState: 'all' | 'none' | 'auto' = 'auto'
): HistoryGroupOrItem[] {
	const result: HistoryGroupOrItem[] = [];
	let currentGroup: HistoryItemWithMeta[] | null = null;
	let currentNodeId: string | null = null;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const delta = item.delta;
		const nodeId = extractNodeIdFromDelta(delta);

		// If this item doesn't have a node ID, or it's a different node,
		// or the time gap is too large, finalize the current group
		const timeSinceLastItem =
			currentGroup && currentGroup.length > 0
				? Math.abs(item.meta.timestamp - currentGroup[currentGroup.length - 1].meta.timestamp)
				: 0;

		const shouldStartNewGroup =
			!nodeId || // No node ID (edge or multi-entity change)
			nodeId !== currentNodeId || // Different node
			timeSinceLastItem > maxTimeGapMs; // Time gap too large

		if (shouldStartNewGroup && currentGroup && currentGroup.length > 0) {
			// Finalize current group
			if (currentGroup.length === 1) {
				// Single item - don't group
				result.push({
					type: 'single',
					item: currentGroup[0],
				});
			} else {
				// Multiple items - create group
				const groupNodeId = currentNodeId || 'unknown';
				const nodeName = extractNodeNameFromDelta(currentGroup[0].delta);
				const timestamps = currentGroup.map((g) => g.meta.timestamp);
				const startTime = Math.min(...timestamps);
				const endTime = Math.max(...timestamps);

				// Determine initial expansion state
				let isExpanded = false;
				if (initialExpandState === 'all') {
					isExpanded = true;
				} else if (initialExpandState === 'auto') {
					// Auto-expand small groups (≤ 3 items)
					isExpanded = currentGroup.length <= 3;
				}

				result.push({
					type: 'group',
					id: `group-${groupNodeId}-${startTime}`,
					nodeId: groupNodeId,
					nodeName,
					items: currentGroup,
					startTime,
					endTime,
					changeCount: currentGroup.length,
					isExpanded,
				});
			}

			currentGroup = null;
			currentNodeId = null;
		}

		// Start or continue grouping
		if (nodeId) {
			if (!currentGroup) {
				currentGroup = [item];
				currentNodeId = nodeId;
			} else {
				currentGroup.push(item);
			}
		} else {
			// Item without node ID - add as single item
			result.push({
				type: 'single',
				item,
			});
		}
	}

	// Finalize any remaining group
	if (currentGroup && currentGroup.length > 0) {
		if (currentGroup.length === 1) {
			result.push({
				type: 'single',
				item: currentGroup[0],
			});
		} else {
			const groupNodeId = currentNodeId || 'unknown';
			const nodeName = extractNodeNameFromDelta(currentGroup[0].delta);
			const timestamps = currentGroup.map((g) => g.meta.timestamp);
			const startTime = Math.min(...timestamps);
			const endTime = Math.max(...timestamps);

			let isExpanded = false;
			if (initialExpandState === 'all') {
				isExpanded = true;
			} else if (initialExpandState === 'auto') {
				isExpanded = currentGroup.length <= 3;
			}

			result.push({
				type: 'group',
				id: `group-${groupNodeId}-${startTime}`,
				nodeId: groupNodeId,
				nodeName,
				items: currentGroup,
				startTime,
				endTime,
				changeCount: currentGroup.length,
				isExpanded,
			});
		}
	}

	return result;
}

/**
 * Toggle expansion state of a specific group
 */
export function toggleGroupExpansion(
	groups: HistoryGroupOrItem[],
	groupId: string
): HistoryGroupOrItem[] {
	return groups.map((item) => {
		if (item.type === 'group' && item.id === groupId) {
			return { ...item, isExpanded: !item.isExpanded };
		}
		return item;
	});
}

/**
 * Expand all groups
 */
export function expandAllGroups(groups: HistoryGroupOrItem[]): HistoryGroupOrItem[] {
	return groups.map((item) => {
		if (item.type === 'group') {
			return { ...item, isExpanded: true };
		}
		return item;
	});
}

/**
 * Collapse all groups
 */
export function collapseAllGroups(groups: HistoryGroupOrItem[]): HistoryGroupOrItem[] {
	return groups.map((item) => {
		if (item.type === 'group') {
			return { ...item, isExpanded: false };
		}
		return item;
	});
}
