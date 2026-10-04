jest.mock('@/components/dashboard/dashboard-layout', () => ({
	DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/sidebar', () => ({
	SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock('@/hooks/extensions/use-saved-recipes', () => {
	class RecipeRequestError extends Error {}
	return {
		installSharedRecipe: jest.fn(),
		RecipeRequestError,
		SAVED_RECIPES_KEY: '/api/recipes',
	};
});
jest.mock('swr', () => ({ mutate: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/image', () => ({
	__esModule: true,
	default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

import { installSharedRecipe } from '@/hooks/extensions/use-saved-recipes';
import type { SharedRecipe } from '@/lib/extensions/recipe-schema';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { mutate } from 'swr';
import { SharedRecipeContent } from './shared-recipe-content';
import { SharedRecipePublic } from './shared-recipe-public';

const recipe: SharedRecipe = {
	id: '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01',
	definition: {
		title: 'Pre-mortem',
		description: 'Imagine this failed',
		icon: 'alert',
		scope: 'node',
		instruction: 'Imagine this idea failed a year from now.\nList the likely causes.',
		output: { maxItems: 4, nodeTypes: ['defaultNode', 'taskNode'], labels: ['risk'] },
	},
	authorName: 'Big J',
	installCount: 12,
};

beforeEach(() => jest.clearAllMocks());

describe('shared recipe page', () => {
	it('shows the full instruction and what the recipe creates', () => {
		render(<SharedRecipePublic isGuest={false} recipe={recipe} />);

		expect(
			screen.getByText(/Imagine this idea failed a year from now\.\s+List the likely causes\./)
		).toBeInTheDocument();
		expect(screen.getByText('Runs on one idea')).toBeInTheDocument();
		expect(screen.getByText('Task')).toBeInTheDocument();
		expect(screen.getByText('risk')).toBeInTheDocument();
		expect(screen.getByText('by Big J · 12 adds')).toBeInTheDocument();
	});

	it('sends signed-out visitors to sign in and back', () => {
		render(<SharedRecipePublic isGuest recipe={recipe} />);

		expect(screen.getByRole('link', { name: 'Sign in to add' })).toHaveAttribute(
			'href',
			`/auth/sign-in?redirectedFrom=${encodeURIComponent(`/recipes/${recipe.id}`)}`
		);
		expect(screen.getByText(/Guest sessions can’t save recipes/)).toBeInTheDocument();
	});

	it('adds a copy for signed-in visitors and refreshes their recipes', async () => {
		(installSharedRecipe as jest.Mock).mockResolvedValue({ id: 'copy-1' });
		const user = userEvent.setup();
		render(<SharedRecipeContent isOwner={false} recipe={recipe} />);

		await user.click(screen.getByRole('button', { name: /add to my recipes/i }));

		expect(installSharedRecipe).toHaveBeenCalledWith(recipe.id);
		expect(mutate).toHaveBeenCalledWith('/api/recipes');
		expect(screen.getByRole('button', { name: /added/i })).toBeDisabled();
	});

	it('lets the button be retried when adding fails', async () => {
		(installSharedRecipe as jest.Mock).mockRejectedValue(new Error('nope'));
		const user = userEvent.setup();
		render(<SharedRecipeContent isOwner={false} recipe={recipe} />);

		await user.click(screen.getByRole('button', { name: /add to my recipes/i }));

		expect(screen.getByRole('button', { name: /add to my recipes/i })).toBeEnabled();
	});

	it('does not offer the author their own recipe', () => {
		render(<SharedRecipeContent isOwner recipe={recipe} />);

		expect(screen.getByText('This is your recipe')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /add to my recipes/i })).not.toBeInTheDocument();
	});
});
