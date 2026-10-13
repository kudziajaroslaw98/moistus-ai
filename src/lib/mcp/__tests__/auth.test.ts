/** @jest-environment node */
import { OAuthError } from '@modelcontextprotocol/server';
import { readMcpCaller, toMcpAuthInfo, toVerificationError } from '../auth';

const validClaims = {
	sub: 'user-1',
	client_id: 'client-1',
	exp: 2_000_000_000,
	aud: 'authenticated',
	scope: 'openid email',
};

describe('toMcpAuthInfo', () => {
	it('accepts an OAuth access token and keeps the user and client', () => {
		const authInfo = toMcpAuthInfo('tok', validClaims);
		expect(authInfo).toMatchObject({
			token: 'tok',
			clientId: 'client-1',
			scopes: ['openid', 'email'],
			expiresAt: 2_000_000_000,
		});
		expect(readMcpCaller(authInfo)).toEqual({ userId: 'user-1', clientId: 'client-1' });
	});

	it.each([
		['a browser session token (no client_id)', { ...validClaims, client_id: undefined }],
		['an anonymous guest', { ...validClaims, is_anonymous: true }],
		['a token without a user', { ...validClaims, sub: undefined }],
		['a token without expiry', { ...validClaims, exp: undefined }],
	])('rejects %s as invalid_token', (_label, claims) => {
		expect(() => toMcpAuthInfo('tok', claims)).toThrow(OAuthError);
		try {
			toMcpAuthInfo('tok', claims);
		} catch (error) {
			expect((error as OAuthError).code).toBe('invalid_token');
		}
	});
});

describe('toVerificationError', () => {
	it('maps bad tokens to 401 invalid_token and JWKS outages to server_error', () => {
		const expired = Object.assign(new Error('"exp" claim timestamp check failed'), {
			code: 'ERR_JWT_EXPIRED',
		});
		const wrongIssuer = Object.assign(new Error('unexpected "iss" claim value'), {
			code: 'ERR_JWT_CLAIM_VALIDATION_FAILED',
		});
		const outage = Object.assign(new Error('timeout'), { code: 'ERR_JWKS_TIMEOUT' });

		expect(toVerificationError(expired).code).toBe('invalid_token');
		expect(toVerificationError(wrongIssuer).code).toBe('invalid_token');
		expect(toVerificationError(outage).code).toBe('server_error');
		expect(toVerificationError(new TypeError('fetch failed')).code).toBe('server_error');
	});
});
