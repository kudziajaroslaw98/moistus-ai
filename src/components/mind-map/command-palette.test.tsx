import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import { BUILTIN_AI_ACTIONS } from '@/lib/extensions/builtin-ai-actions';
import { BUILTIN_COMMANDS } from '@/lib/extensions/builtin-commands';
import useAppStore from '@/store/mind-map-store';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './command-palette';

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: jest.fn(),
}));

jest.mock('@/hooks/subscription/use-feature-gate', () => ({
	useSubscriptionLimits: jest.fn(),
}));

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const mockUseAppStore = useAppStore as unknown as jest.Mock;

function createState(overrides: Record<string, unknown> = {}) {
	const state = {
		popoverOpen: { commandPalette: true },
		selectedNodes: [] as { id: string }[],
		contributions: [...BUILTIN_AI_ACTIONS, ...BUILTIN_COMMANDS],
		mapId: 'map-1',
		mindMap: { id: 'map-1', user_id: 'owner-1' },
		currentUser: { id: 'owner-1' },
		isStreaming: false,
		setPopoverOpen: jest.fn(),
		openCanvasSearch: jest.fn(),
		generateSuggestions: jest.fn(),
		generateMergeSuggestions: jest.fn(),
		generateConnectionSuggestions: jest.fn(),
		runRecipe: jest.fn(),
		...overrides,
	};
	mockUseAppStore.mockImplementation((selector) => selector(state));
	(mockUseAppStore as unknown as { getState: () => typeof state }).getState =
		() => state;
	return state;
}

const optionNames = () =>
	screen.getAllByRole('option').map((option) => option.textContent ?? '');

describe('CommandPalette', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(usePermissions as jest.Mock).mockReturnValue({ canEdit: true });
		(useSubscriptionLimits as jest.Mock).mockReturnValue({
			isAtLimit: () => false,
		});
	});

	it('lists map-wide AI actions and commands when no node is selected', () => {
		createState();
		render(<CommandPalette />);

		const names = optionNames().join(' | ');
		expect(names).toContain('Expand map');
		expect(names).toContain('Search canvas');
		expect(names).toContain('Open history');
		expect(names).toContain('Map settings');
		expect(names).not.toContain('Expand ideas');
	});

	it('offers node actions for a single selected node', () => {
		createState({ selectedNodes: [{ id: 'node-1' }] });
		render(<CommandPalette />);

		expect(optionNames().join(' | ')).toContain('Expand ideas');
	});

	it('filters as you type and runs the active entry with Enter', async () => {
		const user = userEvent.setup();
		const state = createState();
		render(<CommandPalette />);

		await user.type(screen.getByRole('combobox'), 'similar');
		expect(screen.getAllByRole('option')).toHaveLength(1);

		await user.keyboard('{Enter}');

		expect(state.generateMergeSuggestions).toHaveBeenCalledWith(undefined);
		expect(state.setPopoverOpen).toHaveBeenCalledWith({
			commandPalette: false,
		});
	});

	it('moves the active entry with the arrow keys', async () => {
		const user = userEvent.setup();
		const state = createState();
		render(<CommandPalette />);

		await user.type(screen.getByRole('combobox'), 'search');
		await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');

		expect(state.openCanvasSearch).toHaveBeenCalledTimes(1);
	});

	it('hides edit-only entries from viewers', () => {
		(usePermissions as jest.Mock).mockReturnValue({ canEdit: false });
		createState({ currentUser: { id: 'viewer-1' } });
		render(<CommandPalette />);

		// Viewers can still see which plugins the map uses.
		expect(optionNames()).toEqual([
			expect.stringContaining('Search canvas'),
			'PluginsSee the plugins this map uses',
		]);
	});

	it('shows an empty state when nothing matches', async () => {
		const user = userEvent.setup();
		createState();
		render(<CommandPalette />);

		await user.type(screen.getByRole('combobox'), 'zzz');

		expect(screen.getByText('No matching commands')).toBeInTheDocument();
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		const state = createState();
		render(<CommandPalette />);

		await user.keyboard('{Escape}');

		expect(state.setPopoverOpen).toHaveBeenCalledWith({
			commandPalette: false,
		});
	});
});
