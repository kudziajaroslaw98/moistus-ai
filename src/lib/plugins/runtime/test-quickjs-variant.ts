import type { QuickJSSyncVariant } from 'quickjs-emscripten-core';

/**
 * QuickJS for Jest (Node, CommonJS). The published variant loads its WASM module with a
 * dynamic `import()`, which Jest can't run without experimental VM modules, so this
 * variant requires the same files synchronously. Test-only.
 */
export function nodeTestVariant(): QuickJSSyncVariant {
	return {
		type: 'sync',
		importFFI: async () =>
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			require('@jitl/quickjs-wasmfile-release-sync/ffi').QuickJSFFI,
		importModuleLoader: async () =>
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			require('@jitl/quickjs-wasmfile-release-sync/emscripten-module').default,
	};
}
