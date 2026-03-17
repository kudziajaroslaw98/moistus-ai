export const ONBOARDING_STORAGE_KEY = 'shiko_onboarding_v2';

export const ONBOARDING_PATTERN_EXAMPLE =
	'$task Review PR ^tomorrow #backend';

export const ONBOARDING_TASK_IDS = [
	'create-node',
	'try-pattern',
	'know-controls',
] as const;

export type OnboardingTaskId = (typeof ONBOARDING_TASK_IDS)[number];

export const ONBOARDING_CREATE_NODE_STEPS = ['toolbar', 'canvas'] as const;
export type OnboardingCreateNodeStep =
	(typeof ONBOARDING_CREATE_NODE_STEPS)[number];

export const ONBOARDING_PATTERN_STEPS = [
	'pattern-editor',
	'post-create-edit-hint',
] as const;
export type OnboardingPatternStep =
	(typeof ONBOARDING_PATTERN_STEPS)[number];

export const ONBOARDING_STATUSES = [
	'hidden',
	'intro',
	'checklist',
	'coachmarks',
	'upsell',
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_TARGETS = [
	'cursor-tool',
	'add-node',
	'ai-suggestions',
	'layout',
	'export',
	'guided-tour',
	'reset-zoom',
	'comments',
	'share',
	'shortcuts-help',
	'breadcrumb-home',
	'created-node',
] as const;

export type OnboardingTarget = (typeof ONBOARDING_TARGETS)[number];

export const ONBOARDING_COACHMARKS: ReadonlyArray<{
	target: OnboardingTarget;
	title: string;
	description: string;
}> = [
	{
		target: 'cursor-tool',
		title: 'Change how the canvas behaves',
		description:
			'Use this menu to switch between Select, Pan, and Connect so the cursor matches what you want to do next.',
	},
	{
		target: 'add-node',
		title: 'Drop ideas onto the canvas',
		description:
			'Add mode lets you place a new node with a single click when you want to capture ideas quickly.',
	},
	{
		target: 'ai-suggestions',
		title: 'Ask for a next step',
		description:
			'Use AI Suggestions when you want help expanding or challenging the map you already started.',
	},
	{
		target: 'layout',
		title: 'Clean up the structure',
		description:
			'Auto Layout rearranges the map when branches start drifting or when you want a clearer reading order.',
	},
	{
		target: 'export',
		title: 'Take the map with you',
		description:
			'Export to share a snapshot, drop the map into docs, or save a version outside the app.',
	},
	{
		target: 'guided-tour',
		title: 'Present the map',
		description:
			'Guided Tour turns the canvas into a simple walkthrough when you need to present the story behind it.',
	},
	{
		target: 'reset-zoom',
		title: 'Reset your view',
		description:
			'Use reset zoom when you get lost in the canvas and want to quickly recentre your view.',
	},
	{
		target: 'comments',
		title: 'Collect feedback in context',
		description:
			'Comments keep discussion attached to the map, so feedback stays tied to the exact part it refers to.',
	},
	{
		target: 'share',
		title: 'Bring others in when ready',
		description:
			'Invite collaborators after the map has enough structure to react to.',
	},
	{
		target: 'shortcuts-help',
		title: 'Learn shortcuts as you go',
		description:
			'The shortcuts panel is the fastest way to pick up navigation and editing muscle memory.',
	},
	{
		target: 'breadcrumb-home',
		title: 'Get back to your maps',
		description:
			'Use the breadcrumb to get home without losing the habit of working from the canvas.',
	},
] as const;

export const DEFAULT_ONBOARDING_TASKS: Record<OnboardingTaskId, boolean> = {
	'create-node': false,
	'try-pattern': false,
	'know-controls': false,
};
