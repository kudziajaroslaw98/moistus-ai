import type { PluginIconKey } from '@/lib/plugins/manifest-schema';
import {
	NETWORK_EXAMPLE_JS,
	NETWORK_EXAMPLE_MANIFEST,
} from '@/lib/plugins/network-example';
import {
	STARTER_MANIFEST_JSON,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';

/** Two empty-ish files that already pass every check: one kind, one text field. */
const BLANK_MANIFEST_JSON = `${JSON.stringify(
	{
		id: 'dev.yourname.plugin',
		name: 'My plugin',
		version: '0.1.0',
		apiVersion: 1,
		author: 'Your name',
		description: 'Describe what it does in one line.',
		icon: 'puzzle',
		permissions: ['node:own'],
		main: 'plugin.js',
		nodeKinds: [
			{
				kind: 'thing',
				label: 'Thing',
				description: 'What one node of this kind is',
				icon: 'puzzle',
				labelField: 'title',
				fields: {
					title: { type: 'string', title: 'Title', required: true },
				},
				examples: ['My first thing'],
			},
		],
	},
	null,
	2
)}\n`;

const BLANK_PLUGIN_JS = `definePlugin({
  kinds: {
    thing: {
      // Draws the node. Return a view built with ui.
      render(data, ctx) {
        return ui.stack({ gap: 2 }, [
          ui.text(data.title, { tone: 'strong' }),
        ]);
      },
      // Plain text for search, AI and exports.
      summary: (data) => data.title,
    },
  },
});
`;

export type PlaygroundTemplateId =
	'blank' | 'counter' | 'branch-progress' | 'github-issue';

export interface PlaygroundTemplate {
	id: PlaygroundTemplateId;
	name: string;
	/** What a person types in the node editor to add one. */
	trigger: string;
	description: string;
	/** The icon its manifest names. */
	icon: PluginIconKey;
	/** Its manifest's permissions, to say what it can reach. */
	permissions: string[];
}

export const PLAYGROUND_TEMPLATES: PlaygroundTemplate[] = [
	{
		id: 'blank',
		name: 'Blank',
		trigger: '$thing',
		description:
			'Two files with the manifest filled in and one empty node kind.',
		icon: 'puzzle',
		permissions: ['node:own'],
	},
	{
		id: 'counter',
		name: 'Counter',
		trigger: '$counter',
		description: 'Count anything with a + button. The plugin the guide builds.',
		icon: 'puzzle',
		permissions: ['node:own'],
	},
	{
		id: 'branch-progress',
		name: 'Branch progress',
		trigger: '$progress',
		description: 'How many tasks are done in the branch under the node.',
		icon: 'list-checks',
		permissions: ['node:own', 'branch:read'],
	},
	{
		id: 'github-issue',
		name: 'GitHub issue',
		trigger: '$issue',
		description:
			'Shows a public issue. Asks GitHub only when someone refreshes the node.',
		icon: 'git',
		permissions: [...NETWORK_EXAMPLE_MANIFEST.permissions],
	},
];

export interface TemplateFiles {
	manifestText: string;
	code: string;
}

const BRANCH_PROGRESS_FOLDER = '/plugins/shiko.branch-progress/0.1.0';

async function fetchText(
	url: string,
	fetchImpl: typeof fetch
): Promise<string> {
	const response = await fetchImpl(url, { cache: 'no-store' });
	if (!response.ok) throw new Error(`Couldn’t load the template (${url}).`);
	return response.text();
}

/**
 * The two files a template starts from. Branch progress is one of Shiko's own plugins, so
 * its files are read from where the app serves them; Shiko replaces its id when the draft
 * is created.
 */
export async function loadTemplateFiles(
	id: PlaygroundTemplateId,
	// Looked up when needed, so templates that don't fetch work where `fetch` doesn't exist.
	fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<TemplateFiles> {
	switch (id) {
		case 'blank':
			return { manifestText: BLANK_MANIFEST_JSON, code: BLANK_PLUGIN_JS };
		case 'counter':
			return { manifestText: STARTER_MANIFEST_JSON, code: STARTER_PLUGIN_JS };
		case 'github-issue':
			return {
				manifestText: `${JSON.stringify(NETWORK_EXAMPLE_MANIFEST, null, 2)}\n`,
				code: NETWORK_EXAMPLE_JS,
			};
		case 'branch-progress': {
			const [manifestText, code] = await Promise.all([
				fetchText(`${BRANCH_PROGRESS_FOLDER}/manifest.json`, fetchImpl),
				fetchText(`${BRANCH_PROGRESS_FOLDER}/plugin.js`, fetchImpl),
			]);
			return { manifestText, code };
		}
	}
}
