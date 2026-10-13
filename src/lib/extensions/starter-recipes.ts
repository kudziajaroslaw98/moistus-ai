import type { RecipeRef } from '@/lib/extensions/recipe-schema';

export interface StarterRecipe extends RecipeRef {
	/** Listed in the recipes panel but not in menus (a built-in action covers it). */
	hiddenFromMenus?: boolean;
}

/** Also runs the built-in "Generate counterpoints" action. */
export const COUNTERPOINTS_RECIPE: StarterRecipe = {
	id: 'starter:counterpoints',
	hiddenFromMenus: true,
	definition: {
		title: 'Counterpoints',
		description: 'Challenge this idea with opposing views',
		icon: 'alert',
		scope: 'node',
		instruction:
			'Generate rigorous counterpoints to the focus idea: counterarguments, risks, alternatives, or ways to test it. Keep each one concise (under 180 characters), specific to the idea, and different from the others.',
		output: {
			maxItems: 4,
			nodeTypes: ['defaultNode', 'textNode', 'annotationNode', 'taskNode'],
			labels: ['contradicts', 'risk', 'alternative', 'test-of', 'mitigates', 'questions'],
		},
	},
};

/** Read-only recipes everyone has. Users duplicate them to make their own. */
export const STARTER_RECIPES: StarterRecipe[] = [
	COUNTERPOINTS_RECIPE,
	{
		id: 'starter:swot',
		definition: {
			title: 'SWOT this branch',
			description: 'Strengths, weaknesses, opportunities, threats',
			icon: 'grid',
			scope: 'branch',
			instruction:
				'Analyse this branch as a SWOT. Return one strength, one weakness, one opportunity and one threat, each grounded in what the branch actually says.',
			output: {
				maxItems: 4,
				nodeTypes: ['annotationNode'],
				labels: ['strength', 'weakness', 'opportunity', 'threat'],
			},
		},
	},
	{
		id: 'starter:study-questions',
		definition: {
			title: 'Study questions',
			description: 'Quiz questions for this branch',
			icon: 'help',
			scope: 'branch',
			instruction:
				'Write quiz questions that test understanding of this branch. Mix recall and application questions, and give the answer for each.',
			output: {
				maxItems: 6,
				nodeTypes: ['questionNode'],
				labels: [],
			},
		},
	},
];
