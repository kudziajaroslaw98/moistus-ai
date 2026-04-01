import { getTooltipSpaceRect } from './tooltip-viewport';

describe('tooltip viewport helpers', () => {
	it('uses the visual viewport on mobile when it is shorter than the layout viewport', () => {
		const rect = getTooltipSpaceRect({
			documentClientHeight: 844,
			documentClientWidth: 390,
			innerHeight: 844,
			innerWidth: 390,
			visualViewport: {
				offsetTop: 0,
				offsetLeft: 0,
				width: 390,
				height: 520,
			},
		});

		expect(rect).toEqual({
			top: 0,
			left: 0,
			right: 390,
			bottom: 508,
		});
	});

	it('falls back to the document viewport when no visual viewport is available', () => {
		const rect = getTooltipSpaceRect({
			documentClientHeight: 900,
			documentClientWidth: 1280,
			innerHeight: 900,
			innerWidth: 1280,
			visualViewport: null,
		});

		expect(rect).toEqual({
			top: 0,
			left: 0,
			right: 1280,
			bottom: 900,
		});
	});

	it('applies the mobile bottom safety inset only on narrow viewports', () => {
		const mobileRect = getTooltipSpaceRect({
			documentClientHeight: 844,
			documentClientWidth: 390,
			innerHeight: 844,
			innerWidth: 390,
			visualViewport: {
				offsetTop: 24,
				offsetLeft: 0,
				width: 390,
				height: 540,
			},
		});
		const desktopRect = getTooltipSpaceRect({
			documentClientHeight: 900,
			documentClientWidth: 1280,
			innerHeight: 900,
			innerWidth: 1280,
			visualViewport: {
				offsetTop: 24,
				offsetLeft: 0,
				width: 1280,
				height: 540,
			},
		});

		expect(mobileRect.bottom).toBe(552);
		expect(desktopRect.bottom).toBe(900);
	});
});
