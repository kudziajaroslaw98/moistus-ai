import type { QuickJSWASMModule } from 'quickjs-emscripten-core';
import { MAX_PLUGIN_CODE_BYTES } from './limits';
import {
	describeManifestError,
	networkHostsOf,
	pluginManifestSchema,
	type PluginManifest,
} from './manifest-schema';
import { checkPluginRequestUrl } from './network';
import {
	assignListRowIds,
	parsePluginFieldInput,
	validatePluginData,
	type PluginData,
} from './plugin-fields';
import { createPluginSandbox, type PluginSandbox } from './runtime/sandbox';
import { validatePluginTree, type PluginUiNode } from './ui-tree';

/**
 * The automatic checks a plugin passes before it can be submitted, and that Shiko's
 * reviewer sees again. They run the real sandbox (in the plugin worker), so they show
 * what the plugin does with its own examples, not what its code says it does.
 */

export interface PluginCheck {
	label: string;
	ok: boolean;
	/** Why it failed, when it did. */
	detail?: string;
}

/** A view the plugin drew for one of its examples (the reviewer's preview). */
export interface PluginPreview {
	kind: string;
	example: string;
	tree: PluginUiNode;
}

export interface PluginCheckResult {
	checks: PluginCheck[];
	ok: boolean;
	manifest: PluginManifest | null;
	/** Up to three example views, drawn by the sandbox. */
	previews: PluginPreview[];
}

const MAX_PREVIEWS = 3;

const CTX = { canEdit: true, today: '2026-01-15', branch: [] };

const formatKb = (bytes: number) => `${Math.max(0.1, Math.round(bytes / 102.4) / 10)} KB`;

function utf8Bytes(text: string): number {
	let bytes = 0;
	for (const char of text) {
		const code = char.codePointAt(0) ?? 0;
		bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
	}
	return bytes;
}

function actionsIn(node: PluginUiNode): Array<{ action: string; payload: unknown }> {
	if (node.type === 'button' || node.type === 'checkbox')
		return [{ action: node.action, payload: node.payload ?? null }];
	if (node.type === 'stack' || node.type === 'row') return node.children.flatMap(actionsIn);
	return [];
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export function runPluginChecks(
	QuickJS: QuickJSWASMModule,
	input: { manifest: unknown; code: string; previousManifest?: unknown }
): PluginCheckResult {
	const checks: PluginCheck[] = [];
	const previews: PluginPreview[] = [];
	const done = (manifest: PluginManifest | null): PluginCheckResult => ({
		checks,
		ok: checks.every((check) => check.ok),
		manifest,
		previews,
	});

	const parsed = pluginManifestSchema.safeParse(input.manifest);
	if (!parsed.success) {
		checks.push({
			label: 'Manifest is valid',
			ok: false,
			detail: describeManifestError(parsed.error),
		});
		return done(null);
	}
	const manifest = parsed.data;
	checks.push({ label: 'Manifest is valid', ok: true });

	const bytes = utf8Bytes(input.code);
	if (bytes > MAX_PLUGIN_CODE_BYTES) {
		checks.push({
			label: 'Code loads in the sandbox',
			ok: false,
			detail: `It's ${formatKb(bytes)}; the limit is ${formatKb(MAX_PLUGIN_CODE_BYTES)}`,
		});
		return done(manifest);
	}

	let sandbox: PluginSandbox;
	try {
		sandbox = createPluginSandbox(QuickJS, input.code);
	} catch (error) {
		checks.push({
			label: 'Code loads in the sandbox',
			ok: false,
			detail: error instanceof Error ? error.message : String(error),
		});
		return done(manifest);
	}

	try {
		const missing = manifest.nodeKinds.find((kind) => !sandbox.kinds.includes(kind.kind));
		checks.push(
			missing
				? {
						label: 'Code loads in the sandbox',
						ok: false,
						detail: `The code doesn't define "${missing.kind}"`,
					}
				: {
						label: `Code loads in the sandbox (${formatKb(bytes)} of ${formatKb(MAX_PLUGIN_CODE_BYTES)})`,
						ok: true,
					}
		);
		if (missing) return done(manifest);

		const examples = manifest.nodeKinds.flatMap((kind) =>
			kind.examples.map((example) => ({ kind, example }))
		);
		const viewProblems: string[] = [];
		const actionProblems: string[] = [];
		const requestProblems: string[] = [];
		let actionCount = 0;
		const hosts = networkHostsOf(manifest.permissions);

		for (const { kind, example } of examples) {
			const fields = parsePluginFieldInput(example, kind);
			if (fields.errors.length > 0) {
				viewProblems.push(`"${example}": ${fields.errors[0].message}`);
				continue;
			}
			const data: PluginData = assignListRowIds(kind, fields.data);
			try {
				const view = validatePluginTree(sandbox.render(kind.kind, data, CTX).tree);
				if (!view.ok) {
					viewProblems.push(`"${example}": ${view.error}`);
					continue;
				}
				if (previews.length < MAX_PREVIEWS) {
					previews.push({ kind: kind.kind, example, tree: view.tree });
				}
				for (const { action, payload } of actionsIn(view.tree)) {
					actionCount += 1;
					try {
						const next = validatePluginData(
							kind,
							sandbox.action(kind.kind, action, data, payload, CTX)
						);
						if (!next.ok)
							actionProblems.push(`${action}: ${next.errors[0]?.message ?? 'invalid data'}`);
					} catch (error) {
						actionProblems.push(`${action}: ${error instanceof Error ? error.message : error}`);
					}
				}
				if (hosts.length > 0 && sandbox.refreshKinds.includes(kind.kind)) {
					const first = sandbox.refresh(kind.kind, data, CTX, null);
					for (const url of first.requests) {
						const allowed = checkPluginRequestUrl(url, hosts);
						if (!allowed.ok) requestProblems.push(`${url}: ${allowed.message}`);
					}
				}
			} catch (error) {
				viewProblems.push(`"${example}": ${error instanceof Error ? error.message : error}`);
			}
		}

		checks.push(
			examples.length === 0
				? { label: 'Has an example to draw', ok: false, detail: 'Add examples to each node kind' }
				: viewProblems.length > 0
					? { label: 'Its examples draw valid views', ok: false, detail: viewProblems[0] }
					: {
							label: plural(
								examples.length,
								'Its example draws a valid view',
								`Its ${examples.length} examples draw valid views`
							),
							ok: true,
						}
		);
		if (actionCount > 0) {
			checks.push(
				actionProblems.length > 0
					? { label: 'Its buttons return valid data', ok: false, detail: actionProblems[0] }
					: {
							label: plural(actionCount, 'Its button returns valid data', 'Its buttons return valid data'),
							ok: true,
						}
			);
		}
		if (hosts.length > 0) {
			checks.push(
				requestProblems.length > 0
					? { label: 'Refresh asks only for its own sites', ok: false, detail: requestProblems[0] }
					: { label: 'Refresh asks only for its own sites', ok: true }
			);
		}

		if (input.previousManifest) {
			const previous = pluginManifestSchema.safeParse(input.previousManifest);
			if (previous.success) {
				const problems: string[] = [];
				for (const oldKind of previous.data.nodeKinds) {
					const newKind = manifest.nodeKinds.find((kind) => kind.kind === oldKind.kind);
					if (!newKind) {
						problems.push(`"${oldKind.kind}" is gone`);
						continue;
					}
					for (const example of oldKind.examples) {
						const saved = parsePluginFieldInput(example, oldKind).data;
						const checked = validatePluginData(newKind, saved);
						if (!checked.ok) problems.push(`"${example}": ${checked.errors[0]?.message}`);
					}
				}
				checks.push({
					label: `Reads ${previous.data.version} data`,
					ok: problems.length === 0,
					...(problems.length > 0 ? { detail: problems[0] } : {}),
				});
			}
		}

		// The sandbox blocks these anyway; flag them so the author knows the call will throw.
		const usesTextCode = /\beval\s*\(|\bnew\s+Function\s*\(|(?<![.\w])Function\s*\(/.test(input.code);
		checks.push(
			usesTextCode
				? { label: 'Doesn’t use eval or Function', ok: false, detail: 'Plugins can’t run code built from text' }
				: { label: 'Doesn’t use eval or Function', ok: true }
		);
		return done(manifest);
	} finally {
		sandbox.dispose();
	}
}
