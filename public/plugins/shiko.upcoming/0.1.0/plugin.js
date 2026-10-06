// Upcoming: the dated nodes under this one (^friday, ^2026-11-12), soonest first.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// ctx.branch lists the nodes under this node and ctx.today is the viewer's date.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayNumber(text) {
	const [year, month, day] = String(text).split('-').map(Number);
	return Date.UTC(year, month - 1, day) / 86400000;
}

function formatDate(text) {
	const [year, month, day] = String(text).split('-').map(Number);
	return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] + ' ' + day + ' ' + MONTHS[month - 1];
}

function isDone(node) {
	return node.status === 'completed' || Boolean(node.tasks && node.tasks.total > 0 && node.tasks.done === node.tasks.total);
}

function when(due, today) {
	const days = dayNumber(due) - dayNumber(today);
	if (days < 0) return { label: -days === 1 ? '1 day late' : -days + ' days late', tone: 'danger' };
	if (days === 0) return { label: 'Today', tone: 'warning' };
	if (days === 1) return { label: 'Tomorrow', tone: 'warning' };
	if (days < 7) return { label: 'In ' + days + ' days', tone: 'info' };
	return { label: formatDate(due), tone: 'neutral' };
}

function shorten(text) {
	return text.length > 60 ? text.slice(0, 59) + '…' : text;
}

function dated(branch) {
	return branch
		.filter((node) => node.due && !isDone(node))
		.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
}

definePlugin({
	kinds: {
		upcoming: {
			render(data, ctx) {
				const list = dated(ctx.branch || []);
				const shown = list.slice(0, data.limit || 5);
				const children = [ui.text(data.label || 'Upcoming', { tone: 'strong' })];
				if (shown.length === 0) {
					children.push(
						ui.text('Nothing under this node is due. Add a date to a node with ^friday or ^2026-12-31.', {
							size: 'sm',
							tone: 'muted',
						})
					);
					return ui.stack({ gap: 3 }, children);
				}
				for (const node of shown) {
					const due = when(node.due, ctx.today);
					children.push(
						ui.row({ key: node.id, justify: 'between', align: 'center', gap: 2 }, [
							ui.text(shorten(node.text)),
							ui.badge(due.label, { tone: due.tone }),
						])
					);
				}
				if (list.length > shown.length) {
					const more = list.length - shown.length;
					children.push(ui.text(more + (more === 1 ? ' more date' : ' more dates'), { size: 'sm', tone: 'muted' }));
				}
				return ui.stack({ gap: 2 }, children);
			},

			summary(data) {
				return data.label || 'Upcoming';
			},
		},
	},
});
