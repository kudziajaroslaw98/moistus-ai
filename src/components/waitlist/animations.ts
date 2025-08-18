import type { Transition, Variants } from 'motion/react';

// Default transition settings
export const defaultTransition: Transition = {
	duration: 0.5,
	ease: [0.25, 0.1, 0.25, 1], // Custom cubic-bezier for smooth animations
};

export const springTransition: Transition = {
	type: 'spring',
	stiffness: 100,
	damping: 15,
	mass: 1,
};

// Page load animations
export const fadeIn: Variants = {
	hidden: {
		opacity: 0,
	},
	visible: {
		opacity: 1,
		transition: defaultTransition,
	},
};

export const fadeInUp: Variants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.6,
			ease: 'easeOut',
		},
	},
};

export const fadeInScale: Variants = {
	hidden: {
		opacity: 0,
		scale: 0.95,
	},
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.5,
			ease: 'easeOut',
		},
	},
};

// Stagger animations for containers
export const staggerContainer: Variants = {
	hidden: {
		opacity: 0,
	},
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.2,
		},
	},
};

export const staggerItem: Variants = {
	hidden: {
		opacity: 0,
		y: 10,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.4,
			ease: 'easeOut',
		},
	},
};

// Hover animations
export const hoverScale: Variants = {
	rest: {
		scale: 1,
	},
	hover: {
		scale: 1.05,
		transition: springTransition,
	},
	tap: {
		scale: 0.98,
		transition: {
			duration: 0.1,
		},
	},
};

export const hoverGlow: Variants = {
	rest: {
		boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)',
	},
	hover: {
		boxShadow: '0 0 20px 5px rgba(139, 92, 246, 0.3)',
		transition: {
			duration: 0.3,
		},
	},
};

// Form field animations
export const formFieldFocus = {
	rest: {
		scale: 1,
		boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)',
	},
	focus: {
		scale: 1.01,
		boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.4)',
		transition: {
			duration: 0.2,
		},
	},
};

// Success animations
export const checkmarkAnimation: Variants = {
	hidden: {
		pathLength: 0,
		opacity: 0,
	},
	visible: {
		pathLength: 1,
		opacity: 1,
		transition: {
			pathLength: { duration: 0.6, ease: 'easeInOut' },
			opacity: { duration: 0.1 },
		},
	},
};

export const successPulse: Variants = {
	initial: {
		scale: 0,
		opacity: 0,
	},
	animate: {
		scale: [0, 1.2, 1],
		opacity: [0, 1, 1],
		transition: {
			duration: 0.6,
			ease: 'easeOut',
		},
	},
};

// Floating orb animations
export const floatingOrb = (duration: number = 20) => ({
	animate: {
		x: [0, 30, -30, 0],
		y: [0, -30, 30, 0],
		scale: [1, 1.1, 0.9, 1],
		transition: {
			duration,
			ease: 'easeInOut',
			repeat: Infinity,
			repeatType: 'loop' as const,
		},
	},
});

export const floatingOrbReverse = (duration: number = 25) => ({
	animate: {
		x: [0, -40, 40, 0],
		y: [0, 40, -40, 0],
		scale: [1, 0.95, 1.05, 1],
		transition: {
			duration,
			ease: 'easeInOut',
			repeat: Infinity,
			repeatType: 'loop' as const,
		},
	},
});

// Utility function to respect reduced motion preference
export const shouldReduceMotion = () => {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Reduced motion variants
export const getMotionVariant = (variant: Variants): Variants => {
	if (shouldReduceMotion()) {
		return {
			hidden: { opacity: 0 },
			visible: { opacity: 1, transition: { duration: 0.01 } },
		};
	}

	return variant;
};

// Export all animations as a collection
export const animations = {
	fadeIn,
	fadeInUp,
	fadeInScale,
	staggerContainer,
	staggerItem,
	hoverScale,
	hoverGlow,
	formFieldFocus,
	checkmarkAnimation,
	successPulse,
	floatingOrb,
	floatingOrbReverse,
};
