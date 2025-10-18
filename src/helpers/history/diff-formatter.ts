import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { HistoryDelta, HistoryPatchOp } from '@/types/history-state';

/**
 * Formats a delta into a human-readable summary.
 * Example: "2 nodes added, 1 edge modified"
 */
export function formatDiffSummary(delta: HistoryDelta): string {
	const changes = Array.isArray(delta.changes) ? delta.changes : [];

	const nodeAdds = changes.filter(
		(c) => c.type === 'node' && c.op === 'add'
	).length;
	const nodeUpdates = changes.filter(
		(c) => c.type === 'node' && c.op === 'patch'
	).length;
	const nodeDeletes = changes.filter(
		(c) => c.type === 'node' && c.op === 'remove'
	).length;

	const edgeAdds = changes.filter(
		(c) => c.type === 'edge' && c.op === 'add'
	).length;
	const edgeUpdates = changes.filter(
		(c) => c.type === 'edge' && c.op === 'patch'
	).length;
	const edgeDeletes = changes.filter(
		(c) => c.type === 'edge' && c.op === 'remove'
	).length;

	const parts: string[] = [];

	// Nodes
	if (nodeAdds > 0)
		parts.push(`${nodeAdds} node${nodeAdds > 1 ? 's' : ''} added`);
	if (nodeUpdates > 0)
		parts.push(`${nodeUpdates} node${nodeUpdates > 1 ? 's' : ''} modified`);
	if (nodeDeletes > 0)
		parts.push(`${nodeDeletes} node${nodeDeletes > 1 ? 's' : ''} deleted`);

	// Edges
	if (edgeAdds > 0)
		parts.push(`${edgeAdds} edge${edgeAdds > 1 ? 's' : ''} added`);
	if (edgeUpdates > 0)
		parts.push(`${edgeUpdates} edge${edgeUpdates > 1 ? 's' : ''} modified`);
	if (edgeDeletes > 0)
		parts.push(`${edgeDeletes} edge${edgeDeletes > 1 ? 's' : ''} deleted`);

	return parts.join(', ') || 'No changes';
}

/**
 * Gets a human-readable label for a node.
 * Falls back to "Untitled node" if no label found.
 */
export function getNodeLabel(change: HistoryPatchOp): string {
	if (change.type !== 'node') return '';

	const node = (change.value ||
		change.removedValue ||
		change.patch ||
		change.reversePatch) as Partial<AppNode> | undefined;
	if (!node) return 'Untitled node';

	// Try to extract label from data
	const data = node.data as any;
	if (data?.label) return data.label;
	if (data?.content) {
		// Truncate long content
		const content = String(data.content);
		return content.length > 50 ? content.slice(0, 47) + '...' : content;
	}
	if (data?.title) return data.title;

	return 'Untitled node';
}

/**
 * Gets a human-readable label for an edge.
 */
export function getEdgeLabel(change: HistoryPatchOp): string {
	if (change.type !== 'edge') return '';

	const edge = (change.value || change.removedValue) as
		| Partial<AppEdge>
		| undefined;
	if (!edge) return 'Connection';

	const data = edge.data as any;
	if (data?.label) return data.label;

	// Show source -> target if available
	if (edge.source && edge.target) {
		return `${edge.source} → ${edge.target}`;
	}

	return 'Connection';
}

/**
 * Formats a patch path into human-readable text.
 * Example: "data.content" → "Content"
 */
export function formatPatchPath(path: string): string {
	// Remove 'data.' prefix if present
	const cleaned = path.startsWith('data.') ? path.slice(5) : path;

	// Convert camelCase/snake_case to Title Case
	const words = cleaned
		.replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
		.replace(/_/g, ' ') // snake_case
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1));

	return words.join(' ');
}

/**
 * Formats a value for display (truncate if too long).
 * Returns both the formatted value and whether it was truncated.
 */
export function formatValue(
	value: any,
	maxLength: number = 100
): { formatted: string; truncated: boolean; original: any } {
	let formatted: string;
	let truncated = false;

	if (value === undefined) {
		formatted = 'undefined';
	} else if (value === null) {
		formatted = 'null';
	} else if (typeof value === 'boolean') {
		formatted = value ? 'true' : 'false';
	} else if (typeof value === 'number') {
		formatted = String(value);
	} else if (typeof value === 'string') {
		if (value.length > maxLength) {
			formatted = value.slice(0, maxLength - 3) + '...';
			truncated = true;
		} else {
			formatted = value;
		}
	} else if (Array.isArray(value)) {
		formatted = `[${value.length} items]`;
	} else if (typeof value === 'object') {
		try {
			const str = JSON.stringify(value, null, 2);
			if (str.length > maxLength) {
				formatted = str.slice(0, maxLength - 3) + '...';
				truncated = true;
			} else {
				formatted = str;
			}
		} catch {
			formatted = '[object]';
		}
	} else {
		formatted = String(value);
	}

	return { formatted, truncated, original: value };
}

/**
 * Formats a single change into a human-readable description.
 */
export function formatChange(change: HistoryPatchOp): {
	operation: 'add' | 'remove' | 'patch';
	entityType: 'node' | 'edge';
	label: string;
	details?: string;
	patches?: {
		field: string;
		oldValue: string;
		newValue: string;
	}[];
} {
	const { op, type } = change;
	const label = type === 'node' ? getNodeLabel(change) : getEdgeLabel(change);

	if (op === 'add') {
		return {
			operation: 'add',
			entityType: type,
			label,
			details: `Added ${type === 'node' ? 'node' : 'connection'}: ${label}`,
		};
	}

	if (op === 'remove') {
		return {
			operation: 'remove',
			entityType: type,
			label,
			details: `Removed ${type === 'node' ? 'node' : 'connection'}: ${label}`,
		};
	}

	if (op === 'patch' && change.patch) {
		const patches = Object.entries(change.patch).map(([path, newValue]) => {
			const oldValue = change.reversePatch?.[path];
			// No truncation needed - vertical layout with wrapping shows all content
			const oldFormatted = formatValue(oldValue, Infinity);
			const newFormatted = formatValue(newValue, Infinity);

			return {
				field: formatPatchPath(path),
				oldValue: oldFormatted.formatted,
				newValue: newFormatted.formatted,
			};
		});

		return {
			operation: 'patch',
			entityType: type,
			label,
			details: `Modified ${type === 'node' ? 'node' : 'connection'}: ${label}`,
			patches,
		};
	}

	// Fallback
	return {
		operation: op as any,
		entityType: type,
		label,
		details: `Changed ${type}`,
	};
}

/**
 * Formats an entire delta for display.
 */
export function formatDelta(delta: HistoryDelta) {
	const changes = Array.isArray(delta.changes) ? delta.changes : [];
	return {
		summary: formatDiffSummary(delta),
		changes: changes.map(formatChange),
	};
}
