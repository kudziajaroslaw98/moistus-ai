import { useContributions } from '@/hooks/extensions/use-contributions';
import { useSavedRecipes } from '@/hooks/extensions/use-saved-recipes';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeEditor } from './recipe-editor';

jest.mock('@/store/mind-map-store', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/hooks/extensions/use-contributions', () => ({ useContributions: jest.fn() }));
jest.mock('@/hooks/subscription/use-feature-gate', () => ({
	useSubscriptionLimits: jest.fn(),
}));
jest.mock('@/hooks/extensions/use-saved-recipes', () => {
	class RecipeRequestError extends Error {}
	return { useSavedRecipes: jest.fn(), RecipeRequestError };
});
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const createRecipe = jest.fn();
const updateRecipe = jest.fn();
const runContribution = jest.fn();
const createContext = jest.fn((scope: string, nodeId: string | null) => ({ scope, nodeId }));
const setPopoverOpen = jest.fn();

function setup(
	options: {
		selectedNodes?: Array<{ id: string; data: Record<string, unknown> }>;
		isAtLimit?: boolean;
		canSaveRecipes?: boolean;
		showTry?: boolean;
	} = {}
) {
	const state = {
		setPopoverOpen,
		isStreaming: false,
		selectedNodes: options.selectedNodes ?? [],
	};
	(useAppStore as unknown as jest.Mock).mockImplementation((selector) => selector(state));
	(useSavedRecipes as jest.Mock).mockReturnValue({
		canSaveRecipes: options.canSaveRecipes ?? true,
		createRecipe,
		updateRecipe,
	});
	(useContributions as jest.Mock).mockReturnValue({ createContext, runContribution });
	(useSubscriptionLimits as jest.Mock).mockReturnValue({
		isAtLimit: () => options.isAtLimit ?? false,
	});

	const onSaved = jest.fn();
	render(
		<RecipeEditor
			initial={null}
			onClose={jest.fn()}
			onDirtyChange={jest.fn()}
			onSaved={onSaved}
			recipeId={null}
			showTry={options.showTry ?? true}
		/>
	);
	return { onSaved, user: userEvent.setup() };
}

async function fillValidRecipe(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/^name/i), 'Pre-mortem');
	await user.type(
		screen.getByLabelText(/^instruction/i),
		'Imagine this failed. List the likely causes.'
	);
}

beforeEach(() => jest.clearAllMocks());

describe('RecipeEditor', () => {
	it('explains what is missing instead of saving an incomplete recipe', async () => {
		const { user } = setup();

		await user.click(screen.getByRole('button', { name: /save recipe/i }));

		expect(screen.getByText('Give the recipe a name.')).toBeInTheDocument();
		expect(screen.getByText('Write what the AI should do.')).toBeInTheDocument();
		expect(createRecipe).not.toHaveBeenCalled();
	});

	it('saves the recipe with the chosen scope, count, types and labels', async () => {
		const expected = {
			title: 'Pre-mortem',
			description: '',
			icon: 'lightbulb',
			scope: 'branch',
			instruction: 'Imagine this failed. List the likely causes.',
			output: { maxItems: 2, nodeTypes: ['defaultNode', 'taskNode'], labels: ['risk'] },
		};
		const saved = { id: 'r-1', definition: expected };
		createRecipe.mockResolvedValue(saved);
		const { user, onSaved } = setup();

		await fillValidRecipe(user);
		await user.click(screen.getByRole('radio', { name: 'This branch' }));
		await user.click(screen.getByRole('radio', { name: '2 suggestions' }));
		await user.click(screen.getByRole('button', { name: 'Task' }));
		await user.type(screen.getByLabelText(/connection labels/i), 'risk{Enter}');
		await user.click(screen.getByRole('radio', { name: 'Lightbulb' }));
		await user.click(screen.getByRole('button', { name: /save recipe/i }));

		expect(createRecipe).toHaveBeenCalledWith(expected);
		expect(onSaved).toHaveBeenCalledWith(saved);
	});

	it('keeps at least the user’s chosen types and flags an empty selection', async () => {
		const { user } = setup();

		await user.click(screen.getByRole('button', { name: 'Note' }));

		expect(screen.getByText('Pick at least one node type.')).toBeInTheDocument();
	});

	it('needs a selected node to try node recipes, and runs the draft on it', async () => {
		const { user } = setup();
		await fillValidRecipe(user);

		expect(screen.getByRole('button', { name: /try on selected node/i })).toBeDisabled();
		expect(screen.getByText('Select one node on the canvas to try it.')).toBeInTheDocument();
	});

	it('runs the unsaved draft on the selected node', async () => {
		const { user } = setup({
			selectedNodes: [{ id: 'node-1', data: { content: 'Launch beta in May' } }],
		});
		await fillValidRecipe(user);

		expect(screen.getByText('Launch beta in May')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /try on selected node/i }));

		expect(createContext).toHaveBeenCalledWith('node', 'node-1');
		expect(runContribution).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'recipe:draft', title: 'Pre-mortem' }),
			{ scope: 'node', nodeId: 'node-1' }
		);
	});

	it('tries map recipes without a selected node', async () => {
		const { user } = setup();
		await fillValidRecipe(user);
		await user.click(screen.getByRole('radio', { name: 'Whole map' }));

		await user.click(screen.getByRole('button', { name: /try on this map/i }));

		expect(createContext).toHaveBeenCalledWith('map', null);
	});

	it('offers an upgrade instead of Try when AI is not available on the plan', async () => {
		const { user } = setup({ isAtLimit: true });

		await user.click(screen.getByRole('button', { name: /upgrade to pro to run recipes/i }));

		expect(setPopoverOpen).toHaveBeenCalledWith({ upgradeUser: true });
		expect(screen.queryByRole('button', { name: /try on/i })).not.toBeInTheDocument();
	});

	it('leaves out Try when there is no map (dashboard page)', () => {
		setup({ showTry: false });

		expect(screen.queryByRole('heading', { name: 'Try it' })).not.toBeInTheDocument();
		expect(screen.getByText(/open a map and choose manage/i)).toBeInTheDocument();
		expect(useContributions).not.toHaveBeenCalled();
	});

	it('lets guests explore but not save', () => {
		setup({ canSaveRecipes: false });

		expect(screen.getByRole('button', { name: /save recipe/i })).toBeDisabled();
		expect(screen.getByText('Create an account to save recipes')).toBeInTheDocument();
	});
});
