import { respondError, respondSuccess } from "@/helpers/api/responses";
import { withApiValidation } from "@/helpers/api/with-api-validation";
import { defaultModel } from "@/lib/ai/gemini";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestBodySchema = z.object({
  nodeId: z.string().uuid("Invalid node ID format"),
});

// Helper to recursively get ancestor content
async function getAncestorContext(
  nodeId: string,
  supabase: SupabaseClient, // SupabaseClient type from @supabase/supabase-js
  currentMapId: string,
  depthLimit: number = 3, // Limit depth to prevent excessive fetching
  currentDepth: number = 0,
): Promise<string> {
  if (currentDepth >= depthLimit) {
    return "";
  }

  const { data: node, error } = await supabase
    .from("nodes")
    .select("content, parent_id")
    .eq("id", nodeId)
    .eq("map_id", currentMapId) // Ensure we stay within the same map
    .single();

  if (error || !node) {
    return "";
  }

  let context = "";

  if (node.parent_id) {
    context = await getAncestorContext(
      node.parent_id,
      supabase,
      currentMapId,
      depthLimit,
      currentDepth + 1,
    );
  }

  // Add current node's content to the context (prepended by parent's context)
  // We are building context from oldest ancestor to direct parent
  return `${context}${node.content ? `Context: ${node.content}\n` : ""}`;
}

export const POST = withApiValidation(
  requestBodySchema,
  async (req, validatedBody, supabase) => {
    try {
      const { nodeId } = validatedBody;

      const { data: questionNode, error: fetchError } = await supabase
        .from("nodes")
        .select("id, node_type, content, parent_id, map_id, metadata")
        .eq("id", nodeId)
        .single();

      if (fetchError || !questionNode) {
        console.error("Error fetching question node:", fetchError);
        return respondError(
          "Question node not found.",
          404,
          fetchError?.message,
        );
      }

      if (questionNode.node_type !== "questionNode") {
        return respondError("Node is not a question node.", 400);
      }

      if (!questionNode.content || questionNode.content.trim() === "") {
        return respondError("Question node has no content.", 400);
      }

      let contextPrompt = "";

      if (questionNode.parent_id) {
        // Fetch content of parent and its ancestors for context
        const { data: allNodesInMap, error: mapNodesError } = await supabase
          .from("nodes")
          .select("id, content, parent_id")
          .eq("map_id", questionNode.map_id);

        if (mapNodesError) {
          console.warn(
            "Could not fetch all map nodes for full context:",
            mapNodesError.message,
          );
        } else {
          const nodeMap = new Map(allNodesInMap.map((n) => [n.id, n]));
          let currentParentId = questionNode.parent_id;
          const ancestorContents: string[] = [];
          let depth = 0;
          const maxDepth = 3; // Limit context depth

          while (currentParentId && depth < maxDepth) {
            const parentNode = nodeMap.get(currentParentId);

            if (parentNode && parentNode.content) {
              ancestorContents.unshift(parentNode.content); // Add to beginning to maintain order
            }

            currentParentId = parentNode?.parent_id || null;
            depth++;
          }

          if (ancestorContents.length > 0) {
            contextPrompt = `Given the following context from related ideas:\n${ancestorContents.map((c) => `- ${c}`).join("\n")}\n\n`;
          }
        }
      }

      const aiPrompt = `${contextPrompt}Please answer the following question based on your knowledge and the provided context (if any), make sure to summarize the answer in a very short paragraph. Do not include thinking in the response.:\n\nQuestion: "${questionNode.content}"\n\nAnswer:`;

      const result = await defaultModel.generateContent(aiPrompt);
      const response = result.response;
      const generatedAnswer = response.text().trim();

      if (!generatedAnswer) {
        return respondError(
          "AI failed to generate an answer.",
          500,
          "AI response was empty.",
        );
      }

      // The client (useAiFeatures) will call saveNodeMetadata to update the node.
      // This API just returns the answer.

      return respondSuccess(
        { answer: generatedAnswer },
        200,
        "AI answer generated successfully.",
      );
    } catch (error) {
      console.error("Error generating AI answer:", error);
      return respondError(
        "Internal server error during AI answer generation.",
        500,
        error instanceof Error ? error.message : "Internal Server Error",
      );
    }
  },
);
