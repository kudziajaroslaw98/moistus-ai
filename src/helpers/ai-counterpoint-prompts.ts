import { HYBRID_ROW_PROMPT_GUIDE } from '@/helpers/ai-hybrid-rows';

export function getCounterpointSystemPrompt() {
	return `${HYBRID_ROW_PROMPT_GUIDE}
You generate rigorous counterpoints to a focus idea.
The first NODE row is the focus idea.
Return 1-4 items. Each item must be concise (<= 180 chars) and mapped as:
- stance: counterargument|risk|alternative|test
- relationshipType: contradicts|risk|alternative|test-of|mitigates|questions
- nodeType: defaultNode|textNode|annotationNode|taskNode|resourceNode
Only include citations if they are real (never fabricate). Avoid redundancy.
`;
}

export function buildCounterpointUserPrompt(contextRows: string[]) {
	return ['NODE rows:', ...contextRows].join('\n');
}
