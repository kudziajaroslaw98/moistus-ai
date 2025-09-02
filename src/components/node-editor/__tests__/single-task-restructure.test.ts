import { parseTaskInput } from '../parsers';

describe('Single Task Restructure', () => {
	describe('Core Functionality', () => {
		it('should create single task with multiple patterns from multiline input', () => {
			const input = `Preview PR
@2025-10-10
#low
[todo]
+frontend
color:#10b981`;

			const result = parseTaskInput(input);

			// Should have exactly 1 task
			expect(result.tasks).toHaveLength(1);

			// Task text should be clean
			expect(result.tasks[0].text).toBe('Preview PR');
			expect(result.tasks[0].isComplete).toBe(false);

			// Should have all patterns
			expect(result.tasks[0].patterns).toHaveLength(5);

			// Verify each pattern type exists
			const patterns = result.tasks[0].patterns!;
			expect(patterns.find(p => p.type === 'date' && p.value === '2025-10-10')).toBeDefined();
			expect(patterns.find(p => p.type === 'priority' && p.value === 'low')).toBeDefined();
			expect(patterns.find(p => p.type === 'tag' && p.value === 'todo')).toBeDefined();
			expect(patterns.find(p => p.type === 'assignee' && p.value === 'frontend')).toBeDefined();
			expect(patterns.find(p => p.type === 'color' && p.value === '#10b981')).toBeDefined();

			// Legacy fields should be populated for backwards compatibility
			expect(result.dueDate).toBeInstanceOf(Date);
			expect(result.priority).toBe('low');
			expect(result.assignee).toBe('frontend');
			expect(result.tags).toContain('todo');
		});

		it('should handle single line input with mixed patterns', () => {
			const input = 'Fix bug @today #high [urgent] +john color:#ff0000';
			const result = parseTaskInput(input);

			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Fix bug');
			expect(result.tasks[0].patterns).toHaveLength(5);
		});

		it('should handle markdown checkbox format', () => {
			const input = '- [x] Completed task @tomorrow #medium [done]';
			const result = parseTaskInput(input);

			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Completed task');
			expect(result.tasks[0].isComplete).toBe(true);
			expect(result.tasks[0].patterns).toHaveLength(3);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty input', () => {
			const result = parseTaskInput('');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('New task');
			expect(result.tasks[0].patterns).toHaveLength(0);
		});

		it('should handle only patterns without text', () => {
			const input = '@today #high [urgent]';
			const result = parseTaskInput(input);

			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('New task');
			expect(result.tasks[0].patterns).toHaveLength(3);
		});

		it('should handle only text without patterns', () => {
			const input = 'Simple task without any patterns';
			const result = parseTaskInput(input);

			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Simple task without any patterns');
			expect(result.tasks[0].patterns).toHaveLength(0);
		});

		it('should handle whitespace-only input', () => {
			const result = parseTaskInput('   \n  \t  ');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('New task');
			expect(result.tasks[0].patterns).toHaveLength(0);
		});
	});

	describe('Pattern Extraction', () => {
		it('should preserve pattern order', () => {
			const input = 'Task @date1 #high @date2 #low';
			const result = parseTaskInput(input);

			expect(result.tasks[0].patterns).toHaveLength(4);
			// Should have both dates and both priorities
			const datePatterns = result.tasks[0].patterns!.filter(p => p.type === 'date');
			const priorityPatterns = result.tasks[0].patterns!.filter(p => p.type === 'priority');
			
			expect(datePatterns).toHaveLength(2);
			expect(priorityPatterns).toHaveLength(2);
		});

		it('should handle complex color patterns', () => {
			const input = 'Task color:#ff0000 color:rgb(255,0,0) color:red';
			const result = parseTaskInput(input);

			expect(result.tasks[0].patterns).toHaveLength(3);
			const colorPatterns = result.tasks[0].patterns!.filter(p => p.type === 'color');
			expect(colorPatterns).toHaveLength(3);
		});
	});

	describe('Backwards Compatibility', () => {
		it('should populate legacy fields from first matching pattern', () => {
			const input = 'Task @today @tomorrow #high #low [tag1] [tag2] +user1 +user2';
			const result = parseTaskInput(input);

			// Legacy fields should use first occurrence
			expect(result.dueDate).toBeDefined();
			expect(result.priority).toBe('high');
			expect(result.assignee).toBe('user1');
			expect(result.tags).toEqual(['tag1', 'tag2']);
		});
	});
});