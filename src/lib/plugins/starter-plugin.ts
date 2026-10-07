import type { PluginManifest } from '@/lib/plugins/manifest-schema';

/**
 * The Counter plugin from the "Build a plugin" guide. The guide shows and downloads
 * exactly these files, and a test runs them in the real sandbox, so the guide's
 * code always works.
 */
export const STARTER_MANIFEST = {
	id: 'dev.yourname.counter',
	name: 'Counter',
	version: '0.1.0',
	apiVersion: 1,
	author: 'Your name',
	description: 'Count anything with − and + buttons.',
	icon: 'puzzle',
	permissions: ['node:own'],
	main: 'plugin.js',
	nodeKinds: [
		{
			kind: 'counter',
			label: 'Counter',
			description: 'A number you change with buttons',
			icon: 'puzzle',
			labelField: 'label',
			fields: {
				label: { type: 'string', title: 'Label', required: true, maxLength: 80 },
				count: { type: 'integer', title: 'Count', default: 0 },
			},
			examples: ['Coffees today count:2'],
		},
	],
} satisfies PluginManifest;

export const STARTER_MANIFEST_JSON = `${JSON.stringify(STARTER_MANIFEST, null, 2)}\n`;

export const STARTER_PLUGIN_JS = `// Counter: a number you change with − and +.
// Runs in Shiko's plugin sandbox, where only definePlugin and ui exist.

function read(data) {
  return {
    label: data.label || 'Counter',
    count: typeof data.count === 'number' ? data.count : 0,
  };
}

definePlugin({
  kinds: {
    counter: {
      // Draws the node. Runs again whenever its data changes.
      render(data, ctx) {
        const { label, count } = read(data);
        const children = [
          ui.text(label, { tone: 'strong' }),
          ui.text(String(count), { size: 'xl', weight: 'semibold' }),
        ];
        // People who can only view the map get no buttons.
        if (ctx.canEdit) {
          children.push(
            ui.row({ gap: 2 }, [
              ui.button('1', 'decrement', { icon: 'minus' }),
              ui.button('1', 'increment', { icon: 'plus' }),
            ])
          );
        }
        return ui.stack({ gap: 2 }, children);
      },

      // Plain text for search, AI and exports.
      summary(data) {
        const { label, count } = read(data);
        return label + ': ' + count;
      },

      // Each action returns the node's new data.
      actions: {
        increment(data) {
          return { ...data, count: read(data).count + 1 };
        },
        decrement(data) {
          return { ...data, count: read(data).count - 1 };
        },
      },
    },
  },
});
`;
