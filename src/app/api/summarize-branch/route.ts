import { respondError, respondSuccess } from "@/helpers/api/responses";
import { withApiValidation } from "@/helpers/api/with-api-validation";
import generateUuid from "@/helpers/generate-uuid"; // Added for new node ID
import { defaultModel } from "@/lib/ai/gemini";
import { z } from "zod";

const requestBodySchema = z.object({
  nodeId: z.string().uuid("Invalid node ID format"),
});

export const POST = withApiValidation(
  requestBodySchema,
  async (req, validatedBody, supabase) => {
    try {
      const { nodeId } = validatedBody;

      // Fetch the root node including position for placing the summary node
      const { data: rootNode, error: rootFetchError } = await supabase
        .from("nodes")
        .select("map_id, position_x, position_y")
        .eq("id", nodeId)
        .single();

      if (rootFetchError || !rootNode) {
        console.error("Error fetching root node data:", rootFetchError);
        const statusNumber = rootFetchError?.code === "PGRST116" ? 404 : 500;
        const statusText =
          statusNumber === 404
            ? "Branch root node not found."
            : "Error fetching branch root node.";

        return respondError(
          statusText,
          statusNumber,
          rootFetchError?.message || statusText,
        );
      }

      // Fetch all nodes for the specific map
      const { data: allNodesData, error: fetchError } = await supabase
        .from("nodes")
        .select(
          "id, parent_id, content, node_type, map_id, source_url, metadata",
        ) // Select node_type
        .eq("map_id", rootNode.map_id);

      if (fetchError) {
        console.error(
          "Error fetching nodes for branch summarization:",
          fetchError,
        );
        return respondError(
          "Error fetching map nodes for summarization.",
          500,
          fetchError.message,
        );
      }

      if (!allNodesData) {
        return respondError(
          "Could not retrieve nodes for the map.",
          500,
          "Failed to retrieve map nodes.",
        );
      }

      const branchRootNodeData = allNodesData.find(
        (node) => node.id === nodeId,
      );

      if (!branchRootNodeData) {
        return respondError(
          "Branch root node not found in map data.",
          404,
          "Branch root node not found in map data.",
        );
      }

      // Build branch content string recursively, including relevant metadata
      const nodeMap = new Map(allNodesData.map((node) => [node.id, node]));
      const childrenMap = new Map<string, typeof allNodesData>();
      allNodesData.forEach((node) => {
        if (node.parent_id) {
          if (!childrenMap.has(node.parent_id)) {
            childrenMap.set(node.parent_id, []);
          }

          childrenMap.get(node.parent_id)?.push(node);
        }
      });

      const buildContentString = (
        currentNodeId: string,
        depth: number,
      ): string => {
        const node = nodeMap.get(currentNodeId);
        if (!node) return "";

        let nodeInfo = `${"  ".repeat(depth)}Node (ID: ${node.id}, Type: ${node.node_type || "default"}): ${node.content || "[No Content]"}`;

        // Append relevant metadata and source_url
        const details = [];
        if (node.source_url) details.push(`Source: ${node.source_url}`);

        if (node.metadata) {
          if (node.metadata.isComplete !== undefined)
            details.push(`Completed: ${node.metadata.isComplete}`);
          if (node.metadata.dueDate)
            details.push(`Due: ${node.metadata.dueDate}`);
          if (node.metadata.priority)
            details.push(`Priority: ${node.metadata.priority}`);
          if (node.metadata.imageUrl)
            details.push(`Image: ${node.metadata.imageUrl}`);
          if (node.metadata.summary)
            details.push(`Resource Summary: ${node.metadata.summary}`);
          if (node.metadata.answer)
            details.push(`Answer: ${node.metadata.answer}`);
          if (node.metadata.annotationType)
            details.push(`Annotation Type: ${node.metadata.annotationType}`);
        }

        if (details.length > 0) {
          nodeInfo += ` [${details.join("; ")}]`;
        }

        nodeInfo += "\n";

        const children = childrenMap.get(currentNodeId) || [];

        for (const child of children) {
          nodeInfo += buildContentString(child.id, depth + 1);
        }

        return nodeInfo;
      };

      const branchContent = buildContentString(nodeId, 0);

      if (!branchContent.trim()) {
        return respondSuccess(
          { message: "Branch has no content to summarize." },
          200,
          "Branch has no content to summarize.",
        );
      }

      const aiPrompt = `Summarize the following content from a mind map branch, represented hierarchically. Include key details from metadata like source URLs, completion status, image presence, etc., where relevant. Focus on the main ideas and relationships. Output only the summary text.

Branch Content:
${branchContent}`;

      const result = await defaultModel.generateContent(aiPrompt);
      const response = result.response;
      const summary = response.text().trim();

      if (!summary) {
        return respondError(
          "AI failed to generate a summary.",
          500,
          "AI response was empty.",
        );
      }

      // --- Create Annotation Node with Summary ---
      const summaryNodeId = generateUuid();
      const user = (await supabase.auth.getUser()).data.user; // Assume user is validated by withApiValidation

      if (!user) {
        return respondError("User not authenticated.", 401);
      }

      // Position the summary node near the branch root
      const summaryNodePosition = {
        x: rootNode.position_x + 50, // Offset slightly
        y: rootNode.position_y + 150, // Place below
      };

      const { error: insertError } = await supabase.from("nodes").insert([
        {
          id: summaryNodeId,
          map_id: rootNode.map_id,
          user_id: user.id,
          parent_id: nodeId, // Link to the summarized branch root
          content: summary,
          node_type: "annotationNode",
          position_x: summaryNodePosition.x,
          position_y: summaryNodePosition.y,
          metadata: {
            annotationType: "summary",
            sourceBranchNodeId: nodeId, // Optional: Track which branch this summarizes
          },
        },
      ]);

      if (insertError) {
        console.error("Error inserting summary node:", insertError);
        return respondError(
          "Failed to save summary node.",
          500,
          insertError.message,
        );
      }

      // Also need to add an edge from root to summary node
      const summaryEdgeId = generateUuid();
      const { error: edgeInsertError } = await supabase.from("edges").insert([
        {
          id: summaryEdgeId,
          map_id: rootNode.map_id,
          user_id: user.id,
          source: nodeId,
          target: summaryNodeId,
          type: "smoothstep", // Or your default edge type
        },
      ]);

      if (edgeInsertError) {
        console.warn(
          "Warning: Summary node created, but failed to add edge:",
          edgeInsertError,
        );
        // Decide if this should be an error response or just a warning
      }

      return respondSuccess(
        {
          message: "Branch summarized and saved successfully.",
          summaryNodeId: summaryNodeId, // Optionally return the ID
        },
        201, // 201 Created
        "Branch summarized and saved successfully.",
      );
    } catch (error) {
      console.error("Error during AI branch summarization:", error);
      return respondError(
        "Internal server error during AI branch summarization.",
        500,
        error instanceof Error ? error.message : "Internal Server Error",
      );
    }
  },
);
