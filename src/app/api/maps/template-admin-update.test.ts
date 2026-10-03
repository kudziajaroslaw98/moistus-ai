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
	it('maps template fields and merges metadata without dropping templateId', () => {
		const update = buildTemplateAdminUpdate(
			{
				title: 'SWOT',
				template_category: 'business',
				template_icon: 'Briefcase',
				template_preview_colors: ['#111111'],
			},
			{ templateId: 'swot', icon: 'Lightbulb', previewColors: ['#000000'] }
		);

		expect(update).toMatchObject({
			title: 'SWOT',
			template_category: 'business',
			metadata: {
				templateId: 'swot',
				icon: 'Briefcase',
				previewColors: ['#111111'],
			},
		});
		expect(typeof update.updated_at).toBe('string');
	});

	it('leaves metadata alone when no template metadata changes', () => {
		const update = buildTemplateAdminUpdate(
			{ description: null },
			{ templateId: 'swot' }
		);

		expect(update).not.toHaveProperty('metadata');
		expect(update).toHaveProperty('description', null);
	});

	it('never sets is_template', () => {
		const update = buildTemplateAdminUpdate(
			{ is_template: false, title: 'x' },
			null
		);

		expect(update).not.toHaveProperty('is_template');
	});
});
