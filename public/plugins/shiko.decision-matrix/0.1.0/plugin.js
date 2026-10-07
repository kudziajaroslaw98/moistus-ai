// Decision matrix: score options against your criteria and see which one wins.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// Scores s1–s4 line up with the criteria in order; a missing score counts as 0.

function list(data, field) {
	return Array.isArray(data[field]) ? data[field] : [];
}

function scored(data) {
	const criteria = list(data, 'criteria');
	return list(data, 'options').map((option) => {
		const scores = criteria.map((_criterion, index) => {
			const score = option['s' + (index + 1)];
			return typeof score === 'number' ? score : null;
		});
		const total = scores.reduce((sum, score) => sum + (score || 0), 0);
		return { option, scores, total };
	});
}

definePlugin({
	kinds: {
		decision: {
			render(data) {
				const criteria = list(data, 'criteria');
				const rows = scored(data);
				const best = rows.reduce((max, row) => Math.max(max, row.total), 0);
				const children = [ui.text(data.label, { tone: 'strong' })];

				if (criteria.length === 0 || rows.length === 0) {
					children.push(
						ui.text(
							criteria.length === 0
								? 'Add what matters: criteria:["Price", "Battery"]'
								: 'Add options: options:[["Air", 3, 5]]',
							{ size: 'sm', tone: 'muted' }
						)
					);
					return ui.stack({ gap: 3 }, children);
				}

				rows.forEach((row, index) => {
					if (index > 0) children.push(ui.divider({ key: 'divider-' + row.option.id }));
					const name = [ui.text(row.option.name, { weight: 'medium' })];
					if (best > 0 && row.total === best) name.push(ui.badge('Best', { tone: 'success' }));
					children.push(
						ui.stack({ key: row.option.id, gap: 1 }, [
							ui.row({ justify: 'between', align: 'center', gap: 2 }, [
								ui.row({ gap: 2, align: 'center' }, name),
								ui.text(row.total + ' pts', { weight: 'semibold' }),
							]),
							ui.text(
								criteria
									.map((criterion, i) => criterion.name + ' ' + (row.scores[i] === null ? '–' : row.scores[i]))
									.join(' · '),
								{ size: 'sm', tone: 'muted' }
							),
						])
					);
				});
				return ui.stack({ gap: 3 }, children);
			},

			summary(data) {
				const rows = scored(data);
				if (rows.length === 0) return data.label;
				const top = rows.reduce((best, row) => (row.total > best.total ? row : best), rows[0]);
				return data.label + ': ' + top.option.name + ' leads with ' + top.total;
			},
		},
	},
});
