/**
 * Subtle blue-tinted film-grain texture overlay.
 * Uses a tiled 128×128 noise PNG with screen blend to add
 * visible grain on dark backgrounds.
 */
export function GrainOverlay() {
	return (
		<div
			className='absolute inset-0 overflow-hidden pointer-events-none z-[1]'
			aria-hidden='true'
		>
			<div
				className='h-full w-full opacity-[0.06] bg-repeat'
				style={{ backgroundImage: "url('/images/noise-blue.png')" }}
			/>
		</div>
	);
}
