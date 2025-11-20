/**
 * Hook for keyboard navigation in the mind map
 * Handles arrow key navigation, node creation, and viewport management
 */

import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import useAppStore from '@/store/mind-map-store';
import {
  getClosestNodeInDirection,
  calculateNewNodePosition,
  getNodeCenter,
} from '@/utils/navigation-helpers';
import type { NavigationDirection, NavigationConfig } from '@/types/navigation-types';
import { DEFAULT_NAVIGATION_CONFIG } from '@/types/navigation-types';

interface UseKeyboardNavigationProps {
  /** Whether navigation is enabled. Default: true */
  enabled?: boolean;
  /** Custom navigation configuration */
  config?: Partial<NavigationConfig>;
}

export function useKeyboardNavigation({
  enabled = true,
  config: customConfig,
}: UseKeyboardNavigationProps = {}): void {
  const reactFlowInstance = useReactFlow();

  // Store selectors
  const selectedNodes = useAppStore((state) => state.selectedNodes);
  const setSelectedNodes = useAppStore((state) => state.setSelectedNodes);
  const getVisibleNodes = useAppStore((state) => state.getVisibleNodes);
  const nodeEditor = useAppStore((state) => state.nodeEditor);
  const popoverOpen = useAppStore((state) => state.popoverOpen);
  const openNodeEditor = useAppStore((state) => state.openNodeEditor);

  // Merge custom config with defaults
  const config: NavigationConfig = {
    ...DEFAULT_NAVIGATION_CONFIG,
    ...customConfig,
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Don't handle if input is focused
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ql-editor') ||
        target.closest('[contenteditable="true"]');

      if (isInputFocused) {
        return;
      }

      // Don't handle if any modal/popover is open
      const isModalOpen =
        nodeEditor.isOpen ||
        Object.values(popoverOpen).some((isOpen) => isOpen);

      if (isModalOpen) {
        return;
      }

      const isCtrlCmd = event.ctrlKey || event.metaKey;
      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        event.key
      );

      // Handle Ctrl+Arrow: Create node in direction
      if (isCtrlCmd && isArrowKey) {
        event.preventDefault();
        handleCreateNodeInDirection(event.key);
        return;
      }

      // Handle Arrow: Navigate in direction
      if (isArrowKey) {
        event.preventDefault();
        handleNavigateInDirection(event.key);
        return;
      }

      // Handle Enter: Edit selected node
      if (event.key === 'Enter') {
        event.preventDefault();
        handleEditSelectedNode();
        return;
      }

      // Handle Escape: Clear selection (when no modal open)
      if (event.key === 'Escape') {
        if (selectedNodes.length > 0) {
          event.preventDefault();
          setSelectedNodes([]);
        }
        return;
      }
    };

    /**
     * Navigate to the closest node in the arrow key direction
     */
    const handleNavigateInDirection = (key: string) => {
      const direction = getDirectionFromKey(key);
      if (!direction) return;

      // Get current selected node
      let currentNode = selectedNodes[0];

      // If multiple nodes selected, clear to first and navigate from there
      if (selectedNodes.length > 1) {
        setSelectedNodes([selectedNodes[0]]);
        currentNode = selectedNodes[0];
      }

      // If no node selected, do nothing
      if (!currentNode) {
        return;
      }

      // Get all visible nodes
      const visibleNodes = getVisibleNodes();

      // Find closest node in direction
      const targetNode = getClosestNodeInDirection(
        currentNode,
        direction,
        visibleNodes,
        config
      );

      if (targetNode) {
        // Select the target node
        setSelectedNodes([targetNode]);

        // Animate viewport to center the target node
        if (config.animateViewport) {
          const targetCenter = getNodeCenter(targetNode);
          reactFlowInstance.setCenter(targetCenter.x, targetCenter.y, {
            zoom: config.targetZoom,
            duration: config.viewportAnimationDuration,
          });
        }
      }
      // If no target node found, do nothing (no visual feedback yet)
    };

    /**
     * Create a new node in the direction of the arrow key
     */
    const handleCreateNodeInDirection = (key: string) => {
      const direction = getDirectionFromKey(key);
      if (!direction) return;

      // Get current selected node (source node)
      const sourceNode = selectedNodes[0];

      // If no node selected or multiple selected, do nothing
      if (!sourceNode || selectedNodes.length > 1) {
        return;
      }

      // Calculate position for new node
      const newPosition = calculateNewNodePosition(
        sourceNode,
        direction,
        config.createNodeOffset
      );

      // Convert flow position to screen position for modal
      const screenPosition = reactFlowInstance.flowToScreenPosition({
        x: newPosition.x + 100, // Offset to center of new node
        y: newPosition.y + 50,
      });

      // Open NodeEditor modal for creating new node
      openNodeEditor({
        mode: 'create',
        position: newPosition,
        screenPosition,
        parentNode: sourceNode,
        existingNodeId: null,
        suggestedType: null,
      });

      // Note: Edge creation is handled automatically by NodeEditor
      // when parentNode is provided
    };

    /**
     * Open editor for currently selected node
     */
    const handleEditSelectedNode = () => {
      const selectedNode = selectedNodes[0];

      // Only edit if exactly one node is selected
      if (!selectedNode || selectedNodes.length > 1) {
        return;
      }

      // Calculate screen position for modal
      const nodeCenter = getNodeCenter(selectedNode);
      const screenPosition = reactFlowInstance.flowToScreenPosition(nodeCenter);

      // Open NodeEditor in edit mode
      openNodeEditor({
        mode: 'edit',
        position: selectedNode.position,
        screenPosition,
        parentNode: null,
        existingNodeId: selectedNode.id,
        suggestedType: null,
      });
    };

    // Add event listener in capture phase to intercept BEFORE ReactFlow
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [
    enabled,
    selectedNodes,
    setSelectedNodes,
    getVisibleNodes,
    nodeEditor,
    popoverOpen,
    openNodeEditor,
    reactFlowInstance,
    config,
  ]);
}

/**
 * Convert arrow key to navigation direction
 */
function getDirectionFromKey(key: string): NavigationDirection | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}
