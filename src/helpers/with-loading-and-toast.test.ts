import { toast } from 'sonner';
import withLoadingAndToast from './with-loading-and-toast';

const mockSetLoadingStates = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: { getState: () => ({ setLoadingStates: mockSetLoadingStates }) },
}));

jest.mock('sonner', () => ({
	toast: {
		loading: jest.fn(() => 'toast-1'),
		success: jest.fn(),
		error: jest.fn(),
	},
}));

describe('withLoadingAndToast', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows a loading toast, runs the action and reports success', async () => {
		const action = jest.fn().mockResolvedValue('result');
		const wrapped = withLoadingAndToast(action, 'isAddingContent', {
			initialMessage: 'Working...',
			successMessage: 'Worked',
		});

		await expect(wrapped('a')).resolves.toBe('result');

		expect(toast.loading).toHaveBeenCalledWith('Working...');
		expect(action).toHaveBeenCalledWith('a', 'toast-1');
		expect(toast.success).toHaveBeenCalledWith('Worked', { id: 'toast-1' });
		expect(mockSetLoadingStates).toHaveBeenLastCalledWith({
			isAddingContent: false,
		});
	});

	it('skips the action with no toast or loading state when skipWhen is true', async () => {
		const action = jest.fn().mockResolvedValue('result');
		const skipWhen = jest.fn().mockReturnValue(true);
		const wrapped = withLoadingAndToast(action, 'isAddingContent', { skipWhen });

		await expect(wrapped('a', 2)).resolves.toBeUndefined();

		expect(skipWhen).toHaveBeenCalledWith('a', 2);
		expect(action).not.toHaveBeenCalled();
		expect(toast.loading).not.toHaveBeenCalled();
		expect(toast.success).not.toHaveBeenCalled();
		expect(mockSetLoadingStates).not.toHaveBeenCalled();
	});

	it('runs the action when skipWhen is false', async () => {
		const action = jest.fn().mockResolvedValue('result');
		const wrapped = withLoadingAndToast(action, 'isAddingContent', {
			skipWhen: () => false,
		});

		await expect(wrapped('a')).resolves.toBe('result');
		expect(action).toHaveBeenCalledTimes(1);
	});
});
