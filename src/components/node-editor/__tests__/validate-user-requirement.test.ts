import { parseTaskInput } from '../parsers';

describe('User Requirement Validation', () => {
	it('should match exact user requirement', () => {
		const input = `Preview PR
@2025-10-10
#low  
[todo]
+frontend
color:#10b981`;

		const result = parseTaskInput(input);

		// Log detailed results for validation
		console.log('=== USER REQUIREMENT TEST ===');
		console.log('Input:', input);
		console.log('Result:', JSON.stringify(result, null, 2));

		// Validate requirements
		expect(result.tasks).toHaveLength(1);
		expect(result.tasks[0].text).toBe('Preview PR');
		expect(result.tasks[0].isComplete).toBe(false);
		expect(result.tasks[0].patterns).toHaveLength(5);

		// Check each pattern
		const patterns = result.tasks[0].patterns!;
		expect(patterns.find(p => p.type === 'date' && p.value === '2025-10-10')).toBeDefined();
		expect(patterns.find(p => p.type === 'priority' && p.value === 'low')).toBeDefined();
		expect(patterns.find(p => p.type === 'tag' && p.value === 'todo')).toBeDefined();
		expect(patterns.find(p => p.type === 'assignee' && p.value === 'frontend')).toBeDefined();
		expect(patterns.find(p => p.type === 'color' && p.value === '#10b981')).toBeDefined();

		console.log('✅ SUCCESS: Single task with metadata patterns created correctly');
	});
});