import { DraftRequestError } from '@/lib/plugins/drafts-client';
import {
	STARTER_MANIFEST_JSON,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockStore: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStore),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockCreate = jest.fn();
jest.mock('@/lib/plugins/drafts-client', () => ({
	...jest.requireActual('@/lib/plugins/drafts-client'),
	createDraftFromText: (...args: unknown[]) => mockCreate(...args),
}));

import { PluginStartPanel } from './plugin-start-panel';

const updatePreferences = jest.fn().mockResolvedValue(undefined);

function setup(developerMode = true) {
	mockStore = {
		userProfile: { is_anonymous: false, preferences: { developerMode } },
		updatePreferences,
	};
	render(<PluginStartPanel />);
	return { user: userEvent.setup() };
}

/**
 * The switch is a hidden checkbox with a drawn track beside it. People click the track,
 * so click that (it only reaches the checkbox through its label), not the checkbox.
 */
function drawnSwitch(): HTMLElement {
	const track = screen
		.getByRole('switch', { name: 'Developer mode' })
		.closest('label')
		?.querySelector('div');
	if (!track) throw new Error('The switch has no label around its track');
	return track as HTMLElement;
}

// jsdom's File has no text(); browsers do.
beforeAll(() => {
	if (!File.prototype.text) {
		File.prototype.text = function text(this: File) {
			return new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.readAsText(this);
			});
		};
	}
});

beforeEach(() => {
	jest.clearAllMocks();
	mockCreate.mockResolvedValue({ id: 'draft-9' });
});

describe('PluginStartPanel', () => {
	it('offers the four templates with what each can reach', () => {
		setup();
		const panel = document.body;
		for (const name of [
			'Blank',
			'Counter',
			'Branch progress',
			'GitHub issue',
		]) {
			expect(within(panel).getByRole('heading', { name })).toBeInTheDocument();
		}
		expect(within(panel).getByText('Reads its branch')).toBeInTheDocument();
		expect(
			within(panel).getByText('Sends to api.github.com')
		).toBeInTheDocument();
	});

	it('starts a draft from a template and opens it in the playground', async () => {
		const { user } = setup();
		const counter = screen
			.getByRole('heading', { name: 'Counter' })
			.closest('article') as HTMLElement;
		await user.click(within(counter).getByRole('button', { name: 'Start' }));

		await waitFor(() =>
			expect(mockPush).toHaveBeenCalledWith(
				'/dashboard/plugins/playground/draft-9'
			)
		);
		expect(mockCreate).toHaveBeenCalledWith(
			STARTER_MANIFEST_JSON,
			STARTER_PLUGIN_JS
		);
	});

	it('shows the server’s reason when the draft can’t be made', async () => {
		mockCreate.mockRejectedValue(
			new DraftRequestError(
				'You can keep up to 20 drafts. Delete one to start another.',
				409
			)
		);
		const { user } = setup();
		const blank = screen
			.getByRole('heading', { name: 'Blank' })
			.closest('article') as HTMLElement;
		await user.click(within(blank).getByRole('button', { name: 'Start' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/up to 20 drafts/
		);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('explains Developer mode and offers its switch while it is off, with Start held back', async () => {
		const { user } = setup(false);
		expect(
			screen.getByText(/Writing plugins needs Developer mode/)
		).toBeInTheDocument();
		for (const button of screen.getAllByRole('button', { name: 'Start' })) {
			expect(button).toBeDisabled();
		}

		await user.click(drawnSwitch());
		expect(updatePreferences).toHaveBeenCalledWith({ developerMode: true });
	});

	it('imports a draft from the two files the guide describes', async () => {
		const { user } = setup();
		const manifest = new File([STARTER_MANIFEST_JSON], 'manifest.json', {
			type: 'application/json',
		});
		const code = new File([STARTER_PLUGIN_JS], 'plugin.js', {
			type: 'text/javascript',
		});

		await user.upload(
			screen.getByLabelText(/Import manifest\.json and plugin\.js/),
			[code, manifest]
		);

		await waitFor(() =>
			expect(mockCreate).toHaveBeenCalledWith(
				STARTER_MANIFEST_JSON,
				STARTER_PLUGIN_JS
			)
		);
		expect(mockPush).toHaveBeenCalledWith(
			'/dashboard/plugins/playground/draft-9'
		);
	});

	it('asks for both files when one is missing', async () => {
		const { user } = setup();
		const manifest = new File([STARTER_MANIFEST_JSON], 'manifest.json', {
			type: 'application/json',
		});
		await user.upload(
			screen.getByLabelText(/Import manifest\.json and plugin\.js/),
			manifest
		);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/both manifest\.json and a \.js file/
		);
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('points to the localhost way of building further down the page', () => {
		setup();
		expect(
			screen.getByRole('link', { name: /my own editor/i })
		).toHaveAttribute('href', '#own-editor');
	});

	it('shows a status line with the switch once Developer mode is on, and no warning', async () => {
		const { user } = setup(true);
		expect(screen.getByRole('status')).toHaveTextContent(
			'Developer mode is on.'
		);
		expect(
			screen.queryByText(/Writing plugins needs Developer mode/)
		).not.toBeInTheDocument();

		await user.click(drawnSwitch());
		expect(updatePreferences).toHaveBeenCalledWith({ developerMode: false });
	});
});
