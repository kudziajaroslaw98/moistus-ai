import { getMapCoverStyle, hashString } from './map-cover';

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

describe('getMapCoverStyle', () => {
	it('returns the same cover for the same map', () => {
		expect(getMapCoverStyle('id-1')).toEqual(getMapCoverStyle('id-1'));
	});

	it('gives different maps different covers', () => {
		const covers = new Set(
			Array.from({ length: 20 }, (_, i) => getMapCoverStyle(`map-${i}`).backgroundImage)
		);

		expect(covers.size).toBeGreaterThan(15);
	});

	it('layers a gradient and keeps colors dark and muted for the dark UI', () => {
		const { backgroundImage } = getMapCoverStyle('map-xyz');
		const lightness = [...backgroundImage.matchAll(/hsla?\(\d+,\s*(\d+)%,\s*(\d+)%/g)];

		expect(backgroundImage).toContain('radial-gradient');
		expect(lightness.length).toBeGreaterThanOrEqual(2);

		for (const [, saturation, light] of lightness) {
			expect(Number(saturation)).toBeLessThanOrEqual(60);
			expect(Number(light)).toBeLessThanOrEqual(40);
		}
	});
});
