// ELK.js Web Worker for background layout processing
// This file is served from the public directory and can be used by ELK.js

// Import ELK.js - using importScripts for web worker compatibility
importScripts('https://unpkg.com/elkjs@0.10.0/lib/elk-worker.min.js');

// Message handler for layout requests
self.addEventListener('message', async (event) => {
	const { type, graph, options, requestId } = event.data;

	// Handle different message types
	switch (type) {
		case 'LAYOUT_REQUEST':
			try {
				// Validate input
				if (!graph) {
					throw new Error('Graph data is required');
				}

				// Create ELK instance
				const ELK = self.ELK || self.elk;

				if (!ELK) {
					throw new Error('ELK.js not available in worker');
				}

				const elk = new ELK();

				// Perform layout computation
				const result = await elk.layout(graph, options || {});

				// Send success response
				self.postMessage({
					type: 'LAYOUT_SUCCESS',
					result,
					requestId,
				});
			} catch (error) {
				// Send error response
				self.postMessage({
					type: 'LAYOUT_ERROR',
					error: error.message || 'Unknown error occurred',
					requestId,
				});
			}

			break;

		case 'WORKER_INIT':
			// Send ready confirmation
			self.postMessage({
				type: 'WORKER_READY',
				message: 'ELK layout worker initialized successfully',
			});
			break;

		case 'WORKER_TERMINATE':
			// Terminate worker
			self.close();
			break;

		default:
			// Unknown message type
			self.postMessage({
				type: 'WORKER_ERROR',
				error: `Unknown message type: ${type}`,
				requestId,
			});
	}
});

// Handle worker errors
self.addEventListener('error', (error) => {
	self.postMessage({
		type: 'WORKER_ERROR',
		error: error.message || 'Worker error occurred',
	});
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
	self.postMessage({
		type: 'WORKER_ERROR',
		error: event.reason?.message || 'Unhandled promise rejection in worker',
	});
});

// Initialize worker
self.postMessage({
	type: 'WORKER_INITIALIZED',
	message: 'ELK worker script loaded',
});
