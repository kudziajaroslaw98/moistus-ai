'use client';

import { HeroEditorDemo } from './hero-editor-demo';

export function HeroMapScene() {
	return (
		<div className='relative mx-auto w-full max-w-[60rem] overflow-visible lg:max-w-none lg:translate-x-0'>
			<div className='absolute inset-x-[12%] top-[10%] h-36 rounded-full bg-primary-500/16 blur-3xl' />
			<div className='absolute bottom-[10%] left-[10%] h-32 w-40 rounded-full bg-brand-coral/10 blur-3xl' />
			<HeroEditorDemo />
		</div>
	);
}
