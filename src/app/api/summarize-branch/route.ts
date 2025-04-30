import { createClient } from "@/helpers/supabase/server";
import { ApiResponse } from "@/types/api-response"; // <-- Import ApiResponse
import { NodeData } from "@/types/node-data";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const requestBodySchema = z.object({
  nodeId: z.string().uuid("Invalid node ID format"),
});

export async function POST(req: Request) {
  const supabaseServer = await createClient();
  try {
    const body = await req.json();
    const validationResult = requestBodySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: validationResult.error.issues.join(", "),
          status: "error",
          statusNumber: 400,
          statusText: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const { nodeId } = validationResult.data;

    // Fetch the map ID first to limit the node fetch
    const { data: rootNodeMap, error: rootFetchError } = await supabaseServer
      .from("nodes")
      .select("map_id")
      .eq("id", nodeId)
      .single();

    if (rootFetchError || !rootNodeMap) {
      console.error("Error fetching root node map ID:", rootFetchError);
      const statusNumber = rootFetchError?.code === "PGRST116" ? 404 : 500;
      const statusText =
        statusNumber === 404
          ? "Branch root node not found."
          : "Error fetching branch root node.";
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: statusText,
          status: "error",
          statusNumber: statusNumber,
          statusText: rootFetchError?.message || statusText,
        },
        { status: statusNumber },
      );
    }

    // Fetch all nodes for the specific map
    const { data: allNodesData, error: fetchError } = await supabaseServer
      .from("nodes")
      .select("id, parent_id, content, map_id")
      .eq("map_id", rootNodeMap.map_id);

    if (fetchError) {
      console.error(
        "Error fetching nodes for branch summarization:",
        fetchError,
      );
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error fetching map nodes for summarization.",
          status: "error",
          statusNumber: 500,
          statusText: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!allNodesData) {
      // Should not happen if root node was found, but handle defensively
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Could not retrieve nodes for the map.",
          status: "error",
          statusNumber: 500,
          statusText: "Failed to retrieve map nodes.",
        },
        { status: 500 },
      );
    }

    const branchRootNode = allNodesData.find((node) => node.id === nodeId);
    if (!branchRootNode) {
      // Should not happen if root node fetch succeeded, but check anyway
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Branch root node data inconsistency.",
          status: "error",
          statusNumber: 404, // Or 500 for inconsistency
          statusText: "Branch root node not found in map data.",
        },
        { status: 404 },
      );
    }

    // Build branch content string recursively
    let branchContent = "";
    const nodeMap = new Map(allNodesData.map((node) => [node.id, node]));
    const childrenMap = new Map<
      string,
      Pick<NodeData, "id" | "parent_id" | "content" | "map_id">[]
    >();
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

      let content = `${"  ".repeat(depth)}Node (${node.id}): ${
        node.content || "[No Content]"
      }\n`;
      const children = childrenMap.get(currentNodeId) || [];
      for (const child of children) {
        content += buildContentString(child.id, depth + 1);
      }
      return content;
    };

    branchContent = buildContentString(nodeId, 0);

    if (!branchContent.trim()) {
      return NextResponse.json<ApiResponse<{ summary: string }>>(
        {
          data: { summary: "Branch has no content to summarize." },
          status: "success",
          statusNumber: 200,
          statusText: "Branch has no content.",
        },
        { status: 200 },
      );
    }

    const aiPrompt = `Summarize the following content from a mind map branch, represented hierarchically. Focus on the key ideas and relationships presented.

Branch Content:
${branchContent}`;

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const summary = response.text();

    return NextResponse.json<ApiResponse<{ summary: string }>>(
      {
        data: { summary: summary },
        status: "success",
        statusNumber: 200,
        statusText: "Branch summarized successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during AI branch summarization:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during AI branch summarization.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
