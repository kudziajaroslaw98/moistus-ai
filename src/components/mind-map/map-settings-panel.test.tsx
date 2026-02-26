import useAppStore from '@/store/mind-map-store';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TextareaHTMLAttributes } from 'react';
import { MapSettingsPanel } from './map-settings-panel';

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

type StoreState = {
	mindMap: {
		id: string;
		title: string;
		description: string | null;
		tags: string[];
		thumbnailUrl: string | null;
	};
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
		expect(screen.getByText('Editor Preferences')).toBeInTheDocument();
		expect(screen.getByText('Danger Zone')).toBeInTheDocument();
		expect(screen.queryByText('Mark as template')).not.toBeInTheDocument();
	});

	it('disables save and shows validation feedback for empty title and invalid thumbnail URL', async () => {
		const user = userEvent.setup();

		render(<MapSettingsPanel isOpen onClose={jest.fn()} />);

		const saveButton = screen.getByRole('button', { name: 'Save Changes' });
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

		await user.click(screen.getByRole('button', { name: 'Save Changes' }));

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

		await user.click(screen.getByRole('button', { name: 'Discard changes' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
