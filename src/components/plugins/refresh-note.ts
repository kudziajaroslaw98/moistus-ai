/**
 * Whether this person has seen where a network plugin's refresh sends data. Only a
 * convenience (the note shows again if storage is cleared or blocked), never a consent
 * record: the node editor and the first Refresh both say where data goes.
 */
const REFRESH_NOTE_KEY = 'shiko_plugin_refresh_note_v1';

const noteKey = (userId: string, pluginId: string) =>
	`${REFRESH_NOTE_KEY}:${userId}:${pluginId}`;

export function hasSeenRefreshNote(
	userId: string | null,
	pluginId: string
): boolean {
	if (!userId) return false;
	try {
		return window.localStorage.getItem(noteKey(userId, pluginId)) === '1';
	} catch {
		return false;
	}
}

export function markRefreshNoteSeen(userId: string | null, pluginId: string) {
	if (!userId) return;
	try {
		window.localStorage.setItem(noteKey(userId, pluginId), '1');
	} catch {
		// Blocked storage: the note shows again next time.
	}
}
