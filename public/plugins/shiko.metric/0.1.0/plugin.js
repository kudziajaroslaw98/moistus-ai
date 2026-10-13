// Metric: track a number against a target.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.

function round(value) {
	return Math.round(value * 100) / 100;
}

function formatNumber(value) {
	const rounded = round(value);
	const parts = String(Math.abs(rounded)).split('.');
	const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return (rounded < 0 ? '-' : '') + whole + (parts[1] ? '.' + parts[1] : '');
}

function status(ratio) {
	if (ratio >= 1) return { label: 'Reached', tone: 'success' };
	if (ratio >= 0.6) return { label: 'On track', tone: 'success' };
	if (ratio >= 0.3) return { label: 'Behind', tone: 'warning' };
	return { label: 'At risk', tone: 'danger' };
}

function read(data) {
	const value = typeof data.value === 'number' ? data.value : 0;
	const target = typeof data.target === 'number' ? data.target : 0;
	const step = typeof data.step === 'number' ? data.step : 1;
	const unit = typeof data.unit === 'string' ? data.unit : '';
	const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
	return { label: data.label || 'Metric', value, target, step, unit, ratio };
}

definePlugin({
	kinds: {
		metric: {
			render(data, ctx) {
				const metric = read(data);
				const badge = status(metric.ratio);
				const children = [
					ui.row({ justify: 'between', align: 'center', gap: 2 }, [
						ui.text(metric.label, { tone: 'strong' }),
						ui.badge(badge.label, { tone: badge.tone }),
					]),
					ui.row({ gap: 2, align: 'baseline' }, [
						ui.text(formatNumber(metric.value), {
							size: 'xl',
							weight: 'semibold',
						}),
						ui.text(
							'/ ' +
								formatNumber(metric.target) +
								(metric.unit ? ' ' + metric.unit : ''),
							{ tone: 'muted' }
						),
					]),
					ui.progress(metric.ratio, { label: 'Progress', showValue: true }),
				];
				if (ctx.canEdit && metric.step > 0) {
					children.push(
						ui.row({ gap: 2 }, [
							ui.button(formatNumber(metric.step), 'decrement', {
								icon: 'minus',
							}),
							ui.button(formatNumber(metric.step), 'increment', {
								icon: 'plus',
							}),
						])
					);
				}
				return ui.stack({ gap: 3 }, children);
			},

			summary(data) {
				const metric = read(data);
				return (
					metric.label +
					': ' +
					formatNumber(metric.value) +
					' / ' +
					formatNumber(metric.target) +
					(metric.unit ? ' ' + metric.unit : '')
				);
			},

			actions: {
				increment(data) {
					const metric = read(data);
					return Object.assign({}, data, {
						value: round(metric.value + metric.step),
					});
				},
				decrement(data) {
					const metric = read(data);
					return Object.assign({}, data, {
						value: round(metric.value - metric.step),
					});
				},
			},
		},
	},
});
