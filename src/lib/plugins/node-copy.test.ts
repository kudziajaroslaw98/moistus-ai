import { describeBlockedNodes, isCopyBlockedMetadata, isNodeCopyBlocked } from './node-copy';

const node = (extension?: Record<string, unknown>) => ({
	data: { metadata: extension ? { extension } : {} },
}) as never;

describe('nodes that can’t be copied', () => {
	it('are plugin nodes saved with noCopy, and nothing else', () => {
		expect(isCopyBlockedMetadata({ extension: { pluginId: 'a', noCopy: true } })).toBe(true);
		expect(isCopyBlockedMetadata({ extension: { pluginId: 'a' } })).toBe(false);
		expect(isCopyBlockedMetadata({ extension: { noCopy: 'yes' } })).toBe(false);
		expect(isCopyBlockedMetadata({})).toBe(false);
		expect(isCopyBlockedMetadata(null)).toBe(false);
		expect(isNodeCopyBlocked(node({ noCopy: true }))).toBe(true);
		expect(isNodeCopyBlocked(node())).toBe(false);
	});

	it('are named for the toast, once each', () => {
		const threads = node({ noCopy: true, kindLabel: 'Threads' });
		expect(describeBlockedNodes([threads])).toBe('The Threads node');
		expect(describeBlockedNodes([threads, threads])).toBe('Threads nodes');
		expect(
			describeBlockedNodes([threads, node({ noCopy: true, kindLabel: 'Links' })])
		).toBe('Threads and Links nodes');
	});
});
