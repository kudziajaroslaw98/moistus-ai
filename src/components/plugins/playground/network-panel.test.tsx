import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkPanel } from './network-panel';

const props = {
	hosts: ['api.github.com'],
	mock: '{"title":"Hi"}',
	onMockChange: jest.fn(),
	onRealChange: jest.fn(),
	real: false,
};

beforeEach(() => jest.clearAllMocks());

describe('NetworkPanel', () => {
	it('names the site and says nothing leaves the browser while the answer is typed', () => {
		render(<NetworkPanel {...props} />);
		expect(screen.getByText('api.github.com')).toBeInTheDocument();
		expect(screen.getByLabelText('Answer used by Refresh')).toHaveValue(
			'{"title":"Hi"}'
		);
		expect(screen.getByText(/Nothing leaves your browser/)).toBeInTheDocument();
		expect(
			screen.getByRole('switch', { name: 'Send real requests' })
		).not.toBeChecked();
	});

	it('reports a change to the typed answer', () => {
		render(<NetworkPanel {...props} />);
		fireEvent.change(screen.getByLabelText('Answer used by Refresh'), {
			target: { value: '{}' },
		});
		expect(props.onMockChange).toHaveBeenCalledWith('{}');
	});

	it('turns real requests on and says exactly what they do', async () => {
		const { rerender } = render(<NetworkPanel {...props} />);
		await userEvent.click(
			screen.getByRole('switch', { name: 'Send real requests' })
		);
		expect(props.onRealChange).toHaveBeenCalledWith(true);

		rerender(<NetworkPanel {...props} real />);
		expect(
			screen.getByText(
				/Refresh now asks api\.github\.com from your browser: GET only, no cookies/
			)
		).toBeInTheDocument();
		expect(screen.getByLabelText('Answer used by Refresh')).toBeDisabled();
	});
});
