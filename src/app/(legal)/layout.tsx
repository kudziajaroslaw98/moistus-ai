import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LegalLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className='min-h-screen flex flex-col bg-background'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-subtle'>
				<div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex items-center justify-between h-16'>
						<Link
							href='/'
							className='flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200'
						>
							<ArrowLeft className='w-4 h-4' />
							<span>Back to Shiko</span>
						</Link>
						<span className='text-lg font-semibold text-text-primary'>
							Shiko
						</span>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className='max-w-4xl flex h-auto mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16'>
				{children}
			</main>

			{/* Footer */}
			<footer className='border-t border-border-subtle'>
				<div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
					<div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
						<span className='text-sm text-text-tertiary'>
							© {new Date().getFullYear()} Shiko. All rights reserved.
						</span>
						<nav className='flex items-center gap-6'>
							<Link
								href='/privacy'
								className='text-sm text-text-tertiary hover:text-text-primary transition-colors duration-200'
							>
								Privacy Policy
							</Link>
							<Link
								href='/terms'
								className='text-sm text-text-tertiary hover:text-text-primary transition-colors duration-200'
							>
								Terms of Service
							</Link>
						</nav>
					</div>
				</div>
			</footer>
		</div>
	);
}
