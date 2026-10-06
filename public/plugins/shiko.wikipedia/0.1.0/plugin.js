// Wikipedia summary: a topic's first paragraph from English Wikipedia, as plain text.
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// Refresh names one address with ctx.request; Shiko fetches it from en.wikipedia.org
// when someone editing the map saves the node or presses Refresh.

const MAX_SUMMARY = 500;

function shorten(text) {
	const clean = String(text || '').replace(/\s+/g, ' ').trim();
	if (clean.length <= MAX_SUMMARY) return clean;
	const cut = clean.slice(0, MAX_SUMMARY - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return (lastSpace > 300 ? cut.slice(0, lastSpace) : cut) + '…';
}

function articleName(topic) {
	return String(topic || '').trim().replace(/\s+/g, '_');
}

definePlugin({
	kinds: {
		wiki: {
			render(data) {
				const children = [ui.text(data.title || data.topic, { tone: 'strong' })];
				if (data.summary) {
					children.push(ui.text(data.summary, { size: 'sm' }));
				} else if (!data.error) {
					children.push(ui.text('Refresh to fetch the summary.', { size: 'sm', tone: 'muted' }));
				}
				if (data.ambiguous) {
					children.push(
						ui.text('This name has several meanings. Write a more specific topic to get one article.', {
							size: 'sm',
							tone: 'muted',
						})
					);
				}
				if (data.error) children.push(ui.text(data.error, { size: 'sm', tone: 'muted' }));
				return ui.stack({ gap: 2 }, children);
			},

			summary(data) {
				return (data.title || data.topic) + (data.summary ? ': ' + data.summary : '');
			},

			actions: {
				refresh(data, payload, ctx) {
					const response = ctx.request(
						'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(articleName(data.topic))
					);
					if (response.status === 'loading') return data;
					if (response.status === 'error') {
						return Object.assign({}, data, {
							error:
								response.code === 404
									? 'Wikipedia has no article called “' + data.topic + '”.'
									: response.message,
						});
					}
					const json = response.json || {};
					return Object.assign({}, data, {
						title: String(json.title || data.topic).slice(0, 200),
						summary: shorten(json.extract),
						ambiguous: json.type === 'disambiguation',
						error: '',
					});
				},
			},
		},
	},
});
