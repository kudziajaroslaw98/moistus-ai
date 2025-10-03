import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	checkAIFeatureAccess,
	trackAIFeatureUsage,
} from '@/helpers/api/with-ai-feature-gate';
import { defaultModel } from '@/lib/ai/gemini';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

const requestBodySchema = z.object({
	url: z.string().url('Invalid URL format'),
	generateSummary: z.boolean().default(true),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase, user) => {
		// Check AI feature access
		const { hasAccess, isPro, error } = await checkAIFeatureAccess(
			user,
			supabase,
			'url_processing'
		);

		if (!hasAccess && error) {
			return error;
		}

		try {
			const { url, generateSummary } = validatedBody;

			// Fetch the webpage with a timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			const response = await fetch(url, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				console.error(
					`Failed to fetch URL: ${response.status} ${response.statusText}`
				);
				return respondError(
					`Failed to fetch URL: ${response.statusText}`,
					response.status,
					`Failed to fetch URL: ${response.statusText}`
				);
			}

			const html = await response.text();

			// Simple regex-based extraction for OpenGraph tags
			const getMetaTag = (content: string, property: string) => {
				const regex = new RegExp(
					`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`,
					'i'
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
			const ogTitle = getMetaTag(html, 'og:title') || getTitleTag(html);
			const ogDescription = getMetaTag(html, 'og:description');
			const ogImage = getMetaTag(html, 'og:image');

			// Fix relative image URLs
			let imageUrl = ogImage;

			if (imageUrl && !imageUrl.startsWith('http')) {
				const urlObj = new URL(url);

				if (imageUrl.startsWith('/')) {
					imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
				} else {
					imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
				}
			}

			// Generate AI summary if requested
			let summary = null;

			if (generateSummary) {
				// Extract text - this is a simplified approach
				const sanitizedHtml = sanitizeHtml(html, {
					allowedTags: [], // Remove all tags
					allowedAttributes: {}, // Remove all attributes
				});
				const textContent = sanitizedHtml
					.replace(/\s+/g, ' ')
					.trim()
					.substring(0, 15000); // Limit content

				if (textContent.length > 100) {
					const aiPrompt = `Summarize the following webpage content in a concise paragraph (50-100 words maximum):

        ${textContent}

        Provide only the summary paragraph, no additional commentary.`;

					try {
						const result = await defaultModel.generateContent(aiPrompt);
						const response = result.response;
						summary = response.text().trim();
					} catch (aiError) {
						console.error('Error generating summary:', aiError);
						summary = 'Failed to generate summary.';
					}
				} else {
					summary = 'Insufficient content found to generate a summary.';
				}
			}

			// Track usage for free tier users
			await trackAIFeatureUsage(user, supabase, 'url_processing', isPro, {
				url,
				hasSummary: !!summary,
			});

			return respondSuccess(
				{
					title: ogTitle,
					description: ogDescription,
					imageUrl: imageUrl,
					summary: summary,
				},
				200,
				'URL processed successfully.'
			);
		} catch (error) {
			console.error('Error processing URL:', error);
			return respondError(
				'Internal server error during URL processing.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
