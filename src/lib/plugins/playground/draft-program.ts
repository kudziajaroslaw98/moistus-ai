import {
	describeManifestError,
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import type { PluginHost } from '@/lib/plugins/runtime/plugin-host';

export type DraftManifestResult =
	{ ok: true; manifest: PluginManifest } | { ok: false; message: string };

/** manifest.json text to a checked manifest, or one line saying what's wrong. */
export function parseDraftManifest(text: string): DraftManifestResult {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'not valid JSON';
		return { ok: false, message: `manifest.json isn’t valid JSON: ${reason}` };
	}
	const parsed = pluginManifestSchema.safeParse(raw);
	return parsed.success
		? { ok: true, manifest: parsed.data }
		: { ok: false, message: describeManifestError(parsed.error) };
}

export type DraftProgram =
	{ ok: true; manifest: PluginManifest } | { ok: false; message: string };

/**
 * Loads a draft into a playground host: the manifest must be valid, the code must load
 * in the sandbox and define every node kind the manifest lists. Never throws; the
 * message is what the preview shows instead of the node.
 */
export async function loadDraftProgram(
	host: PluginHost,
	manifestText: string,
	code: string
): Promise<DraftProgram> {
	const parsed = parseDraftManifest(manifestText);
	if (!parsed.ok) return parsed;

	let defined: string[];
	try {
		defined = await host.load(parsed.manifest.id, code);
	} catch (error) {
		return {
			ok: false,
			message:
				error instanceof Error
					? error.message
					: 'plugin.js could not be loaded',
		};
	}
	const missing = parsed.manifest.nodeKinds.find(
		(kind) => !defined.includes(kind.kind)
	);
	if (missing) {
		return {
			ok: false,
			message: `plugin.js doesn’t define the “${missing.kind}” kind that manifest.json lists.`,
		};
	}
	return { ok: true, manifest: parsed.manifest };
}
