'use client';

import {
	Brain,
	FileText,
	Link2,
	LucideIcon,
	Search,
	Sparkles,
	Users,
	Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { hoverScale } from './animations';

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
	Brain,
	Search,
	Sparkles,
	Users,
	FileText,
	Link2,
	Zap,
};

interface FeatureCardProps {
	iconName: string;
	title: string;
	description: string;
	gradient: string;
	delay?: number;
	className?: string;
}

export default function FeatureCard({
	iconName,
	title,
	description,
	gradient,
	delay = 0,
	className = '',
}: FeatureCardProps) {
	// Get the icon component from the map, fallback to Sparkles if not found
	const Icon = iconMap[iconName] || Sparkles;

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className={`relative group ${className}`}
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.5, delay }}
			variants={hoverScale}
			whileHover='hover'
			whileTap='tap'
		>
			<div className='relative h-full rounded-2xl border border-border-secondary bg-surface-primary/50 backdrop-blur-sm p-6 transition-colors hover:border-border-primary'>
				{/* Gradient background on hover */}
				<div
					className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`}
				/>

				{/* Icon with gradient background */}
				<div className='relative mb-4'>
					<div
						className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} p-2.5 shadow-lg`}
					>
						<Icon className='h-full w-full text-white' />
					</div>

					{/* Icon glow effect */}
					<div
						className={`absolute inset-0 h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} blur-xl opacity-50 group-hover:opacity-70 transition-opacity`}
					/>
				</div>

				{/* Content */}
				<h3 className='relative mb-2 text-lg font-semibold text-text-primary'>
					{title}
				</h3>

				<p className='relative text-sm text-text-secondary leading-relaxed'>
					{description}
				</p>
			</div>
		</motion.div>
	);
}
