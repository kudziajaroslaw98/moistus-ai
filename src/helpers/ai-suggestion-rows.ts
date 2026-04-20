import { aliasNodeId, type AiIdAliasMap } from '@/helpers/ai-id-alias-map';
import { encodeHybridRow } from '@/helpers/ai-hybrid-rows';
import type { SuggestionGraphContextModel } from '@/helpers/ai-suggestion-graph';

export function serializeSuggestionGraphContext(
	graph: SuggestionGraphContextModel,
	options?: { aliasMap?: AiIdAliasMap }
): string[] {
	const rows: string[] = [
		encodeHybridRow('MAP', [
			graph.map.title,
			graph.map.description,
			graph.map.nodeCount,
			graph.map.edgeCount,
		]),
	];

	if (graph.topics.length > 0) {
		rows.push(encodeHybridRow('TOPICS', graph.topics));
	}

	for (const node of graph.nodes) {
		rows.push(
			encodeHybridRow('NODE', [
				aliasNodeId(node.id, options?.aliasMap) ?? node.id,
				node.type,
				node.text,
				node.tags,
				node.depth,
				node.degree,
				node.flags,
			])
		);
	}

	for (const relation of graph.relations) {
		rows.push(
			encodeHybridRow('REL', [
				relation.kind,
				aliasNodeId(relation.fromId, options?.aliasMap) ?? relation.fromId,
				aliasNodeId(relation.toId, options?.aliasMap) ?? relation.toId,
			])
		);
	}

	for (const anchor of graph.anchors) {
		rows.push(
			encodeHybridRow('ANCHOR', [
				aliasNodeId(anchor.id, options?.aliasMap) ?? anchor.id,
				anchor.type,
				anchor.text,
				anchor.depth,
				anchor.degree,
			])
		);
	}

	rows.push(
		encodeHybridRow('METRIC', [
			graph.metrics.maxDepth,
			graph.metrics.rootCount,
			graph.metrics.isolatedCount,
		])
	);

	return rows;
}
