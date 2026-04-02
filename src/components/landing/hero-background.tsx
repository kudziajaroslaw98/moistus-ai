/**
 * Static landing background layers.
 * Keeps the hero atmospheric without a WebGL surface.
 */
export function HeroBackground() {
	return (
		<div className='absolute inset-0 overflow-hidden pointer-events-none'>
			<div className='absolute inset-0 bg-[radial-gradient(circle_at_16%_82%,rgba(96,165,250,0.18),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(96,165,250,0.22),transparent_28%),radial-gradient(circle_at_66%_24%,rgba(224,133,106,0.08),transparent_18%),radial-gradient(circle_at_52%_58%,rgba(120,94,255,0.08),transparent_26%)]' />
			<div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.82)_0%,rgba(8,10,14,0.46)_30%,rgba(8,10,14,0.14)_58%,rgba(8,10,14,0.72)_100%)]' />
			<div className='absolute inset-0 bg-[url("/grid.svg")] bg-[length:60px_60px] opacity-[0.07]' />
			<div className='absolute inset-0 bg-[url("/images/noise-blue.png")] opacity-[0.05] mix-blend-screen' />
			<div className='absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,7,10,0.14)_55%,rgba(5,7,10,0.78)_100%)]' />
		</div>
	);
}
