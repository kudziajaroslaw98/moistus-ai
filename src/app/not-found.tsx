import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Page Not Found - Shiko',
	description: 'The page you are looking for does not exist.',
	robots: { index: false, follow: false },
};

export default function NotFound() {
	return (
		<main className='flex min-h-screen flex-col items-center justify-center px-4 text-center'>
			<h1 className='font-lora text-6xl font-bold text-text-primary'>404</h1>
			<p className='mt-4 text-lg text-text-secondary'>
				The page you&apos;re looking for doesn&apos;t exist.
			</p>
			<Link
				href='/'
				className='mt-8 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400 focus-visible:ring-offset-base'
			>
				Back to home
			</Link>
		</main>
	);
}
