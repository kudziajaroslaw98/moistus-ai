import Link from 'next/link';

export default function Home() {
	return (
		<div className='grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20'>
			<main className='row-start-2 flex flex-col items-center gap-[32px] sm:items-start'>
				<h1 className='text-4xl font-bold text-zinc-100'>Mind Map AI App</h1>

				<p className='text-lg text-zinc-400'>
					AI-powered mind mapping and information organization
				</p>

				<div className='flex flex-wrap items-center justify-center gap-[24px]'>
					<Link
						className='flex items-center gap-2 hover:underline hover:underline-offset-4'
						href='/auth/sign-in'
					>
						Sign In
					</Link>

					<Link
						className='flex items-center gap-2 hover:underline hover:underline-offset-4'
						href='/auth/sign-up'
					>
						Sign Up
					</Link>

					<Link
						className='flex items-center gap-2 hover:underline hover:underline-offset-4'
						href='/dashboard'
					>
						Dashboard
					</Link>
				</div>
			</main>
		</div>
	);
}
