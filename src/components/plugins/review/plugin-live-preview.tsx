'use client';

import { PluginUiTree } from '@/components/plugins/plugin-ui-tree';
import { pluginCallContext } from '@/lib/plugins/call-context';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import type { PluginPreview } from '@/lib/plugins/plugin-checks';
import type { PluginData } from '@/lib/plugins/plugin-fields';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface PluginLivePreviewProps {
	/** The submitted code, as stored. */
	code: string;
	manifest: PluginManifest;
	/** The example the checks drew: its kind, data and first view. */
	preview: PluginPreview;
}

/**
 * A reviewer's preview of one example that works like the node on a canvas: buttons run
 * the plugin's actions and the view redraws. Nothing is saved. It uses the app's plugin
 * host under a key of its own, so it never touches a plugin the reviewer has loaded
 * themselves, and it only loads the code on the first click.
 */
export function PluginLivePreview({
	code,
	manifest,
	preview,
}: PluginLivePreviewProps) {
	const runtimeKey = `review-preview:${manifest.id}:${useId()}`;
	const [tree, setTree] = useState(preview.tree);
	const [data, setData] = useState<PluginData>(preview.data);
	const [error, setError] = useState<string | null>(null);
	const [changed, setChanged] = useState(false);
	const busy = useRef(false);
	const loaded = useRef(false);

	// Free the sandbox when the sheet closes (only if a button was ever pressed).
	useEffect(
		() => () => {
			if (!loaded.current) return;
			loaded.current = false;
			void loadPluginHost()
				.then((host) => host.unload(runtimeKey))
				.catch(() => undefined);
		},
		[runtimeKey]
	);

	const handleAction = useCallback(
		async (action: string, payload: unknown) => {
			const kind = manifest.nodeKinds.find(
				(candidate) => candidate.kind === preview.kind
			);
			if (!kind || busy.current) return;

			busy.current = true;
			setError(null);
			try {
				const host = await loadPluginHost();
				if (!loaded.current) {
					await host.load(runtimeKey, code);
					loaded.current = true;
				}
				const ctx = pluginCallContext(true, []);
				const nextData = await host.action(
					runtimeKey,
					kind,
					action,
					data,
					payload,
					ctx
				);
				const next = await host.render(runtimeKey, kind, nextData, ctx);
				setData(nextData);
				setTree(next.tree);
				setChanged(true);
			} catch (failure) {
				setError(
					failure instanceof Error
						? failure.message
						: 'The plugin could not run'
				);
			} finally {
				busy.current = false;
			}
		},
		[code, data, manifest.nodeKinds, preview.kind, runtimeKey]
	);

	const reset = () => {
		setTree(preview.tree);
		setData(preview.data);
		setError(null);
		setChanged(false);
	};

	return (
		<div className='flex flex-col gap-2'>
			<div className='max-w-[320px] rounded-[10px] border border-white/6 bg-[#1e1e1e] p-4'>
				<PluginUiTree onAction={handleAction} tree={tree} />
			</div>

			<div className='flex min-h-5 items-center gap-3 text-xs text-text-tertiary'>
				<span>Try the buttons. Nothing is saved.</span>

				{changed && (
					<button
						className='inline-flex items-center gap-1 rounded-sm text-text-secondary transition-colors duration-200 ease hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
						onClick={reset}
						type='button'
					>
						<RotateCcw aria-hidden className='size-3' />
						Reset
					</button>
				)}
			</div>

			{error && (
				<p className='text-xs text-error-400' role='alert'>
					{error}
				</p>
			)}
		</div>
	);
}
