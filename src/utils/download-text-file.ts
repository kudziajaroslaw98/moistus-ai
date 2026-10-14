/** Saves text as a file in the browser (the Build guide's starter files, the playground's export). */
export function downloadTextFile(
	filename: string,
	content: string,
	type: string
) {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	// Give the browser a moment to start the download before freeing the URL.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
