// Workload: who has what in the nodes under this one (people named with @).
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// ctx.branch lists the nodes under this node (read-only).

const MAX_PEOPLE = 10;

function openTasks(node) {
	return node.tasks ? node.tasks.total - node.tasks.done : 0;
}

function people(branch) {
	const byName = {};
	let unassigned = 0;
	for (const node of branch) {
		// Other plugin nodes (a progress bar, a list of dates) aren't work to assign.
		if (node.type === 'plugin') continue;
		if (!node.assignees || node.assignees.length === 0) {
			unassigned += 1;
			continue;
		}
		for (const name of node.assignees) {
			const person = byName[name] || (byName[name] = { name, nodes: 0, open: 0 });
			person.nodes += 1;
			person.open += openTasks(node);
		}
	}
	const list = Object.keys(byName)
		.map((name) => byName[name])
		.sort((a, b) => b.open - a.open || b.nodes - a.nodes || (a.name < b.name ? -1 : 1));
	return { list, unassigned };
}

function describe(person) {
	const nodes = person.nodes + (person.nodes === 1 ? ' node' : ' nodes');
	return person.open > 0 ? person.open + (person.open === 1 ? ' open task · ' : ' open tasks · ') + nodes : nodes;
}

definePlugin({
	kinds: {
		workload: {
			render(data, ctx) {
				const { list, unassigned } = people(ctx.branch || []);
				const children = [ui.text(data.label || 'Workload', { tone: 'strong' })];
				if (list.length === 0) {
					children.push(
						ui.text('No one is assigned under this node. Name people with @ in a node.', {
							size: 'sm',
							tone: 'muted',
						})
					);
					return ui.stack({ gap: 3 }, children);
				}
				for (const person of list.slice(0, MAX_PEOPLE)) {
					children.push(
						ui.row({ key: person.name, justify: 'between', align: 'center', gap: 2 }, [
							ui.text('@' + person.name),
							ui.badge(describe(person), { tone: person.open > 0 ? 'info' : 'neutral' }),
						])
					);
				}
				const extra = [];
				if (list.length > MAX_PEOPLE) extra.push(list.length - MAX_PEOPLE + ' more people');
				if (unassigned > 0) extra.push(unassigned + (unassigned === 1 ? ' node' : ' nodes') + ' not assigned');
				if (extra.length) children.push(ui.text(extra.join(' · '), { size: 'sm', tone: 'muted' }));
				return ui.stack({ gap: 2 }, children);
			},

			summary(data) {
				return data.label || 'Workload';
			},
		},
	},
});
