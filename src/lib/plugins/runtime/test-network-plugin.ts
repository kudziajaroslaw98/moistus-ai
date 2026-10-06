/** A small network plugin for tests: shows a GitHub issue that its refresh fetches. */
export const issueManifest = {
	id: 'dev.issue',
	name: 'Issue',
	version: '0.1.0',
	apiVersion: 1,
	author: 'Test',
	description: 'A GitHub issue',
	icon: 'flag',
	permissions: ['node:own', 'network:api.github.com'],
	networkHosts: {
		'api.github.com': {
			operator: 'GitHub',
			privacyPolicy: 'https://docs.github.com/site-policy/privacy-policies',
			sends: 'issue addresses',
		},
	},
	main: 'plugin.js',
	nodeKinds: [
		{
			kind: 'issue',
			label: 'Issue',
			description: 'A GitHub issue',
			icon: 'flag',
			labelField: 'label',
			fields: {
				label: { type: 'string', title: 'Label' },
				repo: { type: 'string', title: 'Repo', required: true },
				number: { type: 'integer', title: 'Number', required: true, min: 1 },
				title: { type: 'string', title: 'Title', setBy: 'refresh' },
				state: {
					type: 'enum',
					title: 'State',
					options: ['open', 'closed'],
					setBy: 'refresh',
				},
				error: { type: 'string', title: 'Error', setBy: 'refresh' },
			},
			examples: ['Login bug repo:shiko/app number:482'],
		},
	],
};

export const issueCode = `
definePlugin({
	kinds: {
		issue: {
			render(data) {
				return ui.stack({}, [
					ui.text(data.title || data.repo + ' #' + data.number),
					ui.badge(data.state || 'not fetched'),
				]);
			},
			actions: {
				refresh(data, payload, ctx) {
					const res = ctx.request(
						'https://api.github.com/repos/' + data.repo + '/issues/' + data.number
					);
					if (res.status === 'loading') return data;
					if (res.status === 'error') return Object.assign({}, data, { error: res.message });
					return Object.assign({}, data, {
						title: res.json.title,
						state: res.json.state,
						error: '',
					});
				},
			},
		},
	},
});
`;
