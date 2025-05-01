import { ApiResponse } from "@/types/api-response";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const requestBodySchema = z.object({
  url: z.string().url("Invalid URL format"),
  generateSummary: z.boolean().default(true),
});

interface ProcessUrlData {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  summary: string | null;
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

    const { url, generateSummary } = validationResult.data;

    // Fetch the webpage with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: `Failed to fetch URL: ${response.statusText}`,
          status: "error",
          statusNumber: response.status,
          statusText: `Error fetching URL: ${response.statusText}`,
        },
        { status: 500 },
      );
    }

    const html = await response.text();

    // Simple regex-based extraction for OpenGraph tags
    const getMetaTag = (content: string, property: string) => {
      const regex = new RegExp(
        `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`,
        "i",
      );
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    const getTitleTag = (content: string) => {
      const regex = /<title[^>]*>(.*?)<\/title>/i;
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    // Extract OpenGraph metadata
    const ogTitle = getMetaTag(html, "og:title") || getTitleTag(html);
    const ogDescription = getMetaTag(html, "og:description");
    const ogImage = getMetaTag(html, "og:image");

    // Fix relative image URLs
    let imageUrl = ogImage;
    if (imageUrl && !imageUrl.startsWith("http")) {
      const urlObj = new URL(url);
      if (imageUrl.startsWith("/")) {
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      } else {
        imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
      }
    }

    // Generate AI summary if requested
    let summary = null;
    if (generateSummary) {
      // Extract text - this is a simplified approach
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 15000); // Limit content

      if (textContent.length > 100) {
        const aiPrompt = `Summarize the following webpage content in a concise paragraph (50-100 words maximum):

        ${textContent}

        Provide only the summary paragraph, no additional commentary.`;

        try {
          const result = await model.generateContent(aiPrompt);
          const response = result.response;
          summary = response.text().trim();
        } catch (aiError) {
          console.error("Error generating summary:", aiError);
          summary = "Failed to generate summary.";
        }
      } else {
        summary = "Insufficient content found to generate a summary.";
      }
    }

    const data: ProcessUrlData = {
      title: ogTitle,
      description: ogDescription,
      imageUrl: imageUrl,
      summary: summary,
    };

    return NextResponse.json<ApiResponse<ProcessUrlData>>(
      {
        data: data,
        status: "success",
        statusNumber: 200,
        statusText: "URL processed successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing URL:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during URL processing.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
