import type { AppEdge } from "@/types/app-edge";
import type { AppNode } from "@/types/app-node";
import type { LayoutResult, SpecificLayoutConfig } from "@/types/layout-types";
import dagre from "dagre";

// Simple force simulation for force-directed layout
interface ForceNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface ForceLink {
  source: string;
  target: string;
}

export class LayoutAlgorithms {
  private static applyDagreLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    direction: string = "TB",
    nodeSpacing: number = 80,
    rankSpacing: number = 150,
  ): LayoutResult {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing,
      ranksep: rankSpacing,
      marginx: 20,
      marginy: 20,
    });

    nodes.forEach((node) => {
      const nodeWidth = node.width || 320;
      const nodeHeight = node.height || 100;
      g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);

      if (!nodeWithPosition) {
        return { id: node.id, position: node.position };
      }

      const nodeWidth = node.width || 320;
      const nodeHeight = node.height || 100;

      return {
        id: node.id,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    return {
      nodes: layoutedNodes,
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  }

  private static applyForceDirectedLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    config: { iterations?: number; strength?: number; distance?: number } = {},
  ): LayoutResult {
    const { iterations = 300, strength = -300, distance = 100 } = config;

    const forceNodes: ForceNode[] = nodes.map((node) => ({
      id: node.id,
      x: node.position.x + Math.random() * 100,
      y: node.position.y + Math.random() * 100,
      vx: 0,
      vy: 0,
    }));

    const links: ForceLink[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    // Simple force simulation
    for (let i = 0; i < iterations; i++) {
      const alpha = 0.3 * (1 - i / iterations);

      // Reset forces
      forceNodes.forEach((node) => {
        node.vx = 0;
        node.vy = 0;
      });

      // Repulsion force between all nodes
      for (let j = 0; j < forceNodes.length; j++) {
        for (let k = j + 1; k < forceNodes.length; k++) {
          const a = forceNodes[j];
          const b = forceNodes[k];

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared > 0) {
            const distance = Math.sqrt(distanceSquared);
            const force = (strength * alpha) / distance;

            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // Attraction force for connected nodes
      links.forEach((link) => {
        const source = forceNodes.find((n) => n.id === link.source);
        const target = forceNodes.find((n) => n.id === link.target);

        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0) {
            const force = (dist - distance) * alpha * 0.1;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      });

      // Apply velocities
      forceNodes.forEach((node) => {
        if (node.fx === undefined) node.x += node.vx;
        if (node.fy === undefined) node.y += node.vy;
      });
    }

    return {
      nodes: forceNodes.map((node) => ({
        id: node.id,
        position: { x: node.x, y: node.y },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  }

  private static applyCircularLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    config: { radius?: number; startAngle?: number; sortNodes?: boolean } = {},
  ): LayoutResult {
    const { radius = 200, startAngle = 0, sortNodes = false } = config;

    const sortedNodes = [...nodes];

    if (sortNodes) {
      sortedNodes.sort((a, b) =>
        (a.data.content || "").localeCompare(b.data.content || ""),
      );
    }

    const angleStep = (2 * Math.PI) / sortedNodes.length;

    const layoutedNodes = sortedNodes.map((node, index) => {
      const angle = startAngle + index * angleStep;
      return {
        id: node.id,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
      };
    });

    return {
      nodes: layoutedNodes,
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  }

  private static applyGridLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    config: { columns?: number; cellWidth?: number; cellHeight?: number } = {},
  ): LayoutResult {
    const {
      columns = Math.ceil(Math.sqrt(nodes.length)),
      cellWidth = 350,
      cellHeight = 150,
    } = config;

    const layoutedNodes = nodes.map((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      return {
        id: node.id,
        position: {
          x: col * cellWidth,
          y: row * cellHeight,
        },
      };
    });

    return {
      nodes: layoutedNodes,
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  }

  private static applyRadialLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    config: {
      centerNode?: string;
      maxRadius?: number;
      nodeSpacing?: number;
    } = {},
  ): LayoutResult {
    const { centerNode, maxRadius = 300, nodeSpacing = 80 } = config;

    const centerNodeObj = centerNode
      ? nodes.find((n) => n.id === centerNode)
      : nodes[0];

    if (!centerNodeObj) {
      return this.applyCircularLayout(nodes, edges);
    }

    const remainingNodes = nodes.filter((n) => n.id !== centerNodeObj.id);
    const levels: string[][] = [];

    // Build levels based on edges
    const visited = new Set<string>();
    const queue: { id: string; level: number }[] = [
      { id: centerNodeObj.id, level: 0 },
    ];
    visited.add(centerNodeObj.id);

    while (queue.length > 0) {
      const { id: currentId, level } = queue.shift()!;

      if (!levels[level]) levels[level] = [];
      levels[level].push(currentId);

      const neighbors = edges
        .filter((e) => e.source === currentId || e.target === currentId)
        .map((e) => (e.source === currentId ? e.target : e.source))
        .filter((nodeId) => !visited.has(nodeId));

      neighbors.forEach((neighborId) => {
        visited.add(neighborId);
        queue.push({ id: neighborId, level: level + 1 });
      });
    }

    // Add remaining unconnected nodes to the last level
    remainingNodes.forEach((node) => {
      if (!visited.has(node.id)) {
        const lastLevel = levels.length;
        if (!levels[lastLevel]) levels[lastLevel] = [];
        levels[lastLevel].push(node.id);
      }
    });

    // Position nodes
    const layoutedNodes: Array<{
      id: string;
      position: { x: number; y: number };
    }> = [];

    levels.forEach((levelNodes, levelIndex) => {
      if (levelIndex === 0) {
        // Center node
        layoutedNodes.push({
          id: levelNodes[0],
          position: { x: 0, y: 0 },
        });
      } else {
        const radius = Math.min(levelIndex * nodeSpacing, maxRadius);
        const angleStep = (2 * Math.PI) / levelNodes.length;

        levelNodes.forEach((nodeId, nodeIndex) => {
          const angle = nodeIndex * angleStep;
          layoutedNodes.push({
            id: nodeId,
            position: {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
            },
          });
        });
      }
    });

    return {
      nodes: layoutedNodes,
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  }

  private static applyTreeLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    config: {
      direction?: string;
      levelSeparation?: number;
      siblingSpacing?: number;
    } = {},
  ): LayoutResult {
    const {
      direction = "TB",
      levelSeparation = 150,
      siblingSpacing = 100,
    } = config;

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(
      (node) => !edges.some((edge) => edge.target === node.id),
    );

    if (rootNodes.length === 0) {
      return this.applyDagreLayout(nodes, edges, direction);
    }

    // Use the first root as the main root
    const root = rootNodes[0];
    const layoutedNodes: Array<{
      id: string;
      position: { x: number; y: number };
    }> = [];

    // Build tree structure
    const buildTree = (
      nodeId: string,
      level: number,
      xOffset: number,
    ): number => {
      const children = edges
        .filter((e) => e.source === nodeId)
        .map((e) => e.target);

      if (direction === "TB" || direction === "BT") {
        const y =
          direction === "TB"
            ? level * levelSeparation
            : -level * levelSeparation;
        layoutedNodes.push({
          id: nodeId,
          position: { x: xOffset, y },
        });
      } else {
        const x =
          direction === "LR"
            ? level * levelSeparation
            : -level * levelSeparation;
        layoutedNodes.push({
          id: nodeId,
          position: { x, y: xOffset },
        });
      }

      let currentOffset =
        xOffset - ((children.length - 1) * siblingSpacing) / 2;
      children.forEach((childId) => {
        currentOffset = buildTree(childId, level + 1, currentOffset);
        currentOffset += siblingSpacing;
      });

      return xOffset;
    };

    buildTree(root.id, 0, 0);

    // Add any remaining nodes that weren't connected
    const processedIds = new Set(layoutedNodes.map((n) => n.id));
    nodes.forEach((node, index) => {
      if (!processedIds.has(node.id)) {
        layoutedNodes.push({
          id: node.id,
          position: {
            x: (index - processedIds.size) * siblingSpacing,
            y: (rootNodes.length + 1) * levelSeparation,
          },
        });
      }
    });

    return {
      nodes: layoutedNodes,
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  }

  public static applyLayout(
    nodes: AppNode[],
    edges: AppEdge[],
    config: SpecificLayoutConfig,
  ): LayoutResult {
    switch (config.algorithm) {
      case "dagre-tb":
        return this.applyDagreLayout(
          nodes,
          edges,
          "TB",
          config.nodeSpacing,
          config.rankSpacing,
        );
      case "dagre-lr":
        return this.applyDagreLayout(
          nodes,
          edges,
          "LR",
          config.nodeSpacing,
          config.rankSpacing,
        );
      case "dagre-bt":
        return this.applyDagreLayout(
          nodes,
          edges,
          "BT",
          config.nodeSpacing,
          config.rankSpacing,
        );
      case "dagre-rl":
        return this.applyDagreLayout(
          nodes,
          edges,
          "RL",
          config.nodeSpacing,
          config.rankSpacing,
        );
      case "force-directed":
        return this.applyForceDirectedLayout(nodes, edges, {
          iterations: config.iterations,
          strength: (config as unknown as { strength?: number }).strength,
          distance: (config as unknown as { distance?: number }).distance,
        });
      case "circular":
        return this.applyCircularLayout(nodes, edges, {
          radius: (config as unknown as { radius?: number }).radius,
          startAngle: (config as unknown as { startAngle?: number }).startAngle,
          sortNodes: (config as unknown as { sortNodes?: boolean }).sortNodes,
        });
      case "grid":
        return this.applyGridLayout(nodes, edges, {
          columns: (config as unknown as { columns?: number }).columns,
          cellWidth: (config as unknown as { cellWidth?: number }).cellWidth,
          cellHeight: (config as unknown as { cellHeight?: number }).cellHeight,
        });
      case "radial":
        return this.applyRadialLayout(nodes, edges, {
          centerNode: (config as unknown as { centerNode?: string }).centerNode,
          maxRadius: (config as unknown as { maxRadius?: number }).maxRadius,
          nodeSpacing: config.nodeSpacing,
        });
      case "tree":
        return this.applyTreeLayout(nodes, edges, {
          direction: config.direction,
          levelSeparation: (config as unknown as { levelSeparation?: number })
            .levelSeparation,
          siblingSpacing: (config as unknown as { siblingSpacing?: number })
            .siblingSpacing,
        });
      case "hierarchical":
        // For now, use dagre as hierarchical layout
        return this.applyDagreLayout(
          nodes,
          edges,
          config.direction || "TB",
          config.nodeSpacing,
          config.rankSpacing,
        );
      default:
        return this.applyDagreLayout(nodes, edges);
    }
  }

  public static getLayoutPresets() {
    return [
      {
        id: "dagre-tb",
        name: "Top to Bottom",
        description: "Hierarchical layout flowing from top to bottom",
        category: "hierarchical" as const,
        config: {
          algorithm: "dagre-tb" as const,
          nodeSpacing: 80,
          rankSpacing: 150,
        },
      },
      {
        id: "dagre-lr",
        name: "Left to Right",
        description: "Hierarchical layout flowing from left to right",
        category: "hierarchical" as const,
        config: {
          algorithm: "dagre-lr" as const,
          nodeSpacing: 80,
          rankSpacing: 150,
        },
      },
      {
        id: "force-directed",
        name: "Force Directed",
        description: "Organic layout using force simulation",
        category: "force" as const,
        config: {
          algorithm: "force-directed" as const,
          iterations: 300,
          strength: -300,
          distance: 100,
        },
        disabled: true,
      },
      {
        id: "circular",
        name: "Circular",
        description: "Arrange nodes in a circle",
        category: "geometric" as const,
        config: {
          algorithm: "circular" as const,
          radius: 200,
          startAngle: 0,
          sortNodes: false,
        },
        disabled: true,
      },
      {
        id: "radial",
        name: "Radial",
        description: "Radial layout from center node",
        category: "hierarchical" as const,
        config: {
          algorithm: "radial" as const,
          nodeSpacing: 80,
          maxRadius: 300,
        },
        disabled: true,
      },
      {
        id: "grid",
        name: "Grid",
        description: "Organize nodes in a grid pattern",
        category: "geometric" as const,
        config: {
          algorithm: "grid" as const,
          columns: 4,
          cellWidth: 350,
          cellHeight: 150,
        },
        disabled: true,
      },
      {
        id: "tree",
        name: "Tree",
        description: "Tree layout with proper hierarchy",
        category: "hierarchical" as const,
        config: {
          algorithm: "tree" as const,
          direction: "TB" as const,
          levelSeparation: 150,
          siblingSpacing: 100,
        },
        disabled: true,
      },
    ];
  }
}
