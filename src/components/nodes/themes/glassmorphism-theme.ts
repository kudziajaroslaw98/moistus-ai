/**
 * Glassmorphism Theme for Node Components
 *
 * This theme system preserves the minimal glassmorphism design with Material Design
 * elevation principles. All values are extracted from the existing implementation
 * to maintain pixel-perfect visual consistency.
 */

export const GlassmorphismTheme = {
	// Material Design elevation system for dark themes
	// Base: #121212, then progressively lighter based on elevation
	// Added sunken effect for code blocks and input fields
	elevation: {
		0: '#121212', // Base canvas background
		1: '#1E1E1E', // Cards, default nodes
		2: '#222222', // Raised cards
		4: '#272727', // App bars
		6: '#2C2C2C', // FABs, snackbars
		8: '#2F2F2F', // Navigation drawers
		12: '#333333', // Modals
		16: '#353535', // Sheets
		24: '#383838', // Dialogs
		// Sunken effects (darker than base for inset appearance)
		sunken: '#0D0D0D', // Code blocks, text inputs
	},

	// Border system - subtle and sophisticated
	borders: {
		default: 'rgba(255, 255, 255, 0.06)', // Subtle border for definition
		selected: 'rgba(96, 165, 250, 0.3)', // Selected state
		hover: 'rgba(255, 255, 255, 0.1)', // Hover state
		accent: 'rgba(96, 165, 250, 0.4)', // Accent borders
	},

	// Text hierarchy following Material Design
	text: {
		high: 'rgba(255, 255, 255, 0.87)', // High emphasis
		medium: 'rgba(255, 255, 255, 0.60)', // Medium emphasis
		disabled: 'rgba(255, 255, 255, 0.38)', // Disabled/low emphasis
	},

	// Shadow and selection effects
	effects: {
		// Selection glow - double border technique for proper focus states
		selectedShadow:
			'0 0 0 1px rgba(96, 165, 250, 0.3), 0 0 0 2px rgba(96, 165, 250, 0.15)',

		// Focus state - double border for accessibility
		focusShadow:
			'0 0 0 1px rgba(96, 165, 250, 0.4), 0 0 0 2px rgba(96, 165, 250, 0.2)',

		// Ambient glow for selected state
		ambientGlow:
			'radial-gradient(circle at center, rgba(96, 165, 250, 0.03) 0%, transparent 70%)',

		// Glassmorphism backdrop for special elements
		glassmorphism: 'blur(8px)',
		specialCardBackdrop: 'rgba(20, 20, 30, 0.7)',

		// Smooth transitions
		transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

		// Transform effects
		selectedTransform: 'translateY(-1px)',
		defaultTransform: 'translateY(0)',
	},

	// Animation configurations
	animations: {
		duration: {
			fast: '0.15s',
			normal: '0.2s',
			slow: '0.3s',
		},

		easing: {
			default: 'cubic-bezier(0.4, 0, 0.2, 1)',
			spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			ease: 'ease-out' as const,
		},

		// Motion/react animation variants
		motionVariants: {
			fadeIn: {
				initial: { opacity: 0, scale: 0.95, y: 10 },
				animate: { opacity: 1, scale: 1, y: 0 },
				exit: { opacity: 0, scale: 0.95, y: 10 },
			},

			scaleIn: {
				initial: { opacity: 0, scale: 0.8 },
				animate: { opacity: 1, scale: 1 },
				exit: { opacity: 0, scale: 0.8 },
			},

			slideUp: {
				initial: { opacity: 0, y: 20 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: 20 },
			},
		},
	},

	// Node-specific styling
	node: {
		// Default padding and spacing
		padding: '1rem', // p-4
		gap: '1rem', // gap-4
		borderRadius: '0.5rem', // rounded-lg
		minWidth: '20rem', // min-w-80

		// Handle styling
		handle: {
			width: '0.5rem', // w-2
			height: '0.5rem', // h-2
			background: 'transparent',
			border: '1px solid rgba(255, 255, 255, 0.2)',
			hoverBackground: 'rgba(255, 255, 255, 0.1)',
			hoverBorder: 'rgba(255, 255, 255, 0.4)',
			hoverScale: '1.25',
			bottom: '-4px',
		},

		// Resizer styling
		resizer: {
			color: 'rgba(96, 165, 250, 0.1)',
			handleWidth: '0.5rem',
			handleHeight: '0.5rem',
			handleRadius: '2px !important', // rounded-full
			selectedBackground: 'rgba(96, 165, 250, 0.1)',
			border: '1px solid rgba(255, 255, 255, 0.2)',
		},
	},

	// Button and interaction styling - standardized Material Design controls
	buttons: {
		// Standard control button specifications
		standard: {
			height: '24px', // Consistent height for all control buttons
			padding: '0 6px', // Consistent padding
			background: 'rgba(255, 255, 255, 0.05)', // Subtle background
			border: '1px solid rgba(255, 255, 255, 0.1)', // Definition border
			borderRadius: '4px', // Subtle rounding
			color: 'rgba(255, 255, 255, 0.87)', // High emphasis text
			fontSize: '12px',
			minGap: '4px', // 4px minimum between interactive elements
		},

		// Add new node button (FAB style)
		fab: {
			size: '2.5rem', // w-10 h-10
			background: '#2C2C2C', // elevation 6
			border: '1px solid rgba(255, 255, 255, 0.1)',
			color: 'rgba(255, 255, 255, 0.87)',
			hoverScale: '1.1',
		},

		// Node type indicator
		typeIndicator: {
			background: '#272727', // elevation 4
			border: '1px solid rgba(255, 255, 255, 0.06)',
			color: 'rgba(255, 255, 255, 0.38)',
			fontSize: '10px',
			padding: '0.125rem 0.5rem', // py-0.5 px-2
		},
	},

	// Ghost node (AI suggestions) specific styling
	ghost: {
		background: 'rgba(113, 113, 122, 0.1)', // Zinc with low opacity
		border: 'rgba(255, 255, 255, 0.08)', // Dashed border
		borderStyle: 'dashed',
		borderWidth: '2px',

		// Confidence level colors
		confidence: {
			high: 'rgba(34, 197, 94, 0.87)', // Green for 80%+
			medium: 'rgba(251, 191, 36, 0.87)', // Yellow for 60-80%
			low: 'rgba(239, 68, 68, 0.87)', // Red for <60%
		},

		// Action buttons
		actions: {
			accept: {
				background: 'rgba(34, 197, 94, 0.8)',
				hover: 'rgba(34, 197, 94, 1)',
				text: 'rgba(220, 252, 231, 1)', // Green-50
			},
			reject: {
				background: 'rgba(239, 68, 68, 0.8)',
				hover: 'rgba(239, 68, 68, 1)',
				text: 'rgba(254, 226, 226, 1)', // Red-50
			},
		},

		// Animation variants
		animation: {
			initial: { opacity: 0, scale: 0.95, y: 40 },
			animate: { opacity: 1, scale: 1, y: 0 },
			exit: { opacity: 0, scale: 0.95, y: 40 },
			transition: { ease: 'easeOut' as const, duration: 0.3 },
		},
	},

	// Progress and status indicators - updated with desaturated colors
	indicators: {
		// Progress bars with 25-30% desaturated colors
		progress: {
			background: 'rgba(255, 255, 255, 0.06)', // Semantic track color
			fill: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6) 0%, rgba(96, 165, 250, 0.8) 100%)', // Desaturated blue #60A5FA
			completeFill:
				'linear-gradient(90deg, rgba(52, 211, 153, 0.7) 0%, rgba(52, 211, 153, 0.9) 100%)', // Desaturated green #34D399
			height: '0.25rem', // h-1
		},

		// Status dots with desaturated semantic colors
		status: {
			pending: 'rgba(251, 191, 36, 0.87)', // Desaturated amber #FBBF24
			complete: 'rgba(52, 211, 153, 0.87)', // Desaturated emerald #34D399
			error: 'rgba(239, 68, 68, 0.87)', // Desaturated red (kept same for accessibility)
		},
	},
};

// Helper function to get elevation color
export const getElevationColor = (level: number | 'sunken'): string => {
	const elevationMap = GlassmorphismTheme.elevation;
	if (level === 'sunken') return elevationMap.sunken;
	return elevationMap[level as keyof typeof elevationMap] || elevationMap[1];
};

// Helper function to create consistent node styles
export const createNodeStyles = (
	elevation: number = 1,
	selected: boolean = false,
	accentColor?: string
): React.CSSProperties => {
	const theme = GlassmorphismTheme;

	const baseStyles: React.CSSProperties = {
		backgroundColor: getElevationColor(elevation),
		border: `1px solid ${selected ? theme.borders.selected : theme.borders.default}`,
		transform: selected
			? theme.effects.selectedTransform
			: theme.effects.defaultTransform,
		transition: theme.effects.transition,
		borderRadius: theme.node.borderRadius,
		padding: theme.node.padding,
		gap: theme.node.gap,
	};

	// Add selection effects
	if (selected) {
		baseStyles.boxShadow = theme.effects.selectedShadow;
	}

	// Add accent color system - subtle and sophisticated
	if (accentColor) {
		baseStyles.borderTop = `2px solid ${accentColor}`;
		baseStyles.borderTopLeftRadius = '8px';
		baseStyles.borderTopRightRadius = '8px';
	}

	return baseStyles;
};

// Type definitions for theme usage
export type ElevationLevel =
	| keyof typeof GlassmorphismTheme.elevation
	| 'sunken';
export type BorderType = keyof typeof GlassmorphismTheme.borders;
export type TextEmphasis = keyof typeof GlassmorphismTheme.text;
export type AnimationDuration =
	keyof typeof GlassmorphismTheme.animations.duration;
export type AnimationEasing = keyof typeof GlassmorphismTheme.animations.easing;

export default GlassmorphismTheme;
