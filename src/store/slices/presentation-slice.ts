/**
 * Presentation Mode Slice
 *
 * Manages presentation state for converting mind maps into slideshows.
 * Root node becomes title slide, each child becomes a content slide.
 */

import type { AppNode } from '@/types/app-node';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

export interface Slide {
	id: string;
	nodeId: string;
	title: string;
	content: string | null;
	depth: number;
	childSlides: Slide[];
	parentId: string | null;
	nodeType: string;
	metadata?: Record<string, unknown>;
}

export interface PresentationState {
	isPresenting: boolean;
	slides: Slide[];
	currentSlideIndex: number;
	isFullscreen: boolean;
	showSpeakerNotes: boolean;
	transitionDuration: number;
	laserPointerEnabled: boolean;
}

export interface PresentationSlice extends PresentationState {
	// Actions
	startPresentation: (startFromNodeId?: string) => void;
	stopPresentation: () => void;
	nextSlide: () => void;
	previousSlide: () => void;
	goToSlide: (index: number) => void;
	toggleFullscreen: () => void;
	toggleSpeakerNotes: () => void;
	toggleLaserPointer: () => void;
	setTransitionDuration: (duration: number) => void;

	// Computed
	getCurrentSlide: () => Slide | null;
	getTotalSlides: () => number;
	getProgress: () => number;
}

// Helper function to build slides from nodes
function buildSlidesFromNodes(
	nodes: AppNode[],
	edges: { source: string; target: string }[],
	startNodeId?: string
): Slide[] {
	// Find root nodes (nodes with no incoming edges, or the specified start node)
	const targetIds = new Set(edges.map((e) => e.target));
	const rootNodes = startNodeId
		? nodes.filter((n) => n.id === startNodeId)
		: nodes.filter((n) => !targetIds.has(n.id));

	// Build adjacency list for children
	const childrenMap = new Map<string, string[]>();
	edges.forEach((edge) => {
		const children = childrenMap.get(edge.source) || [];
		children.push(edge.target);
		childrenMap.set(edge.source, children);
	});

	// Node lookup
	const nodeMap = new Map(nodes.map((n) => [n.id, n]));

	// Build slides recursively
	function buildSlide(nodeId: string, depth: number, parentId: string | null): Slide | null {
		const node = nodeMap.get(nodeId);
		if (!node) return null;

		// Skip ghost nodes
		if (node.type === 'ghostNode') return null;

		// Get child node IDs
		const childIds = childrenMap.get(nodeId) || [];

		// Build child slides
		const childSlides = childIds
			.map((childId) => buildSlide(childId, depth + 1, nodeId))
			.filter((s): s is Slide => s !== null);

		return {
			id: `slide-${nodeId}`,
			nodeId: node.id,
			title: extractTitle(node),
			content: node.data?.content || null,
			depth,
			childSlides,
			parentId,
			nodeType: node.type || 'defaultNode',
			metadata: node.data?.metadata ?? undefined,
		};
	}

	// Extract title from node (use metadata title if available, otherwise content)
	function extractTitle(node: AppNode): string {
		if (node.data?.metadata?.title) {
			return String(node.data.metadata.title);
		}
		if (node.data?.content) {
			// Use first line or first 50 characters
			const firstLine = node.data.content.split('\n')[0];
			return firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;
		}
		return 'Untitled';
	}

	// Build root slides
	const rootSlides = rootNodes
		.map((node) => buildSlide(node.id, 0, null))
		.filter((s): s is Slide => s !== null);

	// Flatten slides for presentation (depth-first)
	function flattenSlides(slides: Slide[]): Slide[] {
		return slides.flatMap((slide) => [slide, ...flattenSlides(slide.childSlides)]);
	}

	return flattenSlides(rootSlides);
}

const initialState: PresentationState = {
	isPresenting: false,
	slides: [],
	currentSlideIndex: 0,
	isFullscreen: false,
	showSpeakerNotes: false,
	transitionDuration: 300,
	laserPointerEnabled: false,
};

export const createPresentationSlice: StateCreator<
	AppState,
	[],
	[],
	PresentationSlice
> = (set, get) => ({
	...initialState,

	startPresentation: (startFromNodeId?: string) => {
		const { nodes, edges } = get();
		const slides = buildSlidesFromNodes(nodes, edges, startFromNodeId);

		if (slides.length === 0) {
			console.warn('No slides to present');
			return;
		}

		// Find starting index if startFromNodeId was specified
		let startIndex = 0;
		if (startFromNodeId) {
			const idx = slides.findIndex((s) => s.nodeId === startFromNodeId);
			if (idx !== -1) startIndex = idx;
		}

		set({
			isPresenting: true,
			slides,
			currentSlideIndex: startIndex,
		});
	},

	stopPresentation: () => {
		// Exit fullscreen if active
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		}

		set({
			...initialState,
		});
	},

	nextSlide: () => {
		const { currentSlideIndex, slides } = get();
		if (currentSlideIndex < slides.length - 1) {
			set({ currentSlideIndex: currentSlideIndex + 1 });
		}
	},

	previousSlide: () => {
		const { currentSlideIndex } = get();
		if (currentSlideIndex > 0) {
			set({ currentSlideIndex: currentSlideIndex - 1 });
		}
	},

	goToSlide: (index: number) => {
		const { slides } = get();
		if (index >= 0 && index < slides.length) {
			set({ currentSlideIndex: index });
		}
	},

	toggleFullscreen: async () => {
		const { isFullscreen } = get();

		try {
			if (!isFullscreen) {
				await document.documentElement.requestFullscreen();
				set({ isFullscreen: true });
			} else if (document.fullscreenElement) {
				await document.exitFullscreen();
				set({ isFullscreen: false });
			}
		} catch (error) {
			console.error('Fullscreen toggle failed:', error);
		}
	},

	toggleSpeakerNotes: () => {
		set((state) => ({ showSpeakerNotes: !state.showSpeakerNotes }));
	},

	toggleLaserPointer: () => {
		set((state) => ({ laserPointerEnabled: !state.laserPointerEnabled }));
	},

	setTransitionDuration: (duration: number) => {
		set({ transitionDuration: Math.max(0, Math.min(1000, duration)) });
	},

	getCurrentSlide: () => {
		const { slides, currentSlideIndex } = get();
		return slides[currentSlideIndex] || null;
	},

	getTotalSlides: () => {
		return get().slides.length;
	},

	getProgress: () => {
		const { currentSlideIndex, slides } = get();
		if (slides.length === 0) return 0;
		return (currentSlideIndex + 1) / slides.length;
	},
});
