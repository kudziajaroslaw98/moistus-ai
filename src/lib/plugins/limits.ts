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

/** Requests a plugin's `refresh` can make (fetched by Shiko, see network.ts). */
export const PLUGIN_REQUEST_LIMITS = {
	/** Requests one refresh can make. */
	perRefresh: 4,
	timeoutMs: 10_000,
	responseBytes: 256 * 1024,
	urlLength: 2048,
} as const;
