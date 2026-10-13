import {
	createPluginWorkerHandler,
	type PluginWorkerRequest,
	type PluginWorkerResponse,
} from '@/lib/plugins/runtime/worker-protocol';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import {
	memoizePromiseFactory,
	newQuickJSWASMModuleFromVariant,
} from 'quickjs-emscripten-core';

// Plugin worker entry. The WASM is a separate file: the variant loads it with
// `new URL('emscripten-module.wasm', import.meta.url)`, which the bundler emits as a
// static asset. Don't go back to the single-file build: it embeds the binary in a
// template string, and the production minifier rewrites a NUL byte followed by a digit
// as `\00`, which browsers reject ("Octal escape sequences are not allowed in template
// strings"), so the whole worker chunk fails to load and no plugin can run.
const getModule = memoizePromiseFactory(() =>
	newQuickJSWASMModuleFromVariant(variant)
);
const handle = createPluginWorkerHandler(getModule);

// The project's TS lib is DOM, where `self.postMessage` is Window's; this runs in a worker.
const workerScope = self as unknown as {
	onmessage: ((event: MessageEvent<PluginWorkerRequest>) => void) | null;
	postMessage: (message: PluginWorkerResponse) => void;
};

workerScope.onmessage = async (event) => {
	workerScope.postMessage(await handle(event.data));
};
