import metricManifest from '../../../public/plugins/shiko.metric/0.1.0/manifest.json';
import { describeManifestError, pluginManifestSchema } from './manifest-schema';

const clone = () => JSON.parse(JSON.stringify(metricManifest));

describe('pluginManifestSchema', () => {
	it('accepts the first-party Metric manifest', () => {
		const parsed = pluginManifestSchema.safeParse(metricManifest);

		expect(parsed.success).toBe(true);
		expect(parsed.data?.nodeKinds[0].kind).toBe('metric');
	});

	it('rejects ids that are not reverse-DNS', () => {
		const manifest = { ...clone(), id: 'Metric Plugin' };

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});

	it('refuses kinds that would take over built-in triggers', () => {
		const manifest = clone();
		manifest.nodeKinds[0].kind = 'task';

		const parsed = pluginManifestSchema.safeParse(manifest);
		expect(parsed.success).toBe(false);
		expect(describeManifestError(parsed.error!)).toBe(
			'nodeKinds.0.kind: This kind is reserved'
		);
	});

	it('needs the label field to be a string field', () => {
		const manifest = clone();
		manifest.nodeKinds[0].labelField = 'value';

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});

	it('refuses unknown powers and plugins without node:own', () => {
		expect(
			pluginManifestSchema.safeParse({ ...clone(), permissions: ['map:read'] })
				.success
		).toBe(false);
		expect(
			pluginManifestSchema.safeParse({
				...clone(),
				permissions: ['branch:read'],
			}).success
		).toBe(false);
	});

	it('rejects unknown keys and main paths outside the plugin', () => {
		expect(
			pluginManifestSchema.safeParse({ ...clone(), homepage: 'x' }).success
		).toBe(false);
		expect(
			pluginManifestSchema.safeParse({ ...clone(), main: '../evil.js' }).success
		).toBe(false);
		expect(
			pluginManifestSchema.safeParse({
				...clone(),
				main: 'https://evil.test/a.js',
			}).success
		).toBe(false);
	});

	it('rejects duplicate kinds', () => {
		const manifest = clone();
		manifest.nodeKinds.push(manifest.nodeKinds[0]);

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});
});

const github = {
	operator: 'GitHub',
	privacyPolicy: 'https://docs.github.com/site-policy/privacy-policies',
	sends: 'issue addresses',
};

/** Metric with the given powers (and who runs each site). */
function withPowers(
	permissions: string[],
	networkHosts?: Record<string, unknown>
) {
	return { ...clone(), permissions, ...(networkHosts ? { networkHosts } : {}) };
}

function problem(manifest: unknown): string | null {
	const parsed = pluginManifestSchema.safeParse(manifest);
	return parsed.success ? null : describeManifestError(parsed.error);
}

describe('plugin powers', () => {
	it('accepts reading the branch, or reaching sites that say who runs them', () => {
		expect(problem(withPowers(['node:own', 'branch:read']))).toBeNull();
		expect(
			problem(
				withPowers(['node:own', 'network:api.github.com'], {
					'api.github.com': github,
				})
			)
		).toBeNull();
	});

	it('never gives one plugin both the branch and a site', () => {
		expect(
			problem(
				withPowers(['node:own', 'branch:read', 'network:api.github.com'], {
					'api.github.com': github,
				})
			)
		).toBe(
			'permissions: A plugin can reach sites or read the branch, not both'
		);
	});

	it('needs who runs each site, and nothing for sites it does not reach', () => {
		expect(problem(withPowers(['node:own', 'network:api.github.com']))).toBe(
			'networkHosts: Say who runs api.github.com: networkHosts["api.github.com"]'
		);
		expect(
			problem(withPowers(['node:own'], { 'api.github.com': github }))
		).toContain("api.github.com isn't in permissions");
		expect(
			problem(
				withPowers(['node:own', 'network:api.github.com'], {
					'api.github.com': {
						...github,
						privacyPolicy: 'http://github.com/privacy',
					},
				})
			)
		).toContain('privacyPolicy must be an https link');
	});

	it.each([
		'127.0.0.1',
		'localhost',
		'printer.local',
		'db.internal',
		'api.github.com:8443',
		'API.GitHub.com',
		'https://api.github.com',
		'[::1]',
	])('refuses %s as a site', (host) => {
		expect(
			problem(withPowers(['node:own', `network:${host}`], { [host]: github }))
		).not.toBeNull();
	});

	it('allows up to three sites', () => {
		const hosts = [
			'a.example.org',
			'b.example.org',
			'c.example.org',
			'd.example.org',
		];
		const info = Object.fromEntries(hosts.map((host) => [host, github]));
		expect(
			problem(
				withPowers(
					['node:own', ...hosts.slice(0, 3).map((h) => `network:${h}`)],
					Object.fromEntries(hosts.slice(0, 3).map((host) => [host, github]))
				)
			)
		).toBeNull();
		expect(
			problem(
				withPowers(['node:own', ...hosts.map((h) => `network:${h}`)], info)
			)
		).not.toBeNull();
	});

	it('keeps fields set by refresh optional and needs a site for them', () => {
		const manifest = withPowers(['node:own', 'network:api.github.com'], {
			'api.github.com': github,
		});
		manifest.nodeKinds[0].fields.title = {
			type: 'string',
			title: 'Title',
			setBy: 'refresh',
		};
		expect(problem(manifest)).toBeNull();

		manifest.nodeKinds[0].fields.title.required = true;
		expect(problem(manifest)).toContain('can’t be required');

		const offline = clone();
		offline.nodeKinds[0].fields.title = {
			type: 'string',
			title: 'Title',
			setBy: 'refresh',
		};
		expect(problem(offline)).toBe(
			'nodeKinds: Fields set by refresh need a network:<host> power'
		);
	});
});

describe('node links', () => {
	/** Metric with a list of rows that hold node ids, the way Threads keeps its stops. */
	function withStops(extra: Record<string, unknown> = {}) {
		const manifest = withPowers(['node:own', 'nodes:refs']);
		manifest.nodeKinds[0].fields.stops = {
			type: 'list',
			title: 'Stops',
			setBy: 'action',
			maxItems: 100,
			columns: [
				{ name: 'thread', type: 'string', title: 'Thread' },
				{ name: 'node', type: 'string', title: 'Node', ref: 'node' },
			],
			...extra,
		};
		return manifest;
	}

	it('accepts a list of node ids set by actions, with the nodes:refs power', () => {
		expect(problem(withStops())).toBeNull();
	});

	it('needs the nodes:refs power for fields that hold node ids', () => {
		const manifest = withStops();
		manifest.permissions = ['node:own'];
		expect(problem(manifest)).toBe(
			'permissions: Fields that hold node ids need the "nodes:refs" power'
		);
	});

	it('only lets actions set node ids, so they are never typed', () => {
		const manifest = withStops();
		delete (manifest.nodeKinds[0].fields.stops as Record<string, unknown>).setBy;
		expect(problem(manifest)).toContain('is set by an action');

		const field = withPowers(['node:own', 'nodes:refs']);
		field.nodeKinds[0].fields.linked = { type: 'string', title: 'Linked', ref: 'node' };
		expect(problem(field)).toContain('add setBy: "action"');
	});

	it('keeps fields set by an action optional and out of the label', () => {
		const manifest = withStops({ required: true });
		expect(problem(manifest)).toContain('A field set by action can’t be required');
	});

	it('never lets one plugin read linked nodes and reach a site', () => {
		expect(
			problem(
				withPowers(['node:own', 'nodes:refs', 'network:api.github.com'], {
					'api.github.com': github,
				})
			)
		).toBe(
			'permissions: A plugin can reach sites or read the nodes it links to, not both'
		);
	});

	it('allows up to 100 rows in a list and no more', () => {
		expect(problem(withStops({ maxItems: 100 }))).toBeNull();
		expect(problem(withStops({ maxItems: 101 }))).not.toBeNull();
	});
});

describe('checklists', () => {
	function withChecklist(columns: unknown[], extra: Record<string, unknown> = {}) {
		const manifest = clone();
		manifest.nodeKinds[0].fields.threads = {
			type: 'list',
			title: 'Threads',
			syntax: 'checklist',
			columns,
			...extra,
		};
		return manifest;
	}
	const text = { name: 'text', type: 'string', title: 'Thread' };
	const status = { name: 'status', type: 'enum', title: 'Status', options: ['open', 'resolved', 'dropped'] };

	it('is a list of text and a status of up to three options', () => {
		expect(problem(withChecklist([text, status]))).toBeNull();
		expect(problem(withChecklist([text, { ...status, options: ['open', 'done'] }]))).toBeNull();
	});

	it('refuses other shapes', () => {
		expect(problem(withChecklist([text]))).toContain('A checklist has two columns');
		expect(problem(withChecklist([status, text]))).toContain('A checklist has two columns');
		expect(
			problem(withChecklist([text, { ...status, options: ['a', 'b', 'c', 'd'] }]))
		).toContain('A checklist has two columns');
	});

	it('is typed in the editor, and only one list per kind can be one', () => {
		expect(problem(withChecklist([text, status], { setBy: 'action' }))).toContain(
			'A checklist is typed in the editor'
		);
		const two = withChecklist([text, status]);
		two.nodeKinds[0].fields.more = { type: 'list', title: 'More', syntax: 'checklist', columns: [text, status] };
		expect(problem(two)).toContain('Only one list per kind can be a checklist');
	});
});
