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
		title: 'AI-Powered Intelligence',
		description: 'Get smart suggestions and auto-connections',
		gradient: 'from-purple-500 to-purple-600',
		delay: 0,
	},
	{
		id: 'realtime-collab',
		icon: Users,
		title: 'Real-time Collaboration',
		description: 'Work together seamlessly with your team',
		gradient: 'from-sky-500 to-sky-600',
		delay: 0.1,
	},
	{
		id: 'smart-layouts',
		icon: Brain,
		title: 'Smart Layouts',
		description: 'Automatically organize your thoughts',
		gradient: 'from-emerald-500 to-emerald-600',
		delay: 0.2,
	},
	{
		id: 'export-anywhere',
		icon: Download,
		title: 'Export Anywhere',
		description: 'PDF, PNG, Markdown, and more',
		gradient: 'from-orange-500 to-orange-600',
		delay: 0.3,
	},
	{
		id: 'lightning-fast',
		icon: Zap,
		title: 'Lightning Fast',
		description: 'Optimized performance for large maps',
		gradient: 'from-yellow-500 to-yellow-600',
		delay: 0.4,
	},
	{
		id: 'secure-private',
		icon: Shield,
		title: 'Secure & Private',
		description: 'Your data is encrypted and protected',
		gradient: 'from-rose-500 to-rose-600',
		delay: 0.5,
	},
];

const containerVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20, scale: 0.9 },
	show: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: {
			type: 'spring',
			stiffness: 100,
		},
	},
};

export function BenefitsStep({ onContinue, onBack }: BenefitsStepProps) {
	return (
		<div className='flex flex-col h-full w-full p-12'>
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-12'
			>
				<h2 className='text-3xl font-bold text-zinc-50 mb-4'>
					Why Teams Love Moistus AI
				</h2>

				<p className='text-lg text-zinc-400'>
					Everything you need to bring your ideas to life
				</p>
			</motion.div>

			{/* Benefits Grid */}
			<motion.div
				variants={containerVariants}
				initial='hidden'
				animate='show'
				className='w-full grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 mb-12'
			>
				{benefits.map((benefit) => (
					<motion.div
						key={benefit.id}
						variants={itemVariants}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className='relative group'
					>
						<div className='h-full  bg-zinc-800/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-300'>
							<div
								className={`w-12 h-12 rounded-lg bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-4`}
							>
								<benefit.icon className='w-6 h-6 text-white' />
							</div>

							<h3 className='text-lg font-semibold text-zinc-50 mb-2'>
								{benefit.title}
							</h3>

							<p className='text-sm text-zinc-400'>{benefit.description}</p>

							{/* Hover glow effect */}
							<div className='absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-teal-500/10 group-hover:via-transparent group-hover:to-purple-500/10 transition-all duration-500 pointer-events-none' />
						</div>
					</motion.div>
				))}
			</motion.div>

			{/* Navigation */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.6 }}
				className='flex items-center justify-between'
			>
				<Button
					onClick={onBack}
					variant='ghost'
					className='text-zinc-400 hover:text-zinc-300'
				>
					Back
				</Button>

				<Button
					onClick={onContinue}
					size='lg'
					className='bg-teal-500 hover:bg-teal-600 text-zinc-900 font-semibold px-8'
				>
					Continue
				</Button>
			</motion.div>
		</div>
	);
}
