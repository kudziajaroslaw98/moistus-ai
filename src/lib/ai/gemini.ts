import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // Throwing an error during startup is acceptable here
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Consider making model name configurable via env var as well
const defaultModelName = "gemini-2.0-flash";

/**
 * Gets a Google Generative AI model instance.
 * @param modelName The name of the model to get (defaults to gemini-2.0-flash).
 * @returns The generative model instance.
 */
export function getGenerativeModel(modelName: string = defaultModelName) {
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Default Gemini Flash model instance.
 */
export const defaultModel = getGenerativeModel();

/**
 * Helper function to parse potentially messy JSON responses from the AI.
 * Attempts to clean common markdown code blocks and parse.
 * @param text The raw text response from the AI.
 * @returns The parsed JSON object/array or null if parsing fails.
 */
export function parseAiJsonResponse<T>(text: string): T | null {
  try {
    // Attempt direct parsing first
    return JSON.parse(text) as T;
  } catch (e1) {
    try {
      // Clean markdown code fences and retry
      const jsonString = text
        .replace(/^```json\n?/, "") // Optional newline after ```json
        .replace(/\n?```$/, "") // Optional newline before ```
        .trim();
      return JSON.parse(jsonString) as T;
    } catch (e2) {
      console.error("Failed to parse AI response as JSON:", e2);
      console.error("Original AI Response Text:", text);
      return null; // Indicate parsing failure
    }
  }
}
