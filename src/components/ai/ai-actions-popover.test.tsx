import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import { BUILTIN_AI_ACTIONS } from '@/lib/extensions/builtin-ai-actions';
import useAppStore from '@/store/mind-map-store';
import type { Contribution } from '@/types/extensions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { toast } from 'sonner';
import { AIActionsPopover } from './ai-actions-popover';

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

jest.mock('sonner', () => ({
	toast: {
		error: jest.fn(),
	},
}));

type MockStoreState = {
	contributions: Contribution[];
	mapId: string;
	mindMap: { id: string };
	generateSuggestions: jest.Mock;
	generateConnectionSuggestions: jest.Mock;
	generateMergeSuggestions: jest.Mock;
	generateCounterpointsForNode: jest.Mock;
	isStreaming: boolean;
	setPopoverOpen: jest.Mock;
};

const mockUseAppStore = useAppStore as unknown as jest.Mock;
const mockUseSubscriptionLimits = useSubscriptionLimits as unknown as jest.Mock;
const mockUsePermissions = usePermissions as unknown as jest.Mock;

/** Wires the selector-style store mock plus getState (used by contribution context). */
const useMockStore = (state: MockStoreState) => {
	mockUseAppStore.mockImplementation((selector) => selector(state));
	(mockUseAppStore as unknown as { getState: () => MockStoreState }).getState =
		() => state;
};

const createMockStoreState = (
	overrides: Partial<MockStoreState> = {}
): MockStoreState => ({
	contributions: BUILTIN_AI_ACTIONS,
	mapId: 'map-1',
	mindMap: { id: 'map-1' },
	generateSuggestions: jest.fn(),
	generateConnectionSuggestions: jest.fn(),
	generateMergeSuggestions: jest.fn(),
	generateCounterpointsForNode: jest.fn(),
	isStreaming: false,
	setPopoverOpen: jest.fn(),
	...overrides,
});

function ClosableHarness({ onClose }: { onClose: () => void }) {
	const [open, setOpen] = useState(true);

	return open ? (
		<AIActionsPopover
			scope='map'
			onClose={() => {
				onClose();
				setOpen(false);
			}}
		/>
	) : null;
}

describe('AIActionsPopover', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseSubscriptionLimits.mockReturnValue({
			isAtLimit: jest.fn(() => false),
		});
		mockUsePermissions.mockReturnValue({ canEdit: true });
	});

	it('executes map action and closes after click', async () => {
		const user = userEvent.setup();
		const onClose = jest.fn();
		const mockState = createMockStoreState();

		useMockStore(mockState);

		render(<ClosableHarness onClose={onClose} />);

		const findConnectionsButton = screen.getByRole('button', {
			name: /find connections/i,
		});
		await user.click(findConnectionsButton);

		expect(mockState.generateConnectionSuggestions).toHaveBeenCalledWith(
			undefined
		);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByRole('button', { name: /find connections/i })
		).not.toBeInTheDocument();
	});

	it('renders whole-map expansion and triggers suggestions without a source node', async () => {
		const user = userEvent.setup();
		const mockState = createMockStoreState();

		useMockStore(mockState);

		render(<AIActionsPopover scope='map' onClose={jest.fn()} />);

		const expandMapButton = screen.getByRole('button', {
			name: /expand map/i,
		});

		await user.click(expandMapButton);

		expect(mockState.generateSuggestions).toHaveBeenCalledWith({
			trigger: 'magic-wand',
		});
	});

	it('disables map actions while streaming', async () => {
		const user = userEvent.setup();
		const mockState = createMockStoreState({ isStreaming: true });

		useMockStore(mockState);

		render(<AIActionsPopover scope='map' onClose={jest.fn()} />);

		const findConnectionsButton = screen.getByRole('button', {
			name: /find connections/i,
		});
		const findSimilarButton = screen.getByRole('button', {
			name: /find similar/i,
		});
		const expandMapButton = screen.getByRole('button', {
			name: /expand map/i,
		});

		expect(findConnectionsButton).toBeDisabled();
		expect(findSimilarButton).toBeDisabled();
		expect(expandMapButton).toBeDisabled();

		await user.click(findConnectionsButton);
		await user.click(findSimilarButton);
		await user.click(expandMapButton);

		expect(mockState.generateConnectionSuggestions).not.toHaveBeenCalled();
		expect(mockState.generateMergeSuggestions).not.toHaveBeenCalled();
		expect(mockState.generateSuggestions).not.toHaveBeenCalled();
	});

	it('shows node actions and passes the source node id', async () => {
		const user = userEvent.setup();
		const mockState = createMockStoreState();
		useMockStore(mockState);

		render(
			<AIActionsPopover
				scope='node'
				sourceNodeId='node-7'
				onClose={jest.fn()}
			/>
		);

		expect(
			screen.queryByRole('button', { name: /expand map/i })
		).not.toBeInTheDocument();
		await user.click(
			screen.getByRole('button', { name: /generate counterpoints/i })
		);
		await user.click(screen.getByRole('button', { name: /find similar/i }));

		expect(mockState.generateCounterpointsForNode).toHaveBeenCalledWith(
			'node-7'
		);
		expect(mockState.generateMergeSuggestions).toHaveBeenCalledWith('node-7');
	});

	it('blocks actions and offers an upgrade when the AI quota is used up', async () => {
		const user = userEvent.setup();
		const onClose = jest.fn();
		const mockState = createMockStoreState();
		useMockStore(mockState);
		mockUseSubscriptionLimits.mockReturnValue({
			isAtLimit: jest.fn(() => true),
		});

		render(<AIActionsPopover scope='map' onClose={onClose} />);
		await user.click(screen.getByRole('button', { name: /expand map/i }));

		expect(mockState.generateSuggestions).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			'AI feature limit reached',
			expect.any(Object)
		);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('hides actions from users without edit access', () => {
		useMockStore(createMockStoreState());
		mockUsePermissions.mockReturnValue({ canEdit: false });

		render(<AIActionsPopover scope='map' onClose={jest.fn()} />);

		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});
});
