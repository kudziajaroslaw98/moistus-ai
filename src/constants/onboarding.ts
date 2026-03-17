export const ONBOARDING_STORAGE_KEY = 'shiko_onboarding_v2';

export const ONBOARDING_PATTERN_EXAMPLE =
	'$task Review PR ^tomorrow #backend';

export const ONBOARDING_TASK_IDS = [
	'create-node',
	'try-pattern',
	'know-controls',
] as const;

export type OnboardingTaskId = (typeof ONBOARDING_TASK_IDS)[number];

export const ONBOARDING_STATUSES = [
	'hidden',
	'intro',
	'checklist',
	'coachmarks',
	'upsell',
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_TARGETS = [
	'add-node',
	'ai-suggestions',
	'share',
	'shortcuts-help',
	'breadcrumb-home',
] as const;

export type OnboardingTarget = (typeof ONBOARDING_TARGETS)[number];

export const ONBOARDING_COACHMARKS: ReadonlyArray<{
	target: OnboardingTarget;
	title: string;
	description: string;
}> = [
	{
		target: 'add-node',
		title: 'Add from anywhere',
		description:
			'This is the fastest way to grow a branch when you already know what you want to add.',
	},
	{
		target: 'ai-suggestions',
		title: 'Ask for a push',
		description:
			'Use AI Suggestions when the map needs another angle, not when you want to start from scratch.',
	},
	{
		target: 'share',
		title: 'Share when it is useful',
		description:
			'Invite collaborators after the map has enough structure to react to.',
	},
	{
		target: 'shortcuts-help',
		title: 'Keep the controls close',
		description:
			'The shortcuts panel is the fastest way to pick up navigation and editing muscle memory.',
	},
	{
		target: 'breadcrumb-home',
		title: 'Jump back to your maps',
		description:
			'Use the breadcrumb to get home without losing the habit of working from the canvas.',
	},
] as const;

export const DEFAULT_ONBOARDING_TASKS: Record<OnboardingTaskId, boolean> = {
	'create-node': false,
	'try-pattern': false,
	'know-controls': false,
};
