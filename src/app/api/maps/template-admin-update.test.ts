jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
	createServiceRoleClient: jest.fn(),
}));

import { buildTemplateAdminUpdate } from './[id]/route';

describe('buildTemplateAdminUpdate', () => {
	it('maps title, description and category', () => {
		const update = buildTemplateAdminUpdate({
			title: 'SWOT',
			description: null,
			template_category: 'business',
		});

		expect(update).toMatchObject({
			title: 'SWOT',
			description: null,
			template_category: 'business',
		});
		expect(typeof update.updated_at).toBe('string');
	});

	it('never writes metadata, so icon and colors stay category-locked', () => {
		// A stale client may still send the removed fields; they must not reach the row.
		const update = buildTemplateAdminUpdate({
			template_category: 'business',
			template_icon: 'Briefcase',
			template_preview_colors: ['#111111'],
		} as Parameters<typeof buildTemplateAdminUpdate>[0]);

		expect(update).not.toHaveProperty('metadata');
		expect(update).not.toHaveProperty('template_icon');
		expect(update).not.toHaveProperty('template_preview_colors');
	});

	it('ignores tags and thumbnail', () => {
		const update = buildTemplateAdminUpdate({
			tags: ['a'],
			thumbnailUrl: 'https://example.com/x.png',
		});

		expect(update).not.toHaveProperty('tags');
		expect(update).not.toHaveProperty('thumbnail_url');
		expect(update).not.toHaveProperty('thumbnailUrl');
	});

	it('never sets is_template', () => {
		const update = buildTemplateAdminUpdate({ is_template: false, title: 'x' });

		expect(update).not.toHaveProperty('is_template');
	});
});
