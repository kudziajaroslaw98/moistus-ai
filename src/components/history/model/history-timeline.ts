import {
	formatHistoryActionTitle,
	normalizeHistoryActionIntent,
} from '@/helpers/history/presentation';
import type {
	HistoryItem as HistoryMeta,
	HistorySubjectHint,
} from '@/types/history-state';

/**
 * Pure view model for the history side panel: filter categories, compact row
 * titles/subjects, day sections and collapsing of consecutive identical runs.
 */

export type HistoryFilter = 'all' | 'edits' | 'added' | 'removed' | 'links';
export type HistoryRowCategory = Exclude<HistoryFilter, 'all'> | 'checkpoint';

export interface HistoryTimelineEntry {
	meta: HistoryMeta;
	/** Index into the store's ascending `historyMeta` (what revert expects). */
	originalIndex: number;
	isCurrent: boolean;
}

export type HistoryTimelineRow =
	| { kind: 'single'; key: string; entry: HistoryTimelineEntry }
	| { kind: 'group'; key: string; entries: HistoryTimelineEntry[] };

export interface HistoryTimelineSection {
	key: string;
	label: string;
	changeCount: number;
	rows: HistoryTimelineRow[];
}

export interface HistoryRowSubject {
	/** "Group", "Text nodes", "Nodes", "Connection" */
	typeLabel: string;
	/** Tailwind text color class for `typeLabel`. */
	tone: string;
	/** Readable names when known, otherwise short `#id`s. */
	names: string[];
	/** Whether `names` are ids (rendered monospace). */
	namesAreIds: boolean;
	/** Count of subjects not listed in `names`. */
	moreCount: number;
	/** Trailing detail, e.g. "Width, Height" or "Idea → Plan". */
	detail: string | null;
}

export type NodeLabelResolver = (nodeId: string) => string | null;

const NODE_TYPE_LABELS: Record<string, string> = {
	defaultNode: 'Note',
	textNode: 'Text',
	taskNode: 'Task',
	imageNode: 'Image',
	resourceNode: 'Resource',
	questionNode: 'Question',
	codeNode: 'Code',
	annotationNode: 'Annotation',
	groupNode: 'Group',
	referenceNode: 'Reference',
	commentNode: 'Comment',
	ghostNode: 'Suggestion',
};

const NODE_TYPE_TONES: Record<string, string> = {
	defaultNode: 'text-zinc-200',
	textNode: 'text-sky-300',
	taskNode: 'text-orange-300',
	imageNode: 'text-teal-300',
	resourceNode: 'text-cyan-300',
	questionNode: 'text-pink-300',
	codeNode: 'text-emerald-300',
	annotationNode: 'text-violet-300',
	groupNode: 'text-sky-300',
	referenceNode: 'text-indigo-300',
	commentNode: 'text-yellow-200',
	ghostNode: 'text-violet-300',
};

const MIXED_NODES_TONE = 'text-violet-300';
const CONNECTION_TONE = 'text-amber-300';
const MAX_LISTED_NAMES = 2;

// Server fallback labels look like "Group node #60d6f625" / "Connection #ab12cd34".
const FALLBACK_LABEL_PATTERN = /#[0-9a-z-]{1,8}$/i;

export function nodeTypeLabel(nodeType: string | undefined): string {
	if (!nodeType) return 'Node';
	const known = NODE_TYPE_LABELS[nodeType];
	if (known) return known;
	const base = nodeType
		.replace(/Node$/, '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim();
	return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Node';
}

function nodeTypeTone(nodeType: string | undefined): string {
	return (nodeType && NODE_TYPE_TONES[nodeType]) || 'text-zinc-200';
}

export function shortId(id: string): string {
	return `#${id.length > 8 ? id.slice(0, 8) : id}`;
}

function nodeSubjects(meta: HistoryMeta): HistorySubjectHint[] {
	return (meta.subjects ?? []).filter((subject) => subject.type === 'node');
}

function edgeSubjects(meta: HistoryMeta): HistorySubjectHint[] {
	return (meta.subjects ?? []).filter((subject) => subject.type === 'edge');
}

export function getHistoryFilterCategory(
	meta: HistoryMeta
): HistoryRowCategory {
	if (meta.type === 'snapshot') return 'checkpoint';

	switch (normalizeHistoryActionIntent(meta.actionName)) {
		case 'node_add':
			return 'added';
		case 'node_delete':
			return 'removed';
		case 'connection_add':
		case 'connection_remove':
		case 'connection_update':
		case 'connection_reroute':
			return 'links';
		case 'generic_change':
			break;
		default:
			return 'edits';
	}

	if (meta.entityType === 'edge') return 'links';
	if (meta.operationType === 'add') return 'added';
	if (meta.operationType === 'delete') return 'removed';
	return 'edits';
}

export function matchesHistoryFilter(
	meta: HistoryMeta,
	filter: HistoryFilter
): boolean {
	if (filter === 'all') return true;
	return getHistoryFilterCategory(meta) === filter;
}

/** Chip counts. Checkpoints are not changes, so they only show under "All". */
export function countHistoryByFilter(
	items: readonly HistoryMeta[]
): Record<HistoryFilter, number> {
	const counts: Record<HistoryFilter, number> = {
		all: 0,
		edits: 0,
		added: 0,
		removed: 0,
		links: 0,
	};
	for (const meta of items) {
		const category = getHistoryFilterCategory(meta);
		if (category === 'checkpoint') continue;
		counts.all += 1;
		counts[category] += 1;
	}
	return counts;
}

function joinFields(fields: string[]): string | null {
	if (fields.length === 0) return null;
	if (fields.length === 1) return fields[0];
	if (fields.length === 2) return `${fields[0]} & ${fields[1]}`;
	return `${fields.length} properties`;
}

function verbWithSubject(
	verb: string,
	nodes: HistorySubjectHint[],
	edgeCount = 0
): string {
	if (edgeCount > 0) {
		return nodes.length > 1
			? `${verb} ${nodes.length} nodes + connections`
			: `${verb} node + connection`;
	}
	if (nodes.length === 1) {
		return `${verb} ${nodeTypeLabel(nodes[0].nodeType).toLowerCase()}`;
	}
	if (nodes.length > 1) return `${verb} ${nodes.length} nodes`;
	return `${verb} node`;
}

function countedConnection(count: number, verb: string): string {
	return count > 1 ? `${count} connections ${verb}` : `Connection ${verb}`;
}

/**
 * Short, non-redundant row title ("Resized group", "Collapsed state changed").
 * Node identity lives in the subtitle, so titles name the action, plus the
 * node type when there is exactly one node.
 */
export function buildHistoryRowTitle(meta: HistoryMeta): string {
	if (meta.type === 'snapshot') {
		return meta.isMajor ? 'Checkpoint' : 'Auto-save point';
	}

	const nodes = nodeSubjects(meta);
	const edges = edgeSubjects(meta);
	const fields = meta.fieldLabels ?? [];

	switch (normalizeHistoryActionIntent(meta.actionName)) {
		case 'node_resize':
			return verbWithSubject('Resized', nodes);
		case 'node_move':
			return verbWithSubject('Moved', nodes);
		case 'node_add':
			return verbWithSubject('Added', nodes, edges.length);
		case 'node_delete':
			return verbWithSubject('Deleted', nodes);
		case 'node_detach_or_reparent':
			return verbWithSubject('Detached', nodes);
		case 'layout_apply':
			return 'Layout applied';
		case 'connection_add':
			return countedConnection(edges.length, 'added');
		case 'connection_remove':
			return countedConnection(edges.length, 'removed');
		case 'connection_update':
		case 'connection_reroute':
			return countedConnection(edges.length, 'updated');
		default: {
			const fieldPhrase = joinFields(fields);
			if (fieldPhrase) return `${fieldPhrase} changed`;
			return meta.summary ?? formatHistoryActionTitle(meta.actionName);
		}
	}
}

function readableName(
	subject: HistorySubjectHint,
	resolveNodeLabel?: NodeLabelResolver
): string | null {
	if (subject.type === 'node') {
		const live = resolveNodeLabel?.(subject.id);
		if (live) return live;
	}
	if (subject.label && !FALLBACK_LABEL_PATTERN.test(subject.label)) {
		return subject.label;
	}
	return null;
}

function listNames(
	subjects: HistorySubjectHint[],
	resolveNodeLabel?: NodeLabelResolver
): Pick<HistoryRowSubject, 'names' | 'namesAreIds' | 'moreCount'> {
	const listed = subjects.slice(0, MAX_LISTED_NAMES);
	const readable = listed.map((subject) =>
		readableName(subject, resolveNodeLabel)
	);
	const allReadable = readable.every((name): name is string => !!name);
	return {
		names: allReadable
			? readable
			: listed.map((subject) => shortId(subject.id)),
		namesAreIds: !allReadable,
		moreCount: Math.max(0, subjects.length - listed.length),
	};
}

function typeBreakdown(nodes: HistorySubjectHint[]): string {
	const counts = new Map<string, number>();
	for (const node of nodes) {
		const label = nodeTypeLabel(node.nodeType);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([label, count]) => (count > 1 ? `${label} ×${count}` : label))
		.join(', ');
}

/** Subtitle parts: colored type, names or mono ids, trailing detail. */
export function buildHistoryRowSubject(
	meta: HistoryMeta,
	resolveNodeLabel?: NodeLabelResolver
): HistoryRowSubject | null {
	if (meta.type === 'snapshot') {
		const parts = [
			typeof meta.nodeCount === 'number' ? `${meta.nodeCount} nodes` : null,
			typeof meta.edgeCount === 'number'
				? `${meta.edgeCount} connections`
				: null,
		].filter((part): part is string => !!part);
		return parts.length > 0
			? {
					typeLabel: 'Map',
					tone: 'text-zinc-300',
					names: [],
					namesAreIds: false,
					moreCount: 0,
					detail: parts.join(' · '),
				}
			: null;
	}

	const nodes = nodeSubjects(meta);
	const edges = edgeSubjects(meta);
	const fieldDetail =
		meta.fieldLabels && meta.fieldLabels.length > 0
			? meta.fieldLabels.join(', ')
			: null;

	if (nodes.length > 0) {
		const types = new Set(nodes.map((node) => node.nodeType ?? ''));
		const singleType = types.size === 1 ? nodes[0].nodeType : undefined;

		if (nodes.length > 1 && types.size > 1) {
			return {
				typeLabel: 'Nodes',
				tone: MIXED_NODES_TONE,
				names: [typeBreakdown(nodes)],
				namesAreIds: false,
				moreCount: 0,
				detail: fieldDetail,
			};
		}

		const baseLabel = nodeTypeLabel(singleType);
		return {
			typeLabel: nodes.length > 1 ? `${baseLabel} nodes` : baseLabel,
			tone: nodeTypeTone(singleType),
			...listNames(nodes, resolveNodeLabel),
			detail: fieldDetail,
		};
	}

	if (edges.length > 0) {
		const first = edges[0];
		const endpoints =
			edges.length === 1 && first.sourceLabel && first.targetLabel
				? `${first.sourceLabel} → ${first.targetLabel}`
				: null;
		return {
			typeLabel: edges.length > 1 ? 'Connections' : 'Connection',
			tone: CONNECTION_TONE,
			...(endpoints
				? { names: [endpoints], namesAreIds: false, moreCount: 0 }
				: listNames(edges)),
			detail: fieldDetail,
		};
	}

	return null;
}

function rowGroupKey(meta: HistoryMeta): string {
	return [
		meta.userId ?? '',
		meta.actorLabel ?? '',
		getHistoryFilterCategory(meta),
		buildHistoryRowTitle(meta),
		[...(meta.fieldLabels ?? [])].sort().join(','),
	].join('|');
}

function startOfDay(timestamp: number): number {
	const date = new Date(timestamp);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
}

export function formatHistoryDayLabel(timestamp: number, now: number): string {
	const day = startOfDay(timestamp);
	const today = startOfDay(now);
	if (day === today) return 'Today';
	// Compare calendar days via a date shift so DST transitions are safe.
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (day === yesterday.getTime()) return 'Yesterday';

	const date = new Date(timestamp);
	const sameYear = date.getFullYear() === new Date(now).getFullYear();
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(sameYear ? {} : { year: 'numeric' }),
	});
}

/** Compact right-aligned time: relative within the hour, clock time after. */
export function formatHistoryRowTime(timestamp: number, now: number): string {
	const diff = now - timestamp;
	if (diff < 60_000) return 'Just now';
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
	return new Date(timestamp).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
	});
}

function canJoinGroup(
	entry: HistoryTimelineEntry,
	previous: HistoryTimelineEntry | undefined
): boolean {
	if (!previous) return false;
	if (entry.isCurrent || previous.isCurrent) return false;
	if (entry.meta.type !== 'event' || previous.meta.type !== 'event') {
		return false;
	}
	return rowGroupKey(entry.meta) === rowGroupKey(previous.meta);
}

/**
 * Newest-first day sections. Consecutive events in the same day with the same
 * author, title and changed fields collapse into one group row; the current
 * entry always stays on its own row.
 */
export function buildHistoryTimeline(
	historyMeta: readonly HistoryMeta[],
	{
		historyIndex,
		filter,
		now,
	}: { historyIndex: number; filter: HistoryFilter; now: number }
): HistoryTimelineSection[] {
	const sections: HistoryTimelineSection[] = [];
	let runs: HistoryTimelineEntry[][] = [];
	let currentDay: number | null = null;

	const flushDay = () => {
		if (currentDay === null || runs.length === 0) return;
		const rows: HistoryTimelineRow[] = runs.map((run) =>
			run.length === 1
				? { kind: 'single', key: run[0].meta.id, entry: run[0] }
				: { kind: 'group', key: `group:${run[0].meta.id}`, entries: run }
		);
		sections.push({
			key: String(currentDay),
			label: formatHistoryDayLabel(currentDay, now),
			changeCount: runs.flat().filter((entry) => entry.meta.type === 'event')
				.length,
			rows,
		});
		runs = [];
	};

	for (let index = historyMeta.length - 1; index >= 0; index -= 1) {
		const meta = historyMeta[index];
		if (!matchesHistoryFilter(meta, filter)) continue;

		const entry: HistoryTimelineEntry = {
			meta,
			originalIndex: index,
			isCurrent: index === historyIndex,
		};
		const day = startOfDay(meta.timestamp);
		if (day !== currentDay) {
			flushDay();
			currentDay = day;
		}

		const lastRun = runs[runs.length - 1];
		if (lastRun && canJoinGroup(entry, lastRun[lastRun.length - 1])) {
			lastRun.push(entry);
		} else {
			runs.push([entry]);
		}
	}
	flushDay();

	return sections;
}

/**
 * How many entries a revert to `originalIndex` would undo. Revert restores
 * the whole map to that point, so every entry between it and the current
 * position is rolled back.
 */
export function countChangesUndoneByRevert(
	originalIndex: number,
	historyIndex: number
): number {
	const undone = historyIndex - originalIndex;
	return Number.isFinite(undone) ? Math.max(0, undone) : 0;
}
