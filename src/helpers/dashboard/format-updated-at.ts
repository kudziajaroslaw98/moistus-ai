const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (count: number, unit: string) =>
	`${count} ${unit}${count === 1 ? '' : 's'} ago`;

/**
 * Dashboard "last edited" label: relative for the past week
 * ("2 hours ago", "Yesterday"), then "Sep 28", then "Mar 2, 2025".
 */
export function formatUpdatedAt(iso: string, now: Date = new Date()): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';

	const diff = now.getTime() - date.getTime();

	if (diff < MINUTE) return 'Just now';
	if (diff < HOUR) return plural(Math.floor(diff / MINUTE), 'minute');
	if (diff < DAY) return plural(Math.floor(diff / HOUR), 'hour');
	if (diff < 2 * DAY) return 'Yesterday';
	if (diff < 7 * DAY) return plural(Math.floor(diff / DAY), 'day');

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
	});
}
