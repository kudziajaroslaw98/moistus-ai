'use client';

export function BackToTopLink() {
	return (
		<button
			type='button'
			className='text-text-tertiary hover:text-text-primary transition-colors duration-200'
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
		>
			Back to top ↑
		</button>
	);
}
