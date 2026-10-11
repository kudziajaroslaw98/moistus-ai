import type { PluginBranchNode } from '@/lib/plugins/branch-context';
import type { PluginNodeKind } from '@/lib/plugins/manifest-schema';
import type { PluginRefs } from '@/lib/plugins/ref-context';
import {
	defaultPluginData,
	parsePluginFieldInput,
	type PluginData,
} from '@/lib/plugins/plugin-fields';

/**
 * The data the preview node starts with: the kind's first example (the same text a person
 * would type in the node editor), or its defaults. Fields without a value stay empty so
 * the form can ask for them.
 */
export function seedSampleData(kind: PluginNodeKind): PluginData {
	const example = kind.examples?.[0];
	return example
		? parsePluginFieldInput(example, kind).data
		: defaultPluginData(kind);
}

/** Stand-ins for the nodes a `nodes:refs` plugin's data links to, so its preview has text to show. */
export function sampleRefs(ids: readonly string[]): PluginRefs {
	return Object.fromEntries(
		ids.map((id, index) => [
			id,
			{
				type: 'note',
				text: `Sample node ${index + 1}`,
				tasks: null,
				status: null,
				priority: null,
				assignees: [],
				due: null,
				tags: [],
			},
		])
	);
}

/** A small branch for plugins with `branch:read`, so their preview has something to read. */
export function sampleBranch(today: string): PluginBranchNode[] {
	const base = {
		assignees: [] as string[],
		tags: [] as string[],
		status: null,
		priority: null,
	};
	return [
		{
			...base,
			id: 'sample-1',
			depth: 1,
			type: 'task',
			text: 'Write the launch email',
			tasks: { done: 2, total: 5 },
			assignees: ['Ada'],
			due: today,
		},
		{
			...base,
			id: 'sample-2',
			depth: 1,
			type: 'note',
			text: 'Pick a launch date',
			tasks: null,
			due: null,
			tags: ['planning'],
		},
		{
			...base,
			id: 'sample-3',
			depth: 2,
			type: 'task',
			text: 'Book the venue',
			tasks: { done: 0, total: 1 },
			assignees: ['Grace'],
			due: null,
		},
	];
}

/**
 * A first mock answer for `refresh`: an object with each field the kind's refresh sets,
 * so the author only has to adjust values. Plugins read the answer however they like
 * (`issue.json.title`), so this is a starting point, not a contract.
 */
export function defaultMockAnswer(kind: PluginNodeKind): string {
	const answer: Record<string, string | number | boolean> = {};
	for (const [name, spec] of Object.entries(kind.fields)) {
		if (!('setBy' in spec) || spec.setBy !== 'refresh') continue;
		switch (spec.type) {
			case 'enum':
				answer[name] = spec.options[0];
				break;
			case 'number':
			case 'integer':
				answer[name] = 1;
				break;
			case 'boolean':
				answer[name] = true;
				break;
			default:
				answer[name] = `Example ${spec.title.toLowerCase()}`;
		}
	}
	return JSON.stringify(answer, null, 2);
}

/** What the preview remembers on the draft: sample data per kind, and the mock answer. */
export interface PlaygroundSample {
	kinds?: Record<string, PluginData>;
	mock?: string;
}

/**
 * Trims a sample so its JSON fits the draft's size limit: other kinds' data go first,
 * then the mock answer, then everything. Saving the draft never fails over sample data.
 */
export function fitSample(
	sample: PlaygroundSample,
	currentKind: string,
	maxBytes: number
): PlaygroundSample {
	const size = (value: unknown) => JSON.stringify(value).length;
	if (size(sample) <= maxBytes) return sample;

	const current = sample.kinds?.[currentKind];
	const withoutOthers: PlaygroundSample = {
		...(current ? { kinds: { [currentKind]: current } } : {}),
		...(sample.mock === undefined ? {} : { mock: sample.mock }),
	};
	if (size(withoutOthers) <= maxBytes) return withoutOthers;

	const withoutMock: PlaygroundSample = current
		? { kinds: { [currentKind]: current } }
		: {};
	return size(withoutMock) <= maxBytes ? withoutMock : {};
}
