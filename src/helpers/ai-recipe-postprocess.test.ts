/**
 * @jest-environment node
 */
import { createAiIdAliasMap } from '@/helpers/ai-id-alias-map';
import type { RecipeRef } from '@/lib/extensions/recipe-schema';
import { z } from 'zod';
import {
	buildRecipeOutputSchema,
	processRecipeElement,
	sanitizeRecipeText,
} from './ai-recipe-postprocess';

const recipe = (overrides: Partial<RecipeRef['definition']> = {}): RecipeRef => ({
	id: 'recipe-1',
	definition: {
		title: 'Pre-mortem',
		description: '',
		icon: 'alert',
		scope: 'branch',
		instruction: 'List the likely causes of failure.',
		output: { maxItems: 2, nodeTypes: ['defaultNode', 'taskNode'], labels: ['risk'] },
		...overrides,
	},
});

const aliasMap = createAiIdAliasMap([{ id: 'focus' }, { id: 'child' }, { id: 'parent' }]);
const promptContext = {
	aliasMap,
	validAnchorNodeIds: new Set(['focus', 'child']),
	focusNodeId: 'focus',
};

const element = (overrides: Record<string, unknown> = {}) => ({
	content: 'Beta testers drop off after week one',
	nodeType: 'defaultNode',
	nodePayload: null,
	confidence: 0.8,
	context: { sourceNodeId: 2, relationshipType: 'risk' },
	...overrides,
});

function run(
	value: unknown,
	options: { recipe?: RecipeRef; emitted?: { content: string; sourceNodeId: string | null }[] } = {}
) {
	const activeRecipe = options.recipe ?? recipe();
	return processRecipeElement({
		element: value,
		schema: buildRecipeOutputSchema(activeRecipe.definition),
		recipe: activeRecipe,
		promptContext,
		existingEntries: [],
		emittedEntries: options.emitted ?? [],
		createId: () => 'id-1',
	});
}

type JsonSchemaNode = {
	type?: string | string[];
	properties?: Record<string, JsonSchemaNode>;
	required?: string[];
	format?: string;
	items?: JsonSchemaNode;
	anyOf?: JsonSchemaNode[];
};

/** Walks a JSON schema and lists anything OpenAI strict structured outputs reject. */
function findStrictModeViolations(node: JsonSchemaNode, path = '$'): string[] {
	const violations: string[] = [];
	if (node.format) violations.push(`${path}: format "${node.format}"`);
	if (node.properties) {
		const required = new Set(node.required ?? []);
		for (const [key, child] of Object.entries(node.properties)) {
			if (!required.has(key)) violations.push(`${path}.${key}: not required`);
			violations.push(...findStrictModeViolations(child, `${path}.${key}`));
		}
	}
	if (node.items) violations.push(...findStrictModeViolations(node.items, `${path}[]`));
	for (const option of node.anyOf ?? []) {
		violations.push(...findStrictModeViolations(option, path));
	}
	return violations;
}

describe('buildRecipeOutputSchema', () => {
	it.each([
		['with labels', recipe()],
		['without labels', recipe({ output: { maxItems: 4, nodeTypes: ['questionNode'], labels: [] } })],
	])('is compatible with OpenAI strict structured outputs (%s)', (_label, value) => {
		// Same conversion the AI SDK applies to zod 4 schemas before calling OpenAI.
		const jsonSchema = z.toJSONSchema(buildRecipeOutputSchema(value.definition), {
			target: 'draft-7',
			io: 'input',
			reused: 'inline',
		}) as JsonSchemaNode;
		expect(findStrictModeViolations(jsonSchema)).toEqual([]);
	});

	it('limits node types and labels to the recipe', () => {
		const schema = buildRecipeOutputSchema(recipe().definition);
		expect(schema.safeParse(element({ nodeType: 'codeNode' })).success).toBe(false);
		expect(
			schema.safeParse(element({ context: { sourceNodeId: 1, relationshipType: 'other' } }))
				.success
		).toBe(false);
	});
});

describe('sanitizeRecipeText', () => {
	it('removes images and HTML and keeps link text', () => {
		expect(
			sanitizeRecipeText(
				'Risk ![x](https://evil.example/?q=secret) see [docs](https://a.example) <img src="https://evil.example/a.png"> now'
			)
		).toBe('Risk  see docs  now');
	});

	it('removes reference-style images and link definitions', () => {
		expect(sanitizeRecipeText('Look ![x][1]\n[1]: https://evil.example/a.png')).toBe('Look');
	});

	it('removes markup rebuilt from the pieces around what it removed', () => {
		expect(sanitizeRecipeText('Risk !<b>[x]<i>(https://evil.example/?q=secret)')).toBe('Risk');
		expect(sanitizeRecipeText('<<b>script>alert(1)<</b>/script>')).toBe('alert(1)');
		expect(sanitizeRecipeText('<<b>img src="https://evil.example/a.png">')).toBe('');
	});
});

describe('processRecipeElement', () => {
	it('resolves the alias to a valid branch anchor and attributes the recipe', () => {
		const result = run(element());
		expect(result?.suggestion).toMatchObject({
			id: 'id-1',
			content: 'Beta testers drop off after week one',
			context: {
				sourceNodeId: 'child',
				relationshipType: 'risk',
				trigger: 'magic-wand',
				recipe: { id: 'recipe-1', title: 'Pre-mortem', icon: 'alert' },
			},
		});
	});

	it('falls back to the focus node when a branch anchor is outside the branch', () => {
		expect(run(element({ context: { sourceNodeId: 3, relationshipType: null } }))?.suggestion.context.sourceNodeId).toBe('focus');
	});

	it('always attaches node-scoped results to the focus node', () => {
		const result = run(element(), { recipe: recipe({ scope: 'node' }) });
		expect(result?.suggestion.context.sourceNodeId).toBe('focus');
	});

	it('leaves map-scoped results unanchored when the anchor is unknown', () => {
		const result = run(element({ context: { sourceNodeId: 99, relationshipType: null } }), {
			recipe: recipe({ scope: 'map' }),
		});
		expect(result?.suggestion.context.sourceNodeId).toBeNull();
	});

	it('downgrades a task without checklist rows and sanitises payload text', () => {
		expect(
			run(element({ nodeType: 'taskNode', nodePayload: { title: null, taskTexts: [], answer: null, questionType: null, annotationType: null, language: null, fileName: null } }))?.suggestion
		).toMatchObject({ nodeType: 'defaultNode', nodePayload: null });

		const task = run(
			element({
				nodeType: 'taskNode',
				nodePayload: {
					title: null,
					taskTexts: ['Ship ![x](https://evil.example/t)', '![only](https://evil.example)'],
					answer: null,
					questionType: null,
					annotationType: null,
					language: null,
					fileName: null,
				},
			})
		);
		expect(task?.suggestion.nodePayload?.taskTexts).toEqual(['Ship']);
	});

	it('drops results that are empty after sanitising, duplicates, and anything past maxItems', () => {
		expect(run(element({ content: '![x](https://evil.example)' }))).toBeNull();
		expect(
			run(element(), {
				emitted: [{ content: 'Beta testers drop off after week one', sourceNodeId: 'child' }],
			})
		).toBeNull();
		expect(
			run(element({ content: 'Something new' }), {
				emitted: [
					{ content: 'First', sourceNodeId: null },
					{ content: 'Second', sourceNodeId: null },
				],
			})
		).toBeNull();
	});

	it('drops elements that do not match the schema', () => {
		expect(run({ content: 'No type' })).toBeNull();
	});
});
