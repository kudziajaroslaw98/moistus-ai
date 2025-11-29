'use client';

import { Button } from '@/components/ui/button';
import { Brain, Download, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface BenefitsStepProps {
	onContinue: () => void;
	onBack: () => void;
}

interface Benefit {
	id: string;
	icon: React.ElementType;
	title: string;
	description: string;
	gradient: string;
	delay: number;
}

const benefits: Benefit[] = [
	{
		id: 'ai-powered',
		icon: Sparkles,
		title: 'Break Through Creative Blocks',
		description:
			'Never stare at a blank canvas - AI expands your thinking instantly',
		gradient:
			'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(147, 51, 234, 0.8) 100%)',
		delay: 0,
	},
	{
		id: 'realtime-collab',
		icon: Users,
		title: 'Get Everyone Aligned',
		description:
			"Reduce endless meetings - see everyone's ideas in one visual space",
		gradient:
			'linear-gradient(135deg, rgba(96, 165, 250, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%)',
		delay: 0.1,
	},
	{
		id: 'smart-layouts',
		icon: Brain,
		title: 'Find Hidden Connections',
		description:
			'Discover insights buried in complexity with auto-organized visuals',
		gradient:
			'linear-gradient(135deg, rgba(52, 211, 153, 0.8) 0%, rgba(16, 185, 129, 0.8) 100%)',
		delay: 0.2,
	},
	{
		id: 'export-anywhere',
		icon: Download,
		title: 'Share Your Brilliance',
		description:
			'Turn your thinking into presentations, docs, and plans instantly',
		gradient:
			'linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.8) 100%)',
		delay: 0.3,
	},
	{
		id: 'lightning-fast',
		icon: Zap,
		title: 'Stay in Your Flow',
		description: 'Never wait - handle thousand-node maps without lag',
		gradient:
			'linear-gradient(135deg, rgba(234, 179, 8, 0.8) 0%, rgba(202, 138, 4, 0.8) 100%)',
		delay: 0.4,
	},
	{
		id: 'secure-private',
		icon: Shield,
		title: 'Think Freely',
		description: 'Brainstorm confidently - your ideas stay yours',
		gradient:
			'linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(225, 29, 72, 0.8) 100%)',
		delay: 0.5,
	},
];

export function BenefitsStep({ onContinue, onBack }: BenefitsStepProps) {
	return (
		<div className='flex flex-col h-full w-full p-12'>
			{/* Header */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-12'
				initial={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
				}}
			>
				<h2 className='text-3xl font-bold mb-4 text-text-primary'>
					What You'll Achieve With Moistus AI
				</h2>

				<p className='text-lg text-text-secondary'>
					Real outcomes that transform how you think and work
				</p>
			</motion.div>

			{/* Benefits Grid */}
			<div className='w-full grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 mb-12'>
				{benefits.map((benefit, index) => (
					<motion.div
						animate={{ opacity: 1, y: 0, scale: 1 }}
						className='relative group'
						initial={{ opacity: 0, y: 20, scale: 0.95 }}
						key={benefit.id}
						transition={{
							duration: 0.3,
							ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
							delay: benefit.delay,
						}}
					>
						<div className='h-full rounded-xl p-6 bg-surface border border-border-subtle hover:border-border-default transition-colors duration-200'>
							<div
								className='w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
								style={{ background: benefit.gradient }}
							>
								<benefit.icon className='w-6 h-6 text-white' />
							</div>

							<h3 className='text-lg font-semibold mb-2 text-text-primary'>
								{benefit.title}
							</h3>

							<p className='text-sm text-text-secondary'>
								{benefit.description}
							</p>

							{/* Subtle hover glow effect */}
							<div className='absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.03)_0%,transparent_70%)]' />
						</div>
					</motion.div>
				))}
			</div>

			{/* Navigation */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='flex items-center justify-between'
				initial={{ opacity: 0, y: 20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.6,
				}}
			>
				<Button
					className='text-text-secondary hover:text-text-primary transition-colors duration-200'
					onClick={onBack}
					variant='ghost'
				>
					Back
				</Button>

				<Button
					className='font-semibold px-8 bg-primary-600 hover:bg-primary-500 text-base hover:-translate-y-0.5 transition-all duration-200'
					onClick={onContinue}
					size='lg'
				>
					Continue
				</Button>
			</motion.div>
		</div>
	);
}
