// OKR: an objective and its key results, each with progress.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.

function results(data) {
	return Array.isArray(data.results) ? data.results : [];
}

function ratio(result) {
	return result.target > 0 ? Math.max(0, Math.min(1, result.at / result.target)) : 0;
}

function formatNumber(value) {
	const rounded = Math.round(value * 100) / 100;
	const text = String(Math.abs(rounded)).split('.');
	const whole = text[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return (rounded < 0 ? '-' : '') + whole + (text[1] ? '.' + text[1] : '');
}

function overall(data) {
	const list = results(data);
	if (list.length === 0) return 0;
	return list.reduce((sum, result) => sum + ratio(result), 0) / list.length;
}

function status(value) {
	if (value >= 0.7) return { label: 'On track', tone: 'success' };
	if (value >= 0.4) return { label: 'Behind', tone: 'warning' };
	return { label: 'At risk', tone: 'danger' };
}

definePlugin({
	kinds: {
		okr: {
			render(data) {
				const list = results(data);
				const value = overall(data);
				const badge = status(value);
				const children = [
					ui.row({ justify: 'between', align: 'center', gap: 2 }, [
						ui.text(data.label, { tone: 'strong' }),
						list.length
							? ui.badge(Math.round(value * 100) + '% · ' + badge.label, { tone: badge.tone })
							: ui.badge('No key results', { tone: 'neutral' }),
					]),
				];
				for (const result of list) {
					children.push(
						ui.stack({ key: result.id, gap: 1 }, [
							ui.progress(ratio(result), { label: result.name, showValue: true }),
							ui.text(formatNumber(result.at) + ' of ' + formatNumber(result.target), {
								size: 'sm',
								tone: 'muted',
							}),
						])
					);
				}
				return ui.stack({ gap: 3 }, children);
			},

			summary(data) {
				const list = results(data);
				return (
					data.label +
					': ' +
					Math.round(overall(data) * 100) +
					'% across ' +
					list.length +
					(list.length === 1 ? ' key result' : ' key results')
				);
			},
		},
	},
});
