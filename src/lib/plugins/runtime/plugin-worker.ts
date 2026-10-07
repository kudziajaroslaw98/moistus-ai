import {
	createPluginWorkerHandler,
	type PluginWorkerRequest,
	type PluginWorkerResponse,
} from '@/lib/plugins/runtime/worker-protocol';
import variant from '@jitl/quickjs-singlefile-browser-release-sync';
import {
	memoizePromiseFactory,
	newQuickJSWASMModuleFromVariant,
} from 'quickjs-emscripten-core';

// Plugin worker entry. The single-file build embeds the WASM, so nothing else is fetched.
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
