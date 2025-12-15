import BackgroundEffects from '@/components/waitlist/background-effects';
import MinimalFooter from '@/components/waitlist/minimal-footer';
import WaitlistForm from '@/components/waitlist/waitlist-form';
import { WaitlistHero } from '@/components/waitlist/waitlist-hero';
import { Clock } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
	title: 'Moistus AI - AI-Powered Mind Mapping | Join the Waitlist',
	description:
		'Transform your thoughts into connected knowledge with AI-powered mind mapping. Join our waitlist for early access to the future of knowledge management.',
	keywords: [
		'mind mapping',
		'AI',
		'knowledge management',
		'collaboration',
		'productivity',
		'brainstorming',
		'semantic search',
		'waitlist',
		'early access',
	],
	openGraph: {
		title: 'Moistus AI - Transform Your Thoughts Into Connected Knowledge',
		description:
			'Join the waitlist for early access to AI-powered mind mapping that understands context and grows with your ideas.',
		type: 'website',
		url: 'https://moistus.ai',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Moistus AI - AI-Powered Mind Mapping',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Moistus AI - Transform Your Thoughts Into Connected Knowledge',
		description:
			'Join the waitlist for early access to AI-powered mind mapping.',
		images: ['/og-image.png'],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
};

export default function Home() {
	return (
		<main className='relative min-h-screen flex flex-col bg-zinc-950 z-10'>
			<BackgroundEffects />

			{/* Hero Section */}
			<section className='flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative z-20'>
				<div className='w-full max-w-2xl mx-auto text-center gap-12 flex flex-col'>
					{/* Logo */}
					<div className='mb-8'>
						<div className='mb-8'>
							<div className='w-full flex justify-center items-center mb-4'>
								<Image
									alt='Moistus Logo'
									height={150}
									src='/images/moistus.svg'
									width={150}
								/>
							</div>

							<div className='flex flex-col gap-4'>
								{/* Early Access Badge */}
								<div className='mb-6 animate-fade-in delay-100'>
									<span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/10 to-teal-500/10 px-4 py-2 text-sm font-medium text-sky-400 ring-1 ring-inset ring-sky-500/20 backdrop-blur-sm'>
										<Clock className='h-4 w-4' />
										Early Access Soon
									</span>
								</div>
							</div>
						</div>

						<WaitlistHero />
					</div>

					{/* Waitlist Form */}
					<div className='animate-fade-in-up delay-500'>
						<div
							className='p-8 rounded-2xl mx-auto max-w-md z-10 backdrop-blur-sm'
							style={{
								background:
									'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
								border: '1px solid rgba(255, 255, 255, 0.06)',
								backdropFilter: 'blur(8px)',
							}}
						>
							<WaitlistForm />
						</div>
					</div>

					{/* Trust Indicators */}
					<div className='mt-4 flex items-center justify-center gap-6 text-sm text-zinc-500 animate-fade-in delay-700'>
						<div className='flex items-center gap-2'>
							<svg
								className='h-4 w-4 text-emerald-500'
								fill='currentColor'
								viewBox='0 0 20 20'
							>
								<path
									clipRule='evenodd'
									d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
									fillRule='evenodd'
								/>
							</svg>

							<span>No spam, ever</span>
						</div>

						<div className='flex items-center gap-2'>
							<svg
								className='h-4 w-4 text-emerald-500'
								fill='currentColor'
								viewBox='0 0 20 20'
							>
								<path
									clipRule='evenodd'
									d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
									fillRule='evenodd'
								/>
							</svg>

							<span>Be the first to know</span>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<MinimalFooter />
		</main>
	);
}
