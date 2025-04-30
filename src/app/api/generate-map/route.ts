import { ApiResponse } from "@/types/api-response"; // <-- Import ApiResponse
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Adjusted model as per original code

const requestBodySchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
});

// Define a simple structure type for clarity
interface MindMapStructure {
  root: {
    content: string;
    children?: MindMapStructure[];
  };
}

interface GenerateMapData {
  structure: MindMapStructure;
}

export async function POST(req: Request) {
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

    const { prompt } = validationResult.data;

    const aiPrompt = `Generate a mind map structure in JSON format based on the following topic: "${prompt}".
    The JSON should represent a hierarchical structure with a root node and nested children.
    Each node should have a "content" field for the node text. Children should be in a "children" array.
    Example format:
    {
      "root": {
        "content": "Main Topic",
        "children": [
          {
            "content": "Subtopic 1",
            "children": [
              { "content": "Detail A" },
              { "content": "Detail B" }
            ]
          },
          { "content": "Subtopic 2" }
        ]
      }
    }
    Ensure the output is ONLY the JSON object, nothing else.`;

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const text = response.text();

    let aiStructure: MindMapStructure;
    try {
      const jsonString = text
        .replace(/^```json\n/, "")
        .replace(/\n```$/, "")
        .trim();
      aiStructure = JSON.parse(jsonString);
      // Basic validation (more robust schema validation could be added here if needed)
      if (
        !aiStructure ||
        typeof aiStructure !== "object" ||
        !aiStructure.root ||
        typeof aiStructure.root.content !== "string"
      ) {
        throw new Error("Parsed structure is invalid.");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("AI Response Text:", text);
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Failed to parse AI response structure.",
          status: "error",
          statusNumber: 500,
          statusText:
            parseError instanceof Error
              ? parseError.message
              : "AI response parsing failed.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<GenerateMapData>>(
      {
        data: { structure: aiStructure },
        status: "success",
        statusNumber: 200, // Using 200 as per original, could argue for 201
        statusText: "Map structure generated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating map structure:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during map generation.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
