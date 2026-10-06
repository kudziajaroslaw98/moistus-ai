jest.mock('@/components/dashboard/dashboard-layout', () => ({
	DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/sidebar', () => ({
	SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock('sonner', () => ({
	toast: {
		error: (message: string) => mockToastError(message),
		success: (message: string) => mockToastSuccess(message),
	},
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { PluginsContent } from './plugins-content';

const LATEST = { pluginId: 'shiko.metric', version: '0.2.0' };
let maps = [
	{ id: 'map-1', title: 'Roadmap', plugins: [LATEST] },
	{ id: 'map-2', title: 'Notes', plugins: [] as Array<typeof LATEST> },
];

let toggleOk = true;
const mockFetch = jest.fn(async (url: string, init?: RequestInit) => {
	if (url.endsWith('manifest.json')) {
		const json = readFileSync(join(process.cwd(), 'public', url), 'utf8');
		return { ok: true, json: async () => JSON.parse(json) };
	}
	if (url === '/api/plugins/maps') {
		return { ok: true, json: async () => ({ data: { maps } }) };
	}
	return { ok: toggleOk, json: async () => ({}), method: init?.method };
});

function setup() {
	global.fetch = mockFetch as unknown as typeof fetch;
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<PluginsContent />
		</SWRConfig>
	);
	return userEvent.setup();
}

beforeEach(() => {
	jest.clearAllMocks();
	toggleOk = true;
	maps = [
		{ id: 'map-1', title: 'Roadmap', plugins: [LATEST] },
		{ id: 'map-2', title: 'Notes', plugins: [] },
	];
});

describe('PluginsContent', () => {
	it('lists Shiko plugins with how many of your maps use them', async () => {
		setup();

		expect(await screen.findByText('by Shiko · v0.2.0')).toBeInTheDocument();
		expect(await screen.findByRole('button', { name: /On in 1 map/ })).toBeInTheDocument();
		expect(screen.queryByTestId('plugin-update')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Read the guide/ })).toHaveAttribute(
			'href',
			'/dashboard/plugins/build'
		);
	});

	it('turns a plugin on for another map', async () => {
		const user = setup();

		await user.click(await screen.findByRole('button', { name: /On in 1 map/ }));
		const dialog = await screen.findByRole('dialog');
		await user.click(within(dialog).getByRole('checkbox', { name: 'Notes' }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith('/api/maps/map-2/plugins/shiko.metric', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: '{"permissions":["node:own"]}',
			})
		);
		expect(await screen.findByRole('button', { name: /On in 2 maps/ })).toBeInTheDocument();
	});

	it('updates every map on an older version after showing what changes', async () => {
		maps = [
			{ id: 'map-1', title: 'Roadmap', plugins: [{ ...LATEST, version: '0.1.0' }] },
			{ id: 'map-2', title: 'Notes', plugins: [{ ...LATEST, version: '0.1.0' }] },
		];
		const user = setup();

		const update = await screen.findByTestId('plugin-update');
		expect(update).toHaveTextContent('0.2.0 ready for 2 of your maps');
		expect(update).toHaveTextContent('No new powers');
		await user.click(screen.getByRole('button', { name: 'Update 2 maps' }));

		await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Metric is on 0.2.0 in 2 maps'));
		for (const id of ['map-1', 'map-2']) {
			expect(mockFetch).toHaveBeenCalledWith(`/api/maps/${id}/plugins/shiko.metric`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: '{"version":"0.2.0","permissions":["node:own"]}',
			});
		}
		await waitFor(() => expect(screen.queryByTestId('plugin-update')).not.toBeInTheDocument());
	});

	it('puts the switch back and says so when saving fails', async () => {
		toggleOk = false;
		const user = setup();

		await user.click(await screen.findByRole('button', { name: /On in 1 map/ }));
		const dialog = await screen.findByRole('dialog');
		await user.click(within(dialog).getByRole('checkbox', { name: 'Roadmap v0.2.0' }));

		await waitFor(() =>
			expect(mockToastError).toHaveBeenCalledWith('Couldn’t turn Metric off for “Roadmap”')
		);
		expect(within(dialog).getByRole('checkbox', { name: 'Roadmap v0.2.0' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});
});
