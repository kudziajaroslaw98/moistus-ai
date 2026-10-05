'use client';

import { PluginNodeContent } from '@/components/nodes/content/plugin-node-content';
import type { ParsedPluginFields } from '@/lib/plugins/plugin-fields';
import type { ActivePluginKind } from '@/types/plugins';
import { AlertCircle } from 'lucide-react';

interface PluginEditorPreviewProps {
	active: ActivePluginKind | null;
	parsed: ParsedPluginFields | null;
	hasInput: boolean;
}

/**
 * Node editor preview for plugin node kinds: the plugin draws the draft live (no
 * actions), and field errors explain what's missing before Create is allowed.
 */
export function PluginEditorPreview({
	active,
	parsed,
	hasInput,
}: PluginEditorPreviewProps) {
	if (!active) {
		return (
			<p className='px-4 py-4 text-sm text-zinc-500 sm:px-6 sm:py-6'>
				This plugin isn’t running on this map, so it can’t be previewed.
			</p>
		);
	}
	if (!hasInput || !parsed) {
		return (
			<p className='px-4 py-4 text-sm text-zinc-500 sm:px-6 sm:py-6'>
				Start typing to preview.
			</p>
		);
	}

	return (
		<div
			className='flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6'
			data-testid='plugin-editor-preview'
		>
			{parsed.errors.length > 0 ? (
				<ul className='flex flex-col gap-1.5' aria-label='Fields to fix'>
					{parsed.errors.map((error) => (
						<li
							className='flex items-start gap-2 text-sm text-amber-400/90'
							key={error.field}
						>
							<AlertCircle aria-hidden className='mt-0.5 size-3.5 shrink-0' />

							{error.message}
						</li>
					))}
				</ul>
			) : (
				<div className='rounded-[10px] border border-white/6 bg-elevation-1 p-4'>
					<PluginNodeContent
						canEdit
						preview
						nodeId={null}
						extension={{
							pluginId: active.manifest.id,
							kind: active.kind.kind,
							kindLabel: active.kind.label,
							version: active.manifest.version,
							data: parsed.data,
						}}
					/>
				</div>
			)}
		</div>
	);
}
