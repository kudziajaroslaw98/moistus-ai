import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSWR from 'swr';
import { CreateMapDialog } from './create-map-dialog';

jest.mock('swr', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/hooks/use-touch-first', () => ({ useTouchFirst: () => false }));

const TEMPLATES = [
	{
		templateId: 'brainstorm',
		name: 'Brainstorm',
		description: 'Capture ideas fast',
		category: 'creative',
	},
	{
		templateId: 'sprint-plan',
		name: 'Sprint plan',
		description: 'Plan the next sprint',
		category: 'planning',
	},
];

const mockUseSWR = useSWR as jest.Mock;

function setup(props: Partial<Parameters<typeof CreateMapDialog>[0]> = {}) {
	const onSubmit = jest.fn().mockResolvedValue(undefined);
	const onOpenChange = jest.fn();

	render(
		<CreateMapDialog
			open
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			{...props}
		/>
	);

	return { onSubmit, onOpenChange, user: userEvent.setup() };
}

describe('CreateMapDialog', () => {
	beforeEach(() => {
		mockUseSWR.mockReturnValue({
			data: { data: { templates: TEMPLATES } },
			error: undefined,
			isLoading: false,
		});
	});

	it('opens as a panel on a blank map with Create disabled', () => {
		setup();

		expect(screen.getByRole('dialog', { name: 'New map' })).toBeInTheDocument();
		expect(
			screen.getByText('Blank map', { selector: 'p' })
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Blank map/ })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByRole('button', { name: /Create map/ })).toBeDisabled();
	});

	it('creates a blank map from a trimmed title and no description', async () => {
		const { onSubmit, user } = setup();

		await user.type(screen.getByLabelText(/Title/), '  My map  ');
		await user.click(screen.getByRole('button', { name: /Create map/ }));

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				title: 'My map',
				description: undefined,
				templateId: undefined,
			})
		);
	});

	it('submits with Enter from the title field', async () => {
		const { onSubmit, user } = setup();

		await user.type(screen.getByLabelText(/Title/), 'Quick{Enter}');

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
	});

	it('sends the picked template and shows it in the footer', async () => {
		const { onSubmit, user } = setup();

		await user.click(screen.getByRole('button', { name: /Sprint plan/ }));

		expect(screen.getByText('Template: Sprint plan')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Sprint plan/ })).toHaveAttribute(
			'aria-pressed',
			'true'
		);

		await user.type(screen.getByLabelText(/Title/), 'Q4');
		await user.click(screen.getByRole('button', { name: /Create map/ }));

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				title: 'Q4',
				description: undefined,
				templateId: 'sprint-plan',
			})
		);
	});

	it('starts with the template chosen outside the panel', () => {
		setup({
			initialTemplate: { templateId: 'brainstorm', name: 'Brainstorm' },
		});

		expect(screen.getByLabelText(/Title/)).toHaveValue('Brainstorm');
		expect(screen.getByText('Template: Brainstorm')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Create map/ })).toBeEnabled();
	});

	it('filters templates by category and keeps the blank map', async () => {
		const { user } = setup();
		const filters = screen.getByRole('toolbar', { name: 'Filter templates' });

		await user.click(within(filters).getByRole('button', { name: /Planning/ }));

		expect(
			screen.getByRole('button', { name: /Sprint plan/ })
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /Brainstorm/ })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /Blank map/ })
		).toBeInTheDocument();
	});

	it('asks for a title after leaving the empty field', async () => {
		const { user } = setup();

		await user.click(screen.getByLabelText(/Title/));
		await user.tab();

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Title is required'
		);
	});

	it('blocks a description over the limit', async () => {
		const { user } = setup();

		await user.type(screen.getByLabelText(/Title/), 'Long');
		await user.click(screen.getByLabelText(/Description/));
		await user.paste('x'.repeat(520));

		expect(screen.getByRole('button', { name: /Create map/ })).toBeDisabled();
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Description must be 500 characters or less'
		);
	});

	it('still offers a blank map when templates fail to load', () => {
		mockUseSWR.mockReturnValue({
			data: undefined,
			error: new Error('HTTP 500'),
			isLoading: false,
		});
		setup();

		expect(screen.getByRole('alert')).toHaveTextContent(
			'Templates could not be loaded'
		);
		expect(
			screen.getByRole('button', { name: /Blank map/ })
		).toBeInTheDocument();
	});

	it('closes from Cancel', async () => {
		const { onOpenChange, user } = setup();

		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
