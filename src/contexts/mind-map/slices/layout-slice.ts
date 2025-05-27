import getLayoutedElements from "@/helpers/get-layouted-elements";
import withLoadingAndToast from "@/helpers/with-loading-and-toast";
import type { LayoutDirection } from "@/types/layout-direction";
import type { SpecificLayoutConfig } from "@/types/layout-types";
import { LayoutAlgorithms } from "@/utils/layout-algorithms";
import { toast } from "sonner";
import type { StateCreator } from "zustand";
import type { AppState } from "../app-state";

export interface LayoutSlice {
  // Layout state
  currentLayoutConfig: SpecificLayoutConfig | null;
  availableLayouts: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    config: SpecificLayoutConfig;
  }>;

  // Layout actions
  applyLayout: (direction: LayoutDirection) => Promise<void>;
  applyAdvancedLayout: (config: SpecificLayoutConfig) => Promise<void>;
  setLayoutConfig: (config: SpecificLayoutConfig) => void;
  getLayoutPresets: () => Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    config: SpecificLayoutConfig;
  }>;
}

export const createLayoutSlice: StateCreator<AppState, [], [], LayoutSlice> = (
  set,
  get,
) => ({
  // state
  currentLayoutConfig: null,
  availableLayouts: LayoutAlgorithms.getLayoutPresets(),

  // setters
  setLayoutConfig: (config: SpecificLayoutConfig) => {
    set({ currentLayoutConfig: config });
  },

  // getters
  getLayoutPresets: () => {
    return LayoutAlgorithms.getLayoutPresets();
  },

  // actions
  applyLayout: withLoadingAndToast(
    async (direction: LayoutDirection) => {
      const {
        nodes,
        edges,
        setNodes,
        reactFlowInstance,
        addStateToHistory,
        triggerNodeSave, // Use triggerNodeSave for individual node position updates
      } = get();

      if (nodes.length === 0) {
        // No need to throw an error that stops execution, just inform the user.
        toast.error("Nothing to layout. Add some nodes first.");
        return; // Return early if there are no nodes
      }

      const { layoutedNodes } = getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]); // Update nodes in the store with new positions

      // After nodes are updated in the store, trigger debounced save for each moved node.
      // triggerNodeSave will pick up the latest position from the store.
      layoutedNodes.forEach((node) => {
        triggerNodeSave(node.id);
      });

      addStateToHistory(`applyLayout (${direction})`);

      // Fit view after a short delay to allow DOM updates and ensure layout is rendered
      setTimeout(() => {
        reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
      }, 50);
    },
    "isApplyingLayout", // Key for loading state
    {
      initialMessage: "Applying layout...",
      successMessage: "Layout applied and node positions are being saved.",
      errorMessage: "Failed to apply layout.",
    },
  ),
  applyAdvancedLayout: withLoadingAndToast(
    async (config: SpecificLayoutConfig) => {
      const { nodes, edges, addStateToHistory } = get();

      const layoutResult = LayoutAlgorithms.applyLayout(nodes, edges, config);

      const updatedNodes = nodes.map((node) => {
        const layoutNode = layoutResult.nodes.find((ln) => ln.id === node.id);
        return layoutNode
          ? {
              ...node,
              position: layoutNode.position,
            }
          : node;
      });

      set({
        nodes: updatedNodes,
        currentLayoutConfig: config,
      });

      addStateToHistory("applyLayout", { nodes: updatedNodes, edges });
    },
    "isApplyingLayout",
    {
      initialMessage: "Applying layout...",
      successMessage: "Layout applied successfully",
      errorMessage: "Failed to apply layout",
    },
  ),
});
