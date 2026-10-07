import { COVER_HUES, getMapCoverSpec, hashString } from './map-cover';

describe('hashString', () => {
	it('is deterministic and non-negative', () => {
		expect(hashString('abc')).toBe(hashString('abc'));
		expect(hashString('')).toBeGreaterThanOrEqual(0);
		expect(hashString('some long map title')).toBeGreaterThanOrEqual(0);
	});

	it('differs for different input', () => {
		expect(hashString('a')).not.toBe(hashString('b'));
	});
});

describe('getMapCoverSpec', () => {
	it('is stable for the same map', () => {
		expect(getMapCoverSpec('id-1', 'Dump')).toEqual(
			getMapCoverSpec('id-1', 'Dump')
		);
	});

	it('uses the first letter of the title, uppercased', () => {
		expect(getMapCoverSpec('id', 'mind dump temp').letter).toBe('M');
		expect(getMapCoverSpec('id', '  dump').letter).toBe('D');
	});

	it('keeps accents and non-Latin letters whole', () => {
		expect(getMapCoverSpec('id', 'żółw').letter).toBe('Ż');
		expect(getMapCoverSpec('id', '😀 plan').letter).toBe('😀');
	});

	it('falls back to a plus sign for an empty title', () => {
		expect(getMapCoverSpec('id', '   ').letter).toBe('+');
	});

	it('picks the accent from the brand hue set and spreads maps across it', () => {
		const hues = new Set(
			Array.from({ length: 40 }, (_, i) => getMapCoverSpec(`map-${i}`, 'x').hue)
		);

		for (const hue of hues) expect(COVER_HUES).toContain(hue);
		expect(hues.size).toBeGreaterThanOrEqual(4);
	});
});
