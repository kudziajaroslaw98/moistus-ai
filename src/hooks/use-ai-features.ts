import generateUuid from "@/helpers/generate-uuid";
import useFetch from "@/hooks/use-fetch";
import { NotificationType } from "@/hooks/use-notifications";
import { AiConnectionSuggestion } from "@/types/ai-connection-suggestion";
import { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
import { AiNodeStructure } from "@/types/ai-node-structure";
import { AiResponseStructure } from "@/types/ai-response-structure";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { HistoryState } from "@/types/history-state";
import { NodeData } from "@/types/node-data";
import { Edge, Node, XYPosition } from "@xyflow/react";
import { useCallback, useState } from "react";

interface UseAiFeaturesProps {
  mapId: string;
  nodes: Node<NodeData>[];
  addNode: (
    parentNodeId?: string | null,
    content?: string,
    nodeType?: string,
    position?: XYPosition,
    initialData?: Partial<NodeData>,
  ) => Promise<Node<NodeData> | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  saveEdge: (sourceId: string, targetId: string) => Promise<AppEdge | null>;
  saveNodeContent: (nodeId: string, content: string) => Promise<void>;
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  addStateToHistory: (sourceAction?: string) => void;
  showNotification: (message: string, type: NotificationType) => void;
  currentHistoryState: HistoryState | undefined;
}

export interface AiActions {
  generateMap: () => Promise<void>;
  summarizeNode: (nodeId: string) => Promise<void>;
  summarizeBranch: (nodeId: string) => Promise<void>;
  extractConcepts: (nodeId: string) => Promise<void>;
  searchNodes: () => Promise<void>;
  generateContent: (nodeId: string, additionalPrompt?: string) => Promise<void>;
  suggestConnections: () => Promise<void>;
  suggestMerges: () => Promise<void>;
  acceptMerge: (suggestion: AiMergeSuggestion) => Promise<void>;
  dismissMerge: (suggestion: AiMergeSuggestion) => void;
  setAiPrompt: React.Dispatch<React.SetStateAction<string>>;
  setAiSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setAiContentTargetNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  acceptSuggestedConnection: (
    suggestionData: AiConnectionSuggestion,
  ) => Promise<void>;
  dismissSuggestedConnection: (edgeId: string) => void;
}

export interface AiLoadingStates {
  isGenerating: boolean;
  isSummarizing: boolean;
  isExtracting: boolean;
  isSearching: boolean;
  isGeneratingContent: boolean;
  isSuggestingConnections: boolean;
  isSummarizingBranch: boolean;
  isSuggestingMerges: boolean;
  isAcceptingMerge: boolean;
}

export interface UseAiFeaturesResult {
  aiActions: AiActions;
  aiLoadingStates: AiLoadingStates;
  suggestedEdges: Edge<Partial<EdgeData>>[];
  mergeSuggestions: AiMergeSuggestion[];
  isAiContentModalOpen: boolean;
  setIsAiContentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  aiContentTargetNodeId: string | null;
  isMergeModalOpen: boolean;
  setIsMergeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  aiPrompt: string;
  aiSearchQuery: string;
}

export function useAiFeatures({
  mapId,
  nodes,
  addNode,
  deleteNode,
  saveEdge,
  saveNodeContent,
  setNodes,
  setEdges,
  addStateToHistory,
  showNotification,
}: UseAiFeaturesProps): UseAiFeaturesResult {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [suggestedEdges, setSuggestedEdges] = useState<
    Edge<Partial<EdgeData>>[]
  >([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<AiMergeSuggestion[]>(
    [],
  );

  const [loadingStates, setLoadingStates] = useState<AiLoadingStates>({
    isGenerating: false,
    isSummarizing: false,
    isExtracting: false,
    isSearching: false,
    isGeneratingContent: false,
    isSuggestingConnections: false,
    isSummarizingBranch: false,
    isSuggestingMerges: false,
    isAcceptingMerge: false,
  });

  const [isAiContentModalOpen, setIsAiContentModalOpen] = useState(false);
  const [aiContentTargetNodeId, setAiContentTargetNodeId] = useState<
    string | null
  >(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const { fetch: fetchWrapper } = useFetch();

  const setLoading = (key: keyof AiLoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  const addAiStructure = useCallback(
    async (
      aiNode: AiNodeStructure,
      parentNodeId: string | null,
      basePosition?: { x: number; y: number },
    ): Promise<Node<NodeData> | null> => {
      const newNode = await addNode(
        parentNodeId,
        aiNode.content,
        "editableNode",
        basePosition,
        {},
      );

      if (newNode && aiNode.children && aiNode.children.length > 0) {
        const parentPos = newNode.position;

        for (let i = 0; i < aiNode.children.length; i++) {
          const child = aiNode.children[i];
          const childPosition = {
            x: parentPos.x + 200,
            y: parentPos.y + i * 80,
          };
          await addAiStructure(child, newNode.id, childPosition);
        }
      }

      return newNode;
    },
    [addNode],
  );

  const generateMap = useCallback(async () => {
    if (!mapId || !aiPrompt.trim() || loadingStates.isGenerating) return;

    setLoading("isGenerating", true);
    showNotification("Generating Map...", "success");

    const response = await fetchWrapper<{ structure: AiResponseStructure }>(
      "/api/generate-map",
      {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt, mapId }),
      },
    );

    if (response.status === "success" && response.data?.structure?.root) {
      const rootAiNode = response.data.structure.root;
      let parentForAiStructure: string | null = null;
      let rootNodePosition: { x: number; y: number } | undefined = {
        x: 250,
        y: 100,
      };

      if (nodes.length > 0) {
        const existingRoot = nodes.find((node) => !node.data.parent_id);

        if (existingRoot) {
          rootNodePosition = {
            x: existingRoot.position.x + 300,
            y: existingRoot.position.y + 100,
          };
          parentForAiStructure = null;
        }
      }

      await addAiStructure(rootAiNode, parentForAiStructure, rootNodePosition);
      setAiPrompt("");
      addStateToHistory("generateMap");
      showNotification("Map structure generated.", "success");
    } else {
      const errorMsg =
        response.status === "error"
          ? response.error
          : "Failed to generate map structure.";
      console.error("Generate Map Error:", errorMsg);
      showNotification(errorMsg, "error");
    }

    setLoading("isGenerating", false);
  }, [
    mapId,
    aiPrompt,
    loadingStates.isGenerating,
    fetchWrapper,
    addAiStructure,
    addStateToHistory,
    showNotification,
    nodes,
  ]);

  const summarizeNode = useCallback(
    async (nodeId: string) => {
      const nodeToSummarize = nodes.find((n) => n.id === nodeId);

      if (
        !nodeToSummarize ||
        loadingStates.isSummarizing ||
        !nodeToSummarize.data?.content?.trim()
      ) {
        if (!nodeToSummarize?.data?.content?.trim())
          showNotification("Node has no content to summarize.", "error");
        return;
      }

      setLoading("isSummarizing", true);
      showNotification("Summarizing Node...", "success");

      const response = await fetchWrapper<{ summary: string }>(
        "/api/summarize-node",
        {
          method: "POST",
          body: JSON.stringify({ nodeId }),
        },
      );

      if (response.status === "success") {
        const summary = response.data.summary;

        if (
          summary &&
          summary.trim().length > 0 &&
          summary.trim() !== "Node has no content to summarize."
        ) {
          await addNode(nodeId, `Summary: ${summary}`, "editableNode");
          addStateToHistory("summarizeNode");
          showNotification("Node summarized.", "success");
        } else {
          showNotification("AI could not generate a summary.", "error");
        }
      } else {
        const errorMsg = response.error || "Failed to summarize node.";
        console.error("Summarize Node Error:", errorMsg);
        showNotification(errorMsg, "error");
      }

      setLoading("isSummarizing", false);
    },
    [
      nodes,
      loadingStates.isSummarizing,
      fetchWrapper,
      addNode,
      addStateToHistory,
      showNotification,
    ],
  );

  const summarizeBranch = useCallback(
    async (nodeId: string) => {
      const branchRootNode = nodes.find((n) => n.id === nodeId);
      if (!branchRootNode || loadingStates.isSummarizingBranch) return;

      setLoading("isSummarizingBranch", true);
      showNotification("Summarizing Branch...", "success");

      const response = await fetchWrapper<{ summary: string }>(
        "/api/summarize-branch",
        {
          method: "POST",
          body: JSON.stringify({ nodeId }),
        },
      );

      if (response.status === "success") {
        const summary = response.data.summary;

        if (
          summary &&
          summary.trim().length > 0 &&
          summary.trim() !== "Branch has no content to summarize."
        ) {
          await addNode(nodeId, `Branch Summary: ${summary}`, "editableNode");
          addStateToHistory("summarizeBranch");
          showNotification("Branch summarized.", "success");
        } else {
          showNotification(
            "AI could not generate a summary for this branch.",
            "error",
          );
        }
      } else {
        const errorMsg = response.error || "Failed to summarize branch.";
        console.error("Summarize Branch Error:", errorMsg);
        showNotification(errorMsg, "error");
      }

      setLoading("isSummarizingBranch", false);
    },
    [
      nodes,
      loadingStates.isSummarizingBranch,
      fetchWrapper,
      addNode,
      addStateToHistory,
      showNotification,
    ],
  );

  const extractConcepts = useCallback(
    async (nodeId: string) => {
      const nodeToExtract = nodes.find((n) => n.id === nodeId);

      if (
        !nodeToExtract ||
        loadingStates.isExtracting ||
        !nodeToExtract.data?.content?.trim()
      ) {
        if (!nodeToExtract?.data?.content?.trim())
          showNotification(
            "Node has no content to extract concepts from.",
            "error",
          );
        return;
      }

      setLoading("isExtracting", true);
      showNotification("Extracting Concepts...", "success");

      const response = await fetchWrapper<{ concepts: string[] }>(
        "/api/extract-concepts",
        {
          method: "POST",
          body: JSON.stringify({ nodeId }),
        },
      );

      if (response.status === "success") {
        const concepts = response.data.concepts;

        if (
          concepts &&
          concepts.length > 0 &&
          concepts[0].trim() !== "Node has no content to analyze."
        ) {
          const conceptsRootNode = await addNode(
            nodeId,
            "Key Concepts",
            "editableNode",
          );

          if (conceptsRootNode) {
            for (const concept of concepts) {
              await addNode(conceptsRootNode.id, concept, "editableNode");
            }

            addStateToHistory("extractConcepts");
            showNotification("Concepts extracted and added.", "success");
          } else {
            showNotification(
              "Concepts extracted, but failed to add nodes.",
              "error",
            );
          }
        } else {
          showNotification("AI could not extract concepts.", "error");
        }
      } else {
        const errorMsg = response.error || "Failed to extract concepts.";
        console.error("Extract Concepts Error:", errorMsg);
        showNotification(errorMsg, "error");
      }

      setLoading("isExtracting", false);
    },
    [
      nodes,
      loadingStates.isExtracting,
      fetchWrapper,
      addNode,
      addStateToHistory,
      showNotification,
    ],
  );

  const searchNodes = useCallback(async () => {
    if (!mapId || !aiSearchQuery.trim() || loadingStates.isSearching) return;

    setLoading("isSearching", true);
    showNotification("Searching Map...", "success");

    const response = await fetchWrapper<{ relevantNodeIds: string[] }>(
      "/api/search-nodes",
      {
        method: "POST",
        body: JSON.stringify({ mapId, query: aiSearchQuery }),
      },
    );

    if (response.status === "success") {
      const relevantNodeIds = response.data.relevantNodeIds;
      const relevantNodeIdsSet = new Set(relevantNodeIds);
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isSearchResult: relevantNodeIdsSet.has(node.id),
          },
        })),
      );
      showNotification(
        `Found ${relevantNodeIds.length} relevant node(s).`,
        "success",
      );
    } else {
      setNodes((nds) =>
        nds.map((node) =>
          node.data.isSearchResult
            ? { ...node, data: { ...node.data, isSearchResult: false } }
            : node,
        ),
      );
      const errorMsg =
        response.status === "error"
          ? response.error
          : "No relevant nodes found.";
      showNotification(
        errorMsg,
        response.status === "error" ? "error" : "success",
      );
    }

    setLoading("isSearching", false);
  }, [
    mapId,
    aiSearchQuery,
    loadingStates.isSearching,
    fetchWrapper,
    setNodes,
    showNotification,
  ]);

  const generateContent = useCallback(
    async (nodeId: string, additionalPrompt: string = "") => {
      const nodeToExpand = nodes.find((n) => n.id === nodeId);

      if (
        !nodeToExpand ||
        loadingStates.isGeneratingContent ||
        !nodeToExpand.data?.content?.trim()
      ) {
        if (!nodeToExpand?.data?.content?.trim())
          showNotification("Node has no content to generate from.", "error");
        return;
      }

      setLoading("isGeneratingContent", true);
      showNotification("Generating Content...", "success");

      const response = await fetchWrapper<{ generatedContent: string }>(
        "/api/generate-content",
        {
          method: "POST",
          body: JSON.stringify({
            nodeId,
            additionalPrompt: additionalPrompt.trim(),
          }),
        },
      );

      if (response.status === "success") {
        const generatedContent = response.data.generatedContent;

        if (
          generatedContent &&
          generatedContent.trim().length > 0 &&
          generatedContent.trim() !== "Node has no content to expand on."
        ) {
          await addNode(nodeId, generatedContent, "editableNode");
          addStateToHistory("generateContent");
          showNotification("Content generated and added.", "success");
        } else {
          showNotification(
            "AI could not generate content based on this node.",
            "error",
          );
        }
      } else {
        const errorMsg = response.error || "Failed to generate content.";
        console.error("Generate Content Error:", errorMsg);
        showNotification(errorMsg, "error");
      }

      setLoading("isGeneratingContent", false);
    },
    [
      nodes,
      loadingStates.isGeneratingContent,
      fetchWrapper,
      addNode,
      addStateToHistory,
      showNotification,
    ],
  );

  const suggestConnections = useCallback(async () => {
    if (!mapId || loadingStates.isSuggestingConnections || nodes.length < 2)
      return;

    setLoading("isSuggestingConnections", true);
    showNotification("Suggesting Connections...", "success");
    setSuggestedEdges([]);

    const response = await fetchWrapper<{
      suggestions: AiConnectionSuggestion[];
    }>("/api/suggest-connections", {
      method: "POST",
      body: JSON.stringify({ mapId }),
    });

    if (response.status === "success") {
      const suggestions = response.data.suggestions;

      if (suggestions && suggestions.length > 0) {
        const suggestedReactFlowEdges: Edge<Partial<EdgeData>>[] =
          suggestions.map((suggestion) => ({
            id: `suggested-${generateUuid()}`,
            source: suggestion.sourceNodeId,
            target: suggestion.targetNodeId,
            type: "suggestedConnection",
            animated: true,
            style: { stroke: "orange", strokeWidth: 2, strokeDasharray: "5 5" },
            data: {
              reason: suggestion.reason,
              sourceNodeId: suggestion.sourceNodeId,
              targetNodeId: suggestion.targetNodeId,
            },
          }));
        setSuggestedEdges(suggestedReactFlowEdges);
        showNotification(
          `Suggested ${suggestions.length} connection(s).`,
          "success",
        );
      } else {
        showNotification("No new connections suggested.", "success");
      }
    } else {
      const errorMsg = response.error || "Failed to suggest connections.";
      console.error("Suggest Connections Error:", errorMsg);
      showNotification(errorMsg, "error");
    }

    setLoading("isSuggestingConnections", false);
  }, [
    mapId,
    nodes.length,
    loadingStates.isSuggestingConnections,
    fetchWrapper,
    showNotification,
  ]);

  const suggestMerges = useCallback(async () => {
    if (!mapId || loadingStates.isSuggestingMerges || nodes.length < 2) return;

    setLoading("isSuggestingMerges", true);
    showNotification("Suggesting Merges...", "success");
    setMergeSuggestions([]);

    const response = await fetchWrapper<{ suggestions: AiMergeSuggestion[] }>(
      "/api/suggest-merges",
      {
        method: "POST",
        body: JSON.stringify({ mapId }),
      },
    );

    if (response.status === "success") {
      const suggestions = response.data.suggestions;

      if (suggestions && suggestions.length > 0) {
        setMergeSuggestions(suggestions);
        setIsMergeModalOpen(true);
        showNotification(
          `Suggested ${suggestions.length} merge(s).`,
          "success",
        );
      } else {
        showNotification("No merge suggestions found.", "success");
      }
    } else {
      const errorMsg = response.error || "Failed to suggest merges.";
      console.error("Suggest Merges Error:", errorMsg);
      showNotification(errorMsg, "error");
    }

    setLoading("isSuggestingMerges", false);
  }, [
    mapId,
    nodes.length,
    loadingStates.isSuggestingMerges,
    fetchWrapper,
    showNotification,
  ]);

  const acceptSuggestedConnection = useCallback(
    async (suggestionData: AiConnectionSuggestion) => {
      if (!suggestionData?.sourceNodeId || !suggestionData?.targetNodeId) {
        showNotification("Error: Missing node IDs in suggestion.", "error");
        return;
      }

      const { sourceNodeId, targetNodeId } = suggestionData;

      // Optimistically remove suggested edge
      setSuggestedEdges((eds) =>
        eds.filter(
          (edge) =>
            !(
              edge.source === sourceNodeId &&
              edge.target === targetNodeId &&
              edge.type === "suggestedConnection"
            ),
        ),
      );

      try {
        // Add the permanent edge using existing CRUD action
        const addedEdge = await saveEdge(sourceNodeId, targetNodeId);

        if (addedEdge) {
          showNotification("Connection accepted and saved.", "success");
          addStateToHistory("acceptSuggestedConnection"); // Add history state if needed
        } else {
          showNotification("Failed to save accepted connection.", "error");
        }
      } catch (error) {
        console.error("Error accepting suggested connection:", error);
        showNotification(
          "An error occurred while accepting the connection.",
          "error",
        );
      }
    },
    [saveEdge, showNotification, setSuggestedEdges, addStateToHistory],
  );

  const dismissSuggestedConnection = useCallback(
    (edgeId: string) => {
      setSuggestedEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      showNotification("Connection suggestion dismissed.", "success");
    },
    [setSuggestedEdges, showNotification],
  );

  const acceptMerge = useCallback(
    async (suggestion: AiMergeSuggestion) => {
      setLoading("isAcceptingMerge", true);
      const { node1Id, node2Id, reason } = suggestion;

      try {
        const nodeToKeep = nodes.find((n) => n.id === node1Id);
        const nodeToMerge = nodes.find((n) => n.id === node2Id);

        if (!nodeToKeep || !nodeToMerge) {
          throw new Error(
            "One or both nodes involved in the merge could not be found.",
          );
        }

        const mergedContent = `${nodeToKeep.data.content}\n\n---\n*Merged content from similar node (Reason: ${reason || "Similar topic"})*:\n${nodeToMerge.data.content}`;
        await saveNodeContent(node1Id, mergedContent);

        const childrenToReparent = nodes.filter(
          (n) => n.data.parent_id === node2Id,
        );

        for (const child of childrenToReparent) {
          await saveEdge(node1Id, child.id);
        }

        await deleteNode(node2Id);

        setNodes((currentNodes) => {
          const childrenIds = new Set(childrenToReparent.map((c) => c.id));
          return currentNodes
            .filter((n) => n.id !== node2Id)
            .map((n) => {
              if (n.id === node1Id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    content: mergedContent,
                    label: mergedContent,
                  },
                };
              }

              if (childrenIds.has(n.id)) {
                return { ...n, data: { ...n.data, parent_id: node1Id } };
              }

              return n;
            });
        });
        setEdges((currentEdges) => {
          const filteredEdges = currentEdges.filter(
            (e) => e.source !== node2Id && e.target !== node2Id,
          );
          const newEdges = childrenToReparent.map((child) => ({
            id: `e-${node1Id}-${child.id}`,
            source: node1Id,
            target: child.id,
            type: "smoothstep",
          }));
          return [...filteredEdges, ...newEdges];
        });

        setMergeSuggestions((prev) =>
          prev.filter((s) => s.node1Id !== node1Id || s.node2Id !== node2Id),
        );

        if (mergeSuggestions.length <= 1) {
          setIsMergeModalOpen(false);
        }

        addStateToHistory("acceptMerge");
        showNotification("Nodes merged successfully.", "success");
      } catch (err: unknown) {
        console.error("Error accepting merge:", err);
        const message =
          err instanceof Error ? err.message : "Failed to merge nodes.";
        showNotification(message, "error");
      } finally {
        setLoading("isAcceptingMerge", false);
      }
    },
    [
      nodes,
      saveNodeContent,
      saveEdge,
      deleteNode,
      setNodes,
      setEdges,
      addStateToHistory,
      showNotification,
      mergeSuggestions.length,
    ],
  );

  const dismissMerge = useCallback(
    (suggestion: AiMergeSuggestion) => {
      setMergeSuggestions((prev) =>
        prev.filter(
          (s) =>
            s.node1Id !== suggestion.node1Id ||
            s.node2Id !== suggestion.node2Id,
        ),
      );
      showNotification("Merge suggestion dismissed.", "success");

      if (mergeSuggestions.length <= 1) {
        setIsMergeModalOpen(false);
      }
    },
    [showNotification, mergeSuggestions.length],
  );

  return {
    aiActions: {
      generateMap,
      summarizeNode,
      summarizeBranch,
      extractConcepts,
      searchNodes,
      generateContent,
      suggestConnections,
      suggestMerges,
      acceptMerge,
      dismissMerge,
      setAiPrompt,
      setAiSearchQuery,
      setAiContentTargetNodeId,
      acceptSuggestedConnection,
      dismissSuggestedConnection,
    },
    aiLoadingStates: loadingStates,
    suggestedEdges,
    mergeSuggestions,
    isAiContentModalOpen,
    setIsAiContentModalOpen,
    aiContentTargetNodeId,
    isMergeModalOpen,
    setIsMergeModalOpen,
    aiPrompt,
    aiSearchQuery,
  };
}
