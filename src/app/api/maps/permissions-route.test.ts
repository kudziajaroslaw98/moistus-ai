jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

import {
	buildTemplateViewerPermissions,
	normalizePermissionsRole,
} from './[id]/permissions/route';

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

describe('buildTemplateViewerPermissions', () => {
	it('returns read-only viewer permissions for template access', () => {
		const permissions = buildTemplateViewerPermissions('2026-02-26T12:00:00.000Z');

		expect(permissions).toEqual({
			role: 'viewer',
			can_view: true,
			can_edit: false,
			can_comment: false,
			updated_at: '2026-02-26T12:00:00.000Z',
			isOwner: false,
		});
	});

	it('falls back to current timestamp when updatedAt is missing', () => {
		const permissions = buildTemplateViewerPermissions(null);

		expect(permissions.role).toBe('viewer');
		expect(permissions.can_view).toBe(true);
		expect(permissions.can_edit).toBe(false);
		expect(permissions.can_comment).toBe(false);
		expect(permissions.isOwner).toBe(false);
		expect(typeof permissions.updated_at).toBe('string');
		expect(Number.isNaN(Date.parse(permissions.updated_at))).toBe(false);
	});
});
