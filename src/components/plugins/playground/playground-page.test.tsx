import { DraftRequestError } from '@/lib/plugins/drafts-client';
import {
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import { NETWORK_EXAMPLE_MANIFEST } from '@/lib/plugins/network-example';
import {
	STARTER_MANIFEST,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/dynamic', () => () => {
	const React = require('react');
	return function EditorStub(props: {
		label: string;
		value: string;
		onChange: (value: string) => void;
	}) {
		return React.createElement('textarea', {
			'aria-label': props.label,
			value: props.value,
			onChange: (event: { target: { value: string } }) =>
				props.onChange(event.target.value),
		});
	};
});

let mockStore: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStore),
}));

const mockDownload = jest.fn();
jest.mock('@/utils/download-text-file', () => ({
	downloadTextFile: (...args: unknown[]) => mockDownload(...args),
}));

const mockUseDraft = jest.fn();
jest.mock('./use-draft', () => ({
	useDraft: (...args: unknown[]) => mockUseDraft(...args),
}));

const mockUseDraftProgram = jest.fn();
const mockUseDraftChecks = jest.fn();
const mockUsePlaygroundNode = jest.fn();
jest.mock('./use-playground', () => ({
	usePlaygroundHost: () => ({ fake: 'host' }),
	useDraftProgram: (...args: unknown[]) => mockUseDraftProgram(...args),
	useDraftChecks: (...args: unknown[]) => mockUseDraftChecks(...args),
	usePlaygroundNode: (...args: unknown[]) => mockUsePlaygroundNode(...args),
}));

jest.mock('@/lib/plugins/network-client', () => ({
	requestPluginJson: jest.fn(),
}));

const mockToastError = jest.fn();
jest.mock('sonner', () => ({
	toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

jest.mock('@/components/plugins/plugin-submit-sheet', () => ({
	PluginSubmitSheet: ({ manifestUrl }: { manifestUrl: string }) => (
		<p>Submit sheet for {manifestUrl}</p>
	),
}));

jest.mock('./try-on-map-popover', () => ({
	TryOnMapPopover: ({
		draftId,
		saveFirst,
	}: {
		draftId: string;
		saveFirst: () => Promise<boolean>;
	}) => (
		<button onClick={() => void saveFirst()} type='button'>
			Try on a map ({draftId})
		</button>
	),
}));

import { PlaygroundPage } from './playground-page';

const counter = pluginManifestSchema.parse({
	...STARTER_MANIFEST,
	id: 'dev.counter-9b2c41a7',
});
const issue = pluginManifestSchema.parse({
	...NETWORK_EXAMPLE_MANIFEST,
	id: 'dev.issue-9b2c41a7',
});

function setup({
	manifest = counter,
	draft = {},
	node = {},
	developerMode = true,
}: {
	manifest?: PluginManifest;
	draft?: Record<string, unknown>;
	node?: Record<string, unknown>;
	developerMode?: boolean;
} = {}) {
	mockStore = {
		userProfile: { is_anonymous: false, preferences: { developerMode } },
		updatePreferences: jest.fn(),
	};
	const actions = {
		setCode: jest.fn(),
		setManifestText: jest.fn(),
		setSample: jest.fn(),
		setCheckSummary: jest.fn(),
		loadNewer: jest.fn(),
		keepMine: jest.fn(),
		flush: jest.fn().mockResolvedValue(true),
	};
	mockUseDraft.mockReturnValue({
		status: 'ready',
		error: null,
		draft: { id: 'draft-1', pluginId: manifest.id, name: manifest.name },
		manifestText: JSON.stringify(manifest, null, 2),
		code: STARTER_PLUGIN_JS,
		sample: {},
		checkSummary: null,
		saveState: 'saved',
		conflict: null,
		...actions,
		...draft,
	});
	mockUseDraftProgram.mockReturnValue({ program: { ok: true, manifest } });
	mockUseDraftChecks.mockReturnValue({
		checks: [{ label: 'Manifest is valid', ok: true }],
		summary: { passed: 1, total: 1 },
	});
	mockUsePlaygroundNode.mockReturnValue({
		view: { tree: { type: 'text', value: 'Coffees today' }, summary: '' },
		fieldErrors: {},
		error: null,
		last: null,
		refreshing: false,
		canRefresh: false,
		runAction: jest.fn(),
		refresh: jest.fn(),
		...node,
	});
	render(<PlaygroundPage draftId='draft-1' />);
	return { actions, user: userEvent.setup() };
}

beforeEach(() => jest.clearAllMocks());

describe('PlaygroundPage', () => {
	it('shows the draft’s name, its id from Shiko, its version and that it is a draft', () => {
		setup();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
			'Counter'
		);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
			'Draft'
		);
		expect(screen.getByText('dev.counter-9b2c41a7')).toBeInTheDocument();
		expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /My plugins/ })).toHaveAttribute(
			'href',
			'/dashboard/plugins/mine'
		);
	});

	it('puts the draft, the checks and the preview on the page', () => {
		setup();
		expect(screen.getByLabelText('plugin.js')).toHaveValue(STARTER_PLUGIN_JS);
		expect(screen.getByRole('region', { name: 'Checks' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument();
		expect(
			screen.getByRole('region', { name: 'Sample data' })
		).toBeInTheDocument();
	});

	it('shows one file at a time and keeps the other editor mounted', async () => {
		const { user } = setup();
		expect(screen.getByLabelText('plugin.js').parentElement).not.toHaveClass(
			'hidden'
		);
		expect(screen.getByLabelText('manifest.json').parentElement).toHaveClass(
			'hidden'
		);

		await user.click(screen.getByRole('tab', { name: 'manifest.json' }));
		expect(
			screen.getByLabelText('manifest.json').parentElement
		).not.toHaveClass('hidden');
		expect(screen.getByLabelText('plugin.js').parentElement).toHaveClass(
			'hidden'
		);
	});

	it('passes typing in an editor to the draft', async () => {
		const { actions, user } = setup();
		await user.type(screen.getByLabelText('plugin.js'), '!');
		expect(actions.setCode).toHaveBeenCalledWith(`${STARTER_PLUGIN_JS}!`);
	});

	it('says whether the draft is saved', () => {
		setup({ draft: { saveState: 'unsaved' } });
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
	});

	it('offers the newer draft or keeping yours when another tab saved first', async () => {
		const { actions, user } = setup({ draft: { conflict: { revision: 5 } } });
		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent(/changed somewhere else/);

		await user.click(
			within(alert).getByRole('button', { name: 'Load the newer version' })
		);
		expect(actions.loadNewer).toHaveBeenCalled();
		await user.click(within(alert).getByRole('button', { name: 'Keep mine' }));
		expect(actions.keepMine).toHaveBeenCalled();
	});

	it('exports both files as they are in the editor', async () => {
		const { user } = setup();
		await user.click(screen.getByRole('button', { name: /Export files/ }));
		expect(mockDownload).toHaveBeenCalledWith(
			'manifest.json',
			JSON.stringify(counter, null, 2),
			'application/json'
		);
		expect(mockDownload).toHaveBeenCalledWith(
			'plugin.js',
			STARTER_PLUGIN_JS,
			'text/javascript'
		);
	});

	it('saves sample data edits on the draft, per kind', async () => {
		const { actions, user } = setup();
		const label = screen.getByLabelText(/^Label/);
		await user.type(label, 'x');
		const [saved] = actions.setSample.mock.calls.at(-1) as [
			{ kinds: Record<string, unknown> },
		];
		expect(Object.keys(saved.kinds)).toEqual(['counter']);
	});

	it('shows the network panel only for a plugin that reaches a site', () => {
		setup();
		expect(
			screen.queryByRole('region', { name: 'Network' })
		).not.toBeInTheDocument();
	});

	it('shows the network panel with the declared site for a network plugin', () => {
		setup({ manifest: issue, node: { canRefresh: true } });
		const network = screen.getByRole('region', { name: 'Network' });
		expect(within(network).getByText('api.github.com')).toBeInTheDocument();
		expect(
			within(network).getByRole('switch', { name: 'Send real requests' })
		).not.toBeChecked();
	});

	it('asks for Developer mode instead of showing the playground when it is off', () => {
		setup({ developerMode: false });
		expect(
			screen.getByRole('heading', { name: /needs Developer mode/ })
		).toBeInTheDocument();
		expect(screen.queryByLabelText('plugin.js')).not.toBeInTheDocument();
		expect(mockUseDraft).not.toHaveBeenCalled();
	});

	it('explains a draft that does not exist', () => {
		setup({
			draft: {
				status: 'error',
				error: new DraftRequestError('Draft not found.', 404),
				draft: null,
			},
		});
		expect(
			screen.getByRole('heading', { name: /doesn’t exist/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: 'Back to My plugins' })
		).toBeInTheDocument();
	});

	it('shows the server’s message for any other failure to open it', () => {
		setup({
			draft: {
				status: 'error',
				error: new DraftRequestError('Something broke', 500),
				draft: null,
			},
		});
		expect(screen.getByText('Something broke')).toBeInTheDocument();
	});

	describe('trying and submitting', () => {
		it('hands the draft to Try on a map, with a way to save it first', async () => {
			const { actions, user } = setup();
			await user.click(
				screen.getByRole('button', { name: /Try on a map \(draft-1\)/ })
			);
			expect(actions.flush).toHaveBeenCalled();
		});

		it('saves, then opens the submit sheet on the saved draft’s files', async () => {
			const { actions, user } = setup();
			await user.click(
				screen.getByRole('button', { name: 'Submit for review' })
			);

			expect(actions.flush).toHaveBeenCalled();
			expect(
				await screen.findByText(
					`Submit sheet for ${window.location.origin}/api/plugins/drafts/draft-1/files/manifest.json`
				)
			).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toHaveTextContent('Submit Counter');
		});

		it('does not open the sheet, and says why, when the draft could not be saved', async () => {
			const { actions, user } = setup();
			actions.flush.mockResolvedValue(false);
			await user.click(
				screen.getByRole('button', { name: 'Submit for review' })
			);

			expect(mockToastError).toHaveBeenCalledWith(
				expect.stringMatching(/Couldn’t save the draft first/)
			);
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});
});
