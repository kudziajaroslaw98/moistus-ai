// Branch progress: how many tasks are done in the nodes under this one.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// ctx.branch lists the nodes under this node (read-only); the plugin can't reach any
// site, so nothing it reads leaves the browser.

function count(branch) {
	return branch.reduce(
		(sum, node) =>
			node.tasks
				? { done: sum.done + node.tasks.done, total: sum.total + node.tasks.total, lists: sum.lists + 1 }
				: sum,
		{ done: 0, total: 0, lists: 0 }
	);
}

definePlugin({
	kinds: {
		progress: {
			render(data, ctx) {
				const branch = ctx.branch || [];
				const tasks = count(branch);
				const children = [ui.text(data.label || 'Branch progress', { tone: 'strong' })];
				if (tasks.total === 0) {
					children.push(
						ui.text(
							branch.length === 0
								? 'Add nodes under this one to track them.'
								: 'No tasks under this node yet.',
							{ size: 'sm', tone: 'muted' }
						)
					);
					return ui.stack({ gap: 3 }, children);
				}
				children.push(
					ui.row({ gap: 2, align: 'baseline' }, [
						ui.text(String(tasks.done), { size: 'xl', weight: 'semibold' }),
						ui.text('of ' + tasks.total + (tasks.total === 1 ? ' task' : ' tasks') + ' done', {
							tone: 'muted',
						}),
					]),
					ui.progress(tasks.done / tasks.total, {})
				);
				return ui.stack({ gap: 3 }, children);
			},

			summary(data) {
				return data.label || 'Branch progress';
			},
		},
	},
});
