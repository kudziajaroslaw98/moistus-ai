jest.mock('next/dynamic', () => () => {
	const React = require('react');
	return function EditorStub(props: {
		label: string;
		value: string;
		language: string;
		readOnly?: boolean;
	}) {
		return React.createElement(
			'pre',
			{
				'aria-label': props.label,
				'data-language': props.language,
				'data-readonly': String(Boolean(props.readOnly)),
			},
			props.value
		);
	};
});

const mockToastError = jest.fn();
jest.mock('sonner', () => ({
	toast: { error: (message: string) => mockToastError(message) },
}));

const mockFetchSource = jest.fn();
jest.mock('@/lib/plugins/plugin-source', () => ({
	fetchPluginSource: (...args: unknown[]) => mockFetchSource(...args),
}));

import {
	setPluginLibrary,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import type { PluginSource } from '@/lib/plugins/plugin-source';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { PluginCodeSheet } from './plugin-code-sheet';

const sourceOf = (
	version: string,
	overrides: Partial<PluginSource> = {}
): PluginSource => ({
	pluginId: 'shiko.metric',
	version,
	manifestText: `{\n  "version": "${version}"\n}`,
	icon: 'gauge',
	permissions: ['node:own'],
	mainName: 'plugin.js',
	code: `// metric ${version}\ndefinePlugin({});`,
	sha256: 'a'.repeat(64),
	fingerprint: 'match',
	...overrides,
});

function setup(
	props: Partial<React.ComponentProps<typeof PluginCodeSheet>> = {}
) {
	const onOpenChange = jest.fn();
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<PluginCodeSheet
				open
				onOpenChange={onOpenChange}
				pluginId='shiko.metric'
				pluginName='Metric'
				{...props}
			/>
		</SWRConfig>
	);
	return { onOpenChange, user: userEvent.setup() };
}

beforeEach(() => {
	jest.clearAllMocks();
	setPluginLibrary({ plugins: [], disabled: [] });
	mockFetchSource.mockImplementation(async (_id: string, version: string) =>
		sourceOf(version)
	);
});

describe('PluginCodeSheet', () => {
	it('shows the newest version’s code read-only, with its fingerprint check', async () => {
		setup();

		const code = await screen.findByLabelText('plugin.js, read-only');
		expect(code).toHaveTextContent('// metric 0.2.0');
		expect(code).toHaveAttribute('data-readonly', 'true');
		expect(code).toHaveAttribute('data-language', 'javascript');
		expect(mockFetchSource).toHaveBeenCalledWith('shiko.metric', '0.2.0');
		expect(
			screen.getByText('Matches the reviewed fingerprint')
		).toBeInTheDocument();
		expect(screen.getByText('sha256 aaaaaaaaaaaa…aaaa')).toBeInTheDocument();
		expect(screen.getByText(/One of Shiko’s own plugins/)).toBeInTheDocument();
		expect(screen.getByText('2 lines · 33 B')).toBeInTheDocument();
	});

	it('opens on the version it is given and lists versions newest first', async () => {
		setup({ version: '0.1.0' });

		expect(
			await screen.findByLabelText('plugin.js, read-only')
		).toHaveTextContent('// metric 0.1.0');
		const select = screen.getByRole('combobox', { name: 'Version' });
		expect(select).toHaveValue('0.1.0');
		expect(
			within(select)
				.getAllByRole('option')
				.map((option) => option.textContent)
		).toEqual(['0.2.0', '0.1.0']);
	});

	it('loads another version when it is picked', async () => {
		const { user } = setup();
		await screen.findByLabelText('plugin.js, read-only');

		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Version' }),
			'0.1.0'
		);

		expect(await screen.findByText(/\/\/ metric 0\.1\.0/)).toBeInTheDocument();
		expect(mockFetchSource).toHaveBeenLastCalledWith('shiko.metric', '0.1.0');
	});

	it('switches to the manifest and copies the file on screen', async () => {
		const { user } = setup();
		await screen.findByLabelText('plugin.js, read-only');

		// user-event gives the page a clipboard it can read back.
		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(await navigator.clipboard.readText()).toBe(
			'// metric 0.2.0\ndefinePlugin({});'
		);
		expect(
			await screen.findByRole('button', { name: 'Copied' })
		).toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: 'manifest.json' }));
		const manifest = await screen.findByLabelText('manifest.json, read-only');
		expect(manifest).toHaveAttribute('data-language', 'json');
		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(await navigator.clipboard.readText()).toBe(
			'{\n  "version": "0.2.0"\n}'
		);
	});

	it('says plainly when the code is not the reviewed code, or can not be checked', async () => {
		mockFetchSource.mockResolvedValue(
			sourceOf('0.2.0', { fingerprint: 'mismatch' })
		);
		const first = render(
			<SWRConfig value={{ provider: () => new Map() }}>
				<PluginCodeSheet
					open
					onOpenChange={jest.fn()}
					pluginId='shiko.metric'
					pluginName='Metric'
				/>
			</SWRConfig>
		);
		expect(
			await screen.findByText(/Doesn’t match the reviewed fingerprint/)
		).toBeInTheDocument();
		first.unmount();

		mockFetchSource.mockResolvedValue(
			sourceOf('0.2.0', { fingerprint: 'unavailable', sha256: null })
		);
		setup();
		expect(
			await screen.findByText('This browser can’t check the fingerprint')
		).toBeInTheDocument();
		expect(screen.queryByText(/^sha256/)).not.toBeInTheDocument();
	});

	it('reports a code file that could not be loaded and tries again', async () => {
		mockFetchSource.mockRejectedValueOnce(
			new Error("Couldn't load plugin.js (404)")
		);
		const { user } = setup();

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/plugin\.js \(404\)/
		);
		await user.click(screen.getByRole('button', { name: 'Try again' }));
		expect(
			await screen.findByLabelText('plugin.js, read-only')
		).toBeInTheDocument();
	});

	it('names a community plugin’s author and says Shiko reviewed it', async () => {
		const entry: PluginCatalogEntry = {
			id: 'com.example.reading',
			author: 'Ada',
			versions: [
				{
					version: '1.0.0',
					sha256: 'b'.repeat(64),
					permissions: ['node:own'],
					notes: '',
				},
			],
		};
		setPluginLibrary({ plugins: [entry], disabled: [] });
		mockFetchSource.mockResolvedValue(
			sourceOf('1.0.0', { pluginId: 'com.example.reading' })
		);
		setup({ pluginId: 'com.example.reading', pluginName: 'Reading list' });

		expect(
			await screen.findByText(
				'Read-only. Reviewed by Shiko before it was published, by Ada.'
			)
		).toBeInTheDocument();
	});

	it('does not fetch while closed, and says so for a plugin that is not in the library', async () => {
		setup({ open: false });
		expect(mockFetchSource).not.toHaveBeenCalled();
	});

	it('says when the plugin is not in the library', async () => {
		setup({ pluginId: 'nobody.home', pluginName: 'Nobody' });
		expect(await screen.findByRole('alert')).toHaveTextContent(
			/Couldn’t find this plugin/
		);
		await waitFor(() => expect(mockFetchSource).not.toHaveBeenCalled());
	});
});
