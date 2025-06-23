import BackgroundEffects from '@/components/waitlist/background-effects';
import FeatureCard from '@/components/waitlist/feature-card';
import MinimalFooter from '@/components/waitlist/minimal-footer';
import WaitlistForm from '@/components/waitlist/waitlist-form';
import { Clock } from 'lucide-react';
import { Metadata } from 'next';

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

const features = [
	{
		iconName: 'Brain',
		title: 'AI-Powered Intelligence',
		description:
			'Our AI understands context and suggests connections you might have missed.',
		gradient: 'from-violet-500 to-purple-600',
	},
	{
		iconName: 'Users',
		title: 'Real-time Collaboration',
		description:
			'Work together seamlessly with your team, see changes instantly.',
		gradient: 'from-blue-500 to-indigo-600',
	},
	{
		iconName: 'Search',
		title: 'Semantic Search',
		description: 'Find anything in your knowledge base using natural language.',
		gradient: 'from-emerald-500 to-teal-600',
	},
];

export default function Home() {
	return (
		<>
			<main className='relative min-h-screen flex flex-col z-10'>
				<BackgroundEffects />
				{/* Hero Section */}
				<section className='flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative z-20'>
					<div className='w-full max-w-2xl mx-auto text-center gap-12 flex flex-col'>
						{/* Logo */}
						<div className='mb-8 animate-fade-in'>
							<div className='inline-flex items-center gap-3'>
								<div className='h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25' />
								<span className='text-2xl font-bold text-zinc-50'>
									Moistus AI
								</span>
							</div>
						</div>

						<div className='flex flex-col gap-4'>
							{/* Early Access Badge */}
							<div className='mb-6 animate-fade-in delay-100'>
								<span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-600/10 px-4 py-2 text-sm font-medium text-violet-400 ring-1 ring-inset ring-violet-500/20'>
									<Clock className='h-4 w-4' />
									Early Access Soon
								</span>
							</div>

							{/* Headline */}
							<h1 className='mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-50 leading-tight animate-fade-in-up delay-200'>
								Transform Your Thoughts Into{' '}
								<span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600'>
									Connected Knowledge
								</span>
							</h1>

							{/* Subtitle */}
							<p className='mb-10 text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto animate-fade-in-up delay-300'>
								AI-powered mind mapping that understands context, suggests
								connections, and grows with your ideas. The future of knowledge
								management is here.
							</p>
						</div>

						{/* Waitlist Form */}
						<div className='animate-fade-in-up delay-500'>
							<WaitlistForm />
						</div>

						{/* Trust Indicators */}
						<div className='mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500 animate-fade-in delay-700'>
							<div className='flex items-center gap-2'>
								<svg
									className='h-4 w-4 text-emerald-500'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path
										fillRule='evenodd'
										d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
										clipRule='evenodd'
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
										fillRule='evenodd'
										d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
										clipRule='evenodd'
									/>
								</svg>
								<span>Be the first to know</span>
							</div>
						</div>
					</div>
				</section>

				{/* Features Preview */}
				<section className='px-4 sm:px-6 lg:px-8 py-16 relative z-20'>
					<div className='max-w-5xl mx-auto'>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							{features.map((feature, index) => (
								<FeatureCard
									key={feature.title}
									iconName={feature.iconName}
									title={feature.title}
									description={feature.description}
									gradient={feature.gradient}
									className={`delay-${700 + index * 100}`}
								/>
							))}
						</div>
					</div>
				</section>

				{/* Footer */}
				<MinimalFooter />
			</main>
		</>
	);
}
