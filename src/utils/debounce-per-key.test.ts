import { debouncePerKey } from '@/utils/debounce-per-key';

describe('debouncePerKey', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('flushes a pending key immediately', async () => {
		const fn = jest.fn();
		const debounced = debouncePerKey(fn, 500, (key: string) => key);

		debounced('node-1');
		expect(fn).not.toHaveBeenCalled();

		await debounced.flush('node-1');
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('node-1');
	});

	it('flushAll drains all pending keys once', async () => {
		const fn = jest.fn();
		const debounced = debouncePerKey(fn, 500, (key: string) => key);

		debounced('node-1');
		debounced('node-2');
		debounced('node-1');
		expect(fn).not.toHaveBeenCalled();

		await debounced.flushAll();
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenNthCalledWith(1, 'node-1');
		expect(fn).toHaveBeenNthCalledWith(2, 'node-2');

		jest.advanceTimersByTime(1000);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

