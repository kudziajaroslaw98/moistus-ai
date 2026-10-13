import {
	createMcpHandler,
	getOAuthProtectedResourceMetadataUrl,
	requireBearerAuth,
} from '@modelcontextprotocol/server';
import { createSupabaseTokenVerifier } from '@/lib/mcp/auth';
import { getMcpResourceUrl } from '@/lib/mcp/config';
import { createMcpToolContext } from '@/lib/mcp/context';
import { createShikoMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const verifier = createSupabaseTokenVerifier();

// Stateless: every request gets a fresh server bound to the verified caller.
const mcpHandler = createMcpHandler(({ authInfo, requestInfo }) =>
	createShikoMcpServer(
		createMcpToolContext(authInfo, requestInfo ? new URL(requestInfo.url).origin : '')
	)
);

// Bearer tokens, not cookies, so any origin may call (browser-based MCP clients).
function withCors(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

async function handleMcpRequest(request: Request): Promise<Response> {
	const gate = requireBearerAuth({
		verifier,
		resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(getMcpResourceUrl(request)),
	});
	const auth = await gate(request);
	if (auth instanceof Response) return withCors(auth);

	return withCors(await mcpHandler.fetch(request, { authInfo: auth }));
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;

export function OPTIONS(request: Request): Response {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers':
				request.headers.get('Access-Control-Request-Headers') ??
				'Authorization, Content-Type, Accept, Mcp-Protocol-Version',
			'Access-Control-Max-Age': '600',
		},
	});
}
