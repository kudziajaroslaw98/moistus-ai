/**
 * Sidebar Theme Integration Utilities
 *
 * This module provides helper functions and hooks to integrate the sidebar component
 * with the glassmorphism theme system and animation guidelines.
 */

import { useEffect, useState } from 'react';
import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';

/**
 * Hook to detect if the user prefers reduced motion
 * Provides accessibility support for users with vestibular disorders
 *
 * @returns {boolean} True if user prefers reduced motion
 */
export const useReducedMotion = (): boolean => {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		// Check initial preference
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		setPrefersReducedMotion(mediaQuery.matches);

		// Listen for changes
		const handler = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches);
		};

		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	}, []);

	return prefersReducedMotion;
};

/**
 * Hook to detect if the device supports hover interactions
 * Used to optimize hover states for touch devices
 *
 * @returns {boolean} True if device has hover capability (not touch)
 */
export const useHoverCapable = (): boolean => {
	const [isHoverCapable, setIsHoverCapable] = useState(true);

	useEffect(() => {
		// Check if device supports hover
		const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
		setIsHoverCapable(mediaQuery.matches);

		// Listen for changes (e.g., when connecting external mouse to tablet)
		const handler = (event: MediaQueryListEvent) => {
			setIsHoverCapable(event.matches);
		};

		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	}, []);

	return isHoverCapable;
};

/**
 * Creates transition configuration using glassmorphism theme values
 * Follows animation guidelines: ease-out, 200ms default, optimized with will-change
 *
 * @param properties - CSS properties to animate (e.g., ['width', 'opacity'])
 * @param duration - Optional duration override (default: theme normal = 200ms)
 * @returns React CSSProperties object with transition configuration
 */
export const getSidebarTransition = (
	properties: string[],
	duration?: keyof typeof GlassmorphismTheme.animations.duration
): React.CSSProperties => {
	const theme = GlassmorphismTheme.animations;

	return {
		transitionProperty: properties.join(', '),
		transitionDuration: theme.duration[duration || 'normal'],
		transitionTimingFunction: theme.easing.default,
		// Only add will-change for properties that benefit from GPU acceleration
		willChange: properties.filter(prop =>
			['transform', 'opacity', 'width', 'left', 'right'].includes(prop)
		).join(', ') || 'auto',
	};
};

/**
 * Creates hover transition configuration optimized for simple property changes
 * Uses built-in 'ease' with 200ms as per animation guidelines
 *
 * @param properties - CSS properties to animate on hover (e.g., ['color', 'background-color'])
 * @returns React CSSProperties object with hover-optimized transition
 */
export const getHoverTransition = (properties: string[]): React.CSSProperties => {
	return {
		transitionProperty: properties.join(', '),
		transitionDuration: '200ms',
		transitionTimingFunction: 'ease',
	};
};

/**
 * Creates transform configuration with reduced motion support
 * Disables transforms when user prefers reduced motion
 *
 * @param transform - Transform value (e.g., 'translateY(-1px)')
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns React CSSProperties object with conditional transform
 */
export const getAccessibleTransform = (
	transform: string,
	prefersReducedMotion: boolean
): React.CSSProperties => {
	return {
		transform: prefersReducedMotion ? 'none' : transform,
	};
};

/**
 * Sidebar width constants using glassmorphism theme approach
 * These match the existing sidebar widths but provide type safety
 */
export const SIDEBAR_DIMENSIONS = {
	width: '16rem',
	widthMobile: '18rem',
	widthIcon: '3rem',
} as const;

/**
 * Sidebar transition configurations for common use cases
 * Pre-configured for optimal performance and accessibility
 */
export const SIDEBAR_TRANSITIONS = {
	width: getSidebarTransition(['width']),
	position: getSidebarTransition(['left', 'right', 'width']),
	collapse: getSidebarTransition(['margin', 'opacity']),
	hover: getHoverTransition(['background-color', 'color', 'opacity']),
} as const;

/**
 * Helper to conditionally apply styles based on hover capability
 * Prevents hover state issues on touch devices
 *
 * @param hoverStyles - Styles to apply when hover is supported
 * @param isHoverCapable - Whether device supports hover
 * @returns Styles object or empty object
 */
export const withHoverStyles = (
	hoverStyles: React.CSSProperties,
	isHoverCapable: boolean
): React.CSSProperties => {
	return isHoverCapable ? hoverStyles : {};
};
