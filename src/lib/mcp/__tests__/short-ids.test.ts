import { buildShortIds, resolveShortId } from '../format/short-ids';
import { uuidFrom } from '../__fixtures__/graph';

describe('buildShortIds', () => {
	it('uses 6 hex chars when they are unique', () => {
		const a = uuidFrom('a1b2c3');
		const b = uuidFrom('ffee00');
		const shortIds = buildShortIds([a, b]);
		expect(shortIds.get(a)).toBe('a1b2c3');
		expect(shortIds.get(b)).toBe('ffee00');
	});

	it('extends only the ids that share a prefix, past the dash', () => {
		const a = uuidFrom('a1b2c3d4e5');
		const b = uuidFrom('a1b2c3d4f6');
		const c = uuidFrom('0000aa');
		const shortIds = buildShortIds([a, b, c]);
		expect(shortIds.get(a)).toBe('a1b2c3d4e');
		expect(shortIds.get(b)).toBe('a1b2c3d4f');
		expect(shortIds.get(c)).toBe('0000aa');
	});
});

describe('resolveShortId', () => {
	const a = uuidFrom('a1b2c3d4e5');
	const b = uuidFrom('a1b2c3d4f6');
	const ids = [a, b];

	it('resolves a unique prefix, a bracketed id and a full UUID', () => {
		expect(resolveShortId('a1b2c3d4e', ids)).toEqual({ ok: true, id: a });
		expect(resolveShortId('[a1b2c3d4f]', ids)).toEqual({ ok: true, id: b });
		expect(resolveShortId(a.toUpperCase(), ids)).toEqual({ ok: true, id: a });
	});

	it('reports ambiguous, missing and invalid ids', () => {
		expect(resolveShortId('a1b2c3', ids)).toMatchObject({ ok: false, reason: 'ambiguous' });
		expect(resolveShortId('bbbbbb', ids)).toMatchObject({ ok: false, reason: 'not-found' });
		expect(resolveShortId('a1b2', ids)).toMatchObject({ ok: false, reason: 'invalid' });
		expect(resolveShortId('paul', ids)).toMatchObject({ ok: false, reason: 'invalid' });
	});
});
