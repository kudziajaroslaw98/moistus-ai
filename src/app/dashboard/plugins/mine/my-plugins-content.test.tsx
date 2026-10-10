jest.mock('@/components/plugins/plugin-submit-sheet', () => ({
	PluginSubmitSheet: () => <p>Submit sheet</p>,
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { MyPluginsContent } from './my-plugins-content';

const plugin = {
	id: 'com.example.reading-list',
	name: 'Reading list',
	icon: 'book',
	description: 'Track what you read.',
	permissions: ['node:own', 'network:openlibrary.org'],
	mapCount: 14,
	openReports: 1,
	disabledReason: null,
	versions: [
		{
			version: '0.2.0',
			status: 'changes_requested',
			notes: 'Adds author lookup.',
			submittedAt: '2026-10-01T10:00:00Z',
			reviewedAt: '2026-10-02T10:00:00Z',
			reviewMessage: 'Please explain what is sent.',
			publishedAt: null,
			disabledReason: null,
		},
		{
			version: '0.1.0',
			status: 'published',
			notes: 'First version.',
			submittedAt: '2026-09-01T10:00:00Z',
			reviewedAt: '2026-09-02T10:00:00Z',
			reviewMessage: null,
			publishedAt: '2026-09-02T10:00:00Z',
			disabledReason: null,
		},
	],
};

function setup() {
	global.fetch = jest.fn(async () => ({
		ok: true,
		json: async () => ({ data: { plugins: [plugin] } }),
	})) as unknown as typeof fetch;
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MyPluginsContent />
		</SWRConfig>
	);
	return userEvent.setup();
}

describe('MyPluginsContent', () => {
	it('shows each plugin as a card with its status, Shiko’s message and one Versions button', async () => {
		setup();

		const card = (await screen.findByText('Reading list')).closest(
			'article'
		) as HTMLElement;
		expect(within(card).getByText('Published 0.1.0')).toBeInTheDocument();
		expect(within(card).getByText('Changes requested')).toBeInTheDocument();
		expect(
			within(card).getByText('Shiko: “Please explain what is sent.”')
		).toBeInTheDocument();
		expect(
			within(card).getByText('On in 14 maps · 1 report')
		).toBeInTheDocument();
		expect(
			within(card).getByRole('button', { name: 'Versions' })
		).toBeInTheDocument();
	});

	it('opens every version with its review messages in a side sheet', async () => {
		const user = setup();

		const card = (await screen.findByText('Reading list')).closest(
			'article'
		) as HTMLElement;
		await user.click(within(card).getByRole('button', { name: 'Versions' }));

		const sheet = await screen.findByRole('dialog');
		expect(within(sheet).getByText('Live version')).toBeInTheDocument();
		expect(within(sheet).getAllByText('0.1.0')).toHaveLength(2);
		expect(within(sheet).getByText('0.2.0')).toBeInTheDocument();
		expect(
			within(sheet).getByText(/Please explain what is sent/)
		).toBeInTheDocument();
	});

	it('ends the grid with a Submit a new plugin tile', async () => {
		setup();

		expect(
			await screen.findByRole('button', { name: /Submit a new plugin/ })
		).toBeInTheDocument();
	});
});
