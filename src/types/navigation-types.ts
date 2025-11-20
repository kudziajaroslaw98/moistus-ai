/**
 * Types for keyboard navigation in the mind map
 */

import type { AppNode } from './app-node';

/**
 * Cardinal directions for navigation
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Node with its center point calculated
 */
export interface NodeWithCenter {
  node: AppNode;
  center: Point;
}

/**
 * Result of directional search
 */
export interface DirectionalSearchResult {
  node: AppNode | null;
  distance: number;
  angle: number;
}

/**
 * Configuration for navigation behavior
 */
export interface NavigationConfig {
  /** Angle cone in degrees (±value from direction). Default: 45° */
  angleTolerance: number;
  /** Whether to widen angle if no nodes found. Default: true */
  widenAngleOnEmpty: boolean;
  /** Maximum widened angle in degrees. Default: 90° */
  maxWideAngle: number;
  /** Offset distance for new node creation in pixels. Default: 180 */
  createNodeOffset: number;
  /** Whether to animate viewport transitions. Default: true */
  animateViewport: boolean;
  /** Viewport animation duration in ms. Default: 300 */
  viewportAnimationDuration: number;
  /** Target zoom level when centering. Default: 1 */
  targetZoom: number;
}

/**
 * Default navigation configuration
 */
export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  angleTolerance: 45,
  widenAngleOnEmpty: true,
  maxWideAngle: 90,
  createNodeOffset: 180,
  animateViewport: true,
  viewportAnimationDuration: 300,
  targetZoom: 1,
};
