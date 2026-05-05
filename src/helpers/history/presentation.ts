import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	HistoryDelta,
	HistoryPatchOp,
	HistorySubjectHint,
} from '@/types/history-state';

interface HistoryPresentationContext {
	actionName?: string;
	nodes?: AppNode[];
	edges?: AppEdge[];
	previousNodes?: AppNode[];
	previousEdges?: AppEdge[];
}

export type HistoryFocusTarget =
	| {
			type: 'node';
			nodeId: string;
			label: string;
			position?: { x: number; y: number };
			width?: number | null;
			height?: number | null;
	  }
	| {
			type: 'edge';
			edgeId: string;
			label: string;
			nodeIds: string[];
	  };

export interface HistoryReadableChange {
	id: string;
	kind: 'add' | 'remove' | 'move' | 'route' | 'field';
	label: string;
	summary: string;
	oldValue?: string;
	newValue?: string;
	paths: string[];
}

export interface HistoryPresentationSubject {
	id: string;
	type: 'node' | 'edge';
	label: string;
	description: string;
	focusTarget: HistoryFocusTarget | null;
	changes: HistoryReadableChange[];
}

export interface HistoryPresentation {
	title: string;
	summary: string;
	subjects: HistoryPresentationSubject[];
	subjectPreview: string;
	movedNodeCount: number;
	reroutedConnectionCount: number;
	technicalChanges: HistoryPatchOp[];
}

const FIELD_LABELS: Record<string, string> = {
	content: 'Content',
	title: 'Title',
	label: 'Label',
	node_type: 'Node type',
	type: 'Type',
	tasks: 'Tasks',
	hideCompletedTasks: 'Completed task visibility',
	dueDate: 'Due date',
	status: 'Status',
	priority: 'Priority',
	tags: 'Tags',
	backgroundColor: 'Background color',
	borderColor: 'Border color',
	accentColor: 'Accent color',
	fontSize: 'Font size',
	fontWeight: 'Font weight',
	fontStyle: 'Font style',
	textAlign: 'Text alignment',
	textColor: 'Text color',
	url: 'URL',
	caption: 'Caption',
	altText: 'Alt text',
	language: 'Language',
	fileName: 'File name',
	annotationType: 'Annotation type',
	answer: 'Answer',
	questionType: 'Question type',
	userResponse: 'Response',
	isCollapsed: 'Collapsed state',
	parentId: 'Parent',
	parent_id: 'Parent',
	width: 'Width',
	height: 'Height',
	source: 'Connection start',
	target: 'Connection end',
};

const STYLE_FIELDS = new Set([
	'backgroundColor',
	'borderColor',
	'accentColor',
	'fontSize',
	'fontWeight',
	'fontStyle',
	'textAlign',
	'textColor',
	'width',
	'height',
]);

function isHistoryOperation(
	value: unknown
): value is HistoryDelta['operation'] {
	return (
		value === 'add' ||
		value === 'update' ||
		value === 'delete' ||
		value === 'batch'
	);
}

function isHistoryEntityType(
	value: unknown
): value is HistoryDelta['entityType'] {
	return value === 'node' || value === 'edge' || value === 'mixed';
}

export function normalizeHistoryDelta(
	value: unknown,
	fallback: { operation?: unknown; entityType?: unknown } = {}
): HistoryDelta | null {
	if (Array.isArray(value)) {
		return {
			operation: isHistoryOperation(fallback.operation)
				? fallback.operation
				: 'batch',
			entityType: isHistoryEntityType(fallback.entityType)
				? fallback.entityType
				: 'mixed',
			changes: value as HistoryPatchOp[],
		};
	}

	if (!isRecord(value) || !Array.isArray(value.changes)) return null;

	const operation = isHistoryOperation(value.operation)
		? value.operation
		: isHistoryOperation(fallback.operation)
			? fallback.operation
			: 'batch';
	const entityType = isHistoryEntityType(value.entityType)
		? value.entityType
		: isHistoryEntityType(fallback.entityType)
			? fallback.entityType
			: 'mixed';

	return {
		operation,
		entityType,
		changes: value.changes as HistoryPatchOp[],
		summary: typeof value.summary === 'string' ? value.summary : undefined,
		subjectHints: Array.isArray(value.subjectHints)
			? (value.subjectHints as HistorySubjectHint[])
			: undefined,
	};
}

function compactId(id: string): string {
	return id.length > 8 ? id.slice(0, 8) : id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecordValue(
	record: Record<string, unknown> | undefined,
	key: string
): unknown {
	return record ? record[key] : undefined;
}

function getNestedValue(value: unknown, path: string[]): unknown {
	let current = value;
	for (const part of path) {
		if (!isRecord(current)) return undefined;
		current = current[part];
	}
	return current;
}

function getNodeContentFromUnknown(value: unknown): string | null {
	if (!isRecord(value)) return null;

	const data = getRecordValue(value, 'data');
	if (isRecord(data)) {
		const metadata = getRecordValue(data, 'metadata');
		const metadataTitle = getNestedValue(metadata, ['title']);
		if (typeof metadataTitle === 'string' && metadataTitle.trim()) {
			return metadataTitle.trim();
		}

		const metadataLabel = getNestedValue(metadata, ['label']);
		if (typeof metadataLabel === 'string' && metadataLabel.trim()) {
			return metadataLabel.trim();
		}

		const content = getRecordValue(data, 'content');
		if (typeof content === 'string' && content.trim()) return content.trim();

		const dataLabel = getRecordValue(data, 'label');
		if (typeof dataLabel === 'string' && dataLabel.trim()) {
			return dataLabel.trim();
		}
	}

	const directContent = getRecordValue(value, 'content');
	if (typeof directContent === 'string' && directContent.trim()) {
		return directContent.trim();
	}

	const directTitle = getRecordValue(value, 'title');
	if (typeof directTitle === 'string' && directTitle.trim()) {
		return directTitle.trim();
	}

	return null;
}

function truncateLabel(value: string, maxLength = 54): string {
	const singleLine = value.replace(/\s+/g, ' ').trim();
	if (singleLine.length <= maxLength) return singleLine;
	return `${singleLine.slice(0, maxLength - 1)}...`;
}

function getNodeLabel(
	nodeId: string,
	change: HistoryPatchOp,
	nodeMap: Map<string, AppNode>,
	previousNodeMap: Map<string, AppNode>
): string {
	const currentNode = nodeMap.get(nodeId);
	const previousNode = previousNodeMap.get(nodeId);
	const fromCurrent = currentNode
		? getNodeContentFromUnknown(currentNode)
		: null;
	if (fromCurrent) return truncateLabel(fromCurrent);

	const fromPrevious = previousNode
		? getNodeContentFromUnknown(previousNode)
		: null;
	if (fromPrevious) return truncateLabel(fromPrevious);

	const fromValue = getNodeContentFromUnknown(change.value);
	if (fromValue) return truncateLabel(fromValue);

	const fromRemoved = getNodeContentFromUnknown(change.removedValue);
	if (fromRemoved) return truncateLabel(fromRemoved);

	const patchLabel = getLabelFromPatch(change);
	if (patchLabel) return truncateLabel(patchLabel);

	return `Node ${compactId(nodeId)}`;
}

function getLabelFromPatch(change: HistoryPatchOp): string | null {
	const patch = change.patch ?? {};
	const reversePatch = change.reversePatch ?? {};
	for (const path of [
		'data.metadata.title',
		'metadata.title',
		'data.metadata.label',
		'metadata.label',
		'data.content',
		'content',
	]) {
		const nextValue = patch[path];
		if (typeof nextValue === 'string' && nextValue.trim()) return nextValue;

		const previousValue = reversePatch[path];
		if (typeof previousValue === 'string' && previousValue.trim()) {
			return previousValue;
		}
	}
	return null;
}

function getEdgeFromChange(
	change: HistoryPatchOp,
	edgeMap: Map<string, AppEdge>,
	previousEdgeMap: Map<string, AppEdge>
): Partial<AppEdge> | null {
	return (
		edgeMap.get(change.id) ??
		previousEdgeMap.get(change.id) ??
		(change.value as Partial<AppEdge> | undefined) ??
		(change.removedValue as Partial<AppEdge> | undefined) ??
		null
	);
}

function getNodeLabelById(
	nodeId: string | undefined,
	nodeMap: Map<string, AppNode>,
	previousNodeMap: Map<string, AppNode>,
	fallback?: string
): string {
	if (!nodeId) return fallback || 'Unknown node';
	const current = nodeMap.get(nodeId);
	const previous = previousNodeMap.get(nodeId);
	const label =
		(current ? getNodeContentFromUnknown(current) : null) ??
		(previous ? getNodeContentFromUnknown(previous) : null);
	return truncateLabel(label ?? fallback ?? `Node ${compactId(nodeId)}`);
}

function getEdgeLabel(
	change: HistoryPatchOp,
	nodeMap: Map<string, AppNode>,
	edgeMap: Map<string, AppEdge>,
	previousNodeMap: Map<string, AppNode>,
	previousEdgeMap: Map<string, AppEdge>
): string {
	const edge = getEdgeFromChange(change, edgeMap, previousEdgeMap);
	const data = isRecord(edge?.data) ? edge?.data : null;
	const dataLabel = data?.label;
	if (typeof dataLabel === 'string' && dataLabel.trim()) {
		return truncateLabel(dataLabel);
	}

	const sourceId =
		typeof edge?.source === 'string'
			? edge.source
			: typeof data?.source === 'string'
				? data.source
				: undefined;
	const targetId =
		typeof edge?.target === 'string'
			? edge.target
			: typeof data?.target === 'string'
				? data.target
				: undefined;

	if (sourceId || targetId) {
		return `${getNodeLabelById(sourceId, nodeMap, previousNodeMap)} -> ${getNodeLabelById(
			targetId,
			nodeMap,
			previousNodeMap
		)}`;
	}

	return `Connection ${compactId(change.id)}`;
}

function getNodePosition(
	nodeId: string,
	change: HistoryPatchOp,
	nodeMap: Map<string, AppNode>,
	previousNodeMap: Map<string, AppNode>
): { x: number; y: number } | undefined {
	const current = nodeMap.get(nodeId)?.position;
	if (current) return current;

	const previous = previousNodeMap.get(nodeId)?.position;
	if (previous) return previous;

	const valuePosition = getNestedValue(change.value, ['position']);
	if (
		isRecord(valuePosition) &&
		typeof valuePosition.x === 'number' &&
		typeof valuePosition.y === 'number'
	) {
		return { x: valuePosition.x, y: valuePosition.y };
	}

	const removedPosition = getNestedValue(change.removedValue, ['position']);
	if (
		isRecord(removedPosition) &&
		typeof removedPosition.x === 'number' &&
		typeof removedPosition.y === 'number'
	) {
		return { x: removedPosition.x, y: removedPosition.y };
	}

	const patch = change.patch ?? {};
	const reversePatch = change.reversePatch ?? {};
	const x = firstNumber(patch['position.x'], reversePatch['position.x']);
	const y = firstNumber(patch['position.y'], reversePatch['position.y']);
	if (typeof x === 'number' && typeof y === 'number') return { x, y };

	return undefined;
}

function getNodeDimension(
	nodeId: string,
	key: 'width' | 'height',
	change: HistoryPatchOp,
	nodeMap: Map<string, AppNode>,
	previousNodeMap: Map<string, AppNode>
): number | null | undefined {
	const current = nodeMap.get(nodeId);
	const previous = previousNodeMap.get(nodeId);
	const currentDimension =
		typeof current?.[key] === 'number' ? current[key] : current?.data?.[key];
	if (typeof currentDimension === 'number') return currentDimension;

	const previousDimension =
		typeof previous?.[key] === 'number' ? previous[key] : previous?.data?.[key];
	if (typeof previousDimension === 'number') return previousDimension;

	const directValue = getNestedValue(change.value, [key]);
	if (typeof directValue === 'number') return directValue;

	const removedValue = getNestedValue(change.removedValue, [key]);
	if (typeof removedValue === 'number') return removedValue;

	return null;
}

function getNodeType(
	nodeId: string,
	change: HistoryPatchOp,
	nodeMap: Map<string, AppNode>,
	previousNodeMap: Map<string, AppNode>
): string | undefined {
	const node =
		nodeMap.get(nodeId) ??
		previousNodeMap.get(nodeId) ??
		(change.value as Partial<AppNode> | undefined) ??
		(change.removedValue as Partial<AppNode> | undefined);
	const type = node?.type ?? node?.data?.node_type;
	return typeof type === 'string' ? type : undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
	for (const value of values) {
		if (typeof value === 'number') return value;
	}
	return undefined;
}

function mapsFromContext(context: HistoryPresentationContext) {
	return {
		nodeMap: new Map((context.nodes ?? []).map((node) => [node.id, node])),
		edgeMap: new Map((context.edges ?? []).map((edge) => [edge.id, edge])),
		previousNodeMap: new Map(
			(context.previousNodes ?? []).map((node) => [node.id, node])
		),
		previousEdgeMap: new Map(
			(context.previousEdges ?? []).map((edge) => [edge.id, edge])
		),
	};
}

export function deriveHistorySubjectHints(
	delta: HistoryDelta,
	context: HistoryPresentationContext = {}
): HistorySubjectHint[] {
	const { nodeMap, edgeMap, previousNodeMap, previousEdgeMap } =
		mapsFromContext(context);

	return delta.changes.map((change) => {
		if (change.type === 'node') {
			return {
				id: change.id,
				type: 'node',
				label: getNodeLabel(change.id, change, nodeMap, previousNodeMap),
				nodeType: getNodeType(change.id, change, nodeMap, previousNodeMap),
				position: getNodePosition(change.id, change, nodeMap, previousNodeMap),
				width: getNodeDimension(
					change.id,
					'width',
					change,
					nodeMap,
					previousNodeMap
				),
				height: getNodeDimension(
					change.id,
					'height',
					change,
					nodeMap,
					previousNodeMap
				),
			};
		}

		const edge = getEdgeFromChange(change, edgeMap, previousEdgeMap);
		const sourceId = typeof edge?.source === 'string' ? edge.source : undefined;
		const targetId = typeof edge?.target === 'string' ? edge.target : undefined;
		const sourceLabel = getNodeLabelById(sourceId, nodeMap, previousNodeMap);
		const targetLabel = getNodeLabelById(targetId, nodeMap, previousNodeMap);

		return {
			id: change.id,
			type: 'edge',
			label: getEdgeLabel(
				change,
				nodeMap,
				edgeMap,
				previousNodeMap,
				previousEdgeMap
			),
			sourceId,
			targetId,
			sourceLabel,
			targetLabel,
		};
	});
}

function mergeSubjectHints(
	delta: HistoryDelta,
	context: HistoryPresentationContext
): HistorySubjectHint[] {
	const derived = deriveHistorySubjectHints(delta, context);
	const byKey = new Map<string, HistorySubjectHint>();

	for (const hint of derived) {
		byKey.set(`${hint.type}:${hint.id}`, hint);
	}

	for (const hint of delta.subjectHints ?? []) {
		const key = `${hint.type}:${hint.id}`;
		byKey.set(key, { ...byKey.get(key), ...hint });
	}

	return Array.from(byKey.values());
}

function isPositionPath(path: string): boolean {
	return path === 'position.x' || path === 'position.y';
}

function isRoutingPath(path: string): boolean {
	return (
		path.includes('metadata.waypoints') ||
		path.includes('metadata.sourceAnchor') ||
		path.includes('metadata.targetAnchor') ||
		path.includes('metadata.elkLabel') ||
		path.includes('metadata.routingStyle')
	);
}

function cleanPath(path: string): string {
	let cleaned = path;
	if (cleaned.startsWith('data.')) cleaned = cleaned.slice('data.'.length);
	if (cleaned.startsWith('metadata.')) {
		cleaned = cleaned.slice('metadata.'.length);
	}
	return cleaned;
}

function fieldNameFromPath(path: string): string {
	const cleaned = cleanPath(path);
	const parts = cleaned.split('.');
	return parts[parts.length - 1] ?? cleaned;
}

function fieldLabel(path: string): string {
	const field = fieldNameFromPath(path);
	if (FIELD_LABELS[field]) return FIELD_LABELS[field];

	const cleaned = cleanPath(path)
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/_/g, ' ');
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function valueLabel(value: unknown): string {
	if (value === undefined) return 'not set';
	if (value === null) return 'empty';
	if (typeof value === 'boolean') return value ? 'on' : 'off';
	if (typeof value === 'number') {
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? truncateLabel(trimmed, 140) : 'empty';
	}
	if (Array.isArray(value)) {
		if (value.length === 0) return 'no items';
		return `${value.length} item${value.length === 1 ? '' : 's'}`;
	}
	if (isRecord(value)) {
		const title = getNodeContentFromUnknown({ data: { metadata: value } });
		if (title) return truncateLabel(title, 80);
		return 'changed';
	}
	return String(value);
}

function operationVerb(change: HistoryPatchOp): string {
	if (change.op === 'add')
		return change.type === 'node' ? 'Added node' : 'Added connection';
	if (change.op === 'remove') {
		return change.type === 'node' ? 'Removed node' : 'Removed connection';
	}
	return change.type === 'node' ? 'Updated node' : 'Updated connection';
}

function movementChange(change: HistoryPatchOp): HistoryReadableChange | null {
	const patch = change.patch ?? {};
	const reversePatch = change.reversePatch ?? {};
	const movedPaths = Object.keys(patch).filter(isPositionPath);
	if (movedPaths.length === 0) return null;

	const oldX = reversePatch['position.x'];
	const oldY = reversePatch['position.y'];
	const newX = patch['position.x'];
	const newY = patch['position.y'];
	const oldHasPosition = typeof oldX === 'number' && typeof oldY === 'number';
	const newHasPosition = typeof newX === 'number' && typeof newY === 'number';
	const summary =
		oldHasPosition && newHasPosition
			? `Moved from (${valueLabel(oldX)}, ${valueLabel(oldY)}) to (${valueLabel(
					newX
				)}, ${valueLabel(newY)})`
			: 'Moved on the canvas';

	return {
		id: `${change.id}:move`,
		kind: 'move',
		label: 'Position',
		summary,
		oldValue: oldHasPosition
			? `(${valueLabel(oldX)}, ${valueLabel(oldY)})`
			: undefined,
		newValue: newHasPosition
			? `(${valueLabel(newX)}, ${valueLabel(newY)})`
			: undefined,
		paths: movedPaths,
	};
}

function routeChange(change: HistoryPatchOp): HistoryReadableChange | null {
	const patch = change.patch ?? {};
	const routePaths = Object.keys(patch).filter(isRoutingPath);
	if (routePaths.length === 0) return null;

	return {
		id: `${change.id}:route`,
		kind: 'route',
		label: 'Route',
		summary: 'Rerouted connection line',
		paths: routePaths,
	};
}

function fieldChanges(change: HistoryPatchOp): HistoryReadableChange[] {
	const patch = change.patch ?? {};
	return Object.keys(patch)
		.filter((path) => !isPositionPath(path) && !isRoutingPath(path))
		.map((path) => {
			const oldValue = change.reversePatch?.[path];
			const newValue = patch[path];
			const label = fieldLabel(path);
			const oldLabel = valueLabel(oldValue);
			const newLabel = valueLabel(newValue);
			const fieldName = fieldNameFromPath(path);
			const isStyle = STYLE_FIELDS.has(fieldName);
			const summary = isStyle
				? `Changed ${label.toLowerCase()}`
				: `Changed ${label.toLowerCase()} from "${oldLabel}" to "${newLabel}"`;

			return {
				id: `${change.id}:${path}`,
				kind: 'field' as const,
				label,
				summary,
				oldValue: oldLabel,
				newValue: newLabel,
				paths: [path],
			};
		});
}

function readableChangesFor(change: HistoryPatchOp): HistoryReadableChange[] {
	if (change.op === 'add' || change.op === 'remove') {
		return [
			{
				id: `${change.id}:${change.op}`,
				kind: change.op === 'add' ? 'add' : 'remove',
				label: operationVerb(change),
				summary: operationVerb(change),
				paths: [],
			},
		];
	}

	const changes = [
		movementChange(change),
		routeChange(change),
		...fieldChanges(change),
	].filter((item): item is HistoryReadableChange => item !== null);

	if (changes.length > 0) return changes;

	return [
		{
			id: `${change.id}:updated`,
			kind: 'field',
			label: operationVerb(change),
			summary: operationVerb(change),
			paths: Object.keys(change.patch ?? {}),
		},
	];
}

function focusTargetFromSubject(
	subject: HistorySubjectHint
): HistoryFocusTarget | null {
	if (subject.type === 'node') {
		return {
			type: 'node',
			nodeId: subject.id,
			label: subject.label || `Node ${compactId(subject.id)}`,
			position: subject.position,
			width: subject.width,
			height: subject.height,
		};
	}

	const nodeIds = [subject.sourceId, subject.targetId].filter(
		(value): value is string => typeof value === 'string' && value.length > 0
	);
	if (nodeIds.length === 0) return null;

	return {
		type: 'edge',
		edgeId: subject.id,
		label: subject.label || `Connection ${compactId(subject.id)}`,
		nodeIds,
	};
}

function descriptionFor(subject: HistorySubjectHint): string {
	if (subject.type === 'node') {
		return subject.nodeType
			? subject.nodeType.replace(/Node$/, ' node')
			: 'Node';
	}

	if (subject.sourceLabel && subject.targetLabel) {
		return `${subject.sourceLabel} -> ${subject.targetLabel}`;
	}

	return 'Connection';
}

export function formatHistoryActionTitle(
	actionName: string | undefined
): string {
	if (!actionName) return 'Map change';

	const labels: Record<string, string> = {
		applyLayout: 'Auto layout',
		applyLayoutToSelected: 'Auto layout',
		applyLayoutAroundNode: 'Auto layout',
		applyLocalResizeReflow: 'Auto layout',
		moveNodes: 'Moved nodes',
		moveNode: 'Moved node',
		addEdge: 'Added connection',
		deleteEdges: 'Removed connections',
		updateEdge: 'Updated connection',
		addNode: 'Added node',
		deleteNodes: 'Removed nodes',
		updateNode: 'Updated node',
	};

	if (labels[actionName]) return labels[actionName];

	return actionName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[-_]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^./, (first) => first.toUpperCase());
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
	return `${count} ${count === 1 ? singular : pluralValue}`;
}

function subjectPreview(subjects: HistoryPresentationSubject[]): string {
	if (subjects.length === 0) return '';
	const labels = subjects.slice(0, 3).map((subject) => subject.label);
	if (subjects.length > 3) labels.push(`+${subjects.length - 3} more`);
	return labels.join(', ');
}

function operationSummary(
	delta: HistoryDelta,
	subjects: HistoryPresentationSubject[],
	actionName: string | undefined,
	movedNodeCount: number,
	reroutedConnectionCount: number
): string {
	const friendlyName = formatHistoryActionTitle(actionName);
	const action = actionName ?? '';

	if (action.startsWith('applyLayout')) {
		const parts: string[] = [];
		if (movedNodeCount > 0)
			parts.push(`moved ${plural(movedNodeCount, 'node')}`);
		if (reroutedConnectionCount > 0) {
			parts.push(`rerouted ${plural(reroutedConnectionCount, 'connection')}`);
		}
		return parts.length > 0
			? `Auto layout ${parts.join(' and ')}.`
			: 'Auto layout updated the map.';
	}

	if (action === 'moveNodes' || action === 'moveNode') {
		return movedNodeCount > 0
			? `Moved ${plural(movedNodeCount, 'node')}.`
			: `${friendlyName}.`;
	}

	if (subjects.length === 1 && subjects[0].changes.length === 1) {
		return `${subjects[0].changes[0].summary}: ${subjects[0].label}.`;
	}

	const addedNodes = delta.changes.filter(
		(change) => change.type === 'node' && change.op === 'add'
	).length;
	const removedNodes = delta.changes.filter(
		(change) => change.type === 'node' && change.op === 'remove'
	).length;
	const addedEdges = delta.changes.filter(
		(change) => change.type === 'edge' && change.op === 'add'
	).length;
	const removedEdges = delta.changes.filter(
		(change) => change.type === 'edge' && change.op === 'remove'
	).length;

	const parts: string[] = [];
	if (addedNodes) parts.push(`added ${plural(addedNodes, 'node')}`);
	if (removedNodes) parts.push(`removed ${plural(removedNodes, 'node')}`);
	if (movedNodeCount) parts.push(`moved ${plural(movedNodeCount, 'node')}`);
	if (addedEdges) parts.push(`added ${plural(addedEdges, 'connection')}`);
	if (removedEdges) parts.push(`removed ${plural(removedEdges, 'connection')}`);
	if (reroutedConnectionCount) {
		parts.push(`rerouted ${plural(reroutedConnectionCount, 'connection')}`);
	}

	if (parts.length > 0) {
		return `${friendlyName} ${parts.join(', ')}.`;
	}

	return `${friendlyName} updated ${plural(delta.changes.length, 'item')}.`;
}

export function buildHistoryPresentation(
	delta: HistoryDelta,
	context: HistoryPresentationContext = {}
): HistoryPresentation {
	const hints = mergeSubjectHints(delta, context);
	const hintByKey = new Map(
		hints.map((hint) => [`${hint.type}:${hint.id}`, hint])
	);

	const subjects = delta.changes.map((change) => {
		const hint = hintByKey.get(`${change.type}:${change.id}`) ?? {
			id: change.id,
			type: change.type,
		};
		const label =
			hint.label ??
			(change.type === 'node'
				? `Node ${compactId(change.id)}`
				: `Connection ${compactId(change.id)}`);

		return {
			id: change.id,
			type: change.type,
			label,
			description: descriptionFor(hint),
			focusTarget: focusTargetFromSubject({ ...hint, label }),
			changes: readableChangesFor(change),
		};
	});

	const movedNodeCount = subjects.filter(
		(subject) =>
			subject.type === 'node' &&
			subject.changes.some((change) => change.kind === 'move')
	).length;
	const reroutedConnectionCount = subjects.filter(
		(subject) =>
			subject.type === 'edge' &&
			subject.changes.some((change) => change.kind === 'route')
	).length;

	const summary =
		delta.summary ??
		operationSummary(
			delta,
			subjects,
			context.actionName,
			movedNodeCount,
			reroutedConnectionCount
		);

	return {
		title: formatHistoryActionTitle(context.actionName),
		summary,
		subjects,
		subjectPreview: subjectPreview(subjects),
		movedNodeCount,
		reroutedConnectionCount,
		technicalChanges: delta.changes,
	};
}
