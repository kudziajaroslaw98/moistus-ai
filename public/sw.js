(() => {
	const scriptUrl = new URL('/serwist/sw.js', self.location.origin);
	const bootstrapUrl = new URL(self.location.href);
	const bypassKeys = [
		'_vercel_share',
		'x-vercel-protection-bypass',
		'x-vercel-set-bypass-cookie',
	];

	for (const key of bypassKeys) {
		const value = bootstrapUrl.searchParams.get(key);
		if (!value) {
			continue;
		}

		scriptUrl.searchParams.set(key, value);
	}

	importScripts(scriptUrl.toString());
})();
