// Kanban: cards you move from To do to Done, inside one node.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// Every card has a stable `id` from Shiko; views key rows by it and buttons send it,
// so a move always hits the card you pressed, even if the list changed meanwhile.

const COLUMNS = [
	{ field: 'todo', title: 'To do', tone: 'neutral' },
	{ field: 'doing', title: 'Doing', tone: 'info' },
	{ field: 'done', title: 'Done', tone: 'success' },
];

function cards(data, field) {
	return Array.isArray(data[field]) ? data[field] : [];
}

function cardRow(card, index, canEdit) {
	const children = [ui.text(card.text, { tone: index === 2 ? 'muted' : 'default' })];
	if (canEdit) {
		const buttons = [];
		if (index > 0) {
			const to = COLUMNS[index - 1];
			buttons.push(ui.button(to.title, 'move', { icon: 'arrow-left', payload: { id: card.id, to: to.field } }));
		}
		if (index < COLUMNS.length - 1) {
			const to = COLUMNS[index + 1];
			buttons.push(ui.button(to.title, 'move', { icon: 'arrow-right', payload: { id: card.id, to: to.field } }));
		}
		children.push(ui.row({ gap: 1 }, buttons));
	}
	return ui.row({ key: card.id, justify: 'between', align: 'center', gap: 2, wrap: true }, children);
}

definePlugin({
	kinds: {
		kanban: {
			render(data, ctx) {
				const sections = [];
				if (data.label) sections.push(ui.text(data.label, { tone: 'strong' }));
				COLUMNS.forEach((column, index) => {
					const list = cards(data, column.field);
					if (index > 0) sections.push(ui.divider({ key: 'divider-' + column.field }));
					sections.push(
						ui.stack({ key: column.field, gap: 2 }, [
							ui.row({ justify: 'between', align: 'center' }, [
								ui.text(column.title, { size: 'sm', tone: 'muted' }),
								ui.badge(String(list.length), { tone: column.tone }),
							]),
							...(list.length
								? list.map((card) => cardRow(card, index, ctx.canEdit))
								: [ui.text('Nothing here', { size: 'sm', tone: 'muted' })]),
						])
					);
				});
				return ui.stack({ gap: 3 }, sections);
			},

			summary(data) {
				const counts = COLUMNS.map((column) => cards(data, column.field).length + ' ' + column.title.toLowerCase());
				return (data.label ? data.label + ': ' : '') + counts.join(', ');
			},

			actions: {
				move(data, payload) {
					const target = COLUMNS.find((column) => column.field === (payload && payload.to));
					if (!target) return data;
					let moved = null;
					const next = Object.assign({}, data);
					for (const column of COLUMNS) {
						const list = cards(data, column.field);
						const found = list.find((card) => card.id === payload.id);
						if (found) {
							moved = found;
							next[column.field] = list.filter((card) => card.id !== payload.id);
						}
					}
					// The card is gone (someone moved or deleted it): leave the board as it is.
					if (!moved) return data;
					next[target.field] = cards(next, target.field).concat([moved]);
					return next;
				},
			},
		},
	},
});
