import { respondError, respondSuccess } from "@/helpers/api/responses";
import { withApiValidation } from "@/helpers/api/with-api-validation";
import { defaultModel, parseAiJsonResponse } from "@/lib/ai/gemini";
import { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
import { z } from "zod";

const requestBodySchema = z.object({
  mapId: z.string().uuid("Invalid map ID format"),
});

const aiSuggestionSchema = z.object({
  node1Id: z.string(),
  node2Id: z.string(),
  reason: z.string().optional(),
});

const aiResponseSchema = z.array(aiSuggestionSchema);

export const POST = withApiValidation(
  requestBodySchema,
  async (req, validatedBody, supabase) => {
    try {
      const { mapId } = validatedBody;

      const { data: nodesData, error: fetchError } = await supabase
        .from("nodes")
        .select("id, content")
        .eq("map_id", mapId);

      if (fetchError) {
        console.error("Error fetching nodes for merge suggestion:", fetchError);
        return respondError(
          "Error fetching map nodes for merge suggestion.",
          500,
          fetchError.message,
        );
      }

      if (!nodesData || nodesData.length < 2) {
        console.warn(
          "Not enough nodes in map to suggest merges (minimum 2 required).",
        );
        return respondSuccess(
          { suggestions: [] },
          200,
          "Not enough nodes in map to suggest merges (minimum 2 required).",
        );
      }

      const nodeContentList = nodesData
        .map((node) => `${node.id}: ${node.content || "[No Content]"}`)
        .join("\n");

      const aiPrompt = `Given the following list of mind map nodes (ID: Content), identify pairs of nodes that are semantically similar or cover overlapping topics and could potentially be merged.
         Return the result as a JSON array of objects. Each object should have "node1Id" and "node2Id" fields, containing the IDs of the nodes to merge. Optionally include a "reason" field explaining why they might be merged.
         Only suggest pairs where node1Id and node2Id are different.
         Focus on semantic similarity, not just exact text matches.
         Example format:
         [
           { "node1Id": "node-id-1", "node2Id": "node-id-abc", "reason": "Both discuss the core concepts of X" },
           { "node1Id": "another-id", "node2Id": "node-id-1", "reason": "Covers similar sub-points about Y" }
         ]
         Ensure the output is ONLY the JSON array, nothing else.

         Nodes:
         ${nodeContentList}`;

      const result = await defaultModel.generateContent(aiPrompt);
      const response = result.response;
      const text = response.text();

      let suggestions: AiMergeSuggestion[] = [];

      try {
        const parsed = parseAiJsonResponse<AiMergeSuggestion[]>(text);
        suggestions = aiResponseSchema.parse(parsed);
      } catch (parseError) {
        console.error(
          "Failed to parse AI merge suggestions as JSON array:",
          parseError,
        );
        console.error("AI Response Text:", text);
        return respondError(
          "Failed to parse AI merge suggestions.",
          500,
          parseError instanceof Error
            ? parseError.message
            : "AI response parsing failed.",
        );
      }

      const validNodeIds = new Set(nodesData.map((node) => node.id));
      const processedPairs = new Set<string>();
      const validSuggestions = suggestions.filter((suggestion) => {
        // Validate IDs
        if (
          !validNodeIds.has(suggestion.node1Id) ||
          !validNodeIds.has(suggestion.node2Id) ||
          suggestion.node1Id === suggestion.node2Id
        ) {
          return false;
        }

        // Avoid duplicate pairs (e.g., A-B and B-A)
        const pairKey = [suggestion.node1Id, suggestion.node2Id]
          .sort()
          .join("-");

        if (processedPairs.has(pairKey)) {
          return false;
        }

        processedPairs.add(pairKey);
        return true;
      });

      return respondSuccess(
        { suggestions: validSuggestions },
        200,
        "Merge suggestions generated successfully.",
      );
    } catch (error) {
      console.error("Error during AI merge suggestion:", error);
      return respondError(
        "Internal server error during AI merge suggestion.",
        500,
        error instanceof Error ? error.message : "Internal Server Error",
      );
    }
  },
);
