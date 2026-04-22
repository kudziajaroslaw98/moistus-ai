type HybridRowScalar = string | number | boolean | null;
type HybridRowValue = HybridRowScalar | HybridRowScalar[];

export const HYBRID_ROW_PROMPT_GUIDE =
	'Context uses compact rows in the form PREFIX=<JSON array>. Read each prefix and array position literally.';

export function encodeHybridRow(
	prefix: string,
	values: HybridRowValue[]
): string {
	return `${prefix}=${JSON.stringify(values)}`;
}

export function compactPromptText(
	value: string | null | undefined,
	maxLength?: number
): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.replace(/\s+/g, ' ').trim();
	if (!normalized) {
		return null;
	}

	if (!maxLength || normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function compactPromptList(
	values: Array<string | null | undefined>,
	maxItems?: number
): string[] {
	const normalized = Array.from(
		new Set(
			values
				.map((value) => compactPromptText(value))
				.filter((value): value is string => value !== null)
		)
	);

	if (!maxItems) {
		return normalized;
	}

	return normalized.slice(0, maxItems);
}

export function getCompactNodeType(type: string | null | undefined): string {
	const normalized = compactPromptText(type) ?? 'defaultNode';
	return normalized.replace(/Node$/, '') || 'default';
}
