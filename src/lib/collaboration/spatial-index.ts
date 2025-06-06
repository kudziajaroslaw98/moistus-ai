export interface Point {
	x: number;
	y: number;
}

export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface SpatialItem<T> {
	id: string;
	position: Point;
	data: T;
}

interface QuadTreeNode<T> {
	bounds: Bounds;
	items: SpatialItem<T>[];
	children: QuadTreeNode<T>[] | null;
}

export class SpatialIndex<T = any> {
	private root: QuadTreeNode<T>;
	private maxItemsPerNode: number;
	private maxDepth: number;
	private viewportBuffer: number;
	private itemMap: Map<string, SpatialItem<T>>;

	constructor(
		bounds: Bounds,
		options: {
			maxItemsPerNode?: number;
			maxDepth?: number;
			viewportBuffer?: number;
		} = {}
	) {
		this.maxItemsPerNode = options.maxItemsPerNode || 4;
		this.maxDepth = options.maxDepth || 8;
		this.viewportBuffer = options.viewportBuffer || 100;
		this.itemMap = new Map();

		this.root = this.createNode(bounds);
	}

	private createNode(bounds: Bounds): QuadTreeNode<T> {
		return {
			bounds,
			items: [],
			children: null,
		};
	}

	insert(item: SpatialItem<T>): void {
		// Update item map
		this.itemMap.set(item.id, item);

		// Insert into quadtree
		this.insertIntoNode(this.root, item, 0);
	}

	private insertIntoNode(
		node: QuadTreeNode<T>,
		item: SpatialItem<T>,
		depth: number
	): boolean {
		// Check if item is within node bounds
		if (!this.isPointInBounds(item.position, node.bounds)) {
			return false;
		}

		// If node has no children and hasn't reached capacity or max depth
		if (
			!node.children &&
			(node.items.length < this.maxItemsPerNode || depth >= this.maxDepth)
		) {
			node.items.push(item);
			return true;
		}

		// If node has no children but needs to subdivide
		if (!node.children) {
			this.subdivideNode(node);

			// Redistribute existing items
			const existingItems = [...node.items];
			node.items = [];

			for (const existingItem of existingItems) {
				this.insertIntoChildren(node, existingItem, depth + 1);
			}
		}

		// Insert into appropriate child
		return this.insertIntoChildren(node, item, depth + 1);
	}

	private insertIntoChildren(
		node: QuadTreeNode<T>,
		item: SpatialItem<T>,
		depth: number
	): boolean {
		if (!node.children) return false;

		for (const child of node.children) {
			if (this.insertIntoNode(child, item, depth)) {
				return true;
			}
		}

		// If item doesn't fit in any child (edge case), add to parent
		node.items.push(item);
		return true;
	}

	private subdivideNode(node: QuadTreeNode<T>): void {
		const { x, y, width, height } = node.bounds;
		const halfWidth = width / 2;
		const halfHeight = height / 2;

		node.children = [
			// Top-left
			this.createNode({
				x,
				y,
				width: halfWidth,
				height: halfHeight,
			}),
			// Top-right
			this.createNode({
				x: x + halfWidth,
				y,
				width: halfWidth,
				height: halfHeight,
			}),
			// Bottom-left
			this.createNode({
				x,
				y: y + halfHeight,
				width: halfWidth,
				height: halfHeight,
			}),
			// Bottom-right
			this.createNode({
				x: x + halfWidth,
				y: y + halfHeight,
				width: halfWidth,
				height: halfHeight,
			}),
		];
	}

	update(id: string, newPosition: Point): void {
		const item = this.itemMap.get(id);
		if (!item) return;

		// Remove from current position
		this.remove(id);

		// Update position and re-insert
		item.position = newPosition;
		this.insert(item);
	}

	remove(id: string): void {
		const item = this.itemMap.get(id);
		if (!item) return;

		// Remove from map
		this.itemMap.delete(id);

		// Remove from tree
		this.removeFromNode(this.root, item);
	}

	private removeFromNode(node: QuadTreeNode<T>, item: SpatialItem<T>): boolean {
		// Check items in this node
		const index = node.items.findIndex((i) => i.id === item.id);

		if (index !== -1) {
			node.items.splice(index, 1);
			return true;
		}

		// Check children
		if (node.children) {
			for (const child of node.children) {
				if (this.removeFromNode(child, item)) {
					return true;
				}
			}
		}

		return false;
	}

	query(viewport: Bounds): SpatialItem<T>[] {
		// Expand viewport by buffer
		const bufferedViewport: Bounds = {
			x: viewport.x - this.viewportBuffer,
			y: viewport.y - this.viewportBuffer,
			width: viewport.width + this.viewportBuffer * 2,
			height: viewport.height + this.viewportBuffer * 2,
		};

		const results: SpatialItem<T>[] = [];
		this.queryNode(this.root, bufferedViewport, results);

		// Remove duplicates (shouldn't happen but just in case)
		const uniqueResults = new Map<string, SpatialItem<T>>();
		results.forEach((item) => uniqueResults.set(item.id, item));

		return Array.from(uniqueResults.values());
	}

	private queryNode(
		node: QuadTreeNode<T>,
		viewport: Bounds,
		results: SpatialItem<T>[]
	): void {
		// Check if node bounds intersect with viewport
		if (!this.boundsIntersect(node.bounds, viewport)) {
			return;
		}

		// Add items in this node that are within viewport
		for (const item of node.items) {
			if (this.isPointInBounds(item.position, viewport)) {
				results.push(item);
			}
		}

		// Recursively check children
		if (node.children) {
			for (const child of node.children) {
				this.queryNode(child, viewport, results);
			}
		}
	}

	getVisibleCursors(viewport: Bounds): T[] {
		const items = this.query(viewport);
		return items.map((item) => item.data);
	}

	clear(): void {
		this.itemMap.clear();
		this.root = this.createNode(this.root.bounds);
	}

	// Utility methods
	public isPointInBounds(point: Point, bounds: Bounds): boolean {
		return (
			point.x >= bounds.x &&
			point.x <= bounds.x + bounds.width &&
			point.y >= bounds.y &&
			point.y <= bounds.y + bounds.height
		);
	}

	private boundsIntersect(a: Bounds, b: Bounds): boolean {
		return !(
			a.x + a.width < b.x ||
			b.x + b.width < a.x ||
			a.y + a.height < b.y ||
			b.y + b.height < a.y
		);
	}

	// Debug methods
	getStats(): {
		totalItems: number;
		nodeCount: number;
		maxDepth: number;
		averageItemsPerNode: number;
	} {
		const stats = {
			totalItems: this.itemMap.size,
			nodeCount: 0,
			maxDepth: 0,
			totalItemsInNodes: 0,
		};

		this.calculateNodeStats(this.root, 0, stats);

		return {
			totalItems: stats.totalItems,
			nodeCount: stats.nodeCount,
			maxDepth: stats.maxDepth,
			averageItemsPerNode:
				stats.nodeCount > 0 ? stats.totalItemsInNodes / stats.nodeCount : 0,
		};
	}

	private calculateNodeStats(
		node: QuadTreeNode<T>,
		depth: number,
		stats: { nodeCount: number; maxDepth: number; totalItemsInNodes: number }
	): void {
		stats.nodeCount++;
		stats.maxDepth = Math.max(stats.maxDepth, depth);
		stats.totalItemsInNodes += node.items.length;

		if (node.children) {
			for (const child of node.children) {
				this.calculateNodeStats(child, depth + 1, stats);
			}
		}
	}

	// Visualization helper (for debugging)
	visualize(): string {
		const lines: string[] = [];
		this.visualizeNode(this.root, 0, lines);
		return lines.join('\n');
	}

	private visualizeNode(
		node: QuadTreeNode<T>,
		depth: number,
		lines: string[]
	): void {
		const indent = '  '.repeat(depth);
		const bounds = `[${node.bounds.x},${node.bounds.y} ${node.bounds.width}x${node.bounds.height}]`;
		lines.push(`${indent}Node ${bounds}: ${node.items.length} items`);

		if (node.children) {
			for (let i = 0; i < node.children.length; i++) {
				const quadrant = ['TL', 'TR', 'BL', 'BR'][i];
				lines.push(`${indent}  ${quadrant}:`);
				this.visualizeNode(node.children[i], depth + 2, lines);
			}
		}
	}

	// Batch operations for performance
	insertBatch(items: SpatialItem<T>[]): void {
		for (const item of items) {
			this.insert(item);
		}
	}

	updateBatch(updates: Array<{ id: string; position: Point }>): void {
		for (const update of updates) {
			this.update(update.id, update.position);
		}
	}

	removeBatch(ids: string[]): void {
		for (const id of ids) {
			this.remove(id);
		}
	}

	// Get all items (for debugging or special cases)
	getAllItems(): SpatialItem<T>[] {
		return Array.from(this.itemMap.values());
	}

	// Check if an item exists
	has(id: string): boolean {
		return this.itemMap.has(id);
	}

	// Get a specific item
	get(id: string): SpatialItem<T> | undefined {
		return this.itemMap.get(id);
	}

	// Get the number of items
	size(): number {
		return this.itemMap.size;
	}

	// Update bounds (rebuilds the entire tree)
	updateBounds(newBounds: Bounds): void {
		const allItems = this.getAllItems();
		this.root = this.createNode(newBounds);
		this.itemMap.clear();
		this.insertBatch(allItems);
	}
}

// Specialized cursor spatial index with additional features
export class CursorSpatialIndex<T = any> extends SpatialIndex<T> {
	private lastPositions: Map<string, Point>;
	private velocities: Map<string, Point>;

	constructor(bounds: Bounds, options?: any) {
		super(bounds, options);
		this.lastPositions = new Map();
		this.velocities = new Map();
	}

	updateWithVelocity(id: string, newPosition: Point): void {
		const lastPos = this.lastPositions.get(id);

		if (lastPos) {
			// Calculate velocity
			const velocity = {
				x: newPosition.x - lastPos.x,
				y: newPosition.y - lastPos.y,
			};
			this.velocities.set(id, velocity);
		}

		this.lastPositions.set(id, newPosition);
		this.update(id, newPosition);
	}

	// Predict future positions based on velocity
	queryWithPrediction(
		viewport: Bounds,
		predictionMs: number = 100
	): SpatialItem<T>[] {
		const items = this.query(viewport);

		// Include items that might enter the viewport based on velocity
		const allItems = this.getAllItems();

		for (const item of allItems) {
			if (items.find((i) => i.id === item.id)) continue;

			const velocity = this.velocities.get(item.id);
			if (!velocity) continue;

			// Predict future position
			const predictedPos = {
				x: item.position.x + (velocity.x * predictionMs) / 16, // Assuming 60fps
				y: item.position.y + (velocity.y * predictionMs) / 16,
			};

			if (this.isPointInBounds(predictedPos, viewport)) {
				items.push(item);
			}
		}

		return items;
	}

	clear(): void {
		super.clear();
		this.lastPositions.clear();
		this.velocities.clear();
	}
}
