/** @jest-environment node */
import { z } from 'zod';
import { MCP_TOOL_CATALOG, searchCatalog } from '../catalog';
import type { McpToolContext } from '../context';
import { McpToolError } from '../errors';
import { describeTool, runCatalogTool } from '../server';

const ctx = {} as McpToolContext;

const textOf = (result: Awaited<ReturnType<typeof runCatalogTool>>) =>
	result.content.map((block) => ('text' in block ? block.text : '')).join('');

describe('catalog search', () => {
	it('ranks tools by the words in the query', () => {
		expect(searchCatalog('read outline')[0].name).toBe('read_map');
		expect(searchCatalog('find nodes by tag')[0].name).toBe('search_nodes');
		expect(searchCatalog(undefined)).toEqual(MCP_TOOL_CATALOG);
		expect(searchCatalog('zzz')).toEqual([]);
	});

	it('describes a tool with a compact schema and a runnable example', () => {
		const text = describeTool(MCP_TOOL_CATALOG.find((tool) => tool.name === 'read_map')!);
		expect(text).toContain('read_map [read]');
		expect(text).toContain('"additionalProperties":false');
		expect(text).not.toContain('$schema');
		expect(text).toContain('example: run_read {"name":"read_map","args":{"map":"a1b2c3","depth":2}}');
	});
});

describe('runCatalogTool', () => {
	it('runs a read tool through run_read', async () => {
		const result = await runCatalogTool('read', 'guide', { topic: 'syntax' }, ctx);
		expect(result.isError).toBeUndefined();
		expect(textOf(result)).toContain('Shiko outline format');
	});

	it('refuses the wrong runner, unknown tools and bad arguments, with a next step', async () => {
		const wrongRunner = await runCatalogTool('write', 'guide', { topic: 'syntax' }, ctx);
		expect(wrongRunner.isError).toBe(true);
		expect(textOf(wrongRunner)).toContain('Call it with run_read');

		const unknown = await runCatalogTool('read', 'delete_everything', {}, ctx);
		expect(textOf(unknown)).toContain('Run search_tools');

		const typo = await runCatalogTool('read', 'guide', { topik: 'syntax' }, ctx);
		expect(typo.isError).toBe(true);
		expect(textOf(typo)).toContain('describe_tools {names:["guide"]}');
	});

	it('returns McpToolError messages and hides unexpected errors', async () => {
		const failing = {
			name: 'list_maps',
			kind: 'read' as const,
			summary: '',
			keywords: [],
			input: z.object({}),
			example: {},
			run: jest.fn(),
		};
		const original = MCP_TOOL_CATALOG[0];
		MCP_TOOL_CATALOG[0] = failing;
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		try {
			failing.run.mockRejectedValueOnce(new McpToolError('Map not found.'));
			expect(textOf(await runCatalogTool('read', 'list_maps', {}, ctx))).toBe('Map not found.');

			failing.run.mockRejectedValueOnce(new Error('relation "secret_table" does not exist'));
			const hidden = textOf(await runCatalogTool('read', 'list_maps', {}, ctx));
			expect(hidden).not.toContain('secret_table');
			expect(hidden).toContain('unexpected error');
		} finally {
			MCP_TOOL_CATALOG[0] = original;
			consoleError.mockRestore();
		}
	});
});
