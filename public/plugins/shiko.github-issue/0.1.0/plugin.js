// GitHub issue: a public issue or pull request's title, state and labels.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// The plugin can't fetch anything itself: its refresh names one address with
// ctx.request, and Shiko fetches it from api.github.com (no cookies, no redirects)
// when someone editing the map saves the node or presses Refresh.

const ISSUE_PATTERN = /^(?:https:\/\/github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:#|\/(?:issues|pull)\/)(\d{1,9})\/?$/;

function parseIssue(text) {
	const match = ISSUE_PATTERN.exec(String(text || '').trim());
	return match ? { owner: match[1], repo: match[2], number: Number(match[3]) } : null;
}

function reference(issue) {
	return issue.owner + '/' + issue.repo + ' #' + issue.number;
}

const STATE = {
	open: { label: 'Open', tone: 'success' },
	closed: { label: 'Closed', tone: 'neutral' },
	merged: { label: 'Merged', tone: 'info' },
};

function problemFor(response) {
	if (response.code === 404) return 'GitHub has no public issue at that address.';
	if (response.code === 403 || response.code === 429) {
		return 'GitHub limits requests without an account. Try again in a while.';
	}
	return response.message;
}

definePlugin({
	kinds: {
		github: {
			render(data) {
				const issue = parseIssue(data.issue);
				if (!issue) {
					return ui.stack({ gap: 2 }, [
						ui.text(data.issue, { tone: 'strong' }),
						ui.text('Write owner/repo#123 or paste the issue’s github.com link.', {
							size: 'sm',
							tone: 'muted',
						}),
					]);
				}
				const state = STATE[data.state];
				const children = [
					ui.row({ justify: 'between', align: 'center', gap: 2 }, [
						ui.text(reference(issue) + (data.pull ? ' · pull request' : ''), { size: 'sm', tone: 'muted' }),
						state ? ui.badge(state.label, { tone: state.tone }) : ui.badge('Not fetched', { tone: 'neutral' }),
					]),
					ui.text(data.title || 'Refresh to fetch the title', {
						tone: data.title ? 'strong' : 'muted',
					}),
				];
				if (Array.isArray(data.labels) && data.labels.length) {
					children.push(
						ui.row(
							{ gap: 1, wrap: true },
							data.labels.map((label) => ui.badge(label.name, { key: label.id, tone: 'neutral' }))
						)
					);
				}
				if (data.error) children.push(ui.text(data.error, { size: 'sm', tone: 'muted' }));
				return ui.stack({ gap: 2 }, children);
			},

			summary(data) {
				const issue = parseIssue(data.issue);
				if (!issue) return String(data.issue);
				return (data.title ? data.title + ' (' : '') + reference(issue) + (data.state ? ', ' + data.state : '') + (data.title ? ')' : '');
			},

			actions: {
				refresh(data, payload, ctx) {
					const issue = parseIssue(data.issue);
					if (!issue) return Object.assign({}, data, { error: '' });
					const response = ctx.request(
						'https://api.github.com/repos/' +
							encodeURIComponent(issue.owner) +
							'/' +
							encodeURIComponent(issue.repo) +
							'/issues/' +
							issue.number
					);
					if (response.status === 'loading') return data;
					if (response.status === 'error') {
						return Object.assign({}, data, { error: problemFor(response) });
					}
					const json = response.json || {};
					const pull = Boolean(json.pull_request);
					const merged = pull && Boolean(json.pull_request.merged_at);
					const labels = Array.isArray(json.labels) ? json.labels : [];
					return Object.assign({}, data, {
						title: String(json.title || '').slice(0, 200),
						state: merged ? 'merged' : json.state === 'closed' ? 'closed' : 'open',
						pull,
						labels: labels
							.slice(0, 8)
							.map((label) => ({ name: String((label && label.name) || label).slice(0, 50) }))
							.filter((label) => label.name),
						error: '',
					});
				},
			},
		},
	},
});
