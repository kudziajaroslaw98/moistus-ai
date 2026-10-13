import type { z } from 'zod';
import type { McpToolContext } from './context';

/** `read` tools run through run_read (auto-approvable); `write` tools only through run_write. */
export type McpToolKind = 'read' | 'write';

/**
 * A tool in Shiko's hidden catalog. Clients only see the four meta tools;
 * agents find these with search_tools and learn their arguments with
 * describe_tools. `run` returns plain text: it costs fewer tokens than JSON.
 */
export interface McpToolDefinition<Schema extends z.ZodType = z.ZodType> {
	name: string;
	kind: McpToolKind;
	/** One line shown by search_tools. */
	summary: string;
	/** Extra words search_tools matches on. */
	keywords: string[];
	input: Schema;
	example: z.input<Schema>;
	run(args: z.output<Schema>, ctx: McpToolContext): Promise<string>;
}

export const defineMcpTool = <Schema extends z.ZodType>(
	tool: McpToolDefinition<Schema>
): McpToolDefinition<Schema> => tool;
