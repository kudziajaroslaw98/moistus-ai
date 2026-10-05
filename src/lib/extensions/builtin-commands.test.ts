import type { ContributionContext } from '@/types/extensions';
import { BUILTIN_COMMANDS } from './builtin-commands';

const command = (id: string) => {
	const found = BUILTIN_COMMANDS.find((entry) => entry.id === id);
	if (!found) throw new Error(`Missing command ${id}`);
	return found;
};

const context = (state: Record<string, unknown>, isMapReady = true) =>
	({
		getState: () => state,
		scope: 'map',
		nodeId: null,
		canEdit: true,
		isMapReady,
	}) as unknown as ContributionContext;

describe('recipe commands', () => {
	it('are offered to signed-in accounts only', () => {
		for (const id of ['create-recipe', 'manage-recipes']) {
			expect(command(id).when?.(context({ currentUser: { is_anonymous: false } }))).toBe(true);
			expect(command(id).when?.(context({ currentUser: { is_anonymous: true } }))).toBe(false);
			expect(command(id).when?.(context({ currentUser: null }))).toBe(false);
		}
	});

	it('open the editor for a new recipe, or the list', () => {
		const openRecipesPanel = jest.fn();
		const ctx = context({ openRecipesPanel, currentUser: { is_anonymous: false } });

		command('create-recipe').run(ctx);
		command('manage-recipes').run(ctx);

		expect(openRecipesPanel).toHaveBeenNthCalledWith(1, {
			mode: 'edit',
			recipeId: null,
			initial: null,
		});
		expect(openRecipesPanel).toHaveBeenNthCalledWith(2);
	});
});

describe('plugins command', () => {
	const owner = { mindMap: { user_id: 'u1' }, currentUser: { id: 'u1' } };
	const editor = { mindMap: { user_id: 'u1' }, currentUser: { id: 'u2' } };

	it('is offered on every ready map, owner or not', () => {
		expect(command('open-plugins').when?.(context(owner))).toBe(true);
		expect(command('open-plugins').when?.(context(editor))).toBe(true);
		expect(command('open-plugins').when?.(context(owner, false))).toBe(false);
	});

	it('describes what each person can do there', () => {
		const describe = command('open-plugins').description as (
			ctx: ContributionContext
		) => string;

		expect(describe(context(owner))).toBe('Turn plugins on or off for this map');
		expect(describe(context(editor))).toBe('See the plugins this map uses');
	});

	it('opens the Plugins panel', () => {
		const openPluginsPanel = jest.fn();

		command('open-plugins').run(context({ ...owner, openPluginsPanel }));

		expect(openPluginsPanel).toHaveBeenCalledTimes(1);
	});
});
