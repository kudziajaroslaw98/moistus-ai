import { McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { findCatalogTool, MCP_TOOL_CATALOG, searchCatalog } from './catalog';
import type { McpToolContext } from './context';
import { McpToolError } from './errors';
import type { McpToolDefinition, McpToolKind } from './tool-types';

export const MCP_SERVER_INFO = { name: 'shiko', title: 'Shiko', version: '1.0.0' };

/**
 * Sent once at connect. Names the common tools so agents can describe them
 * straight away instead of searching first.
 */
export const MCP_INSTRUCTIONS = `Shiko is a mind-map app. Its tools sit behind four meta tools: search_tools finds a tool, describe_tools shows its arguments, run_read runs a read tool, run_write runs a tool that changes maps.
Common tools: list_maps, read_map, read_nodes (read); create_map, edit_map (write). You can describe them without searching.
Maps and nodes use short hex ids such as a1b2c3. read_map prints an indented outline; create_map and edit_map take the same format. Read guide {topic:"editing"} before your first write.
Each write is atomic and the user can undo it from the map's History panel.`;

const textResult = (text: string): CallToolResult => ({
	content: [{ type: 'text', text }],
});

const errorResult = (text: string): CallToolResult => ({
	content: [{ type: 'text', text }],
	isError: true,
});

const toolLine = (tool: McpToolDefinition) => `${tool.name} [${tool.kind}] ${tool.summary}`;

export function describeTool(tool: McpToolDefinition): string {
	const { $schema: _schema, ...schema } = z.toJSONSchema(tool.input, { io: 'input' });
	const runner = tool.kind === 'read' ? 'run_read' : 'run_write';
	return [
		toolLine(tool),
		`args: ${JSON.stringify(schema)}`,
		`example: ${runner} ${JSON.stringify({ name: tool.name, args: tool.example })}`,
	].join('\n');
}

export async function runCatalogTool(
	kind: McpToolKind,
	name: string,
	args: Record<string, unknown> | undefined,
	ctx: McpToolContext
): Promise<CallToolResult> {
	const tool = findCatalogTool(name);
	if (!tool) {
		return errorResult(`Unknown tool "${name}". Run search_tools to see what exists.`);
	}
	if (tool.kind !== kind) {
		return errorResult(
			tool.kind === 'write'
				? `${name} changes maps. Call it with run_write.`
				: `${name} only reads. Call it with run_read.`
		);
	}

	const parsed = tool.input.safeParse(args ?? {});
	if (!parsed.success) {
		return errorResult(
			`Invalid arguments for ${name}:\n${z.prettifyError(parsed.error)}\nSee describe_tools {names:["${name}"]}.`
		);
	}

	try {
		await ctx.gate.before(tool.kind);
		const text = await tool.run(parsed.data, ctx);
		await ctx.gate.after(tool.kind);
		return textResult(text);
	} catch (error) {
		if (error instanceof McpToolError) return errorResult(error.message);
		console.error(`[mcp] ${name} failed`, error);
		return errorResult(`Shiko hit an unexpected error running ${name}. Try again; if it keeps failing, tell the user.`);
	}
}

const runInput = z.object({
	name: z.string().describe('Tool name from search_tools'),
	args: z.record(z.string(), z.unknown()).optional().describe('Arguments, as describe_tools shows'),
});

/** One server per request (the endpoint is stateless), bound to the caller. */
export function createShikoMcpServer(ctx: McpToolContext): McpServer {
	const server = new McpServer(MCP_SERVER_INFO, { instructions: MCP_INSTRUCTIONS });

	server.registerTool(
		'search_tools',
		{
			title: 'Search Shiko tools',
			description: 'List Shiko tools matching a query (or all of them). One line each: name [read|write] summary.',
			inputSchema: z.object({ query: z.string().optional() }),
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ query }) => {
			const matches = searchCatalog(query);
			if (matches.length > 0) return textResult(matches.map(toolLine).join('\n'));
			return textResult(`No tool matches "${query}". All tools:\n${MCP_TOOL_CATALOG.map(toolLine).join('\n')}`);
		}
	);

	server.registerTool(
		'describe_tools',
		{
			title: 'Describe Shiko tools',
			description: 'Argument schema and an example call for each named tool.',
			inputSchema: z.object({ names: z.array(z.string()).min(1).max(10) }),
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ names }) =>
			textResult(
				names
					.map((name) => {
						const tool = findCatalogTool(name);
						return tool ? describeTool(tool) : `${name}: unknown tool. Run search_tools.`;
					})
					.join('\n\n')
			)
	);

	server.registerTool(
		'run_read',
		{
			title: 'Run a Shiko read tool',
			description: 'Run a [read] tool from search_tools. Never changes anything.',
			inputSchema: runInput,
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ name, args }) => runCatalogTool('read', name, args, ctx)
	);

	server.registerTool(
		'run_write',
		{
			title: 'Run a Shiko write tool',
			description: 'Run a [write] tool from search_tools. Changes the user\'s maps.',
			inputSchema: runInput,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
		},
		async ({ name, args }) => runCatalogTool('write', name, args, ctx)
	);

	return server;
}
