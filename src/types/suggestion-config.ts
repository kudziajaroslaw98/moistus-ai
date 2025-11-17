import type { SuggestionTrigger } from './ghost-node';

/**
 * Configuration for timing thresholds in the suggestion system
 */
export interface SuggestionTimingConfig {
	/**
	 * Minimum milliseconds between any suggestion triggers (throttle)
	 * Prevents spam when user clicks generate button repeatedly
	 * @default 3000
	 */
	minTimeBetweenSuggestions: number;

	/**
	 * Minimum milliseconds between API requests (rate limiting)
	 * @default 3000
	 */
	apiThrottle: number;
}

/**
 * Configuration for quality control and filtering
 */
export interface SuggestionQualityConfig {
	/**
	 * Minimum confidence score for auto-triggered suggestions (0-1)
	 * Manual triggers use a lower threshold
	 * @default 0.6
	 */
	minConfidence: number;

	/**
	 * Minimum confidence for manual triggers (magic wand button)
	 * @default 0.4
	 */
	minConfidenceManual: number;

	/**
	 * Maximum number of suggestions to show per trigger
	 * Prevents choice paralysis
	 * @default 5
	 */
	maxSuggestions: number;

	/**
	 * Maximum number of suggestions for manual triggers
	 * Users asking for suggestions can see more
	 * @default 6
	 */
	maxSuggestionsManual: number;

	/**
	 * Confidence threshold for high-quality indicator (green)
	 * @default 0.8
	 */
	highConfidenceThreshold: number;

	/**
	 * Confidence threshold for medium-quality indicator (yellow)
	 * @default 0.6
	 */
	mediumConfidenceThreshold: number;
}

/**
 * Configuration for context extraction depth
 */
export interface SuggestionContextConfig {
	/**
	 * Which context levels to analyze
	 * - 'primary': Only the source node
	 * - 'siblings': Nodes with same parent
	 * - 'ancestry': Parent and grandparent
	 * - 'topology': Graph metrics (degree, clustering, etc.)
	 * @default ['primary', 'siblings', 'ancestry']
	 */
	contextLevels: Array<'primary' | 'siblings' | 'ancestry' | 'topology'>;

	/**
	 * Maximum number of nodes to analyze for context (performance limit)
	 * @default 20
	 */
	maxContextNodes: number;

	/**
	 * Whether to include graph topology analysis (computationally expensive)
	 * @default false
	 */
	includeTopology: boolean;
}

/**
 * Configuration for a specific trigger type
 */
export interface TriggerConfig {
	/**
	 * Human-readable name for this trigger
	 */
	name: SuggestionTrigger;

	/**
	 * Whether this trigger is enabled
	 * @default true
	 */
	enabled: boolean;

	/**
	 * Debounce time in milliseconds for this trigger
	 * 0 = execute immediately
	 * @default 0
	 */
	debounce: number;

	/**
	 * Minimum confidence threshold for this trigger
	 * @default 0.6
	 */
	confidence: number;

	/**
	 * Maximum suggestions to show for this trigger
	 * @default 5
	 */
	maxSuggestions: number;

	/**
	 * Optional condition function to check before triggering
	 * Returns true if trigger should fire
	 */
	condition?: (node: {
		id: string;
		children: number;
		degree: number;
	}) => boolean;
}

/**
 * Configuration for animation timing and easing
 */
export interface SuggestionAnimationConfig {
	/**
	 * Duration of edge drawing animation in milliseconds
	 * @default 300
	 */
	edgeDuration: number;

	/**
	 * Duration of node reveal animation in milliseconds
	 * @default 250
	 */
	nodeDuration: number;

	/**
	 * Overlap between edge and node animations in milliseconds
	 * Negative = gap, Positive = overlap
	 * @default 0 (node starts when edge completes)
	 */
	overlap: number;

	/**
	 * Easing functions for animations
	 */
	easing: {
		/**
		 * Cubic bezier for edge drawing
		 * @default [0.23, 1, 0.32, 1] (ease-out-quint)
		 */
		edge: readonly [number, number, number, number];

		/**
		 * Cubic bezier for node reveal
		 * @default [0.215, 0.61, 0.355, 1] (ease-out-cubic)
		 */
		node: readonly [number, number, number, number];
	};

	/**
	 * Whether to respect prefers-reduced-motion
	 * @default true
	 */
	respectReducedMotion: boolean;
}

/**
 * Complete suggestion system configuration
 */
export interface SuggestionConfig {
	/** Timing configuration */
	timing: SuggestionTimingConfig;

	/** Quality control configuration */
	quality: SuggestionQualityConfig;

	/** Context extraction configuration */
	context: SuggestionContextConfig;

	/** Per-trigger configuration */
	triggers: TriggerConfig[];

	/** Animation configuration */
	animation: SuggestionAnimationConfig;
}

/**
 * Default suggestion configuration
 * Based on recommendations from inline-node-suggestions.md
 */
export const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig = {
	timing: {
		minTimeBetweenSuggestions: 3000, // 3 seconds between manual triggers
		apiThrottle: 3000,
	},

	quality: {
		minConfidence: 0.6,
		minConfidenceManual: 0.4,
		maxSuggestions: 5,
		maxSuggestionsManual: 6,
		highConfidenceThreshold: 0.8,
		mediumConfidenceThreshold: 0.6,
	},

	context: {
		contextLevels: ['primary', 'siblings', 'ancestry'],
		maxContextNodes: 20,
		includeTopology: false, // Phase 3 feature
	},

	triggers: [
		{
			name: 'magic-wand',
			enabled: true,
			debounce: 0,
			confidence: 0.4, // Show more when user manually asks
			maxSuggestions: 6,
		},
	] as TriggerConfig[],

	animation: {
		edgeDuration: 300,
		nodeDuration: 250,
		overlap: 0,
		easing: {
			edge: [0.23, 1, 0.32, 1] as const, // ease-out-quint
			node: [0.215, 0.61, 0.355, 1] as const, // ease-out-cubic
		},
		respectReducedMotion: true,
	},
};

/**
 * Type for partial configuration updates
 */
export type PartialSuggestionConfig = {
	[K in keyof SuggestionConfig]?: K extends 'triggers'
		? SuggestionConfig[K] // Triggers must be complete, not partial
		: Partial<SuggestionConfig[K]>;
};

/**
 * Helper to merge partial config with defaults
 */
export function mergeSuggestionConfig(
	partial: PartialSuggestionConfig
): SuggestionConfig {
	return {
		timing: { ...DEFAULT_SUGGESTION_CONFIG.timing, ...partial.timing },
		quality: { ...DEFAULT_SUGGESTION_CONFIG.quality, ...partial.quality },
		context: { ...DEFAULT_SUGGESTION_CONFIG.context, ...partial.context },
		triggers: partial.triggers || DEFAULT_SUGGESTION_CONFIG.triggers,
		animation: {
			...DEFAULT_SUGGESTION_CONFIG.animation,
			...partial.animation,
			easing: {
				...DEFAULT_SUGGESTION_CONFIG.animation.easing,
				...partial.animation?.easing,
			},
		},
	};
}
