// Countdown: days left until a date.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// ctx.today is the viewer's local date (YYYY-MM-DD), so the count is right for them.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(text) {
	const [year, month, day] = String(text).split('-').map(Number);
	return { year, month, day };
}

function dayNumber(text) {
	const { year, month, day } = parts(text);
	return Date.UTC(year, month - 1, day) / 86400000;
}

function formatDate(text, today) {
	const { year, month, day } = parts(text);
	const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
	const sameYear = parts(today).year === year;
	return weekday + ' ' + day + ' ' + MONTHS[month - 1] + (sameYear ? '' : ' ' + year);
}

definePlugin({
	kinds: {
		countdown: {
			render(data, ctx) {
				const days = dayNumber(data.date) - dayNumber(ctx.today);
				const header = ui.row({ justify: 'between', align: 'center', gap: 2 }, [
					ui.text(data.label, { tone: 'strong' }),
					ui.badge(formatDate(data.date, ctx.today), {
						tone: days < 0 ? 'neutral' : days === 0 ? 'success' : 'info',
					}),
				]);
				if (days === 0) {
					return ui.stack({ gap: 3 }, [header, ui.text('Today', { size: 'xl', weight: 'semibold' })]);
				}
				const count = Math.abs(days);
				const unit = count === 1 ? 'day' : 'days';
				return ui.stack({ gap: 3 }, [
					header,
					ui.row({ gap: 2, align: 'baseline' }, [
						ui.text(String(count), { size: 'xl', weight: 'semibold' }),
						ui.text(days > 0 ? unit + ' to go' : unit + ' ago', { tone: 'muted' }),
					]),
				]);
			},

			summary(data) {
				return data.label + ': ' + data.date;
			},
		},
	},
});
