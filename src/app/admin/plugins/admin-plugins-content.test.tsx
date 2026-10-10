jest.mock('@/components/dashboard/dashboard-layout', () => ({
	DashboardLayout: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
jest.mock('@/components/ui/sidebar', () => ({
	SidebarProvider: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
jest.mock('@/components/plugins/review/submission-review', () => ({
	SubmissionReview: ({
		submission,
	}: {
		submission: { name: string; version: string };
	}) => <p>{`Reviewing ${submission.name} ${submission.version}`}</p>,
}));
jest.mock('@/components/plugins/use-plugin-library', () => ({
	usePluginLibrary: () => ({ plugins: [] }),
}));
jest.mock('@/components/plugins/use-catalog-manifests', () => ({
	useCatalogManifests: () => ({}),
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { AdminPluginsContent } from './admin-plugins-content';

const submission = {
	pluginId: 'com.example.reading-list',
	version: '0.2.0',
	name: 'Reading list',
	author: 'Ada',
	submittedAt: new Date().toISOString(),
	submitterNote: '',
	notes: 'Fills in the author.',
	sha256: 'a'.repeat(64),
	manifest: { icon: 'book' },
	permissions: ['node:own', 'network:openlibrary.org'],
	previous: { version: '0.1.0', permissions: ['node:own'] },
	mapCount: 14,
};
const group = {
	pluginId: 'com.example.sprint-board',
	version: '1.1.0',
	name: 'Sprint board',
	author: 'Grace',
	mapCount: 31,
	reporters: 3,
	counts: { broken: 2, overreach: 1 },
	reports: [
		{
			id: 'r1',
			reason: 'broken',
			details: 'Cards jump back.',
			createdAt: new Date().toISOString(),
			nodeData: null,
		},
	],
	pluginDisabledReason: null,
	versionDisabledReason: null,
	isShiko: false,
};

function setup() {
	global.fetch = jest.fn(async (url: string) => ({
		ok: true,
		json: async () => {
			if (url.endsWith('/summary'))
				return { data: { submissions: 1, reports: 1 } };
			if (url.endsWith('/submissions'))
				return { data: { submissions: [submission] } };
			return { data: { groups: [group] } };
		},
	})) as unknown as typeof fetch;
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<AdminPluginsContent />
		</SWRConfig>
	);
	return userEvent.setup();
}

describe('AdminPluginsContent', () => {
	it('lists submissions as cards and flags a new power', async () => {
		setup();

		const card = (await screen.findByText('Reading list 0.2.0')).closest(
			'article'
		) as HTMLElement;
		expect(within(card).getByText('Update from 0.1.0')).toBeInTheDocument();
		expect(within(card).getByText('New power')).toBeInTheDocument();
		expect(
			within(card).getByRole('button', { name: 'Review' })
		).toBeInTheDocument();
	});

	it('opens the submission in a sheet with Review', async () => {
		const user = setup();

		const card = (await screen.findByText('Reading list 0.2.0')).closest(
			'article'
		) as HTMLElement;
		await user.click(within(card).getByRole('button', { name: 'Review' }));

		expect(
			await screen.findByText('Reviewing Reading list 0.2.0')
		).toBeInTheDocument();
	});

	it('shows reports as cards and opens the moderation sheet', async () => {
		const user = setup();

		await user.click(await screen.findByRole('tab', { name: /Reports/ }));
		const card = (await screen.findByText('Sprint board 1.1.0')).closest(
			'article'
		) as HTMLElement;
		expect(within(card).getByText('1 report')).toBeInTheDocument();
		await user.click(within(card).getByRole('button', { name: 'Review' }));

		const sheet = await screen.findByRole('dialog');
		expect(
			within(sheet).getByRole('button', {
				name: 'Turn off Sprint board everywhere',
			})
		).toBeInTheDocument();
		expect(within(sheet).getByText('Cards jump back.')).toBeInTheDocument();
	});
});
