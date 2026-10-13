// Metric: track a number against a target.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// 0.2.0: trend arrow (set by − and +, or typed as trend:up) and decimal rounding fix.
// Reads 0.1.0 data unchanged: `trend` is optional.

function round(value) {
	// Nudge before rounding so 1.005 becomes 1.01, not 1 (floating point).
	return (Math.sign(value) * Math.round(Math.abs(value) * 100 + 1e-6)) / 100;
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

const TREND_ICONS = {
	up: { name: 'arrow-up', tone: 'success' },
	down: { name: 'arrow-down', tone: 'danger' },
};

function read(data) {
	const value = typeof data.value === 'number' ? data.value : 0;
	const target = typeof data.target === 'number' ? data.target : 0;
	const step = typeof data.step === 'number' ? data.step : 1;
	const unit = typeof data.unit === 'string' ? data.unit : '';
	const trend = typeof data.trend === 'string' ? data.trend : 'flat';
	const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
	return {
		label: data.label || 'Metric',
		value,
		target,
		step,
		unit,
		trend,
		ratio,
	};
}

definePlugin({
	kinds: {
		metric: {
			render(data, ctx) {
				const metric = read(data);
				const badge = status(metric.ratio);
				const trendIcon = TREND_ICONS[metric.trend];
				const valueRow = [
					ui.text(formatNumber(metric.value), {
						size: 'xl',
						weight: 'semibold',
					}),
				];
				if (trendIcon) valueRow.push(ui.icon(trendIcon.name, { tone: trendIcon.tone }));
				valueRow.push(
					ui.text(
						'/ ' +
							formatNumber(metric.target) +
							(metric.unit ? ' ' + metric.unit : ''),
						{ tone: 'muted' }
					)
				);

				const children = [
					ui.row({ justify: 'between', align: 'center', gap: 2 }, [
						ui.text(metric.label, { tone: 'strong' }),
						ui.badge(badge.label, { tone: badge.tone }),
					]),
					ui.row({ gap: 2, align: 'baseline' }, valueRow),
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
					(metric.unit ? ' ' + metric.unit : '') +
					(metric.trend === 'up' ? ' (up)' : metric.trend === 'down' ? ' (down)' : '')
				);
			},

			actions: {
				increment(data) {
					const metric = read(data);
					return Object.assign({}, data, {
						value: round(metric.value + metric.step),
						trend: 'up',
					});
				},
				decrement(data) {
					const metric = read(data);
					return Object.assign({}, data, {
						value: round(metric.value - metric.step),
						trend: 'down',
					});
				},
			},
		},
	},
});
