import type { McpToolDefinition } from './tool-types';
import { createMapTool } from './tools/create-map';
import { editMapTool } from './tools/edit-map';
import { guideTool } from './tools/guide';
import { listMapsTool } from './tools/list-maps';
import { readMapTool } from './tools/read-map';
import { readNodesTool } from './tools/read-nodes';
import { searchNodesTool } from './tools/search-nodes';
import { updateMapInfoTool } from './tools/update-map-info';

/** Every tool behind the meta tools. Order is the order search_tools lists them in. */
export const MCP_TOOL_CATALOG: McpToolDefinition[] = [
	listMapsTool,
	readMapTool,
	readNodesTool,
	searchNodesTool,
	guideTool,
	createMapTool,
	editMapTool,
	updateMapInfoTool,
];

export function findCatalogTool(name: string): McpToolDefinition | undefined {
	return MCP_TOOL_CATALOG.find((tool) => tool.name === name);
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Tools ranked by how many query words hit their name, summary or keywords. */
export function searchCatalog(query: string | undefined): McpToolDefinition[] {
	const queryWords = words(query ?? '');
	if (queryWords.length === 0) return MCP_TOOL_CATALOG;

	return MCP_TOOL_CATALOG.map((tool, index) => {
		const toolWords = new Set([
			...words(tool.name),
			...words(tool.summary),
			...tool.keywords.flatMap(words),
		]);
		// Prefix match both ways ("node" ~ "nodes", "searching" ~ "search"),
		// ignoring short filler words.
		const score = queryWords.filter((word) =>
			[...toolWords].some(
				(toolWord) =>
					(word.length >= 2 && toolWord.startsWith(word)) ||
					(toolWord.length >= 4 && word.startsWith(toolWord))
			)
		).length;
		return { tool, score, index };
	})
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map((entry) => entry.tool);
}
