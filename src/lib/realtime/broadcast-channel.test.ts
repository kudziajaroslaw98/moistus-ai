describe('broadcast-channel sync routing', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	function loadModule(): {
		subscribeToSyncEvents: (
			mapId: string,
			handlers: Record<string, (...args: any[]) => void>
		) => Promise<() => void>;
		subscribeToYjsGraphMutations: jest.Mock;
		subscribeToYjsSyncEvents: jest.Mock;
		emitGraphMutation: (mutation: Record<string, unknown>) => void;
	} {
		process.env = { ...originalEnv };

		let graphMutationHandler:
			| ((mutation: Record<string, unknown>) => void)
			| null = null;
		const subscribeToYjsGraphMutations = jest
			.fn()
			.mockImplementation(
				async (_roomName: string, handler: (mutation: Record<string, unknown>) => void) => {
					graphMutationHandler = handler;
					return () => undefined;
				}
			);
		const subscribeToYjsSyncEvents = jest
			.fn()
			.mockResolvedValue(() => undefined);

		jest.doMock('@/lib/realtime/yjs-provider', () => ({
			applyYjsGraphMutation: jest.fn(),
			cleanupAllYjsRooms: jest.fn(),
			clearYjsAwarenessPresence: jest.fn(),
			sendYjsSyncEvent: jest.fn(),
			setYjsAwarenessPresence: jest.fn(),
			subscribeToYjsAwareness: jest.fn().mockResolvedValue(() => undefined),
			subscribeToYjsGraphMutations,
			subscribeToYjsSyncEvents,
		}));

		const { subscribeToSyncEvents } = require('./broadcast-channel') as {
			subscribeToSyncEvents: (
				mapId: string,
				handlers: Record<string, (...args: any[]) => void>
			) => Promise<() => void>;
		};

		return {
			subscribeToSyncEvents,
			subscribeToYjsGraphMutations,
			subscribeToYjsSyncEvents,
			emitGraphMutation: (mutation: Record<string, unknown>) => {
				if (!graphMutationHandler) {
					throw new Error('Graph mutation handler is not registered');
				}
				graphMutationHandler(mutation);
			},
		};
	}

	it('routes graph handlers to graph mutations only in graph mode', async () => {
		const {
			subscribeToSyncEvents,
			subscribeToYjsGraphMutations,
			subscribeToYjsSyncEvents,
		} = loadModule();

		await subscribeToSyncEvents('map-1', { onNodeCreate: jest.fn() });

		expect(subscribeToYjsGraphMutations).toHaveBeenCalledTimes(1);
		expect(subscribeToYjsSyncEvents).toHaveBeenCalledTimes(0);
	});

	it('still subscribes to sync events for history handlers in graph mode', async () => {
		const {
			subscribeToSyncEvents,
			subscribeToYjsGraphMutations,
			subscribeToYjsSyncEvents,
		} = loadModule();

		await subscribeToSyncEvents('map-1', { onHistoryRevert: jest.fn() });

		expect(subscribeToYjsGraphMutations).toHaveBeenCalledTimes(0);
		expect(subscribeToYjsSyncEvents).toHaveBeenCalledTimes(1);
	});

	it('uses sync events for non-graph subscriptions', async () => {
		const {
			subscribeToSyncEvents,
			subscribeToYjsGraphMutations,
			subscribeToYjsSyncEvents,
		} = loadModule();

		await subscribeToSyncEvents('map-1', {});

		expect(subscribeToYjsGraphMutations).toHaveBeenCalledTimes(0);
		expect(subscribeToYjsSyncEvents).toHaveBeenCalledTimes(1);
	});

	it('prefers mutation actor/timestamp metadata over record fields', async () => {
		const { subscribeToSyncEvents, emitGraphMutation } = loadModule();
		const onNodeUpdate = jest.fn();

		await subscribeToSyncEvents('map-1', { onNodeUpdate });
		emitGraphMutation({
			entity: 'node',
			action: 'update',
			id: 'node-1',
			value: {
				id: 'node-1',
				user_id: 'creator-id',
				updated_at: '2020-01-01T00:00:00.000Z',
			},
			oldValue: null,
			actorId: 'editor-id',
			timestampMs: 123456,
		});

		expect(onNodeUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'node-1',
				userId: 'editor-id',
				timestamp: 123456,
			})
		);
	});

	it('falls back to record user_id/updated_at when mutation metadata is absent', async () => {
		const { subscribeToSyncEvents, emitGraphMutation } = loadModule();
		const onEdgeUpdate = jest.fn();

		await subscribeToSyncEvents('map-1', { onEdgeUpdate });
		emitGraphMutation({
			entity: 'edge',
			action: 'update',
			id: 'edge-1',
			value: {
				id: 'edge-1',
				user_id: 'creator-edge-id',
				updated_at: '2021-01-01T00:00:00.000Z',
			},
			oldValue: null,
			actorId: null,
			timestampMs: null,
		});

		expect(onEdgeUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'edge-1',
				userId: 'creator-edge-id',
				timestamp: Date.parse('2021-01-01T00:00:00.000Z'),
			})
		);
	});
});
