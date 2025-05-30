// import generateUuid from "@/helpers/generate-uuid";
// import { AiConnectionSuggestion } from "@/types/ai-connection-suggestion";
// import { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
// import { AiNodeStructure } from "@/types/ai-node-structure";
// import type { AiResponseStructure } from "@/types/ai-response-structure";
// import type { ApiResponse } from "@/types/api-response";
// import { AppEdge } from "@/types/app-edge";
// import { EdgeData } from "@/types/edge-data";
// import { HistoryState } from "@/types/history-state";
// import { NodeData } from "@/types/node-data";
// import { Edge, Node, XYPosition } from "@xyflow/react";
// import { useCallback, useState } from "react";
// import { toast } from "sonner";

// interface UseAiFeaturesProps {
//   mapId: string;
//   nodes: Node<NodeData>[];
//   addNode: (
//     parentNodeId?: string | null,
//     content?: string,
//     nodeType?: string,
//     position?: XYPosition,
//     initialData?: Partial<NodeData>,
//   ) => Promise<Node<NodeData> | null>;
//   deleteNode: (nodeId: string) => Promise<void>;
//   saveEdge: (sourceId: string, targetId: string) => Promise<AppEdge | null>;
//   saveNodeContent: (nodeId: string, content: string) => Promise<void>;
//   saveNodeMetadata: (
//     nodeId: string,
//     metadata: Partial<NodeData["metadata"]>,
//   ) => Promise<void>;
//   saveNodeAiData: (
//     nodeId: string,
//     data: Partial<NodeData["aiData"]>,
//   ) => Promise<void>;
//   setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
//   setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
//   addStateToHistory: (
//     actionName?: string,
//     newState?: { nodes: Node<NodeData>[]; edges: AppEdge[] },
//   ) => void;
//   currentHistoryState: HistoryState | undefined;
// }

// export interface AiActions {
//   generateMap: () => Promise<void>;
//   summarizeNode: (nodeId: string) => Promise<void>;
//   summarizeBranch: (nodeId: string) => Promise<void>;
//   extractConcepts: (nodeId: string) => Promise<void>;
//   searchNodes: () => Promise<void>;
//   generateContent: (nodeId: string, additionalPrompt?: string) => Promise<void>;
//   suggestConnections: () => Promise<void>;
//   suggestMerges: () => Promise<void>;
//   acceptMerge: (suggestion: AiMergeSuggestion) => Promise<void>;
//   dismissMerge: (suggestion: AiMergeSuggestion) => void;
//   setAiPrompt: React.Dispatch<React.SetStateAction<string>>;
//   setAiSearchQuery: React.Dispatch<React.SetStateAction<string>>;
//   setAiContentTargetNodeId: React.Dispatch<React.SetStateAction<string | null>>;
//   acceptSuggestedConnection: (
//     suggestionData: AiConnectionSuggestion,
//   ) => Promise<void>;
//   dismissSuggestedConnection: (edgeId: string) => void;
//   generateAnswer: (nodeId: string, prompt: string) => Promise<void>;
//   generateFromSelectedNodes: (
//     nodeIds: string[],
//     prompt: string,
//   ) => Promise<void>;
// }

// export interface AiLoadingStates {
//   isGenerating: boolean;
//   isSummarizing: boolean;
//   isExtracting: boolean;
//   isSearching: boolean;
//   isGeneratingContent: boolean;
//   isSuggestingConnections: boolean;
//   isSummarizingBranch: boolean;
//   isSuggestingMerges: boolean;
//   isAcceptingMerge: boolean;
//   isGeneratingAnswer: boolean;
//   isGeneratingFromSelectedNodes: boolean;
// }

// export interface UseAiFeaturesResult {
//   aiActions: AiActions;
//   aiLoadingStates: AiLoadingStates;
//   suggestedEdges: Edge<Partial<EdgeData>>[];
//   mergeSuggestions: AiMergeSuggestion[];
//   isAiContentModalOpen: boolean;
//   setIsAiContentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   aiContentTargetNodeId: string | null;
//   isMergeModalOpen: boolean;
//   setIsMergeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
//   aiPrompt: string;
//   aiSearchQuery: string;
// }

// export function useAiFeatures({
//   mapId,
//   nodes,
//   addNode,
//   deleteNode,
//   saveEdge,
//   saveNodeContent,
//   saveNodeAiData,
//   setNodes,
//   setEdges,
//   addStateToHistory,
// }: UseAiFeaturesProps): UseAiFeaturesResult {
//   const [aiPrompt, setAiPrompt] = useState("");
//   const [aiSearchQuery, setAiSearchQuery] = useState("");
//   const [suggestedEdges, setSuggestedEdges] = useState<
//     Edge<Partial<EdgeData>>[]
//   >([]);
//   const [mergeSuggestions, setMergeSuggestions] = useState<AiMergeSuggestion[]>(
//     [],
//   );

//   const [loadingStates, setLoadingStates] = useState<AiLoadingStates>({
//     isGenerating: false,
//     isSummarizing: false,
//     isExtracting: false,
//     isSearching: false,
//     isGeneratingContent: false,
//     isSuggestingConnections: false,
//     isSummarizingBranch: false,
//     isSuggestingMerges: false,
//     isAcceptingMerge: false,
//     isGeneratingAnswer: false,
//   });

//   const [isAiContentModalOpen, setIsAiContentModalOpen] = useState(false);
//   const [aiContentTargetNodeId, setAiContentTargetNodeId] = useState<
//     string | null
//   >(null);
//   const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

//   const setLoading = (key: keyof AiLoadingStates, value: boolean) => {
//     setLoadingStates((prev) => ({ ...prev, [key]: value }));
//   };

//   const addAiStructure = useCallback(
//     async (
//       aiNode: AiNodeStructure,
//       parentNodeId: string | null,
//       basePosition?: { x: number; y: number },
//     ): Promise<Node<NodeData> | null> => {
//       const newNode = await addNode(
//         parentNodeId,
//         aiNode.content,
//         "editableNode",
//         basePosition,
//         {},
//       );

//       if (newNode && aiNode.children && aiNode.children.length > 0) {
//         const parentPos = newNode.position;

//         for (let i = 0; i < aiNode.children.length; i++) {
//           const child = aiNode.children[i];
//           const childPosition = {
//             x: parentPos.x + 200,
//             y: parentPos.y + i * 80,
//           };
//           await addAiStructure(child, newNode.id, childPosition);
//         }
//       }

//       return newNode;
//     },
//     [addNode],
//   );

//   const generateMap = useCallback(async () => {
//     if (!mapId || !aiPrompt.trim() || loadingStates.isGenerating) return;

//     setLoading("isGenerating", true);
//     const toastId = toast.loading("Generating Map...");

//     try {
//       const response = await fetch("/api/generate-map", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ prompt: aiPrompt, mapId }),
//       });
//       const result: ApiResponse<{ structure: AiResponseStructure }> =
//         await response.json();

//       if (result.status === "success" && result.data?.structure?.root) {
//         const rootAiNode = result.data.structure.root;
//         let parentForAiStructure: string | null = null;
//         let rootNodePosition: { x: number; y: number } | undefined = {
//           x: 250,
//           y: 100,
//         };

//         if (nodes.length > 0) {
//           const existingRoot = nodes.find((node) => !node.data.parent_id);

//           if (existingRoot) {
//             rootNodePosition = {
//               x: existingRoot.position.x + 300,
//               y: existingRoot.position.y + 100,
//             };
//             parentForAiStructure = null;
//           }
//         }

//         await addAiStructure(
//           rootAiNode,
//           parentForAiStructure,
//           rootNodePosition,
//         );
//         setAiPrompt("");
//         addStateToHistory("generateMap");
//         toast.success("Map structure generated.", { id: toastId });
//       } else {
//         const errorMsg =
//           result.status === "error"
//             ? result.error
//             : "Failed to generate map structure.";
//         console.error("Generate Map Error:", errorMsg);
//         toast.error(errorMsg, { id: toastId });
//       }
//     } catch (err) {
//       console.error("Generate Map Fetch Error:", err);
//       toast.error(
//         err instanceof Error
//           ? err.message
//           : "Network error during map generation.",
//         { id: toastId },
//       );
//     }

//     setLoading("isGenerating", false);
//   }, [
//     mapId,
//     aiPrompt,
//     loadingStates.isGenerating,
//     addAiStructure,
//     addStateToHistory,
//     nodes,
//   ]);

//   const summarizeNode = useCallback(
//     async (nodeId: string) => {
//       const nodeToSummarize = nodes.find((n) => n.id === nodeId);

//       if (
//         !nodeToSummarize ||
//         loadingStates.isSummarizing ||
//         !nodeToSummarize.data?.content?.trim()
//       ) {
//         if (!nodeToSummarize?.data?.content?.trim())
//           toast.error("Node has no content to summarize.");
//         return;
//       }

//       setLoading("isSummarizing", true);
//       const toastId = toast.loading("Summarizing Node...");

//       try {
//         const response = await fetch("/api/summarize-node", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ nodeId }),
//         });
//         const result: ApiResponse<{ summary: string }> = await response.json();

//         if (result.status === "success") {
//           const summary = result.data.summary;

//           if (
//             summary &&
//             summary.trim().length > 0 &&
//             summary.trim() !== "Node has no content to summarize."
//           ) {
//             await addNode(nodeId, `Summary: ${summary}`, "editableNode");
//             addStateToHistory("summarizeNode");
//             toast.success("Node summarized.", { id: toastId });
//           } else {
//             toast.error("AI could not generate a summary.", { id: toastId });
//           }
//         } else {
//           const errorMsg = result.error || "Failed to summarize node.";
//           console.error("Summarize Node Error:", errorMsg);
//           toast.error(errorMsg, { id: toastId });
//         }
//       } catch (err) {
//         console.error("Summarize Node Fetch Error:", err);
//         toast.error(
//           err instanceof Error
//             ? err.message
//             : "Network error during node summarization.",
//           { id: toastId },
//         );
//       }

//       setLoading("isSummarizing", false);
//     },
//     [nodes, loadingStates.isSummarizing, addNode, addStateToHistory],
//   );

//   const summarizeBranch = useCallback(
//     async (nodeId: string) => {
//       const branchRootNode = nodes.find((n) => n.id === nodeId);
//       if (!branchRootNode || loadingStates.isSummarizingBranch) return;

//       setLoading("isSummarizingBranch", true);
//       const toastId = toast.loading("Summarizing Branch...");

//       type SummarizeBranchResponse = {
//         summaryNode: NodeData | null;
//         summaryEdge: AppEdge | null;
//       };

//       try {
//         const response = await fetch("/api/summarize-branch", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ nodeId }),
//         });
//         const result: {
//           status: string;
//           data?: SummarizeBranchResponse;
//           error?: string;
//         } = await response.json();

//         if (result.status === "success" && result.data) {
//           const { summaryNode, summaryEdge } = result.data;

//           if (summaryNode) {
//             const newFlowNode: Node<NodeData> = {
//               id: summaryNode.id,
//               type: summaryNode.node_type || "annotationNode",
//               position: {
//                 x: summaryNode.position_x,
//                 y: summaryNode.position_y,
//               },
//               data: {
//                 id: summaryNode.id,
//                 label:
//                   summaryNode.label ||
//                   summaryNode.content?.substring(0, 30) + "..." ||
//                   "Summary",
//                 created_at: summaryNode.created_at,
//                 updated_at: summaryNode.updated_at,
//                 position_x: summaryNode.position_x,
//                 position_y: summaryNode.position_y,
//                 content: summaryNode.content || "",
//                 parent_id: summaryNode.parent_id,
//                 node_type: summaryNode.node_type || "annotationNode",
//                 map_id: summaryNode.map_id,
//                 user_id: summaryNode.user_id,
//                 sourceUrl: summaryNode.sourceUrl,
//                 metadata: summaryNode.metadata || {},
//               },
//               width: summaryNode.width || 150,
//               height: summaryNode.height || 40,
//             };

//             setNodes((nds) => [...nds, newFlowNode]);

//             if (summaryEdge) {
//               const newFlowEdge: AppEdge = {
//                 id: summaryEdge.id,
//                 source: summaryEdge.source,
//                 target: summaryEdge.target,
//                 type: summaryEdge.type || "smoothstep",
//                 user_id: summaryEdge.user_id,
//                 label: summaryEdge.label,
//                 style: summaryEdge.style,
//                 animated: summaryEdge.animated,
//                 markerEnd: summaryEdge.markerEnd,
//                 markerStart: summaryEdge.markerStart,
//                 data: summaryEdge.data,
//               };
//               setEdges((eds) => [...eds, newFlowEdge]);
//             } else {
//               console.warn(
//                 `Summary node ${summaryNode.id} added, but edge creation failed.`,
//               );
//               toast.warning("Branch summarized, but connection failed.", {
//                 id: toastId,
//               });
//             }

//             addStateToHistory("summarizeBranch");
//             toast.success("Branch summarized and added.", { id: toastId });
//           } else if (result.data.summaryNode === null) {
//             toast.info("Branch has no content to summarize.", { id: toastId });
//           } else {
//             toast.error("Failed to add summary node.", { id: toastId });
//           }
//         } else if (result.status === "error") {
//           const errorMsg = result.error || "Failed to summarize branch.";
//           console.error("Summarize Branch Error:", errorMsg);
//           toast.error(errorMsg, { id: toastId });
//         }
//       } catch (err) {
//         console.error("Summarize Branch Fetch Error:", err);
//         toast.error("Network error during branch summarization.", {
//           id: toastId,
//         });
//       }

//       setLoading("isSummarizingBranch", false);
//     },
//     [
//       nodes,
//       loadingStates.isSummarizingBranch,
//       setNodes,
//       setEdges,
//       addStateToHistory,
//     ],
//   );

//   const extractConcepts = useCallback(
//     async (nodeId: string) => {
//       const nodeToExtract = nodes.find((n) => n.id === nodeId);

//       if (
//         !nodeToExtract ||
//         loadingStates.isExtracting ||
//         !nodeToExtract.data?.content?.trim()
//       ) {
//         if (!nodeToExtract?.data?.content?.trim())
//           toast.error("Node has no content to extract concepts from.");
//         return;
//       }

//       setLoading("isExtracting", true);
//       const toastId = toast.loading("Extracting Concepts...");

//       try {
//         const response = await fetch("/api/extract-concepts", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ nodeId }),
//         });
//         const result: ApiResponse<{ concepts: string[] }> =
//           await response.json();

//         if (result.status === "success") {
//           const concepts = result.data.concepts;

//           if (
//             concepts &&
//             concepts.length > 0 &&
//             concepts[0].trim() !== "Node has no content to analyze."
//           ) {
//             const conceptsRootNode = await addNode(
//               nodeId,
//               "Key Concepts",
//               "editableNode",
//             );

//             if (conceptsRootNode) {
//               for (const concept of concepts) {
//                 await addNode(conceptsRootNode.id, concept, "editableNode");
//               }

//               addStateToHistory("extractConcepts");
//               toast.success("Concepts extracted and added.", { id: toastId });
//             } else {
//               toast.error("Concepts extracted, but failed to add nodes.", {
//                 id: toastId,
//               });
//             }
//           } else {
//             toast.error("AI could not extract concepts.", { id: toastId });
//           }
//         } else {
//           const errorMsg = result.error || "Failed to extract concepts.";
//           console.error("Extract Concepts Error:", errorMsg);

//           toast.error(errorMsg, { id: toastId });
//         }
//       } catch (err) {
//         console.error("Extract Concepts Fetch Error:", err);
//         toast.error(
//           err instanceof Error
//             ? err.message
//             : "Network error during concept extraction.",
//           { id: toastId },
//         );
//       }

//       setLoading("isExtracting", false);
//     },
//     [nodes, loadingStates.isExtracting, addNode, addStateToHistory],
//   );

//   const searchNodes = useCallback(async () => {
//     if (!mapId || !aiSearchQuery.trim() || loadingStates.isSearching) return;

//     setLoading("isSearching", true);
//     const toastId = toast.loading("Searching Map...");

//     try {
//       const response = await fetch("/api/search-nodes", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mapId, query: aiSearchQuery }),
//       });
//       const result: ApiResponse<{
//         relevantNodeIds: string[];
//       }> = await response.json();

//       if (result.status === "success") {
//         const relevantNodeIds = result.data.relevantNodeIds;
//         const relevantNodeIdsSet = new Set(relevantNodeIds);
//         setNodes((nds) =>
//           nds.map((node) => ({
//             ...node,
//             data: {
//               ...node.data,
//               isSearchResult: relevantNodeIdsSet.has(node.id),
//             },
//           })),
//         );
//         toast.success(`Found ${relevantNodeIds.length} relevant node(s).`, {
//           id: toastId,
//         });
//       } else {
//         setNodes((nds) =>
//           nds.map((node) =>
//             node.data.isSearchResult
//               ? { ...node, data: { ...node.data, isSearchResult: false } }
//               : node,
//           ),
//         );
//         const errorMsg =
//           result.status === "error" ? result.error : "No relevant nodes found.";

//         if (result.status === "error") {
//           toast.error(errorMsg, { id: toastId });
//         } else {
//           toast.info(errorMsg, { id: toastId });
//         }
//       }
//     } catch (err) {
//       console.error("Search Nodes Fetch Error:", err);
//       toast.error(
//         err instanceof Error
//           ? err.message
//           : "Network error during node search.",
//         { id: toastId },
//       );
//       setNodes((nds) =>
//         nds.map((node) =>
//           node.data.isSearchResult
//             ? { ...node, data: { ...node.data, isSearchResult: false } }
//             : node,
//         ),
//       );
//     }

//     setLoading("isSearching", false);
//   }, [mapId, aiSearchQuery, loadingStates.isSearching, setNodes]);

//   const generateContent = useCallback(
//     async (nodeId: string, additionalPrompt: string = "") => {
//       const nodeToExpand = nodes.find((n) => n.id === nodeId);

//       if (
//         !nodeToExpand ||
//         loadingStates.isGeneratingContent ||
//         !nodeToExpand.data?.content?.trim()
//       ) {
//         if (!nodeToExpand?.data?.content?.trim())
//           toast.error("Node has no content to generate from.");
//         return;
//       }

//       setLoading("isGeneratingContent", true);
//       const toastId = toast.loading("Generating Content...");

//       try {
//         const response = await fetch("/api/generate-content", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             nodeId,
//             additionalPrompt: additionalPrompt.trim(),
//           }),
//         });
//         const result: ApiResponse<{ generatedContent: string }> =
//           await response.json();

//         if (result.status === "success") {
//           const generatedContent = result.data.generatedContent;

//           if (
//             generatedContent &&
//             generatedContent.trim().length > 0 &&
//             generatedContent.trim() !== "Node has no content to expand on."
//           ) {
//             await addNode(nodeId, generatedContent, "editableNode");
//             addStateToHistory("generateContent");
//             toast.success("Content generated and added.", { id: toastId });
//           } else {
//             toast.error("AI could not generate content based on this node.", {
//               id: toastId,
//             });
//           }
//         } else {
//           const errorMsg = result.error || "Failed to generate content.";
//           console.error("Generate Content Error:", errorMsg);
//           toast.error(errorMsg, { id: toastId });
//         }
//       } catch (err) {
//         console.error("Generate Content Fetch Error:", err);
//         toast.error(
//           err instanceof Error
//             ? err.message
//             : "Network error during content generation.",
//           { id: toastId },
//         );
//       }

//       setLoading("isGeneratingContent", false);
//     },
//     [nodes, loadingStates.isGeneratingContent, addNode, addStateToHistory],
//   );

//   const suggestConnections = useCallback(async () => {
//     if (!mapId || loadingStates.isSuggestingConnections || nodes.length < 2)
//       return;

//     setLoading("isSuggestingConnections", true);
//     const toastId = toast.loading("Suggesting Connections...");
//     setSuggestedEdges([]);

//     try {
//       const response = await fetch("/api/suggest-connections", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mapId }),
//       });
//       const result: ApiResponse<{ suggestions: AiConnectionSuggestion[] }> =
//         await response.json();

//       if (result.status === "success") {
//         const suggestions = result.data.suggestions;

//         if (suggestions && suggestions.length > 0) {
//           const suggestedReactFlowEdges: Edge<Partial<EdgeData>>[] =
//             suggestions.map((suggestion) => ({
//               id: `suggested-${generateUuid()}`,
//               source: suggestion.sourceNodeId,
//               target: suggestion.targetNodeId,
//               type: "suggestedConnection",
//               animated: true,
//               style: {
//                 stroke: "orange",
//                 strokeWidth: 2,
//                 strokeDasharray: "5 5",
//               },
//               data: {
//                 reason: suggestion.reason,
//                 sourceNodeId: suggestion.sourceNodeId,
//                 targetNodeId: suggestion.targetNodeId,
//               },
//             }));
//           setSuggestedEdges(suggestedReactFlowEdges);
//           toast.success(`Suggested ${suggestions.length} connection(s).`, {
//             id: toastId,
//           });
//         } else {
//           toast.info("No new connections suggested.", { id: toastId });
//         }
//       } else {
//         const errorMsg = result.error || "Failed to suggest connections.";
//         console.error("Suggest Connections Error:", errorMsg);
//         toast.error(errorMsg, { id: toastId });
//       }
//     } catch (err) {
//       console.error("Suggest Connections Fetch Error:", err);
//       toast.error(
//         err instanceof Error
//           ? err.message
//           : "Network error during connection suggestion.",
//         { id: toastId },
//       );
//     }

//     setLoading("isSuggestingConnections", false);
//   }, [mapId, nodes.length, loadingStates.isSuggestingConnections]);

//   const suggestMerges = useCallback(async () => {
//     if (!mapId || loadingStates.isSuggestingMerges || nodes.length < 2) return;

//     setLoading("isSuggestingMerges", true);
//     const toastId = toast.loading("Suggesting Merges...");
//     setMergeSuggestions([]);

//     try {
//       const response = await fetch("/api/suggest-merges", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mapId }),
//       });
//       const result: ApiResponse<{ suggestions: AiMergeSuggestion[] }> =
//         await response.json();

//       if (result.status === "success") {
//         const suggestions = result.data.suggestions;

//         if (suggestions && suggestions.length > 0) {
//           setMergeSuggestions(suggestions);
//           setIsMergeModalOpen(true);
//           toast.success(`Suggested ${suggestions.length} merge(s).`);
//         } else {
//           toast.info("No merge suggestions found.", { id: toastId });
//         }
//       } else {
//         const errorMsg = result.error || "Failed to suggest merges.";
//         console.error("Suggest Merges Error:", errorMsg);
//         toast.error(errorMsg, { id: toastId });
//       }
//     } catch (err) {
//       console.error("Suggest Merges Fetch Error:", err);
//       toast.error(
//         err instanceof Error
//           ? err.message
//           : "Network error during merge suggestion.",
//         { id: toastId },
//       );
//     }

//     setLoading("isSuggestingMerges", false);
//   }, [mapId, nodes.length, loadingStates.isSuggestingMerges]);

//   const acceptSuggestedConnection = useCallback(
//     async (suggestionData: AiConnectionSuggestion) => {
//       if (!suggestionData?.sourceNodeId || !suggestionData?.targetNodeId) {
//         toast.error("Error: Missing node IDs in suggestion.");
//         return;
//       }

//       const { sourceNodeId, targetNodeId } = suggestionData;

//       setSuggestedEdges((eds) =>
//         eds.filter(
//           (edge) =>
//             !(
//               edge.source === sourceNodeId &&
//               edge.target === targetNodeId &&
//               edge.type === "suggestedConnection"
//             ),
//         ),
//       );

//       try {
//         const addedEdge = await saveEdge(sourceNodeId, targetNodeId);

//         if (addedEdge) {
//           toast.success("Connection accepted and saved.");
//           addStateToHistory("acceptSuggestedConnection");
//         } else {
//           toast.error("Failed to save accepted connection.");
//         }
//       } catch (error) {
//         console.error("Error accepting suggested connection:", error);
//         toast.error("An error occurred while accepting the connection.");
//       }
//     },
//     [saveEdge, setSuggestedEdges, addStateToHistory],
//   );

//   const dismissSuggestedConnection = useCallback(
//     (edgeId: string) => {
//       setSuggestedEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
//       toast.success("Connection suggestion dismissed.");
//     },
//     [setSuggestedEdges],
//   );

//   const acceptMerge = useCallback(
//     async (suggestion: AiMergeSuggestion) => {
//       setLoading("isAcceptingMerge", true);
//       const { node1Id, node2Id, reason } = suggestion;

//       try {
//         const nodeToKeep = nodes.find((n) => n.id === node1Id);
//         const nodeToMerge = nodes.find((n) => n.id === node2Id);

//         if (!nodeToKeep || !nodeToMerge) {
//           throw new Error(
//             "One or both nodes involved in the merge could not be found.",
//           );
//         }

//         const mergedContent = `${nodeToKeep.data.content}\n\n---\n*Merged content from similar node (Reason: ${reason || "Similar topic"})*:\n${nodeToMerge.data.content}`;
//         await saveNodeContent(node1Id, mergedContent);

//         const childrenToReparent = nodes.filter(
//           (n) => n.data.parent_id === node2Id,
//         );

//         for (const child of childrenToReparent) {
//           await saveEdge(node1Id, child.id);
//         }

//         await deleteNode(node2Id);

//         setNodes((currentNodes) => {
//           const childrenIds = new Set(childrenToReparent.map((c) => c.id));
//           return currentNodes
//             .filter((n) => n.id !== node2Id)
//             .map((n) => {
//               if (n.id === node1Id) {
//                 return {
//                   ...n,
//                   data: {
//                     ...n.data,
//                     content: mergedContent,
//                     label: mergedContent,
//                   },
//                 };
//               }

//               if (childrenIds.has(n.id)) {
//                 return { ...n, data: { ...n.data, parent_id: node1Id } };
//               }

//               return n;
//             });
//         });
//         setEdges((currentEdges) => {
//           const filteredEdges = currentEdges.filter(
//             (e) => e.source !== node2Id && e.target !== node2Id,
//           );
//           const newEdges = childrenToReparent.map((child) => ({
//             id: `e-${node1Id}-${child.id}`,
//             source: node1Id,
//             target: child.id,
//             type: "smoothstep",
//           }));
//           return [...filteredEdges, ...newEdges];
//         });

//         setMergeSuggestions((prev) =>
//           prev.filter((s) => s.node1Id !== node1Id || s.node2Id !== node2Id),
//         );

//         if (mergeSuggestions.length <= 1) {
//           setIsMergeModalOpen(false);
//         }

//         addStateToHistory("acceptMerge");
//         toast.success("Nodes merged successfully.");
//       } catch (err: unknown) {
//         console.error("Error accepting merge:", err);
//         const message =
//           err instanceof Error ? err.message : "Failed to merge nodes.";
//         toast.error(message);
//       } finally {
//         setLoading("isAcceptingMerge", false);
//       }
//     },
//     [
//       nodes,
//       saveNodeContent,
//       saveEdge,
//       deleteNode,
//       setNodes,
//       setEdges,
//       addStateToHistory,
//       mergeSuggestions.length,
//     ],
//   );

//   const dismissMerge = useCallback(
//     (suggestion: AiMergeSuggestion) => {
//       setMergeSuggestions((prev) =>
//         prev.filter(
//           (s) =>
//             s.node1Id !== suggestion.node1Id ||
//             s.node2Id !== suggestion.node2Id,
//         ),
//       );
//       toast.success("Merge suggestion dismissed.");

//       if (mergeSuggestions.length <= 1) {
//         setIsMergeModalOpen(false);
//       }
//     },
//     [mergeSuggestions.length],
//   );

//   const generateAnswer = useCallback(
//     async (nodeId: string, prompt: string) => {
//       const targetNode = nodes.find((n) => n.id === nodeId);

//       if (!targetNode || targetNode.data.node_type !== "questionNode") {
//         toast.error("Invalid node or not a question node for AI answer.");
//         return;
//       }

//       if (targetNode.data.aiData?.aiAnswer) {
//         toast.info("An AI answer already exists for this question.");
//         return;
//       }

//       setLoading("isGeneratingAnswer", true);
//       const toastId = toast.loading("Generating AI Answer...");

//       try {
//         const response = await fetch("/api/generate-answer", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ nodeId, prompt }),
//         });
//         const result: ApiResponse<{ answer: string }> = await response.json();

//         if (result.status === "success" && result.data?.answer) {
//           await saveNodeAiData(nodeId, {
//             requestAiAnswer: true,
//             aiAnswer: result.data.answer,
//           });
//           toast.success("AI answer generated and saved.", { id: toastId });
//         } else if (result.status === "error") {
//           const errorMsg = result.error || "Failed to generate AI answer.";
//           console.error("Generate Answer Error:", errorMsg);
//           toast.error(errorMsg, { id: toastId });
//         }
//       } catch (err) {
//         console.error("Generate Answer Fetch Error:", err);
//         toast.error(
//           err instanceof Error
//             ? err.message
//             : "Network error during AI answer generation.",
//           { id: toastId },
//         );
//       }

//       setLoading("isGeneratingAnswer", false);
//     },
//     [nodes, saveNodeAiData],
//   );

//   const generateFromSelectedNodes = useCallback(
//     async (nodeIds: string[], prompt: string) => {
//       if (!mapId || !prompt.trim() || nodeIds.length === 0) {
//         toast.error(
//           "Cannot generate content: Please provide a prompt and select at least one node.",
//         );
//         return;
//       }

//       setLoading("isGeneratingFromSelectedNodes", true);
//       const toastId = toast.loading(
//         "Generating content from selected nodes...",
//       );

//       try {
//         const response = await fetch("/api/generate-from-selected-nodes", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ nodeIds, prompt, mapId }),
//         });

//         const result: ApiResponse<{ generatedContent: string }> =
//           await response.json();

//         if (result.status === "success" && result.data?.generatedContent) {
//           // Create a new node with the generated content
//           await addNode(null, result.data.generatedContent, "defaultNode");
//           addStateToHistory("generateFromSelectedNodes");
//           toast.success("Content generated from selected nodes.", {
//             id: toastId,
//           });
//         } else {
//           const errorMsg =
//             result.status === "error"
//               ? result.error
//               : "Failed to generate content from selected nodes.";
//           console.error("Generate from nodes error:", errorMsg);
//           toast.error(errorMsg, { id: toastId });
//         }
//       } catch (err) {
//         console.error("Generate from nodes fetch error:", err);
//         toast.error(
//           err instanceof Error
//             ? err.message
//             : "Network error during content generation.",
//           { id: toastId },
//         );
//       }

//       setLoading("isGeneratingFromSelectedNodes", false);
//     },
//     [mapId, addNode, addStateToHistory],
//   );

//   return {
//     aiActions: {
//       generateMap,
//       summarizeNode,
//       summarizeBranch,
//       extractConcepts,
//       searchNodes,
//       generateContent,
//       suggestConnections,
//       suggestMerges,
//       acceptMerge,
//       dismissMerge,
//       setAiPrompt,
//       setAiSearchQuery,
//       setAiContentTargetNodeId,
//       acceptSuggestedConnection,
//       dismissSuggestedConnection,
//       generateAnswer,
//       generateFromSelectedNodes,
//     },
//     aiLoadingStates: loadingStates,
//     suggestedEdges,
//     mergeSuggestions,
//     isAiContentModalOpen,
//     setIsAiContentModalOpen,
//     aiContentTargetNodeId,
//     isMergeModalOpen,
//     setIsMergeModalOpen,
//     aiPrompt,
//     aiSearchQuery,
//   };
// }
