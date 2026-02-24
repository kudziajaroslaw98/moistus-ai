jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

import { normalizePermissionsRole } from './[id]/permissions/route';

describe('normalizePermissionsRole', () => {
	it('keeps allowed role values', () => {
		expect(normalizePermissionsRole('owner')).toBe('owner');
		expect(normalizePermissionsRole('editor')).toBe('editor');
		expect(normalizePermissionsRole('commentator')).toBe('commentator');
		expect(normalizePermissionsRole('viewer')).toBe('viewer');
	});

	it('maps unknown and legacy role values to viewer', () => {
		expect(normalizePermissionsRole('commenter')).toBe('viewer');
		expect(normalizePermissionsRole('admin')).toBe('viewer');
		expect(normalizePermissionsRole('')).toBe('viewer');
		expect(normalizePermissionsRole(null)).toBe('viewer');
		expect(normalizePermissionsRole(undefined)).toBe('viewer');
	});
});
