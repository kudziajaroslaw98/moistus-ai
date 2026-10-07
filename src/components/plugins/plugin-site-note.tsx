'use client';

import type { PluginSite } from '@/lib/plugins/powers';
import type { ReactNode } from 'react';

/** "api.github.com, run by GitHub (privacy policy)" with the policy as a link. */
export function PluginSiteName({ site }: { site: PluginSite }) {
	return (
		<>
			<strong className='font-semibold text-text-primary'>{site.host}</strong>

			{`, run by ${site.operator} (`}

			<a
				className='nodrag underline decoration-white/30 underline-offset-2 [@media(hover:hover)]:hover:decoration-white/70'
				href={site.privacyPolicy}
				onClick={(event) => event.stopPropagation()}
				rel='noopener noreferrer'
				target='_blank'
			>
				privacy policy
			</a>
			)
		</>
	);
}

/**
 * Where a network plugin's data goes, one sentence per site:
 * "<lead> the issue addresses in this node to api.github.com, run by GitHub (privacy policy)."
 */
export function PluginSitesSentence({
	lead,
	sites,
	scope,
}: {
	/** "Refresh sends", "Creating this node sends". */
	lead: string;
	sites: readonly PluginSite[];
	/** "in this node", "typed into its nodes". */
	scope: string;
}): ReactNode {
	return sites.map((site, index) => (
		<span key={site.host}>
			{index > 0 ? ' ' : ''}

			{`${lead} the ${site.sends} ${scope} to `}

			<PluginSiteName site={site} />.
		</span>
	));
}
