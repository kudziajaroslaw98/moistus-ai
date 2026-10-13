import useAppStore from '@/store/mind-map-store';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TextareaHTMLAttributes } from 'react';
import { MapSettingsPanel } from './map-settings-panel';

// Tested on its own (plugins-settings-section.test.tsx).
jest.mock('@/components/plugins/plugins-settings-link', () => ({
	PluginsSettingsLink: () => null,
}));
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('@/components/settings/node-type-selector', () => ({
	NodeTypeSelector: ({
		value,
		onChange,
		disabled,
	}: {
		value: string;
		onChange: (value: string) => void;
		disabled?: boolean;
	}) => (
		<select
			aria-label='Default Node Type'
			disabled={disabled}
			onChange={(e) => onChange(e.target.value)}
			value={value}
		>
			<option value='textNode'>Text</option>
			<option value='taskNode'>Task</option>
		</select>
	),
}));

jest.mock('@/components/mind-map/delete-map-confirmation-dialog', () => ({
	DeleteMapConfirmationDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid='delete-dialog'>Delete Dialog</div> : null,
}));

jest.mock('@/components/mind-map/discard-settings-changes-dialog', () => ({
	DiscardSettingsChangesDialog: ({
		open,
		onContinueEditing,
		onDiscardChanges,
	}: {
		open: boolean;
		onContinueEditing: () => void;
		onDiscardChanges: () => void;
	}) =>
		open ? (
			<div data-testid='discard-dialog'>
				<button onClick={onContinueEditing} type='button'>
					Continue editing
				</button>
				<button onClick={onDiscardChanges} type='button'>
					Discard changes
				</button>
			</div>
		) : null,
}));

jest.mock('@/components/ui/textarea', () => ({
	Textarea: ({
		error: _error,
		...props
	}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) => (
		<textarea {...props} />
	),
}));

jest.mock('@/components/mind-map/publish-template-dialog', () => ({
	PublishTemplateDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid='publish-dialog'>Publish Dialog</div> : null,
}));

type StoreState = {
	mindMap: {
		id: string;
		title: string;
		description: string | null;
		tags: string[];
		thumbnailUrl: string | null;
		is_template?: boolean;
		template_category?: string | null;
	};
	permissions?: { can_edit?: boolean };
	updateMindMap: jest.Mock;
	deleteMindMap: jest.Mock;
	loadingStates: {
		isUpdatingMapSettings: boolean;
		isDeletingMap: boolean;
	};
	nodes: unknown[];
	edges: unknown[];
	updatePreferences: jest.Mock;
	getDefaultNodeType: jest.Mock;
	userProfile: {
		role?: string | null;
		is_anonymous?: boolean;
		preferences?: { developerMode?: boolean };
	};
};

const mockUseAppStore = useAppStore as unknown as jest.Mock;

const createMockState = (): StoreState => ({
	mindMap: {
		id: 'map-1',
		title: 'Moistus MVP',
		description: 'Initial description',
		tags: ['MVP', 'App'],
		thumbnailUrl: null,
	},
	updateMindMap: jest.fn().mockResolvedValue(undefined),
	deleteMindMap: jest.fn().mockResolvedValue(undefined),
	loadingStates: {
		isUpdatingMapSettings: false,
		isDeletingMap: false,
	},
	nodes: [],
	edges: [],
	updatePreferences: jest.fn(),
	getDefaultNodeType: jest.fn(() => 'textNode'),
	userProfile: { is_anonymous: false, preferences: {} },
});

describe('MapSettingsPanel', () => {
	let mockState: StoreState;

	beforeEach(() => {
		jest.clearAllMocks();
		mockState = createMockState();
		mockUseAppStore.mockImplementation(
			(selector: (state: StoreState) => unknown) => selector(mockState)
		);
	});

	it('renders required sections and does not render Template section', () => {
		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		expect(screen.getByText('General')).toBeInTheDocument();
		expect(screen.getByText('Organization')).toBeInTheDocument();
		expect(screen.getByText('Appearance')).toBeInTheDocument();
		expect(screen.getByText('Editor preferences')).toBeInTheDocument();
		expect(screen.getByText('Danger zone')).toBeInTheDocument();
		expect(screen.queryByText('Mark as template')).not.toBeInTheDocument();
	});

	it('turns Developer mode on for the account right away', async () => {
		const user = userEvent.setup();

		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);
		const toggle = screen.getByRole('switch', { name: 'Developer mode' });
		expect(toggle).not.toBeChecked();
		await user.click(toggle);

		expect(mockState.updatePreferences).toHaveBeenCalledWith({ developerMode: true });
	});

	it('disables save and shows validation feedback for empty title and invalid thumbnail URL', async () => {
		const user = userEvent.setup();

		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		const saveButton = screen.getByRole('button', { name: 'Save changes' });
		const titleInput = screen.getByLabelText(/title/i);
		const thumbnailInput = screen.getByLabelText(/thumbnail url/i);

		await user.clear(titleInput);
		await user.tab();

		expect(screen.getByText('Title is required')).toBeInTheDocument();
		expect(saveButton).toBeDisabled();

		await user.type(titleInput, 'Updated title');
		await user.clear(thumbnailInput);
		await user.type(thumbnailInput, 'notaurl');
		await user.tab();

		expect(
			screen.getByText('Please enter a valid URL (including https://)')
		).toBeInTheDocument();
		expect(saveButton).toBeDisabled();
	});

	it('saves only changed persistable fields with sanitized values', async () => {
		const user = userEvent.setup();

		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		const titleInput = screen.getByLabelText(/title/i);
		const descriptionInput = screen.getByLabelText(/description/i);
		const thumbnailInput = screen.getByLabelText(/thumbnail url/i);

		await user.clear(titleInput);
		await user.type(titleInput, '  New Map Title  ');

		await user.clear(descriptionInput);
		await user.type(descriptionInput, '  Updated map description  ');

		await user.type(thumbnailInput, '  https://example.com/thumb.jpg  ');
		await user.tab();

		await user.click(screen.getByRole('button', { name: 'Save changes' }));

		await waitFor(() => {
			expect(mockState.updateMindMap).toHaveBeenCalledTimes(1);
		});

		expect(mockState.updateMindMap).toHaveBeenCalledWith('map-1', {
			title: 'New Map Title',
			description: 'Updated map description',
			thumbnailUrl: 'https://example.com/thumb.jpg',
		});
	});

	it('shows discard dialog on close when there are unsaved changes and closes after discard', async () => {
		const user = userEvent.setup();
		const onClose = jest.fn();

		render(<MapSettingsPanel isOpen onClose={onClose} />);

		const titleInput = screen.getByLabelText(/title/i);
		await user.type(titleInput, ' v2');

		await user.click(screen.getByRole('button', { name: 'Close' }));

		expect(screen.getByTestId('discard-dialog')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();

		// The mocked dialog renders inside the test container, which a modal panel hides.
		await user.click(
			screen.getByRole('button', { name: 'Discard changes', hidden: true })
		);

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

describe('MapSettingsPanel template admin', () => {
	let mockState: StoreState;
	const originalFetch = global.fetch;

	beforeEach(() => {
		jest.clearAllMocks();
		mockState = {
			...createMockState(),
			mindMap: {
				id: 'template-1',
				title: 'SWOT Analysis',
				description: 'Template',
				tags: [],
				thumbnailUrl: null,
				is_template: true,
				template_category: 'business',
			},
			permissions: { can_edit: true },
		};
		mockUseAppStore.mockImplementation(
			(selector: (state: StoreState) => unknown) => selector(mockState)
		);
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					template: {
						category: 'business',
						icon: 'Briefcase',
						previewColors: ['#111111', '#222222', '#333333'],
					},
				},
			}),
		}) as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('shows template section for admins and saves icon changes', async () => {
		const user = userEvent.setup();
		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		expect(screen.getByRole('heading', { name: 'Template' })).toBeInTheDocument();
		expect(global.fetch).toHaveBeenCalledWith('/api/templates/template-1');
		expect(screen.getByText('Delete template')).toBeInTheDocument();

		const lightbulb = await screen.findByRole('radio', { name: 'Lightbulb' });
		expect(screen.getByRole('radio', { name: 'Briefcase' })).toHaveAttribute(
			'aria-checked',
			'true'
		);

		await user.click(lightbulb);
		await user.click(screen.getByRole('button', { name: 'Save changes' }));

		await waitFor(() => {
			expect(mockState.updateMindMap).toHaveBeenCalledWith('template-1', {
				template_icon: 'Lightbulb',
			});
		});
	});

	it('hides template section when the viewer cannot edit the template', () => {
		mockState.permissions = { can_edit: false };
		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		expect(screen.queryByRole('heading', { name: 'Template' })).not.toBeInTheDocument();
		expect(global.fetch).not.toHaveBeenCalled();
	});
});

describe('MapSettingsPanel publish as template', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('offers publishing to admins on their own maps', async () => {
		const user = userEvent.setup();
		const base = createMockState();
		const state = { ...base, userProfile: { ...base.userProfile, role: 'admin' } };
		mockUseAppStore.mockImplementation(
			(selector: (s: StoreState) => unknown) => selector(state)
		);

		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);
		await user.click(screen.getByRole('button', { name: 'Publish as template' }));

		expect(screen.getByTestId('publish-dialog')).toBeInTheDocument();
	});

	it('does not offer publishing to non-admins', () => {
		const base = createMockState();
		const state = { ...base, userProfile: { ...base.userProfile, role: 'user' } };
		mockUseAppStore.mockImplementation(
			(selector: (s: StoreState) => unknown) => selector(state)
		);

		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		expect(
			screen.queryByRole('button', { name: 'Publish as template' })
		).not.toBeInTheDocument();
	});
});
