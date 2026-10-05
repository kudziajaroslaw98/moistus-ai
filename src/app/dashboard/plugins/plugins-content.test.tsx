jest.mock('@/components/dashboard/dashboard-layout', () => ({
	DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/sidebar', () => ({
	SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
const mockToastError = jest.fn();
jest.mock('sonner', () => ({ toast: { error: (message: string) => mockToastError(message) } }));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { PluginsContent } from './plugins-content';

const manifestJson = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/manifest.json'),
	'utf8'
);
const maps = [
	{ id: 'map-1', title: 'Roadmap', pluginIds: ['shiko.metric'] },
	{ id: 'map-2', title: 'Notes', pluginIds: [] },
];

let toggleOk = true;
const mockFetch = jest.fn(async (url: string, init?: RequestInit) => {
	if (url.endsWith('manifest.json')) {
		return { ok: true, json: async () => JSON.parse(manifestJson) };
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
});

describe('PluginsContent', () => {
	it('lists Shiko plugins with how many of your maps use them', async () => {
		setup();

		expect(await screen.findByText('by Shiko · v0.1.0')).toBeInTheDocument();
		expect(await screen.findByRole('button', { name: /On in 1 map/ })).toBeInTheDocument();
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
			})
		);
		expect(await screen.findByRole('button', { name: /On in 2 maps/ })).toBeInTheDocument();
	});

	it('puts the switch back and says so when saving fails', async () => {
		toggleOk = false;
		const user = setup();

		await user.click(await screen.findByRole('button', { name: /On in 1 map/ }));
		const dialog = await screen.findByRole('dialog');
		await user.click(within(dialog).getByRole('checkbox', { name: 'Roadmap' }));

		await waitFor(() =>
			expect(mockToastError).toHaveBeenCalledWith('Couldn’t turn Metric off for “Roadmap”')
		);
		expect(within(dialog).getByRole('checkbox', { name: 'Roadmap' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});
});
