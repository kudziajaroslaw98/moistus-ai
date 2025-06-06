import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');

const genAI = new GoogleGenerativeAI(apiKey);
const defaultModelName = 'gemini-2.5-flash-preview-04-17';

export function getGenerativeModel(modelName: string = defaultModelName) {
	return genAI.getGenerativeModel({ model: modelName });
}

export const defaultModel = getGenerativeModel();

export function parseAiJsonResponse<T>(text: string): T | null {
	try {
		return JSON.parse(text) as T;
	} catch {
		try {
			const jsonString = text
				.replace(/^```json\n?/, '')
				.replace(/\n?```$/, '')
				.trim();
			return JSON.parse(jsonString) as T;
		} catch (e2) {
			console.error('Failed to parse AI response as JSON:', e2);
			console.error('Original AI Response Text:', text);
			return null;
		}
	}
}
