import { compactPromptText } from '@/helpers/ai-hybrid-rows';
import type { AppNode } from '@/types/app-node';

/**
 * Text fragments that carry a node's meaning, in display priority order.
 * Shared by AI prompt rows and canvas search so both "read" a node the same way.
 */
export function getNodeSemanticFragments(node: AppNode): string[] {
	const metadata = node.data.metadata;
	const fragments = [
		typeof metadata?.title === 'string' ? metadata.title : null,
		typeof metadata?.label === 'string' ? metadata.label : null,
		typeof node.data.content === 'string' ? node.data.content : null,
		typeof metadata?.summary === 'string' ? metadata.summary : null,
		typeof metadata?.answer === 'string' ? metadata.answer : null,
		typeof metadata?.caption === 'string' ? metadata.caption : null,
		typeof metadata?.altText === 'string' ? metadata.altText : null,
	]
		.map((fragment) => compactPromptText(fragment))
		.filter((fragment): fragment is string => fragment !== null);

	return Array.from(new Set(fragments));
}

/** AI prompt text for a node (`[no content]` when empty). */
export function getNodeSemanticText(node: AppNode): string {
	return getNodeSemanticFragments(node).join(' | ') || '[no content]';
}

/**
 * Searchable text: semantic fragments plus checklist rows, tags and file names.
 */
export function getNodeSearchText(node: AppNode): string {
	const metadata = node.data.metadata;
	const extra = [
		...(metadata?.tasks ?? []).map((task) => task.text),
		...(metadata?.tags ?? []),
		typeof metadata?.fileName === 'string' ? metadata.fileName : null,
		typeof metadata?.url === 'string' ? metadata.url : null,
	];
	return [...getNodeSemanticFragments(node), ...extra].filter(Boolean).join('\n');
}
