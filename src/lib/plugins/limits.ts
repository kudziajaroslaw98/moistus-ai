/**
 * Plugin runtime limits, shared by the sandbox, the loader and the build guide.
 * Kept free of runtime imports so pages can show them without loading QuickJS.
 */
export const SANDBOX_LIMITS = {
	memoryBytes: 16 * 1024 * 1024,
	stackBytes: 256 * 1024,
	loadMs: 250,
	renderMs: 50,
	actionMs: 100,
} as const;

/** Largest plugin.js the loader accepts. */
export const MAX_PLUGIN_CODE_BYTES = 256 * 1024;
