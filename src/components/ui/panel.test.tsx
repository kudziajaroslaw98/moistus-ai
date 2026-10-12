import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	Panel,
	PanelField,
	PanelFooterActions,
	PanelFooterNote,
	PanelRow,
	PanelSection,
} from './panel';

function renderPanel(
	props: Partial<React.ComponentProps<typeof Panel>> = {}
) {
	const onOpenChange = jest.fn();

	render(
		<div>
			<button type='button'>Canvas</button>

			<Panel
				footer={
					<>
						<PanelFooterNote>All changes are saved</PanelFooterNote>

						<PanelFooterActions>
							<button type='button'>Save</button>
						</PanelFooterActions>
					</>
				}
				onOpenChange={onOpenChange}
				open
				subtitle='Dump'
				title='History'
				{...props}
			>
				<input aria-label='Inside' />
			</Panel>
		</div>
	);

	return { onOpenChange };
}

describe('Panel', () => {
	it('renders title, subtitle, body and footer in a dialog', () => {
		renderPanel();

		const dialog = screen.getByRole('dialog');

		expect(dialog).toHaveAttribute('data-variant', 'modal');
		expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
		expect(screen.getByText('Dump')).toBeInTheDocument();
		expect(screen.getByLabelText('Inside')).toBeInTheDocument();
		expect(screen.getByText('All changes are saved')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});

	it('closes from the close button with a configurable label', () => {
		const { onOpenChange } = renderPanel({ closeLabel: 'Close menu' });

		fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('modal: Escape closes it', async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderPanel();

		await user.keyboard('{Escape}');

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('docked: stays open when the page is clicked, closes on Escape from inside', async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderPanel({ variant: 'docked' });

		expect(screen.getByRole('dialog')).toHaveAttribute(
			'data-variant',
			'docked'
		);

		await user.click(screen.getByRole('button', { name: 'Canvas' }));
		expect(onOpenChange).not.toHaveBeenCalled();

		await user.click(screen.getByLabelText('Inside'));
		await user.keyboard('{Escape}');
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('docked: Escape pressed on the page does not close it', async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderPanel({ variant: 'docked' });

		await user.click(screen.getByRole('button', { name: 'Canvas' }));
		await user.keyboard('{Escape}');

		expect(onOpenChange).not.toHaveBeenCalled();
	});
});

describe('Panel parts', () => {
	it('PanelRow is a button only when it has a handler', () => {
		const onClick = jest.fn();

		render(
			<>
				<PanelRow
					chevron
					description='Browse the map timeline.'
					onClick={onClick}
					title='View history'
				/>

				<PanelRow title='Plain row' trailing='1:05 PM' />
			</>
		);

		fireEvent.click(screen.getByRole('button', { name: /View history/ }));

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Plain row').closest('button')).toBeNull();
		expect(screen.getByText('1:05 PM')).toBeInTheDocument();
	});

	it('PanelSection shows its label, meta and description', () => {
		render(
			<PanelSection description='Short note' label='General' meta='3'>
				<p>Body</p>
			</PanelSection>
		);

		expect(
			screen.getByRole('heading', { name: 'General' })
		).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('Short note')).toBeInTheDocument();
	});

	it('PanelSection centers a numeric meta over icon buttons, but right-aligns text', () => {
		render(
			<>
				<PanelSection label='People' meta={5} metaAlign='icon' />

				<PanelSection label='Plugins' meta='2 updates' metaAlign='icon' />

				<PanelSection label='History' meta={50} />
			</>
		);

		expect(screen.getByText('5').className).toContain('size-8');
		expect(screen.getByText('2 updates').className).not.toContain('size-8');
		expect(screen.getByText('50').className).not.toContain('size-8');
	});

	it('PanelField shows a counter, a required mark, and an alert error', () => {
		render(
			<PanelField
				count={{ value: 300, max: 255 }}
				error='Too long'
				hint='Shown on cards'
				htmlFor='title'
				label='Title'
				required
			>
				<input id='title' />
			</PanelField>
		);

		expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
		expect(screen.getByText('300/255').className).toContain('text-error-400');
		expect(screen.getByRole('alert')).toHaveTextContent('Too long');
		expect(screen.getByText('Shown on cards')).toBeInTheDocument();
	});
});
