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

type HistoryActionIntent =
	| 'property_edit'
	| 'node_move'
	| 'node_resize'
	| 'node_add'
	| 'node_delete'
	| 'connection_add'
	| 'connection_remove'
	| 'connection_update'
	| 'connection_reroute'
	| 'node_detach_or_reparent'
	| 'layout_apply'
	| 'generic_change';

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
	fieldKey?: string;
	verb?: 'updated' | 'cleared' | 'added' | 'removed';
	isLongText?: boolean;
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
	summaryDetail?: string;
	subjects: HistoryPresentationSubject[];
	subjectPreview: string;
	movedNodeCount: number;
	reroutedConnectionCount: number;
	technicalChanges: HistoryPatchOp[];
}

const FIELD_LABELS: Record<string, string> = {
	content: 'Note',
	title: 'Title',
	label: 'Label',
	node_type: 'Node type',
	type: 'Type',
	tasks: 'Tasks',
	hideCompletedTasks: 'Completed task visibility',
	dueDate: 'Due date',
	due_date: 'Due date',
	status: 'Status',
	priority: 'Priority',
	tags: 'Tags',
	description: 'Description',
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

const SUMMARY_NOISE_FIELDS = new Set([
	'updated_at',
	'created_at',
	'map_id',
	'user_id',
	'position_x',
	'position_y',
	'id',
]);

const LONG_TEXT_FIELDS = new Set([
	'content',
	'note',
	'description',
	'summary',
	'answer',
	'caption',
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
		summaryDetail:
			typeof value.summaryDetail === 'string' ? value.summaryDetail : undefined,
		subjectHints: Array.isArray(value.subjectHints)
			? (value.subjectHints as HistorySubjectHint[])
			: undefined,
	};
}

export function normalizeHistoryActionIntent(
	actionName: string | undefined
): HistoryActionIntent {
	if (!actionName) return 'generic_change';

	if (actionName === 'saveNodeProperties' || actionName === 'updateNode') {
		return 'property_edit';
	}
	if (actionName === 'moveNode' || actionName === 'moveNodes') {
		return 'node_move';
	}
	if (actionName === 'resizeNode' || actionName === 'resizeNodes') {
		return 'node_resize';
	}
	if (actionName === 'addNode') return 'node_add';
	if (actionName === 'deleteNode' || actionName === 'deleteNodes') {
		return 'node_delete';
	}
	if (actionName === 'addEdge') return 'connection_add';
	if (actionName === 'deleteEdge' || actionName === 'deleteEdges') {
		return 'connection_remove';
	}
	if (actionName === 'updateEdge' || actionName === 'updateEdges') {
		return 'connection_update';
	}
	if (actionName === 'setParentConnection') return 'node_detach_or_reparent';
	if (
		actionName.startsWith('applyLayout') ||
		actionName === 'applyLocalResizeReflow'
	) {
		return 'layout_apply';
	}

	return 'generic_change';
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

function truncateLabel(value: string, maxLength = 54): string {
	const singleLine = value.replace(/\s+/g, ' ').trim();
	if (singleLine.length <= maxLength) return singleLine;
	return `${singleLine.slice(0, maxLength - 1)}...`;
}

function toTitleCase(value: string): string {
	if (!value) return '';
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function toNodeTypeLabel(type: string | undefined): string {
	const base = (type || 'node')
		.replace(/Node$/, '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[-_]/g, ' ')
		.trim()
		.toLowerCase();
	return `${toTitleCase(base || 'node')} node`;
}

function nodeFallbackLabel(type: string | undefined, id: string): string {
	return `${toNodeTypeLabel(type)} #${compactId(id)}`;
}

function getNodeTypeFromUnknown(value: unknown): string | undefined {
	if (!isRecord(value)) return undefined;
	const directType = getRecordValue(value, 'type');
	if (typeof directType === 'string' && directType.trim()) return directType;

	const data = getRecordValue(value, 'data');
	if (!isRecord(data)) return undefined;
	const nodeType = getRecordValue(data, 'node_type');
	return typeof nodeType === 'string' && nodeType.trim() ? nodeType : undefined;
}

function getNodeTitleFromUnknown(value: unknown): string | null {
	if (!isRecord(value)) return null;

	const data = getRecordValue(value, 'data');
	if (isRecord(data)) {
		const metadata = getRecordValue(data, 'metadata');
		for (const path of [['title'], ['label']]) {
			const candidate = getNestedValue(metadata, path);
			if (typeof candidate === 'string' && candidate.trim()) {
				return candidate.trim();
			}
		}

		const dataLabel = getRecordValue(data, 'label');
		if (typeof dataLabel === 'string' && dataLabel.trim()) {
			return dataLabel.trim();
		}
	}

	for (const key of ['title', 'label']) {
		const candidate = getRecordValue(value, key);
		if (typeof candidate === 'string' && candidate.trim()) {
			return candidate.trim();
		}
	}

	return null;
}

function getLabelFromPatch(change: HistoryPatchOp): string | null {
	const patch = change.patch ?? {};
	const reversePatch = change.reversePatch ?? {};
	for (const path of [
		'data.metadata.title',
		'metadata.title',
		'data.metadata.label',
		'metadata.label',
		'data.label',
		'label',
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
	const patchType = change.patch?.type;
	if (typeof patchType === 'string' && patchType.trim()) return patchType;
	return node?.type ?? node?.data?.node_type;
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
		? getNodeTitleFromUnknown(currentNode)
		: null;
	if (fromCurrent) return truncateLabel(fromCurrent);

	const fromPrevious = previousNode
		? getNodeTitleFromUnknown(previousNode)
		: null;
	if (fromPrevious) return truncateLabel(fromPrevious);

	const fromValue = getNodeTitleFromUnknown(change.value);
	if (fromValue) return truncateLabel(fromValue);

	const fromRemoved = getNodeTitleFromUnknown(change.removedValue);
	if (fromRemoved) return truncateLabel(fromRemoved);

	const patchLabel = getLabelFromPatch(change);
	if (patchLabel) return truncateLabel(patchLabel);

	return nodeFallbackLabel(
		getNodeType(nodeId, change, nodeMap, previousNodeMap),
		nodeId
	);
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
		(current ? getNodeTitleFromUnknown(current) : null) ??
		(previous ? getNodeTitleFromUnknown(previous) : null);
	const type = current?.type ?? previous?.type ?? current?.data?.node_type;
	return truncateLabel(label ?? fallback ?? nodeFallbackLabel(type, nodeId));
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

	return `Connection #${compactId(change.id)}`;
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

function isEmptyValue(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

function isLongText(fieldKey: string | undefined, ...values: unknown[]): boolean {
	if (fieldKey && LONG_TEXT_FIELDS.has(fieldKey)) return true;
	return values.some(
		(value) => typeof value === 'string' && value.trim().length > 160
	);
}

function valueLabel(value: unknown): string {
	if (value === undefined || value === null) return 'not set';
	if (typeof value === 'boolean') return value ? 'on' : 'off';
	if (typeof value === 'number') {
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? trimmed : 'not set';
	}
	if (Array.isArray(value)) {
		if (value.length === 0) return 'not set';
		return `${value.length} item${value.length === 1 ? '' : 's'}`;
	}
	if (isRecord(value)) return 'changed';
	return String(value);
}

function operationSummary(change: HistoryPatchOp): string {
	if (change.op === 'add')
		return change.type === 'node' ? 'Node added' : 'Connection added';
	if (change.op === 'remove') {
		return change.type === 'node' ? 'Node deleted' : 'Connection removed';
	}
	return change.type === 'node' ? 'Node updated' : 'Connection updated';
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

	return {
		id: `${change.id}:move`,
		kind: 'move',
		label: 'Position',
		summary: oldHasPosition && newHasPosition ? 'Node moved' : 'Node moved',
		oldValue: oldHasPosition
			? `(${valueLabel(oldX)}, ${valueLabel(oldY)})`
			: undefined,
		newValue: newHasPosition
			? `(${valueLabel(newX)}, ${valueLabel(newY)})`
			: undefined,
		paths: movedPaths,
		verb: 'updated',
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
		summary: 'Connection rerouted',
		paths: routePaths,
		verb: 'updated',
	};
}

function fieldChanges(change: HistoryPatchOp): HistoryReadableChange[] {
	const patch = change.patch ?? {};
	return Object.keys(patch)
		.filter((path) => !isPositionPath(path) && !isRoutingPath(path))
		.map((path) => {
			const oldValue = change.reversePatch?.[path];
			const newValue = patch[path];
			const fieldKey = fieldNameFromPath(path);
			const label = fieldLabel(path);
			const isStyle = STYLE_FIELDS.has(fieldKey);
			const cleared = isEmptyValue(newValue) && !isEmptyValue(oldValue);
			const verb: HistoryReadableChange['verb'] = cleared ? 'cleared' : 'updated';

			return {
				id: `${change.id}:${path}`,
				kind: 'field',
				label,
				summary: isStyle
					? `${label} updated`
					: `${label} ${verb}`,
				oldValue: valueLabel(oldValue),
				newValue: valueLabel(newValue),
				paths: [path],
				fieldKey,
				verb,
				isLongText: isLongText(fieldKey, oldValue, newValue),
			};
		});
}

function readableChangesFor(change: HistoryPatchOp): HistoryReadableChange[] {
	if (change.op === 'add' || change.op === 'remove') {
		return [
			{
				id: `${change.id}:${change.op}`,
				kind: change.op === 'add' ? 'add' : 'remove',
				label: operationSummary(change),
				summary: operationSummary(change),
				paths: [],
				verb: change.op === 'add' ? 'added' : 'removed',
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
			label: operationSummary(change),
			summary: operationSummary(change),
			paths: Object.keys(change.patch ?? {}),
			verb: 'updated',
		},
	];
}

function buildFocusTargetFromHint(subject: HistorySubjectHint): HistoryFocusTarget | null {
	if (subject.type === 'node') {
		return {
			type: 'node',
			nodeId: subject.id,
			label: subject.label || `Node #${compactId(subject.id)}`,
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
		label: subject.label || `Connection #${compactId(subject.id)}`,
		nodeIds,
	};
}

function descriptionFor(subject: HistorySubjectHint): string {
	if (subject.type === 'node') {
		return subject.nodeType ? toNodeTypeLabel(subject.nodeType) : 'Node';
	}

	if (subject.sourceLabel && subject.targetLabel) {
		return `${subject.sourceLabel} -> ${subject.targetLabel}`;
	}

	return 'Connection';
}

export function formatHistoryActionTitle(
	actionName: string | undefined
): string {
	switch (normalizeHistoryActionIntent(actionName)) {
		case 'property_edit':
			return 'Property edit';
		case 'node_move':
			return 'Node movement';
		case 'node_resize':
			return 'Node resize';
		case 'node_add':
		case 'node_delete':
			return 'Node lifecycle';
		case 'connection_add':
		case 'connection_remove':
		case 'connection_update':
		case 'connection_reroute':
			return 'Connection change';
		case 'layout_apply':
			return 'Layout';
		case 'node_detach_or_reparent':
			return 'Structure change';
		default:
			return 'Map change';
	}
}

function pluralize(count: number, singular: string, plural: string): string {
	return count === 1 ? singular : `${count} ${plural}`;
}

function joinFieldLabels(labels: string[]): string {
	if (labels.length === 0) return '';
	if (labels.length === 1) return labels[0];
	if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
	return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
}

function subjectPreview(subjects: HistoryPresentationSubject[]): string {
	if (subjects.length === 0) return '';
	const labels = subjects.slice(0, 3).map((subject) => subject.label);
	if (subjects.length > 3) labels.push(`+${subjects.length - 3} more`);
	return labels.join(', ');
}

interface PropertyAggregate {
	label: string;
	order: number;
	verbs: Set<'updated' | 'cleared'>;
	nodeIds: Set<string>;
}

interface SummaryMetrics {
	intent: HistoryActionIntent;
	addedNodes: number;
	removedNodes: number;
	addedConnections: number;
	removedConnections: number;
	updatedConnections: number;
	movedNodeIds: Set<string>;
	resizedNodeIds: Set<string>;
	detachedNodeIds: Set<string>;
	reroutedEdgeIds: Set<string>;
	propertyByField: Map<string, PropertyAggregate>;
	propertyFieldOrder: string[];
	propertyNodeIds: Set<string>;
}

function createSummaryMetrics(
	delta: HistoryDelta,
	subjects: HistoryPresentationSubject[],
	actionName: string | undefined
): SummaryMetrics {
	const metrics: SummaryMetrics = {
		intent: normalizeHistoryActionIntent(actionName),
		addedNodes: 0,
		removedNodes: 0,
		addedConnections: 0,
		removedConnections: 0,
		updatedConnections: 0,
		movedNodeIds: new Set<string>(),
		resizedNodeIds: new Set<string>(),
		detachedNodeIds: new Set<string>(),
		reroutedEdgeIds: new Set<string>(),
		propertyByField: new Map<string, PropertyAggregate>(),
		propertyFieldOrder: [],
		propertyNodeIds: new Set<string>(),
	};

	for (const change of delta.changes) {
		if (change.type === 'node' && change.op === 'add') metrics.addedNodes += 1;
		if (change.type === 'node' && change.op === 'remove') metrics.removedNodes += 1;
		if (change.type === 'edge' && change.op === 'add') metrics.addedConnections += 1;
		if (change.type === 'edge' && change.op === 'remove') metrics.removedConnections += 1;
		if (change.type === 'edge' && change.op === 'patch') metrics.updatedConnections += 1;
	}

	for (const subject of subjects) {
		for (const change of subject.changes) {
			if (subject.type === 'node' && change.kind === 'move') {
				metrics.movedNodeIds.add(subject.id);
			}

			if (subject.type === 'edge' && change.kind === 'route') {
				metrics.reroutedEdgeIds.add(subject.id);
			}

			if (subject.type !== 'node' || change.kind !== 'field') continue;

			const fieldKey = change.fieldKey;
			if (!fieldKey || SUMMARY_NOISE_FIELDS.has(fieldKey)) continue;

			if (!metrics.propertyByField.has(fieldKey)) {
				metrics.propertyByField.set(fieldKey, {
					label: change.label,
					order: metrics.propertyFieldOrder.length,
					verbs: new Set<'updated' | 'cleared'>(),
					nodeIds: new Set<string>(),
				});
				metrics.propertyFieldOrder.push(fieldKey);
			}

			const aggregate = metrics.propertyByField.get(fieldKey);
			if (aggregate) {
				if (change.verb === 'cleared') aggregate.verbs.add('cleared');
				else aggregate.verbs.add('updated');
				aggregate.nodeIds.add(subject.id);
			}

			metrics.propertyNodeIds.add(subject.id);

			if (fieldKey === 'width' || fieldKey === 'height') {
				metrics.resizedNodeIds.add(subject.id);
			}

			if (fieldKey === 'parent_id' || fieldKey === 'parentId') {
				metrics.detachedNodeIds.add(subject.id);
			}
		}
	}

	if (
		metrics.reroutedEdgeIds.size > 0 &&
		metrics.intent === 'connection_update'
	) {
		metrics.intent = 'connection_reroute';
	}

	return metrics;
}

function propertyPhrase(
	metrics: SummaryMetrics
): { text: string; detail?: string } | null {
	if (metrics.propertyByField.size === 0) return null;

	const fields = metrics.propertyFieldOrder
		.map((key) => metrics.propertyByField.get(key))
		.filter((value): value is PropertyAggregate => Boolean(value));
	if (fields.length === 0) return null;

	const allCleared = fields.every((field) => field.verbs.has('cleared'));
	const verb = allCleared ? 'cleared' : 'updated';

	if (fields.length === 1) {
		const field = fields[0];
		const fieldVerb = field.verbs.has('updated') ? 'updated' : 'cleared';
		if (field.nodeIds.size > 1) {
			return {
				text: `${field.label} ${fieldVerb} on ${field.nodeIds.size} nodes`,
			};
		}
		return { text: `${field.label} ${fieldVerb}` };
	}

	if (fields.length <= 3) {
		return {
			text: `${joinFieldLabels(fields.map((field) => field.label))} ${verb}`,
			detail: `${fields.length} properties`,
		};
	}

	return { text: `${fields.length} properties ${verb}` };
}

function phraseByIntent(
	intent: HistoryActionIntent,
	metrics: SummaryMetrics,
	property: { text: string; detail?: string } | null
): string | null {
	switch (intent) {
		case 'property_edit':
			return property?.text ?? null;
		case 'node_move':
			return metrics.movedNodeIds.size > 0
				? pluralize(metrics.movedNodeIds.size, 'Node moved', 'nodes moved')
				: null;
		case 'node_resize':
			return metrics.resizedNodeIds.size > 0
				? pluralize(metrics.resizedNodeIds.size, 'Node resized', 'nodes resized')
				: null;
		case 'node_add':
			return metrics.addedNodes > 0
				? pluralize(metrics.addedNodes, 'Node added', 'nodes added')
				: null;
		case 'node_delete':
			return metrics.removedNodes > 0
				? pluralize(metrics.removedNodes, 'Node deleted', 'nodes deleted')
				: null;
		case 'connection_add':
			return metrics.addedConnections > 0
				? pluralize(metrics.addedConnections, 'Connection added', 'connections added')
				: null;
		case 'connection_remove':
			return metrics.removedConnections > 0
				? pluralize(
						metrics.removedConnections,
						'Connection removed',
						'connections removed'
					)
				: null;
		case 'connection_update':
			return metrics.updatedConnections > 1
				? `${metrics.updatedConnections} connections updated`
				: 'Connection updated';
		case 'connection_reroute':
			return metrics.reroutedEdgeIds.size > 0
				? pluralize(
						metrics.reroutedEdgeIds.size,
						'Connection rerouted',
						'connections rerouted'
					)
				: null;
		case 'node_detach_or_reparent':
			return metrics.detachedNodeIds.size > 1
				? `${metrics.detachedNodeIds.size} nodes detached`
				: 'Node detached';
		case 'layout_apply': {
			if (metrics.movedNodeIds.size > 0) {
				return pluralize(metrics.movedNodeIds.size, 'Node moved', 'nodes moved');
			}
			if (metrics.reroutedEdgeIds.size > 0) {
				return pluralize(
					metrics.reroutedEdgeIds.size,
					'Connection rerouted',
					'connections rerouted'
				);
			}
			return 'Layout applied';
		}
		default:
			return null;
	}
}

function fallbackIntentPhrases(
	metrics: SummaryMetrics,
	property: { text: string; detail?: string } | null
): Array<{ intent: HistoryActionIntent; phrase: string }> {
	const entries: Array<{ intent: HistoryActionIntent; phrase: string }> = [];

	if (metrics.addedNodes > 0) {
		entries.push({
			intent: 'node_add',
			phrase: pluralize(metrics.addedNodes, 'Node added', 'nodes added'),
		});
	}
	if (metrics.removedNodes > 0) {
		entries.push({
			intent: 'node_delete',
			phrase: pluralize(metrics.removedNodes, 'Node deleted', 'nodes deleted'),
		});
	}
	if (metrics.addedConnections > 0) {
		entries.push({
			intent: 'connection_add',
			phrase: pluralize(
				metrics.addedConnections,
				'Connection added',
				'connections added'
			),
		});
	}
	if (metrics.removedConnections > 0) {
		entries.push({
			intent: 'connection_remove',
			phrase: pluralize(
				metrics.removedConnections,
				'Connection removed',
				'connections removed'
			),
		});
	}
	if (metrics.movedNodeIds.size > 0) {
		entries.push({
			intent: 'node_move',
			phrase: pluralize(metrics.movedNodeIds.size, 'Node moved', 'nodes moved'),
		});
	}
	if (metrics.resizedNodeIds.size > 0) {
		entries.push({
			intent: 'node_resize',
			phrase: pluralize(
				metrics.resizedNodeIds.size,
				'Node resized',
				'nodes resized'
			),
		});
	}
	if (metrics.detachedNodeIds.size > 0) {
		entries.push({
			intent: 'node_detach_or_reparent',
			phrase:
				metrics.detachedNodeIds.size > 1
					? `${metrics.detachedNodeIds.size} nodes detached`
					: 'Node detached',
		});
	}
	if (metrics.reroutedEdgeIds.size > 0) {
		entries.push({
			intent: 'connection_reroute',
			phrase: pluralize(
				metrics.reroutedEdgeIds.size,
				'Connection rerouted',
				'connections rerouted'
			),
		});
	}
	if (property) {
		entries.push({ intent: 'property_edit', phrase: property.text });
	}

	return entries;
}

function buildSummaryText(
	delta: HistoryDelta,
	subjects: HistoryPresentationSubject[],
	actionName: string | undefined
): { headline: string; detail?: string } {
	const metrics = createSummaryMetrics(delta, subjects, actionName);
	const property = propertyPhrase(metrics);
	const canonicalPhrase = phraseByIntent(metrics.intent, metrics, property);
	const candidates = fallbackIntentPhrases(metrics, property);

	const phrases: string[] = [];

	if (canonicalPhrase) phrases.push(canonicalPhrase);

	for (const candidate of candidates) {
		if (!phrases.includes(candidate.phrase)) {
			phrases.push(candidate.phrase);
		}
	}

	if (phrases.length === 0) {
		return { headline: 'Map updated' };
	}

	const headline = phrases.slice(0, 2).join(', ');
	if (phrases.length > 2) {
		return {
			headline,
			detail: `${phrases.length - 2} more changes`,
		};
	}

	if (property && headline.includes(property.text) && property.detail) {
		return { headline, detail: property.detail };
	}

	return { headline };
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
				? nodeFallbackLabel(hint.nodeType, change.id)
				: `Connection #${compactId(change.id)}`);

		return {
			id: change.id,
			type: change.type,
			label,
			description: descriptionFor(hint),
			focusTarget: buildFocusTargetFromHint({ ...hint, label }),
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

	const summary = buildSummaryText(delta, subjects, context.actionName);

	return {
		title: formatHistoryActionTitle(context.actionName),
		summary: summary.headline,
		summaryDetail: summary.detail,
		subjects,
		subjectPreview: subjectPreview(subjects),
		movedNodeCount,
		reroutedConnectionCount,
		technicalChanges: delta.changes,
	};
}
