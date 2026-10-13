/** @jest-environment node */
import { createMcpHandler } from '@modelcontextprotocol/server';
import type { McpToolContext } from '../context';
import { createShikoMcpServer, MCP_INSTRUCTIONS } from '../server';

const handler = createMcpHandler(() => createShikoMcpServer({ gate: { before: async () => {}, after: async () => {} } } as unknown as McpToolContext));

async function rpc(method: string, params: Record<string, unknown> = {}) {
	const response = await handler.fetch(
		new Request('http://localhost/api/mcp', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
		})
	);
	const raw = await response.text();
	// Stateless legacy serving may answer as SSE; take the data line.
	const json = raw.startsWith('{') ? raw : raw.split('\n').find((line) => line.startsWith('data: '))!.slice(6);
	return JSON.parse(json);
}

describe('MCP endpoint surface', () => {
	it('initializes with short instructions', async () => {
		const result = await rpc('initialize', {
			protocolVersion: '2025-11-25',
			capabilities: {},
			clientInfo: { name: 'test', version: '1' },
		});
		expect(result.result.serverInfo.name).toBe('shiko');
		expect(result.result.instructions).toBe(MCP_INSTRUCTIONS);
		expect(MCP_INSTRUCTIONS.split(/\s+/).length).toBeLessThanOrEqual(120);
	});

	it('lists only the four meta tools, within a small token budget', async () => {
		const result = await rpc('tools/list');
		const tools = result.result.tools as { name: string; annotations?: Record<string, boolean> }[];
		expect(tools.map((tool) => tool.name)).toEqual([
			'search_tools',
			'describe_tools',
			'run_read',
			'run_write',
		]);
		expect(tools.find((tool) => tool.name === 'run_read')?.annotations?.readOnlyHint).toBe(true);
		expect(tools.find((tool) => tool.name === 'run_write')?.annotations?.destructiveHint).toBe(true);

		// ~4 characters per token: keep the whole tool list under ~700 tokens.
		expect(JSON.stringify(tools).length).toBeLessThan(2800);
	});

	it('runs search_tools end to end', async () => {
		const result = await rpc('tools/call', { name: 'search_tools', arguments: { query: 'outline' } });
		expect(result.result.content[0].text).toContain('read_map [read]');
	});
});
