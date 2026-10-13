import { toEdgeAnimated as partykitToEdgeAnimated } from '../../partykit/edge-values';
import { toEdgeAnimated, toEdgeMarker } from './edge-values';

describe('toEdgeAnimated', () => {
	it.each([
		[true, true],
		['true', true],
		[' TRUE ', true],
		['t', true],
		[false, false],
		['false', false],
		['null', false],
		['', false],
		[null, false],
		[undefined, false],
		[1, false],
	])('%p -> %p', (value, expected) => {
		expect(toEdgeAnimated(value)).toBe(expected);
		// PartyKit keeps its own copy; it must agree.
		expect(partykitToEdgeAnimated(value)).toBe(expected);
	});
});

describe('toEdgeMarker', () => {
	it('drops missing, empty and "null" placeholders and keeps real marker ids', () => {
		expect(toEdgeMarker('null')).toBeUndefined();
		expect(toEdgeMarker(' NULL ')).toBeUndefined();
		expect(toEdgeMarker('')).toBeUndefined();
		expect(toEdgeMarker(null)).toBeUndefined();
		expect(toEdgeMarker(undefined)).toBeUndefined();
		expect(toEdgeMarker('arrowclosed')).toBe('arrowclosed');
	});
});
