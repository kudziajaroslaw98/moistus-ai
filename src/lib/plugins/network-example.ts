import type { PluginManifest } from '@/lib/plugins/manifest-schema';

/**
 * The GitHub issue example from the "Build a plugin" guide's Powers section. The guide
 * shows exactly this code, and a test runs both refresh passes in the real sandbox, so
 * the example always works.
 */
export const NETWORK_EXAMPLE_MANIFEST = {
	id: 'dev.yourname.issue',
	name: 'Issue',
	version: '0.1.0',
	apiVersion: 1,
	author: 'Your name',
	description: 'A public GitHub issue’s title and state.',
	icon: 'git',
	permissions: ['node:own', 'network:api.github.com'],
	networkHosts: {
		'api.github.com': {
			operator: 'GitHub',
			privacyPolicy:
				'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement',
			sends: 'issue addresses',
		},
	},
	main: 'plugin.js',
	nodeKinds: [
		{
			kind: 'issue',
			label: 'Issue',
			description: 'A public GitHub issue',
			icon: 'git',
			labelField: 'repo',
			fields: {
				repo: { type: 'string', title: 'Repository', required: true, maxLength: 140 },
				number: { type: 'integer', title: 'Number', required: true, min: 1 },
				title: { type: 'string', title: 'Title', setBy: 'refresh', maxLength: 200 },
				state: {
					type: 'enum',
					title: 'State',
					options: ['open', 'closed'],
					setBy: 'refresh',
				},
			},
			examples: ['vercel/next.js number:1'],
		},
	],
} satisfies PluginManifest;

/** The part of the manifest the Powers section shows. */
export const NETWORK_EXAMPLE_MANIFEST_EXCERPT = `${JSON.stringify(
	{
		permissions: NETWORK_EXAMPLE_MANIFEST.permissions,
		networkHosts: NETWORK_EXAMPLE_MANIFEST.networkHosts,
	},
	null,
	2
)}\n`;

export const NETWORK_EXAMPLE_JS = `definePlugin({
  kinds: {
    issue: {
      render(data) {
        return ui.stack({ gap: 2 }, [
          ui.text(data.title || data.repo + ' #' + data.number, { tone: 'strong' }),
          ui.badge(data.state || 'Not fetched', {
            tone: data.state === 'open' ? 'success' : 'neutral',
          }),
        ]);
      },

      actions: {
        // Shiko runs refresh after an editor adds or edits the node, and on Refresh.
        refresh(data, payload, ctx) {
          const answer = ctx.request(
            'https://api.github.com/repos/' + data.repo + '/issues/' + data.number
          );
          // First pass: Shiko hasn't fetched it yet. Error: keep what was saved.
          if (answer.status !== 'ok') return data;
          return { ...data, title: answer.json.title, state: answer.json.state };
        },
      },
    },
  },
});
`;
