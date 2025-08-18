/**
 * Centralized theme configuration for metadata display across the application
 * Ensures visual consistency for badges, tags, and metadata elements
 */

export const MetadataTheme = {
	colors: {
		// Tag colors - Purple theme
		tag: {
			bg: 'bg-purple-500/20',
			text: 'text-purple-400',
			border: 'border-purple-500/20',
			hover: 'hover:bg-purple-500/30',
			icon: 'text-purple-400',
		},

		// Priority colors
		priority: {
			high: {
				bg: 'bg-red-500/20',
				text: 'text-red-400',
				border: 'border-red-500/20',
				hover: 'hover:bg-red-500/30',
				icon: 'text-red-400',
			},
			medium: {
				bg: 'bg-yellow-500/20',
				text: 'text-yellow-400',
				border: 'border-yellow-500/20',
				hover: 'hover:bg-yellow-500/30',
				icon: 'text-yellow-400',
			},
			low: {
				bg: 'bg-green-500/20',
				text: 'text-green-400',
				border: 'border-green-500/20',
				hover: 'hover:bg-green-500/30',
				icon: 'text-green-400',
			},
		},

		// Status colors
		status: {
			active: {
				bg: 'bg-blue-500/20',
				text: 'text-blue-400',
				border: 'border-blue-500/20',
				hover: 'hover:bg-blue-500/30',
				icon: 'text-blue-400',
			},
			pending: {
				bg: 'bg-yellow-500/20',
				text: 'text-yellow-400',
				border: 'border-yellow-500/20',
				hover: 'hover:bg-yellow-500/30',
				icon: 'text-yellow-400',
			},
			complete: {
				bg: 'bg-green-500/20',
				text: 'text-green-400',
				border: 'border-green-500/20',
				hover: 'hover:bg-green-500/30',
				icon: 'text-green-400',
			},
			draft: {
				bg: 'bg-zinc-500/20',
				text: 'text-zinc-400',
				border: 'border-zinc-500/20',
				hover: 'hover:bg-zinc-500/30',
				icon: 'text-zinc-400',
			},
			'in-progress': {
				bg: 'bg-blue-500/20',
				text: 'text-blue-400',
				border: 'border-blue-500/20',
				hover: 'hover:bg-blue-500/30',
				icon: 'text-blue-400',
			},
			'on-hold': {
				bg: 'bg-orange-500/20',
				text: 'text-orange-400',
				border: 'border-orange-500/20',
				hover: 'hover:bg-orange-500/30',
				icon: 'text-orange-400',
			},
		},

		// Date colors
		date: {
			bg: 'bg-blue-500/20',
			text: 'text-blue-400',
			border: 'border-blue-500/20',
			hover: 'hover:bg-blue-500/30',
			icon: 'text-blue-400',
			overdue: {
				bg: 'bg-red-500/20',
				text: 'text-red-400',
				border: 'border-red-500/20',
				hover: 'hover:bg-red-500/30',
				icon: 'text-red-400',
			},
			upcoming: {
				bg: 'bg-yellow-500/20',
				text: 'text-yellow-400',
				border: 'border-yellow-500/20',
				hover: 'hover:bg-yellow-500/30',
				icon: 'text-yellow-400',
			},
		},

		// Assignee colors
		assignee: {
			bg: 'bg-teal-500/20',
			text: 'text-teal-400',
			border: 'border-teal-500/20',
			hover: 'hover:bg-teal-500/30',
			icon: 'text-teal-400',
		},

		// Annotation type colors
		annotation: {
			note: {
				bg: 'bg-blue-500/20',
				text: 'text-blue-400',
				border: 'border-blue-500/20',
				hover: 'hover:bg-blue-500/30',
			},
			warning: {
				bg: 'bg-yellow-500/20',
				text: 'text-yellow-400',
				border: 'border-yellow-500/20',
				hover: 'hover:bg-yellow-500/30',
			},
			info: {
				bg: 'bg-cyan-500/20',
				text: 'text-cyan-400',
				border: 'border-cyan-500/20',
				hover: 'hover:bg-cyan-500/30',
			},
			success: {
				bg: 'bg-green-500/20',
				text: 'text-green-400',
				border: 'border-green-500/20',
				hover: 'hover:bg-green-500/30',
			},
			error: {
				bg: 'bg-red-500/20',
				text: 'text-red-400',
				border: 'border-red-500/20',
				hover: 'hover:bg-red-500/30',
			},
		},

		// Question status colors
		question: {
			unanswered: {
				bg: 'bg-orange-500/20',
				text: 'text-orange-400',
				border: 'border-orange-500/20',
				hover: 'hover:bg-orange-500/30',
			},
			answered: {
				bg: 'bg-green-500/20',
				text: 'text-green-400',
				border: 'border-green-500/20',
				hover: 'hover:bg-green-500/30',
			},
			ai_answered: {
				bg: 'bg-purple-500/20',
				text: 'text-purple-400',
				border: 'border-purple-500/20',
				hover: 'hover:bg-purple-500/30',
			},
		},

		// Default/fallback colors
		default: {
			bg: 'bg-zinc-500/20',
			text: 'text-zinc-400',
			border: 'border-zinc-500/20',
			hover: 'hover:bg-zinc-500/30',
			icon: 'text-zinc-400',
		},
	},

	// Spacing configurations
	spacing: {
		badge: {
			xs: 'px-1.5 py-0.5',
			sm: 'px-2 py-0.5',
			md: 'px-2.5 py-1',
			lg: 'px-3 py-1.5',
		},
		container: {
			tight: 'gap-1',
			normal: 'gap-2',
			relaxed: 'gap-3',
		},
	},

	// Typography configurations
	typography: {
		badge: {
			xs: 'text-xs',
			sm: 'text-xs',
			md: 'text-sm',
			lg: 'text-base',
		},
		weight: {
			normal: 'font-normal',
			medium: 'font-medium',
			semibold: 'font-semibold',
			bold: 'font-bold',
		},
	},

	// Border radius configurations
	borderRadius: {
		badge: 'rounded-md',
		container: 'rounded-lg',
		node: 'rounded-xl',
	},

	// Animation configurations
	animation: {
		// Hover effects
		hover: {
			scale: 'hover:scale-[1.02]',
			brightness: 'hover:brightness-110',
			opacity: 'hover:opacity-80',
		},
		// Click effects
		click: {
			scale: 'active:scale-[0.98]',
			brightness: 'active:brightness-95',
		},
		// Transition settings
		transition: {
			fast: 'transition-all duration-150',
			normal: 'transition-all duration-200',
			slow: 'transition-all duration-300',
		},
		// Entry animations (for use with motion/react)
		entry: {
			fadeIn: {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
			},
			slideUp: {
				initial: { opacity: 0, y: 10 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: 10 },
			},
			scaleIn: {
				initial: { opacity: 0, scale: 0.8 },
				animate: { opacity: 1, scale: 1 },
				exit: { opacity: 0, scale: 0.8 },
			},
		},
		// Stagger delays for multiple items
		stagger: {
			fast: 0.02,
			normal: 0.03,
			slow: 0.05,
		},
	},

	// Icon sizes
	icons: {
		xs: 'w-2.5 h-2.5',
		sm: 'w-3 h-3',
		md: 'w-3.5 h-3.5',
		lg: 'w-4 h-4',
		xl: 'w-5 h-5',
	},

	// Shadow configurations
	shadows: {
		badge: 'shadow-sm',
		badgeHover: 'shadow-md',
		container: 'shadow-lg',
		node: 'shadow-xl',
	},

	// Backdrop blur for glassmorphism effect
	backdrop: {
		none: '',
		sm: 'backdrop-blur-sm',
		md: 'backdrop-blur-md',
		lg: 'backdrop-blur-lg',
	},
} as const;

// Type exports for TypeScript support
export type MetadataColorKey = keyof typeof MetadataTheme.colors;
export type PriorityLevel = keyof typeof MetadataTheme.colors.priority;
export type StatusType = keyof typeof MetadataTheme.colors.status;
export type AnnotationType = keyof typeof MetadataTheme.colors.annotation;
export type QuestionStatus = keyof typeof MetadataTheme.colors.question;
export type BadgeSize = keyof typeof MetadataTheme.spacing.badge;
export type AnimationSpeed = keyof typeof MetadataTheme.animation.transition;

// Helper function to get color classes for a specific metadata type
export function getMetadataColors(
	type: MetadataColorKey,
	variant?: string
): typeof MetadataTheme.colors.default {
	const colorSet = MetadataTheme.colors[type];

	if (!colorSet) {
		return MetadataTheme.colors.default;
	}

	// If colorSet has variants (like priority, status, etc.)
	if (variant && typeof colorSet === 'object' && variant in colorSet) {
		return (colorSet as any)[variant];
	}

	// If colorSet is directly a color configuration
	if ('bg' in colorSet) {
		return colorSet as typeof MetadataTheme.colors.default;
	}

	return MetadataTheme.colors.default;
}

// Helper function to build complete badge classes
export function getBadgeClasses(
	type: MetadataColorKey,
	size: BadgeSize = 'sm',
	variant?: string,
	interactive: boolean = false
): string {
	const colors = getMetadataColors(type, variant);
	const spacing = MetadataTheme.spacing.badge[size];
	const typography = MetadataTheme.typography.badge[size];
	const animation = MetadataTheme.animation.transition.normal;

	const classes = [
		// Base styles
		'inline-flex items-center font-medium border',
		MetadataTheme.borderRadius.badge,
		MetadataTheme.backdrop.sm,

		// Colors
		colors.bg,
		colors.text,
		colors.border,

		// Spacing and typography
		spacing,
		typography,

		// Animation
		animation,

		// Interactive states
		interactive && [
			'cursor-pointer',
			colors.hover,
			MetadataTheme.animation.hover.scale,
			MetadataTheme.animation.click.scale,
		],
	];

	return classes.filter(Boolean).flat().join(' ');
}

// Helper function for consistent icon sizing
export function getIconSize(size: BadgeSize = 'sm'): string {
	const sizeMap: Record<BadgeSize, keyof typeof MetadataTheme.icons> = {
		xs: 'xs',
		sm: 'sm',
		md: 'md',
		lg: 'lg',
	};

	return MetadataTheme.icons[sizeMap[size]];
}
