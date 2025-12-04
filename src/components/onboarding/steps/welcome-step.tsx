'use client';

import { Button } from '@/components/ui/button';
import { Brain, Lightbulb, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeStepProps {
	onContinue: () => void;
	userName?: string;
}

const features = [
	{
		icon: Lightbulb,
		text: 'Never face a blank page - AI sparks your next idea',
		gradient: 'from-purple-500 to-purple-600',
	},
	{
		icon: Users,
		text: 'Align your team in minutes, not meetings',
		gradient: 'from-blue-500 to-blue-600',
	},
	{
		icon: Brain,
		text: "See patterns and connections you'd miss in text",
		gradient: 'from-emerald-500 to-emerald-600',
	},
	{
		icon: Zap,
		text: 'Take action faster with instant clarity',
		gradient: 'from-amber-500 to-amber-600',
	},
];

export function WelcomeStep({ onContinue, userName }: WelcomeStepProps) {
	return (
		<div className='flex flex-col items-center justify-center h-full p-12 text-center'>
			{/* Logo animation - using ease-out-quart for entrance */}
			<motion.div
				animate={{ scale: 1, opacity: 1 }}
				className='mb-8'
				initial={{ scale: 0.8, opacity: 0 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart from animation guidelines
					delay: 0.1,
				}}
			>
				<div className='w-24 h-24 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary-500/80 to-primary-600/60 shadow-[0_8px_32px_var(--color-primary-500)]'>
					<Sparkles className='w-12 h-12 text-zinc-100' />
				</div>
			</motion.div>

			{/* Welcome text */}
			<motion.h1
				animate={{ opacity: 1, y: 0 }}
				className='text-4xl font-bold mb-4 text-text-primary'
				initial={{ opacity: 0, y: 20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.2,
				}}
			>
				Welcome to Moistus AI{userName ? `, ${userName}` : ''}!
			</motion.h1>

			<motion.p
				animate={{ opacity: 1, y: 0 }}
				className='text-xl mb-8 max-w-2xl text-text-tertiary'
				initial={{ opacity: 0, y: 20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.3,
				}}
			>
				Turn overwhelming complexity into clarity and action
			</motion.p>

			{/* Feature highlights - icon badges */}
			<motion.div
				animate={{ opacity: 1 }}
				className='flex flex-wrap justify-center gap-3 mb-12 max-w-3xl'
				initial={{ opacity: 0 }}
				transition={{ duration: 0.2, delay: 0.4 }}
			>
				{features.map((feature, index) => (
					<motion.div
						animate={{
							opacity: 1,
							scale: 1,
							transition: {
								delay: 0.5 + index * 0.1,
							},
						}}
						className='flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface/50 border border-border-subtle group'
						initial={{
							opacity: 0,
							scale: 0.9,
						}}
						whileHover={{
							scale: 1.02,
							borderColor: 'var(--color-border-default)',
							transition: {
								duration: 0.2,
								ease: 'easeOut',
								delay: 0,
							},
						}}
						key={index}
					>
						<div
							className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-sm`}
						>
							<feature.icon className='w-3.5 h-3.5 text-white' />
						</div>
						<span className='text-sm text-text-primary text-left'>
							{feature.text}
						</span>
					</motion.div>
				))}
			</motion.div>

			{/* CTA Button */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				initial={{ opacity: 0, y: 20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.9,
				}}
			>
				<Button
					className='font-semibold px-8 py-3 text-lg bg-primary-600 hover:bg-primary-500 text-base hover:-translate-y-0.5 transition-all duration-200'
					onClick={onContinue}
					size='lg'
				>
					Get Started
				</Button>
			</motion.div>
		</div>
	);
}
