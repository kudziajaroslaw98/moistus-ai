/**
 * An error the agent should read: the message goes back as the tool result
 * (`isError: true`), so write it as an instruction the agent can act on.
 */
export class McpToolError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'McpToolError';
	}
}
