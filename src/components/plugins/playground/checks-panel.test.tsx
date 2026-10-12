import { render, screen, within } from '@testing-library/react';
import { ChecksPanel } from './checks-panel';

describe('ChecksPanel', () => {
	it('says when every check passes and shows each check’s detail', () => {
		render(
			<ChecksPanel
				summary={{ passed: 2, total: 2 }}
				checks={[
					{ label: 'Manifest is valid', ok: true, detail: 'manifest.json' },
					{ label: 'Code loads', ok: true },
				]}
			/>
		);
		expect(screen.getByRole('status')).toHaveTextContent('All 2 pass');
		expect(screen.getByText('manifest.json')).toBeInTheDocument();
	});

	it('puts the reason under a failing check and counts the passes', () => {
		render(
			<ChecksPanel
				summary={{ passed: 1, total: 2 }}
				checks={[
					{ label: 'Manifest is valid', ok: true },
					{
						label: 'Code loads',
						ok: false,
						detail: 'SyntaxError: unexpected token',
					},
				]}
			/>
		);
		expect(screen.getByRole('status')).toHaveTextContent('1 of 2 pass');
		const failing = screen.getByText(/Code loads/).closest('li') as HTMLElement;
		expect(within(failing).getByText(/Failed/)).toBeInTheDocument();
		expect(within(failing).getByText(/unexpected token/)).toBeInTheDocument();
	});

	it('shows that the first run is still going', () => {
		render(<ChecksPanel checks={[]} summary={null} />);
		expect(screen.getByRole('status')).toHaveTextContent('Checking…');
	});
});
