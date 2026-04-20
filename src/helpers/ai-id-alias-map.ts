export interface AiIdAliasMap {
	nodeIdToAlias: Map<string, number>;
	aliasToNodeId: Map<number, string>;
}

type AliasableItem = string | { id: string | null | undefined };

function getItemId(item: AliasableItem) {
	return typeof item === 'string' ? item : item.id;
}

function parseAlias(value: string | number | null | undefined) {
	if (typeof value === 'number') {
		return Number.isInteger(value) && value > 0 ? value : null;
	}

	if (typeof value !== 'string') {
		return null;
	}

	if (!/^\d+$/.test(value)) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function createAiIdAliasMap(items: AliasableItem[]): AiIdAliasMap {
	const nodeIdToAlias = new Map<string, number>();
	const aliasToNodeId = new Map<number, string>();
	let nextAlias = 1;

	for (const item of items) {
		const id = getItemId(item);
		if (!id || nodeIdToAlias.has(id)) {
			continue;
		}

		nodeIdToAlias.set(id, nextAlias);
		aliasToNodeId.set(nextAlias, id);
		nextAlias += 1;
	}

	return {
		nodeIdToAlias,
		aliasToNodeId,
	};
}

export function aliasNodeId(
	nodeId: string | null | undefined,
	aliasMap?: AiIdAliasMap
): number | string | null {
	if (!nodeId) {
		return null;
	}

	if (!aliasMap) {
		return nodeId;
	}

	return aliasMap.nodeIdToAlias.get(nodeId) ?? null;
}

export function resolveAliasedNodeId(
	value: string | number | null | undefined,
	aliasMap?: AiIdAliasMap
): string | null {
	if (value == null) {
		return null;
	}

	if (!aliasMap) {
		return typeof value === 'string' ? value : String(value);
	}

	if (typeof value === 'string' && aliasMap.nodeIdToAlias.has(value)) {
		return value;
	}

	const parsedAlias = parseAlias(value);
	if (parsedAlias === null) {
		return null;
	}

	return aliasMap.aliasToNodeId.get(parsedAlias) ?? null;
}

export function resolveAliasedNodeIds(
	values: Array<string | number>,
	aliasMap?: AiIdAliasMap
) {
	return values.flatMap((value) => {
		const resolved = resolveAliasedNodeId(value, aliasMap);
		return resolved ? [resolved] : [];
	});
}
