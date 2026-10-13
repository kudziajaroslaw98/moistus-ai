import { recipeDefinitionSchema, type RecipeDefinition } from './recipe-schema';
import { STARTER_RECIPES } from './starter-recipes';

const validDefinition = (): RecipeDefinition => ({
	title: 'Pre-mortem',
	description: 'Imagine this failed: list likely causes',
	icon: 'alert',
	scope: 'node',
	instruction: 'Imagine this idea failed a year from now. List the likely causes.',
	output: { maxItems: 4, nodeTypes: ['defaultNode', 'taskNode'], labels: ['risk'] },
});

describe('recipeDefinitionSchema', () => {
	it('accepts every starter recipe', () => {
		for (const starter of STARTER_RECIPES) {
			expect(recipeDefinitionSchema.safeParse(starter.definition).success).toBe(true);
		}
	});

	it('accepts a user recipe and trims text', () => {
		const parsed = recipeDefinitionSchema.parse({
			...validDefinition(),
			title: '  Pre-mortem  ',
		});
		expect(parsed.title).toBe('Pre-mortem');
	});

	it.each([
		['an empty title', { title: '   ' }],
		['an instruction over 2000 characters', { instruction: 'x'.repeat(2001) }],
		['an unknown scope', { scope: 'selection' }],
		['an unknown icon', { icon: 'skull' }],
	])('rejects %s', (_label, override) => {
		expect(
			recipeDefinitionSchema.safeParse({ ...validDefinition(), ...override }).success
		).toBe(false);
	});

	it.each([
		['no node types', { nodeTypes: [] }],
		['duplicate node types', { nodeTypes: ['taskNode', 'taskNode'] }],
		['an unsafe node type', { nodeTypes: ['imageNode'] }],
		['more than 6 results', { maxItems: 7 }],
		['duplicate labels', { labels: ['risk', 'risk'] }],
		['more than 8 labels', { labels: Array.from({ length: 9 }, (_, i) => `l${i}`) }],
	])('rejects output with %s', (_label, override) => {
		const definition = validDefinition();
		expect(
			recipeDefinitionSchema.safeParse({
				...definition,
				output: { ...definition.output, ...override },
			}).success
		).toBe(false);
	});
});
