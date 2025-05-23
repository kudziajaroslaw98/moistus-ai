// import type { AiActions, AiLoadingStates } from "@/hooks/use-ai-features"; // Assuming types are exported
// import type { CrudActions } from "@/hooks/use-mind-map-crud";
// import type { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
// import type { AppEdge } from "@/types/app-edge";
// import { ContextMenuState } from "@/types/context-menu-state";
// import type { EdgeData } from "@/types/edge-data";
// import type { HistoryState } from "@/types/history-state";
// import { MindMapData } from "@/types/mind-map-data";
// import type { NodeData } from "@/types/node-data";
// import {
//   Edge,
//   EdgeMouseHandler,
//   Node,
//   NodeMouseHandler,
//   OnEdgesChange,
//   OnNodesChange,
//   ReactFlowInstance,
//   XYPosition,
// } from "@xyflow/react";
// import React, {
//   createContext,
//   useContext,
//   type PropsWithChildren,
// } from "react";

// interface MindMapContextProps2 extends Record<string, unknown> {
//   // State
//   mindMap: MindMapData | null;
//   mapId: string | null;
//   nodes: Node<NodeData>[];
//   edges: AppEdge[];
//   isLoading: boolean; // Combined loading state
//   isStateLoading: boolean;
//   isCrudLoading: boolean;
//   isLayoutLoading: boolean;
//   aiLoadingStates: AiLoadingStates;
//   canUndo: boolean;
//   canRedo: boolean;
//   currentHistoryState: HistoryState | undefined;
//   suggestedEdges: Edge<Partial<EdgeData>>[];
//   mergeSuggestions: AiMergeSuggestion[];
//   isAiContentModalOpen: boolean;
//   aiContentTargetNodeId: string | null;
//   isMergeModalOpen: boolean;
//   isNodeTypeModalOpen: boolean;
//   isNodeEditModalOpen: boolean;
//   nodeToEdit: NodeData | null;
//   isEdgeEditModalOpen: boolean;
//   edgeToEdit: AppEdge | null;
//   isCommandPaletteOpen: boolean;
//   isFocusMode: boolean;
//   aiPrompt: string;
//   aiSearchQuery: string;
//   history: HistoryState[]; // Full history array
//   historyIndex: number; // Current index in history
//   isHistorySidebarOpen: boolean; // State for the new sidebar
//   nodeToAddInfo: { parentId: string | null; position?: XYPosition } | null; // Add this line

//   // Setters / Actions
//   setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
//   setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
//   crudActions: CrudActions;
//   aiActions: AiActions;
//   applyLayout: (direction: "TB" | "LR") => Promise<void>;
//   handleUndo: () => void;
//   handleRedo: () => void;
//   addStateToHistory: (sourceAction?: string) => void;
//   revertToHistoryState: (index: number) => Promise<void>; // Function to revert
//   setIsHistorySidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; // Setter for sidebar
//   contextMenuHandlers: {
//     onNodeContextMenu: NodeMouseHandler<Node<NodeData>>;
//     onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void;
//     onEdgeContextMenu: EdgeMouseHandler<Edge<Partial<EdgeData>>>;
//     onPaneClick: () => void;
//     close: () => void;
//   };
//   reactFlowInstance: ReactFlowInstance | null;
//   setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
//   setIsAiContentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   setIsMergeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   setIsNodeTypeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   setNodeToAddInfo: React.Dispatch<
//     React.SetStateAction<{
//       parentId: string | null;
//       position?: XYPosition | undefined;
//     } | null>
//   >;
//   setIsNodeEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   setNodeToEdit: React.Dispatch<React.SetStateAction<NodeData | null>>;
//   setIsEdgeEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   setEdgeToEdit: React.Dispatch<React.SetStateAction<AppEdge | null>>;
//   setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   toggleFocusMode: () => void;
//   handleCopy: () => void;
//   handlePaste: () => Promise<void>;
//   onNodesChange: OnNodesChange;
//   onEdgesChange: OnEdgesChange;
//   contextMenuState: ContextMenuState;
//   toggleNodeCollapse: (nodeId: string) => Promise<void>; // Added for collapsing
//   isNodeCollapsed: (nodeId: string) => boolean; // Helper to check collapse state
// }

// const MindMapContext2 = createContext<MindMapContextProps2 | undefined>(
//   undefined,
// );

// export const useMindMapContext2 = () => {
//   const context = useContext(MindMapContext2);

//   if (!context) {
//     throw new Error("useMindMapContext must be used within a MindMapProvider");
//   }

//   return context;
// };

// export function MindMapProvider2({ children }: PropsWithChildren) {
//   //   const params = useParams();
//   //   const mapId = params.id as string;
//   const [reactFlowInstance, setReactFlowInstance] =
//     useState<ReactFlowInstance | null>(null); // Store the whole instance initially

//   //   const [isFocusMode, setIsFocusMode] = useState(false);
//   const [copiedNodes, setCopiedNodes] = useState<Node<NodeData>[]>([]);
//   const [selectedNodes, setSelectedNodes] = useState<
//     Node<NodeData>[] | undefined
//   >(undefined);
//   //   const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
//   //   const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState(false);
//   //   const [nodeToAddInfo, setNodeToAddInfo] = useState<{
//   //     parentId: string | null;
//   //     position?: XYPosition;
//   //   } | null>(null);
//   //   const [isNodeEditModalOpen, setIsNodeEditModalOpen] = useState(false);
//   //   const [nodeToEdit, setNodeToEdit] = useState<NodeData | null>(null);
//   //   const [isEdgeEditModalOpen, setIsEdgeEditModalOpen] = useState(false);
//   //   const [edgeToEdit, setEdgeToEdit] = useState<AppEdge | null>(null);
//   //   const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false); // New state

//   //   // --- Initialize Hooks ---
//   //   const {
//   //     mindMap,
//   //     nodes,
//   //     setNodes,
//   //     onNodesChange: directNodesChangeHandler,
//   //     edges,
//   //     setEdges,
//   //     onEdgesChange: directEdgesChangeHandler,
//   //     stateError,
//   //     isStateLoading,
//   //   } = useMindMapState(mapId);

//   const crudActionsRef = useRef<
//     ReturnType<typeof useMindMapCRUD>["crudActions"] | null
//   >(null);
//   const aiActionsRef = useRef<
//     ReturnType<typeof useAiFeatures>["aiActions"] | null
//   >(null);

//   const {
//     addStateToHistory,
//     handleUndo,
//     handleRedo,
//     revertToHistoryState, // Get new function
//     canUndo,
//     canRedo,
//     currentHistoryState,
//     history, // Get history array
//     historyIndex, // Get history index
//   } = useMindMapHistory({
//     nodes,
//     edges,
//     setNodes,
//     setEdges,
//     crudActions: crudActionsRef.current,
//     isStateLoading,
//   });

//   const { crudActions, isLoading: isCrudLoading } = useMindMapCRUD({
//     mapId,
//     nodes,
//     edges,
//     setNodes,
//     setEdges,
//     addStateToHistory,
//     aiActions: aiActionsRef.current,
//   });

//   crudActionsRef.current = crudActions;

//   const {
//     aiActions,
//     aiLoadingStates,
//     suggestedEdges,
//     mergeSuggestions,
//     isAiContentModalOpen,
//     setIsAiContentModalOpen,
//     aiContentTargetNodeId,
//     isMergeModalOpen,
//     setIsMergeModalOpen,
//     aiPrompt,
//     aiSearchQuery,
//   } = useAiFeatures({
//     mapId,
//     nodes,
//     addNode: crudActions.addNode,
//     deleteNode: crudActions.deleteNode,
//     saveEdge: crudActions.addEdge,
//     saveNodeContent: crudActions.saveNodeContent,
//     setNodes,
//     setEdges,
//     saveNodeMetadata: crudActions.saveNodeMetadata,
//     saveNodeAiData: crudActions.saveNodeAiData,
//     addStateToHistory,
//     currentHistoryState,
//   });
//   aiActionsRef.current = aiActions;

//   const { contextMenuHandlers, contextMenuState } = useContextMenu();

//   const { applyLayout, isLoading: isLayoutLoading } = useLayout({
//     nodes,
//     edges,
//     setNodes,
//     reactFlowInstance: reactFlowInstance,
//     addStateToHistory,
//     saveNodePosition: crudActions.saveNodePosition,
//   });

//   // --- Combined Loading State ---
//   const isLoading = useMemo(
//     () =>
//       isStateLoading ||
//       isCrudLoading ||
//       isLayoutLoading ||
//       Object.values(aiLoadingStates).some((loading) => loading),
//     [isStateLoading, isCrudLoading, isLayoutLoading, aiLoadingStates],
//   );

//   // --- UI Actions ---
//   const toggleFocusMode = useCallback(() => {
//     setIsFocusMode((prev) => !prev);
//   }, []);

//   const handleCopy = useCallback(() => {
//     if (!reactFlowInstance) return;
//     const currentNodes = reactFlowInstance.getNodes();
//     const selectedNodes = currentNodes.filter((node) => node.selected);

//     if (selectedNodes.length > 0) {
//       const nodesToCopy = selectedNodes.map((node) => ({
//         ...node,
//         data: { ...node.data },
//         selected: false,
//       })) as Node<NodeData>[];
//       setCopiedNodes(nodesToCopy);
//       toast.success(
//         `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}.`,
//       );
//     } else {
//       setCopiedNodes([]);
//     }
//   }, [reactFlowInstance]);

//   const handlePaste = useCallback(async () => {
//     if (copiedNodes.length === 0 || !reactFlowInstance) {
//       toast.error("Nothing to paste.");
//       return;
//     }

//     toast.message("Pasting nodes...");
//     const currentNodes = reactFlowInstance.getNodes();
//     const selectedNodes = currentNodes.filter((node) => node.selected);
//     const targetParentId =
//       selectedNodes.length === 1 ? selectedNodes[0].id : null;
//     const pasteCenter = reactFlowInstance.screenToFlowPosition({
//       x: window.innerWidth / 2,
//       y: window.innerHeight / 2 - 30,
//     });
//     const pastedNodeIds: string[] = [];

//     try {
//       const createdNodes = await Promise.all(
//         copiedNodes.map(async (copiedNode, index) => {
//           const newPosition: XYPosition = {
//             x: pasteCenter.x + index * 30 + Math.random() * 10 - 5,
//             y: pasteCenter.y + index * 30 + Math.random() * 10 - 5,
//           };
//           const clonedData = { ...copiedNode.data };
//           const initialDataForNewNode: Partial<NodeData> = {
//             ...clonedData,
//             content: (clonedData.content || "") + " (Copy)",
//             id: undefined,
//             parent_id: undefined,
//             position_x: undefined,
//             position_y: undefined,
//             embedding: undefined,
//             aiSummary: undefined,
//             extractedConcepts: undefined,
//             isSearchResult: undefined,
//             metadata: {
//               // Ensure metadata is copied, including isCollapsed
//               ...(clonedData.metadata || {}),
//             },
//           };
//           const newNode = await crudActions.addNode(
//             targetParentId,
//             initialDataForNewNode.content ?? "",
//             copiedNode.type ?? "defaultNode",
//             newPosition,
//             initialDataForNewNode,
//           );
//           if (newNode) pastedNodeIds.push(newNode.id);
//           return newNode;
//         }),
//       );
//       const successfulNodes = createdNodes.filter((node) => node !== null);

//       if (successfulNodes.length > 0) {
//         addStateToHistory("pasteNodes");
//         setNodes((nds) =>
//           nds.map((n) => ({ ...n, selected: pastedNodeIds.includes(n.id) })),
//         );
//         setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
//         toast.success(
//           `Pasted ${successfulNodes.length} node${successfulNodes.length > 1 ? "s" : ""}.`,
//         );
//       } else {
//         toast.error("Failed to paste nodes.");
//       }
//     } catch (error) {
//       console.error("Error during paste operation:", error);
//       toast.error("An error occurred while pasting.");
//     }
//   }, [
//     copiedNodes,
//     reactFlowInstance,
//     crudActions,
//     setNodes,
//     setEdges,
//     addStateToHistory,
//   ]);

//   const handleNodesChangeWithSave: OnNodesChange = useCallback(
//     (changes) => {
//       directNodesChangeHandler(changes);
//       changes.forEach((change) => crudActions.triggerNodeSave(change));
//       addStateToHistory("nodeChange");
//     },
//     [directNodesChangeHandler, crudActions.triggerNodeSave, addStateToHistory],
//   );

//   const handleEdgesChangeWithSave: OnEdgesChange = useCallback(
//     (changes) => {
//       directEdgesChangeHandler(changes);
//       changes.forEach((change) => crudActions.triggerEdgeSave(change));
//       addStateToHistory("edgeChange");
//     },
//     [directEdgesChangeHandler, crudActions.triggerEdgeSave, addStateToHistory],
//   );

//   useEffect(() => {
//     if (nodeToEdit !== null) {
//       setNodeToEdit(
//         (prev) => nodes.find((n) => n.id === prev?.id)?.data ?? null,
//       );
//     }
//   }, [nodes, nodeToEdit]);

//   // --- Collapse/Expand Logic ---
//   const toggleNodeCollapse = useCallback(
//     async (nodeId: string) => {
//       console.log(`[toggleNodeCollapse] Triggered for nodeId: ${nodeId}`);
//       const targetNodeIndex = nodes.findIndex((n) => n.id === nodeId);

//       if (targetNodeIndex === -1) {
//         console.warn(`[toggleNodeCollapse] Node not found: ${nodeId}`);
//         return;
//       }

//       const targetNode = nodes[targetNodeIndex];
//       const currentCollapsedState =
//         targetNode.data.metadata?.isCollapsed ?? false;
//       const newCollapsedState = !currentCollapsedState;
//       console.log(
//         `[toggleNodeCollapse] NodeId: ${nodeId}, currentCollapsed: ${currentCollapsedState}, newCollapsed: ${newCollapsedState}`,
//       );

//       // Optimistically update local state for UI responsiveness
//       const updatedNodesOptimistic = nodes.map((n) =>
//         n.id === nodeId
//           ? {
//               ...n,
//               data: {
//                 ...n.data,
//                 metadata: {
//                   ...(n.data.metadata || {}),
//                   isCollapsed: newCollapsedState,
//                 },
//               },
//             }
//           : n,
//       );

//       const updatedTargetNodeForLog = updatedNodesOptimistic.find(
//         (n) => n.id === nodeId,
//       );
//       console.log(
//         `[toggleNodeCollapse] Optimistic update for ${nodeId}. New isCollapsed: ${updatedTargetNodeForLog?.data.metadata?.isCollapsed}`,
//       );

//       setNodes(updatedNodesOptimistic); // This will trigger the visibility useEffect

//       try {
//         await crudActions.saveNodeMetadata(nodeId, {
//           isCollapsed: newCollapsedState,
//         });
//         addStateToHistory("toggleNodeCollapse");
//         toast.success(
//           `Branch ${newCollapsedState ? "collapsed" : "expanded"}.`,
//         );
//       } catch (error) {
//         toast.error("Error saving collapse state.");

//         const revertedNodes = nodes.map((n) =>
//           n.id === nodeId
//             ? {
//                 ...n,
//                 data: {
//                   ...n.data,
//                   metadata: {
//                     ...(n.data.metadata || {}),
//                     isCollapsed: currentCollapsedState, // Revert to original state
//                   },
//                 },
//               }
//             : n,
//         );
//         setNodes(revertedNodes);
//       }
//     },
//     [nodes, setNodes, crudActions, addStateToHistory],
//   );

//   const isNodeCollapsed = useCallback(
//     (nodeId: string): boolean => {
//       const node = nodes.find((n) => n.id === nodeId);
//       return node?.data.metadata?.isCollapsed ?? false;
//     },
//     [nodes],
//   );

//   useEffect(() => {
//     console.log(
//       "[Visibility useEffect] Triggered. Nodes length:",
//       nodes.length,
//       "Edges length:",
//       edges.length,
//     );
//     // This effect calculates and applies the `hidden` property to nodes and edges
//     // based on the `isCollapsed` status of parent nodes.

//     // Only run if there are nodes to process or if initial data has loaded.
//     if (nodes.length === 0) {
//       console.log(
//         "[Visibility useEffect] Skipped: No nodes and no initial nodes.",
//       );
//       return;
//     }

//     const nodeMap = new Map(nodes.map((node) => [node.id, node]));
//     let nodesChanged = false;
//     let edgesChanged = false;

//     // Log the collapsed state of all nodes before processing
//     nodes.forEach((n) => {
//       if (n.data.metadata?.isCollapsed !== undefined) {
//         // Log if isCollapsed is explicitly set
//         console.log(
//           `[Visibility useEffect] Pre-check: Node ${n.id} isCollapsed: ${n.data.metadata.isCollapsed}`,
//         );
//       }
//     });

//     const getIsAnyAncestorCollapsed = (startNodeId: string): boolean => {
//       let currentNodeId = startNodeId;

//       while (true) {
//         const node = nodeMap.get(currentNodeId);

//         if (!node || !node.data.parent_id) {
//           return false; // Reached a root node or node not found
//         }

//         const parentNode = nodeMap.get(node.data.parent_id);

//         if (!parentNode) {
//           return false; // Parent not found, break loop
//         }

//         if (parentNode.data.metadata?.isCollapsed) {
//           return true; // Found a collapsed ancestor
//         }

//         currentNodeId = parentNode.id; // Move up to the next parent
//       }
//     };

//     const newNodes = nodes.map((n) => {
//       const parentNode = n.data.parent_id
//         ? nodeMap.get(n.data.parent_id)
//         : null;
//       const shouldBeHidden = getIsAnyAncestorCollapsed(n.id);

//       // Replace 'YOUR_TARGET_NODE_ID_HERE' with the actual ID of the node you are testing with
//       if (
//         n.data.parent_id === "18b4b1bf-ca5a-4522-9106-f855be1b2e0b" ||
//         n.id === "18b4b1bf-ca5a-4522-9106-f855be1b2e0b"
//       ) {
//         console.log(
//           `[Visibility useEffect] Node: ${n.id}, Parent: ${n.data.parent_id}, Parent Node isCollapsed: ${parentNode?.data.metadata?.isCollapsed}, Calculated Hidden: ${shouldBeHidden}, Current Hidden: ${n.hidden}`,
//         );
//       }

//       if ((n.hidden ?? false) !== shouldBeHidden) {
//         console.log(
//           `[Visibility useEffect] Node ${n.id} hidden state changed from ${n.hidden} to ${shouldBeHidden}`,
//         );
//         nodesChanged = true;
//       }

//       return { ...n, hidden: shouldBeHidden };
//     });

//     const newEdges = edges.map((e) => {
//       const sourceNodeFromNewNodes = newNodes.find((n) => n.id === e.source);
//       const targetNodeFromNewNodes = newNodes.find((n) => n.id === e.target);

//       const sourceHidden = sourceNodeFromNewNodes?.hidden ?? false;
//       const targetHidden = targetNodeFromNewNodes?.hidden ?? false;
//       const shouldBeHidden = sourceHidden || targetHidden;

//       if ((e.hidden ?? false) !== shouldBeHidden) {
//         console.log(
//           `[Visibility useEffect] Edge ${e.id} hidden state changed from ${e.hidden} to ${shouldBeHidden}`,
//         );
//         edgesChanged = true;
//       }

//       return { ...e, hidden: shouldBeHidden };
//     });

//     if (nodesChanged) {
//       console.log("[Visibility useEffect] Applying node visibility changes.");
//       setNodes(newNodes);
//     }

//     if (edgesChanged) {
//       console.log("[Visibility useEffect] Applying edge visibility changes.");
//       setEdges(newEdges);
//     }

//     if (!nodesChanged && !edgesChanged) {
//       console.log("[Visibility useEffect] No visibility changes detected.");
//     }
//     // Dependency array ensures this effect runs when `nodes` or `edges` themselves change (e.g. adding/deleting)
//     // or when the content of `nodes` changes in a way that affects collapse (which is handled by `toggleNodeCollapse` calling `setNodes`).
//     // `initialNodes` and `initialEdges` are for the first pass after data load.
//   }, [nodes, edges, setNodes, setEdges]);

//   // --- Context Value ---
//   const contextValue = useMemo(
//     () => ({
//       mapId,
//       nodes,
//       edges,
//       onNodesChange: handleNodesChangeWithSave,
//       onEdgesChange: handleEdgesChangeWithSave,
//       isLoading,
//       isStateLoading,
//       isCrudLoading,
//       isLayoutLoading,
//       aiLoadingStates,
//       canUndo,
//       canRedo,
//       currentHistoryState,
//       suggestedEdges,
//       mergeSuggestions,
//       isAiContentModalOpen,
//       aiContentTargetNodeId,
//       isMergeModalOpen,
//       isNodeTypeModalOpen,
//       isNodeEditModalOpen,
//       nodeToEdit,
//       isEdgeEditModalOpen,
//       edgeToEdit,
//       isCommandPaletteOpen,
//       isFocusMode,
//       aiPrompt,
//       aiSearchQuery,
//       history, // Pass history array
//       historyIndex, // Pass history index
//       isHistorySidebarOpen, // Pass sidebar state
//       setNodes,
//       setEdges,
//       crudActions,
//       aiActions,
//       applyLayout,
//       handleUndo,
//       handleRedo,
//       addStateToHistory,
//       revertToHistoryState, // Pass revert function
//       contextMenuHandlers,
//       reactFlowInstance: reactFlowInstance as ReturnType<
//         typeof useReactFlow
//       > | null,
//       setReactFlowInstance: setReactFlowInstance as (
//         instance: ReturnType<typeof useReactFlow> | null,
//       ) => void,
//       setIsAiContentModalOpen,
//       setIsMergeModalOpen,
//       setIsNodeTypeModalOpen,
//       setNodeToAddInfo,
//       nodeToAddInfo, // Add this line
//       setIsNodeEditModalOpen,
//       setNodeToEdit,
//       setIsEdgeEditModalOpen,
//       setEdgeToEdit,
//       setIsCommandPaletteOpen,
//       setIsHistorySidebarOpen, // Pass sidebar setter
//       toggleFocusMode,
//       handleCopy,
//       handlePaste,
//       mindMap,
//       contextMenuState,
//       toggleNodeCollapse,
//       isNodeCollapsed,
//       selectedNodes,
//       setSelectedNodes,
//     }),
//     [
//       mapId,
//       nodes,
//       edges,
//       isLoading,
//       isStateLoading,
//       isCrudLoading,
//       isLayoutLoading,
//       aiLoadingStates,
//       canUndo,
//       canRedo,
//       currentHistoryState,
//       suggestedEdges,
//       mergeSuggestions,
//       isAiContentModalOpen,
//       aiContentTargetNodeId,
//       isMergeModalOpen,
//       isNodeTypeModalOpen,
//       isNodeEditModalOpen,
//       nodeToEdit,
//       isEdgeEditModalOpen,
//       edgeToEdit,
//       isCommandPaletteOpen,
//       isFocusMode,
//       aiPrompt,
//       aiSearchQuery,
//       history,
//       historyIndex,
//       isHistorySidebarOpen,
//       nodeToAddInfo, // Add dependency here
//       setNodes,
//       setEdges,
//       crudActions,
//       aiActions,
//       applyLayout,
//       handleUndo,
//       handleRedo,
//       addStateToHistory,
//       revertToHistoryState,
//       contextMenuHandlers,
//       reactFlowInstance,
//       setReactFlowInstance,
//       setIsAiContentModalOpen,
//       setIsMergeModalOpen,
//       setIsNodeTypeModalOpen,
//       setNodeToAddInfo,
//       setIsNodeEditModalOpen,
//       setNodeToEdit,
//       setIsEdgeEditModalOpen,
//       setEdgeToEdit,
//       setIsCommandPaletteOpen,
//       setIsHistorySidebarOpen,
//       toggleFocusMode,
//       handleCopy,
//       handlePaste,
//       handleNodesChangeWithSave,
//       handleEdgesChangeWithSave,
//       mindMap,
//       contextMenuState,
//       toggleNodeCollapse,
//       isNodeCollapsed,
//       selectedNodes,
//       setSelectedNodes,
//     ],
//   );

//   // Handle data loading error
//   useEffect(() => {
//     if (stateError && !mindMap) {
//       toast.error(`Error loading map: ${stateError}`);
//     }
//   }, [stateError, mindMap]);

//   // Handle initial loading state
//   if (isStateLoading && !mindMap && !stateError) {
//     return (
//       <div className="flex min-h-full items-center justify-center text-zinc-400">
//         Loading mind map...
//       </div>
//     );
//   }

//   // Handle case where mapId is invalid or map not found after loading attempt
//   if (!isStateLoading && !mindMap && !stateError && mapId) {
//     // Added mapId check to ensure it's not a pre-load scenario
//     return (
//       <div className="flex min-h-full items-center justify-center text-zinc-400">
//         Mind map not found or invalid ID.
//       </div>
//     );
//   }

//   return (
//     <MindMapContext2.Provider value={contextValue}>
//       {children}
//     </MindMapContext2.Provider>
//   );
// }

// export default MindMapContext2;
