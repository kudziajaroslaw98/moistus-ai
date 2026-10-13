import type { OAuthProtectedResourceMetadata } from '@modelcontextprotocol/server';
import {
	getAuthorizationServerIssuer,
	getMcpResourceUrl,
	MCP_ENDPOINT_PATH,
} from '@/lib/mcp/config';

export const dynamic = 'force-dynamic';

/**
 * RFC 9728 metadata for the MCP endpoint: tells MCP clients that Supabase
 * Auth issues tokens for it. Served at the root path and at the
 * path-suffixed form (/.well-known/oauth-protected-resource/api/mcp).
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
	const { path } = await params;
	const suffix = path ? `/${path.join('/')}` : '';
	if (suffix && suffix !== MCP_ENDPOINT_PATH) {
		return new Response('Not found', { status: 404 });
	}

	const metadata: OAuthProtectedResourceMetadata = {
		resource: getMcpResourceUrl(request).href,
		authorization_servers: [getAuthorizationServerIssuer()],
		bearer_methods_supported: ['header'],
		resource_name: 'Shiko',
	};

	return Response.json(metadata, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': 'public, max-age=300',
		},
	});
}
