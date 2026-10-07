jest.mock('@/components/dashboard/dashboard-layout', () => ({
	DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/sidebar', () => ({
	SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockGetCurrentUser = jest.fn();
let mockCurrentUser: { id: string } | null = null;
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (
		selector: (state: { currentUser: unknown; getCurrentUser: () => void }) => unknown
	) => selector({ currentUser: mockCurrentUser, getCurrentUser: mockGetCurrentUser }),
}));

jest.mock('@/components/recipes/recipe-list', () => ({
	RecipeList: ({ onCreate }: { onCreate: (initial: null) => void }) => (
		<button onClick={() => onCreate(null)} type='button'>
			Start a recipe
		</button>
	),
}));

const mockEditorProps = jest.fn();
jest.mock('@/components/recipes/recipe-editor', () => ({
	RecipeEditor: (props: { onDirtyChange: (isDirty: boolean) => void; showTry?: boolean }) => {
		mockEditorProps(props);
		return (
			<button onClick={() => props.onDirtyChange(true)} type='button'>
				Make a change
			</button>
		);
	},
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { RecipesContent } from './recipes-content';

beforeEach(() => {
	jest.clearAllMocks();
	mockCurrentUser = null;
});

describe('RecipesContent', () => {
	it('loads the signed-in user before showing the list', () => {
		render(<RecipesContent />);

		expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('recipes-page-loading')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Start a recipe' })).not.toBeInTheDocument();
	});

	it('does not reload a user the store already has', () => {
		mockCurrentUser = { id: 'user-1' };
		render(<RecipesContent />);

		expect(mockGetCurrentUser).not.toHaveBeenCalled();
	});

	it('opens the editor without Try and goes back to the list', async () => {
		mockCurrentUser = { id: 'user-1' };
		const user = userEvent.setup();
		render(<RecipesContent />);

		expect(screen.getByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Start a recipe' }));

		expect(screen.getByRole('heading', { name: 'New recipe' })).toBeInTheDocument();
		expect(mockEditorProps).toHaveBeenLastCalledWith(
			expect.not.objectContaining({ showTry: true })
		);
		await user.click(screen.getByRole('button', { name: /all recipes/i }));

		expect(await screen.findByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
	});

	it('asks before throwing away unsaved edits', async () => {
		mockCurrentUser = { id: 'user-1' };
		const user = userEvent.setup();
		render(<RecipesContent />);

		await user.click(screen.getByRole('button', { name: 'Start a recipe' }));
		await user.click(screen.getByRole('button', { name: 'Make a change' }));
		await user.click(screen.getByRole('button', { name: /all recipes/i }));

		expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
		// The modal hides the page from the accessibility tree while it's open.
		expect(screen.getByRole('heading', { name: 'New recipe', hidden: true })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Discard changes' }));

		expect(await screen.findByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
	});
});
