import { fireEvent, render, screen } from '@testing-library/react';
import { StartMappingLink } from './start-mapping-link';

let linkPending = false;

jest.mock('next/link', () => {
	const React = require('react');

	return {
		__esModule: true,
		default: React.forwardRef(
			(
				{
					children,
					href,
					onNavigate: _onNavigate,
					...props
				}: {
					children: unknown;
					href: string;
					onNavigate?: () => void;
				},
				ref: any
			) => (
				<a
					ref={ref}
					href={typeof href === 'string' ? href : '/dashboard'}
					{...props}
				>
					{children}
				</a>
			)
		),
		useLinkStatus: () => ({ pending: linkPending }),
	};
});

describe('StartMappingLink', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		linkPending = false;
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('shows pending feedback immediately on click', () => {
		render(<StartMappingLink className='inline-flex' />);

		const link = screen.getByRole('link', { name: /start mapping/i });
		fireEvent.click(link);

		expect(screen.getByRole('link', { name: /opening\.\.\./i })).toBeInTheDocument();
		expect(screen.getByTestId('start-mapping-progress')).toBeInTheDocument();
	});

	it('reflects the real pending state from useLinkStatus', () => {
		const { rerender } = render(<StartMappingLink className='inline-flex' />);

		expect(screen.getByRole('link', { name: /start mapping/i })).toBeInTheDocument();

		linkPending = true;
		rerender(<StartMappingLink className='inline-flex' />);

		expect(screen.getByRole('link', { name: /opening\.\.\./i })).toBeInTheDocument();

		linkPending = false;
		rerender(<StartMappingLink className='inline-flex' />);

		expect(screen.getByRole('link', { name: /start mapping/i })).toBeInTheDocument();
	});

	it('shows pending feedback on enter key activation', () => {
		const onNavigateStart = jest.fn();
		render(
			<StartMappingLink className='inline-flex' onNavigateStart={onNavigateStart} />
		);

		const link = screen.getByRole('link', { name: /start mapping/i });
		fireEvent.keyDown(link, { key: 'Enter' });

		expect(onNavigateStart).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('link', { name: /opening\.\.\./i })).toBeInTheDocument();
	});

	it('shows pending feedback on space key activation', () => {
		const onNavigateStart = jest.fn();
		render(
			<StartMappingLink className='inline-flex' onNavigateStart={onNavigateStart} />
		);

		const link = screen.getByRole('link', { name: /start mapping/i });
		fireEvent.keyDown(link, { key: ' ' });

		expect(onNavigateStart).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('link', { name: /opening\.\.\./i })).toBeInTheDocument();
	});

	it('clears optimistic pending state when navigation does not continue', () => {
		render(<StartMappingLink className='inline-flex' />);

		const link = screen.getByRole('link', { name: /start mapping/i });
		fireEvent.pointerDown(link, { button: 0, pointerType: 'mouse' });

		expect(screen.getByRole('link', { name: /opening\.\.\./i })).toBeInTheDocument();

		jest.advanceTimersByTime(1600);

		expect(screen.getByRole('link', { name: /start mapping/i })).toBeInTheDocument();
	});
});
