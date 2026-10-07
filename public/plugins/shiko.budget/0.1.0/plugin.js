// Budget: add up items against a limit and tick what you paid.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// Items have stable ids from Shiko, so "paid" always ticks the item you pressed.

function items(data) {
	return Array.isArray(data.items) ? data.items : [];
}

function formatNumber(value) {
	const rounded = Math.round(value * 100) / 100;
	const text = String(Math.abs(rounded)).split('.');
	const whole = text[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return (rounded < 0 ? '-' : '') + whole + (text[1] ? '.' + text[1] : '');
}

function money(value, unit) {
	return formatNumber(value) + (unit ? ' ' + unit : '');
}

function totals(data) {
	return items(data).reduce(
		(sum, item) => ({
			spent: sum.spent + item.amount,
			paid: sum.paid + (item.paid ? item.amount : 0),
		}),
		{ spent: 0, paid: 0 }
	);
}

definePlugin({
	kinds: {
		budget: {
			render(data) {
				const unit = data.unit || '';
				const list = items(data);
				const sum = totals(data);
				const hasLimit = typeof data.limit === 'number' && data.limit > 0;
				const left = hasLimit ? data.limit - sum.spent : 0;

				const header = [ui.text(data.label, { tone: 'strong' })];
				if (hasLimit) {
					header.push(
						left >= 0
							? ui.badge(money(left, unit) + ' left', { tone: 'success' })
							: ui.badge(money(-left, unit) + ' over', { tone: 'danger' })
					);
				}
				const total = [ui.text(money(sum.spent, unit), { size: 'xl', weight: 'semibold' })];
				if (hasLimit) total.push(ui.text('/ ' + money(data.limit, unit), { tone: 'muted' }));

				const children = [
					ui.row({ justify: 'between', align: 'center', gap: 2 }, header),
					ui.row({ gap: 2, align: 'baseline' }, total),
				];
				if (hasLimit) {
					children.push(ui.progress(Math.min(1, sum.spent / data.limit), { label: 'Spent', showValue: true }));
				}
				if (list.length) {
					children.push(ui.divider());
					for (const item of list) {
						children.push(
							ui.row({ key: item.id, justify: 'between', align: 'center', gap: 2 }, [
								ui.checkbox(item.name, item.paid, 'togglePaid', { payload: { id: item.id } }),
								ui.text(money(item.amount, unit)),
							])
						);
					}
					children.push(
						ui.text('Paid ' + money(sum.paid, unit) + ' of ' + money(sum.spent, unit), {
							size: 'sm',
							tone: 'muted',
						})
					);
				}
				return ui.stack({ gap: 3 }, children);
			},

			summary(data) {
				const unit = data.unit || '';
				const sum = totals(data);
				return (
					data.label +
					': ' +
					money(sum.spent, unit) +
					(typeof data.limit === 'number' ? ' of ' + money(data.limit, unit) : '')
				);
			},

			actions: {
				togglePaid(data, payload) {
					const id = payload && payload.id;
					if (!items(data).some((item) => item.id === id)) return data;
					return Object.assign({}, data, {
						items: items(data).map((item) =>
							item.id === id ? Object.assign({}, item, { paid: !item.paid }) : item
						),
					});
				},
			},
		},
	},
});
