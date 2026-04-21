import {
	FOCUSED_NODE_SUGGESTION_PROMPT,
	getSuggestionSystemPrompt,
	SUGGESTION_BASE_PROMPT,
	WHOLE_MAP_SUGGESTION_PROMPT,
} from './ai-suggestion-prompts';

describe('ai suggestion prompts', () => {
	it('includes the confidence rubric and anti-repeat guidance in the base prompt', () => {
		expect(SUGGESTION_BASE_PROMPT).toContain('Confidence rubric:');
		expect(SUGGESTION_BASE_PROMPT).toContain('0.85-0.95');
		expect(SUGGESTION_BASE_PROMPT).toContain('Reduce confidence when a suggestion overlaps existing nodes or RECENT items.');
		expect(SUGGESTION_BASE_PROMPT).toContain('Bad suggestions:');
		expect(SUGGESTION_BASE_PROMPT).toContain('Mini example:');
		expect(SUGGESTION_BASE_PROMPT).toContain('Every suggestion object must include nodePayload');
		expect(SUGGESTION_BASE_PROMPT).toContain('provide all keys and use null for unused values');
			expect(SUGGESTION_BASE_PROMPT).toContain(
				'nodePayload must include taskTexts'
			);
		expect(SUGGESTION_BASE_PROMPT).toContain('Do not use imageNode or resourceNode in this route.');
	});

	it('keeps whole-map and focused-node guidance separate', () => {
		expect(WHOLE_MAP_SUGGESTION_PROMPT).toContain('Whole-map behavior:');
		expect(WHOLE_MAP_SUGGESTION_PROMPT).toContain('under-covered but important areas');
		expect(FOCUSED_NODE_SUGGESTION_PROMPT).toContain('Focused-node behavior:');
		expect(FOCUSED_NODE_SUGGESTION_PROMPT).toContain('siblings, ancestry, and topology');
	});

	it('builds the final system prompt from the base prompt plus the mode-specific prompt', () => {
		const wholeMapPrompt = getSuggestionSystemPrompt('full-map');
		const focusedPrompt = getSuggestionSystemPrompt('focused-node');

		expect(wholeMapPrompt).toContain('You are an expert mind-map expansion engine.');
		expect(wholeMapPrompt).toContain('Whole-map selection heuristic:');
		expect(wholeMapPrompt).toContain('"nodePayload"');
		expect(focusedPrompt).toContain('You are an expert mind-map expansion engine.');
		expect(focusedPrompt).toContain('Focused-node behavior:');
		expect(focusedPrompt).toContain('"nodePayload"');
	});
});
