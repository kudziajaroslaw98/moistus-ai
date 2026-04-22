import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AIActionsPopover } from './ai-actions-popover';

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn(),
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
	generateSuggestions: jest.Mock;
	generateConnectionSuggestions: jest.Mock;
	generateMergeSuggestions: jest.Mock;
	generateCounterpointsForNode: jest.Mock;
	isStreaming: boolean;
	setPopoverOpen: jest.Mock;
};

const mockUseAppStore = useAppStore as unknown as jest.Mock;
const mockUseSubscriptionLimits = useSubscriptionLimits as unknown as jest.Mock;

const createMockStoreState = (
	overrides: Partial<MockStoreState> = {}
): MockStoreState => ({
	generateSuggestions: jest.fn(),
	generateConnectionSuggestions: jest.fn(),
	generateMergeSuggestions: jest.fn(),
	generateCounterpointsForNode: jest.fn(),
	isStreaming: false,
	setPopoverOpen: jest.fn(),
	...overrides,
});

function ClosableHarness({
	onClose,
}: {
	onClose: () => void;
}) {
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
	});

	it('executes map action and closes after click', async () => {
		const user = userEvent.setup();
		const onClose = jest.fn();
		const mockState = createMockStoreState();

		mockUseAppStore.mockImplementation((selector) => selector(mockState));

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

		mockUseAppStore.mockImplementation((selector) => selector(mockState));

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

		mockUseAppStore.mockImplementation((selector) => selector(mockState));

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
});
