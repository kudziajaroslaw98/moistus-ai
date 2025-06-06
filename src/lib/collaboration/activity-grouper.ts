import { UIActivityItem } from '@/components/collaboration/activity-feed';

export interface GroupedActivity {
	id: string;
	type: 'group';
	activities: UIActivityItem[];
	summary: string;
	startTime: Date;
	endTime: Date;
	userCount: number;
	nodeCount: number;
}

export interface ActivityGrouperConfig {
	groupingWindowMs?: number;
	similarityThreshold?: number;
	maxGroupSize?: number;
	groupableTypes?: UIActivityItem['type'][];
}

export class ActivityGrouper {
	private groupingWindowMs: number;
	private similarityThreshold: number;
	private maxGroupSize: number;
	private groupableTypes: Set<UIActivityItem['type']>;

	constructor(config: ActivityGrouperConfig = {}) {
		this.groupingWindowMs = config.groupingWindowMs || 60000; // 1 minute default
		this.similarityThreshold = config.similarityThreshold || 0.8;
		this.maxGroupSize = config.maxGroupSize || 10;
		this.groupableTypes = new Set(
			config.groupableTypes || ['edit', 'cursor_move', 'selection', 'view']
		);
	}

	groupActivities(
		activities: UIActivityItem[]
	): (UIActivityItem | GroupedActivity)[] {
		if (activities.length === 0) return [];

		const result: (UIActivityItem | GroupedActivity)[] = [];
		const groups: Map<string, UIActivityItem[]> = new Map();
		const processedIds = new Set<string>();

		// Sort activities by timestamp
		const sortedActivities = [...activities].sort(
			(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
		);

		for (const activity of sortedActivities) {
			if (processedIds.has(activity.id)) continue;

			// Skip non-groupable types
			if (!this.groupableTypes.has(activity.type)) {
				result.push(activity);
				processedIds.add(activity.id);
				continue;
			}

			// Find or create a group
			const groupKey = this.getGroupKey(activity);
			let group = groups.get(groupKey);

			if (!group) {
				group = [activity];
				groups.set(groupKey, group);
			} else {
				// Check if activity should be added to existing group
				const lastActivity = group[group.length - 1];

				if (
					this.shouldGroup(activity, lastActivity) &&
					group.length < this.maxGroupSize
				) {
					group.push(activity);
				} else {
					// Create new group with same key
					const newGroupKey = `${groupKey}_${Date.now()}`;
					groups.set(newGroupKey, [activity]);
				}
			}

			processedIds.add(activity.id);
		}

		// Convert groups to grouped activities or individual activities
		for (const [key, groupActivities] of groups) {
			if (groupActivities.length > 1) {
				const grouped = this.createGroup(groupActivities);
				result.push(grouped);
			} else {
				result.push(groupActivities[0]);
			}
		}

		// Sort result by most recent activity
		result.sort((a, b) => {
			const timeA =
				'activities' in a ? a.endTime.getTime() : a.timestamp.getTime();
			const timeB =
				'activities' in b ? b.endTime.getTime() : b.timestamp.getTime();
			return timeB - timeA;
		});

		return result;
	}

	private shouldGroup(
		activity1: UIActivityItem,
		activity2: UIActivityItem
	): boolean {
		// Check time window
		const timeDiff = Math.abs(
			activity1.timestamp.getTime() - activity2.timestamp.getTime()
		);

		if (timeDiff > this.groupingWindowMs) {
			return false;
		}

		// Check activity type
		if (activity1.type !== activity2.type) {
			return false;
		}

		// Check user
		if (activity1.userId !== activity2.userId) {
			return false;
		}

		// Check node (if applicable)
		if (activity1.details?.nodeId && activity2.details?.nodeId) {
			return activity1.details.nodeId === activity2.details.nodeId;
		}

		// Calculate similarity score
		const similarity = this.calculateSimilarity(activity1, activity2);
		return similarity >= this.similarityThreshold;
	}

	private calculateSimilarity(
		activity1: UIActivityItem,
		activity2: UIActivityItem
	): number {
		let score = 0;
		let factors = 0;

		// Type match (already checked in shouldGroup, but included for completeness)
		if (activity1.type === activity2.type) {
			score += 1;
		}

		factors += 1;

		// User match (already checked in shouldGroup)
		if (activity1.userId === activity2.userId) {
			score += 1;
		}

		factors += 1;

		// Node match
		if (activity1.details?.nodeId && activity2.details?.nodeId) {
			if (activity1.details.nodeId === activity2.details.nodeId) {
				score += 1;
			}

			factors += 1;
		}

		// Time proximity (closer in time = higher similarity)
		const timeDiff = Math.abs(
			activity1.timestamp.getTime() - activity2.timestamp.getTime()
		);
		const timeScore = 1 - timeDiff / this.groupingWindowMs;
		score += timeScore;
		factors += 1;

		// Comment similarity (for comment activities)
		if (activity1.type === 'comment' && activity2.type === 'comment') {
			if (activity1.details?.comment && activity2.details?.comment) {
				const commentSimilarity = this.calculateTextSimilarity(
					activity1.details.comment,
					activity2.details.comment
				);
				score += commentSimilarity;
				factors += 1;
			}
		}

		return factors > 0 ? score / factors : 0;
	}

	private calculateTextSimilarity(text1: string, text2: string): number {
		// Simple word-based similarity
		const words1 = new Set(text1.toLowerCase().split(/\s+/));
		const words2 = new Set(text2.toLowerCase().split(/\s+/));

		const intersection = new Set([...words1].filter((w) => words2.has(w)));
		const union = new Set([...words1, ...words2]);

		return union.size > 0 ? intersection.size / union.size : 0;
	}

	private createGroup(activities: UIActivityItem[]): GroupedActivity {
		const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const startTime = new Date(
			Math.min(...activities.map((a) => a.timestamp.getTime()))
		);
		const endTime = new Date(
			Math.max(...activities.map((a) => a.timestamp.getTime()))
		);

		const uniqueUsers = new Set(activities.map((a) => a.userId));
		const uniqueNodes = new Set(
			activities.map((a) => a.details?.nodeId).filter(Boolean)
		);

		const summary = this.generateSummary(activities);

		return {
			id,
			type: 'group',
			activities,
			summary,
			startTime,
			endTime,
			userCount: uniqueUsers.size,
			nodeCount: uniqueNodes.size,
		};
	}

	private generateSummary(activities: UIActivityItem[]): string {
		if (activities.length === 0) return '';

		const firstActivity = activities[0];
		const count = activities.length;
		const userName = firstActivity.userName;
		const type = firstActivity.type;

		// Get unique nodes
		const nodeNames = new Set(
			activities.map((a) => a.details?.nodeName).filter(Boolean)
		);

		switch (type) {
			case 'edit':
				if (nodeNames.size === 1) {
					return `${userName} made ${count} edits to "${[...nodeNames][0]}"`;
				} else if (nodeNames.size > 1) {
					return `${userName} edited ${nodeNames.size} nodes (${count} changes)`;
				} else {
					return `${userName} made ${count} edits`;
				}

			case 'comment':
				if (nodeNames.size === 1) {
					return `${userName} added ${count} comments to "${[...nodeNames][0]}"`;
				} else {
					return `${userName} commented ${count} times on ${nodeNames.size} nodes`;
				}

			case 'cursor_move':
				return `${userName} moved cursor ${count} times`;

			case 'selection':
				if (nodeNames.size === 1) {
					return `${userName} selected "${[...nodeNames][0]}" ${count} times`;
				} else {
					return `${userName} selected ${nodeNames.size} different nodes`;
				}

			case 'view':
				return `${userName} viewed ${nodeNames.size || count} nodes`;

			default:
				return `${userName} performed ${count} ${type} actions`;
		}
	}

	private getGroupKey(activity: UIActivityItem): string {
		// Create a unique key for grouping similar activities
		const parts = [
			activity.type,
			activity.userId,
			activity.details?.nodeId || 'no-node',
		];

		return parts.join('_');
	}

	// Update configuration
	updateConfig(config: Partial<ActivityGrouperConfig>): void {
		if (config.groupingWindowMs !== undefined) {
			this.groupingWindowMs = config.groupingWindowMs;
		}

		if (config.similarityThreshold !== undefined) {
			this.similarityThreshold = config.similarityThreshold;
		}

		if (config.maxGroupSize !== undefined) {
			this.maxGroupSize = config.maxGroupSize;
		}

		if (config.groupableTypes !== undefined) {
			this.groupableTypes = new Set(config.groupableTypes);
		}
	}

	// Check if an activity type is groupable
	isGroupable(type: UIActivityItem['type']): boolean {
		return this.groupableTypes.has(type);
	}

	// Add or remove groupable types
	addGroupableType(type: UIActivityItem['type']): void {
		this.groupableTypes.add(type);
	}

	removeGroupableType(type: UIActivityItem['type']): void {
		this.groupableTypes.delete(type);
	}

	// Get current configuration
	getConfig(): Required<ActivityGrouperConfig> {
		return {
			groupingWindowMs: this.groupingWindowMs,
			similarityThreshold: this.similarityThreshold,
			maxGroupSize: this.maxGroupSize,
			groupableTypes: Array.from(this.groupableTypes),
		};
	}
}

// Helper function to check if an item is a grouped activity
export function isGroupedActivity(
	item: UIActivityItem | GroupedActivity
): item is GroupedActivity {
	return 'activities' in item && item.type === 'group';
}

// Helper function to get all activities from an item (grouped or single)
export function getAllActivities(
	item: UIActivityItem | GroupedActivity
): UIActivityItem[] {
	return isGroupedActivity(item) ? item.activities : [item];
}

// Helper function to get the most recent timestamp from an item
export function getMostRecentTimestamp(
	item: UIActivityItem | GroupedActivity
): Date {
	return isGroupedActivity(item) ? item.endTime : item.timestamp;
}

// Helper function to get activity count from an item
export function getActivityCount(
	item: UIActivityItem | GroupedActivity
): number {
	return isGroupedActivity(item) ? item.activities.length : 1;
}
