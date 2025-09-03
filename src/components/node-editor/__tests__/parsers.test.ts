/**
 * Consolidated parsing logic tests for node-editor
 * 
 * Tests all parsing functionality including:
 * - Text input parsing (formatting patterns)
 * - Task input parsing (checkbox formats, patterns)
 * - Date parsing
 * - Pattern extraction and cleaning
 * - Edge cases and error handling
 */

import { parseTextInput, parseTaskInput } from '../parsers';
import type { ParsedTaskData } from '../types';

describe('Text Input Parsing', () => {
	describe('Font Size Parsing', () => {
		it('should parse font size with px unit', () => {
			const result = parseTextInput('Hello @24px');
			expect(result.content).toBe('Hello');
			expect(result.metadata?.fontSize).toBe('24px');
		});

		it('should parse font size with rem unit', () => {
			const result = parseTextInput('Text @2rem');
			expect(result.content).toBe('Text');
			expect(result.metadata?.fontSize).toBe('2rem');
		});

		it('should parse font size with em unit', () => {
			const result = parseTextInput('Content @1.5em');
			expect(result.content).toBe('Content');
			expect(result.metadata?.fontSize).toBe('1.5em');
		});

		it('should default to px when no unit specified', () => {
			const result = parseTextInput('Large text @32');
			expect(result.content).toBe('Large text');
			expect(result.metadata?.fontSize).toBe('32px');
		});

		it('should handle multiple size patterns and use the last one', () => {
			const result = parseTextInput('@16px Small @24px Medium @32px');
			expect(result.content).toBe('Small Medium');
			expect(result.metadata?.fontSize).toBe('32px');
		});
	});

	describe('Bold Text Parsing', () => {
		it('should parse bold text and set fontWeight', () => {
			const result = parseTextInput('**Bold text**');
			expect(result.content).toBe('Bold text');
			expect(result.metadata?.fontWeight).toBe('bold');
		});

		it('should handle multiple bold sections', () => {
			const result = parseTextInput('**First** and **Second**');
			expect(result.content).toBe('First and Second');
			expect(result.metadata?.fontWeight).toBe('bold');
		});

		it('should handle bold with other formatting', () => {
			const result = parseTextInput('**Bold** @24px');
			expect(result.content).toBe('Bold');
			expect(result.metadata?.fontWeight).toBe('bold');
			expect(result.metadata?.fontSize).toBe('24px');
		});
	});

	describe('Italic Text Parsing', () => {
		it('should parse italic text with asterisks', () => {
			const result = parseTextInput('*Italic text*');
			expect(result.content).toBe('Italic text');
			expect(result.metadata?.fontStyle).toBe('italic');
		});

		it('should parse italic text with underscores', () => {
			const result = parseTextInput('_Italic text_');
			expect(result.content).toBe('Italic text');
			expect(result.metadata?.fontStyle).toBe('italic');
		});

		it('should not confuse bold markers with italic', () => {
			const result = parseTextInput('**Bold** not italic');
			expect(result.content).toBe('Bold not italic');
			expect(result.metadata?.fontWeight).toBe('bold');
			expect(result.metadata?.fontStyle).toBeUndefined();
		});
	});

	describe('Text Alignment Parsing', () => {
		it('should parse left alignment', () => {
			const result = parseTextInput('Text align:left');
			expect(result.content).toBe('Text');
			expect(result.metadata?.textAlign).toBe('left');
		});

		it('should parse center alignment', () => {
			const result = parseTextInput('Centered text align:center');
			expect(result.content).toBe('Centered text');
			expect(result.metadata?.textAlign).toBe('center');
		});

		it('should parse right alignment', () => {
			const result = parseTextInput('Right aligned align:right');
			expect(result.content).toBe('Right aligned');
			expect(result.metadata?.textAlign).toBe('right');
		});

		it('should be case-insensitive', () => {
			const result = parseTextInput('Text align:CENTER');
			expect(result.content).toBe('Text');
			expect(result.metadata?.textAlign).toBe('center');
		});
	});

	describe('Color Parsing', () => {
		it('should parse named colors', () => {
			const result = parseTextInput('Red text color:red');
			expect(result.content).toBe('Red text');
			expect(result.metadata?.textColor).toBe('red');
		});

		it('should parse hex colors', () => {
			const result = parseTextInput('Custom color color:#ff0000');
			expect(result.content).toBe('Custom color');
			expect(result.metadata?.textColor).toBe('#ff0000');
		});

		it('should parse Tailwind color classes', () => {
			const result = parseTextInput('Blue text color:blue-500');
			expect(result.content).toBe('Blue text');
			expect(result.metadata?.textColor).toBe('blue-500');
		});

		it('should handle color with hyphens', () => {
			const result = parseTextInput('Teal text color:teal-400');
			expect(result.content).toBe('Teal text');
			expect(result.metadata?.textColor).toBe('teal-400');
		});
	});

	describe('Combined Patterns', () => {
		it('should handle all patterns together', () => {
			const result = parseTextInput(
				'**Bold** and *italic* @24px align:center color:red'
			);
			expect(result.content).toBe('Bold and italic');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				fontWeight: 'bold',
				fontStyle: 'italic',
				textAlign: 'center',
				textColor: 'red',
			});
		});

		it('should handle patterns in any order', () => {
			const result = parseTextInput(
				'color:blue align:right @32px **Important** message'
			);
			expect(result.content).toBe('Important message');
			expect(result.metadata).toEqual({
				fontSize: '32px',
				fontWeight: 'bold',
				textAlign: 'right',
				textColor: 'blue',
			});
		});

		it('should handle text with no patterns', () => {
			const result = parseTextInput('Plain text without any formatting');
			expect(result.content).toBe('Plain text without any formatting');
			expect(result.metadata).toBeUndefined();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty input', () => {
			const result = parseTextInput('');
			expect(result.content).toBe('');
			expect(result.metadata).toBeUndefined();
		});

		it('should handle only whitespace', () => {
			const result = parseTextInput('   ');
			expect(result.content).toBe('');
			expect(result.metadata).toBeUndefined();
		});

		it('should handle only patterns without content', () => {
			const result = parseTextInput('@24px align:center color:red');
			expect(result.content).toBe('');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				textAlign: 'center',
				textColor: 'red',
			});
		});

		it('should preserve special characters in content', () => {
			const result = parseTextInput('Text with @ and # symbols @24px');
			expect(result.content).toBe('Text with @ and # symbols');
			expect(result.metadata?.fontSize).toBe('24px');
		});

		it('should handle nested bold markers properly', () => {
			const result = parseTextInput('**Bold with ** inside**');
			expect(result.content).toBe('Bold with ** inside');
			expect(result.metadata?.fontWeight).toBe('bold');
		});
	});

	describe('Pattern Extraction', () => {
		it('should extract patterns and clean content properly', () => {
			const input = 'Hello @24px world align:center with color:blue text';
			const result = parseTextInput(input);
			expect(result.content).toBe('Hello world with text');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				textAlign: 'center',
				textColor: 'blue',
			});
		});

		it('should handle adjacent patterns', () => {
			const result = parseTextInput('@24pxalign:centercolor:red Text');
			expect(result.content).toBe('Text');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				textAlign: 'center',
				textColor: 'red',
			});
		});
	});
});

describe('Task Input Parsing', () => {
	describe('Enhanced Checkbox Format Support', () => {
		it('should parse traditional checkbox formats correctly', () => {
			const traditionalFormats = [
				'[x] Completed task',
				'[X] Completed task uppercase',
				'[ ] Uncompleted task',
				'[] Empty checkbox task'
			];

			traditionalFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].text).toBe(input.includes('Completed') ? 
					input.replace(/^\[[xX]\]\s*/, '') : 
					input.replace(/^\[\s*\]\s*/, ''));
				
				if (input.includes('[x]') || input.includes('[X]')) {
					expect(result.tasks[0].isComplete).toBe(true);
				} else {
					expect(result.tasks[0].isComplete).toBe(false);
				}
			});
		});

		it('should parse new semicolon checkbox format', () => {
			const semicolonFormats = [
				'[;] Task completed with semicolon',
				'[ ; ] Task with spaced semicolon',
				'[\t;\t] Task with tab-spaced semicolon'
			];

			semicolonFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(true);
				expect(result.tasks[0].text).toMatch(/Task.*semicolon/);
			});
		});

		it('should parse new comma checkbox format', () => {
			const commaFormats = [
				'[,] Task completed with comma',
				'[ , ] Task with spaced comma',
				'[\t,\t] Task with tab-spaced comma'
			];

			commaFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(true);
				expect(result.tasks[0].text).toMatch(/Task.*comma/);
			});
		});

		it('should handle mixed checkbox formats in a single input', () => {
			const mixedInput = `[x] Traditional completed
[ ] Traditional uncompleted
[;] Semicolon completed
[,] Comma completed
[] Empty uncompleted`;

			const result = parseTaskInput(mixedInput);
			// New behavior: Creates single task with combined text and patterns
			expect(result.tasks).toHaveLength(1);

			// Combined text from all lines
			expect(result.tasks[0].text).toBe('Traditional completed Traditional uncompleted Semicolon completed Comma completed Empty uncompleted');
			
			// Should have patterns for the detected checkbox symbols as tags
			const patterns = result.tasks[0].patterns || [];
			expect(patterns.length).toBeGreaterThan(0);
			
			// Completion status determined by checkbox detection logic
			expect(result.tasks[0].isComplete).toBe(false); // Combines to incomplete
		});

		it('should handle list prefixes with new checkbox formats', () => {
			const listFormats = [
				'- [;] List item with semicolon',
				'* [,] List item with comma',
				'- [ ; ] Spaced semicolon list item',
				'* [ , ] Spaced comma list item'
			];

			listFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(true);
				expect(result.tasks[0].text).toMatch(/List item/);
			});
		});

		it('should correctly identify unchecked states', () => {
			const uncheckedFormats = [
				'[ ] Space unchecked',
				'[] Empty unchecked',
				'[  ] Multiple spaces unchecked',
				'[\t] Tab unchecked',
				'[   \t  ] Mixed whitespace unchecked'
			];

			uncheckedFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(false);
			});
		});

		it('should correctly identify checked states for all formats', () => {
			const checkedFormats = [
				'[x] Lowercase x',
				'[X] Uppercase X', 
				'[;] Semicolon',
				'[,] Comma'
			];

			checkedFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(true);
			});
		});
	});

	describe('Multi-Pattern Support', () => {
		it('should parse task with date and priority patterns', () => {
			const input = 'Meeting prep @2025-04-24 #high';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Meeting prep');
			expect(result.tasks[0].patterns).toHaveLength(2);
			
			// Check date pattern
			const datePattern = result.tasks[0].patterns?.find(p => p.type === 'date');
			expect(datePattern).toBeDefined();
			expect(datePattern?.value).toBe('2025-04-24');
			
			// Check priority pattern
			const priorityPattern = result.tasks[0].patterns?.find(p => p.type === 'priority');
			expect(priorityPattern).toBeDefined();
			expect(priorityPattern?.value).toBe('high');
		});
		
		it('should parse task with all pattern types', () => {
			const input = 'Meeting prep @2025-04-24 #medium color:#CD1E8C [urgent] +john';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Meeting prep');
			expect(result.tasks[0].patterns).toHaveLength(5);
			
			// Check all pattern types are present
			const patternTypes = result.tasks[0].patterns?.map(p => p.type) || [];
			expect(patternTypes).toContain('date');
			expect(patternTypes).toContain('priority');
			expect(patternTypes).toContain('color');
			expect(patternTypes).toContain('tag');
			expect(patternTypes).toContain('assignee');
			
			// Verify specific values
			const patterns = result.tasks[0].patterns || [];
			expect(patterns.find(p => p.type === 'date')?.value).toBe('2025-04-24');
			expect(patterns.find(p => p.type === 'priority')?.value).toBe('medium');
			expect(patterns.find(p => p.type === 'color')?.value).toBe('#CD1E8C');
			expect(patterns.find(p => p.type === 'tag')?.value).toBe('urgent');
			expect(patterns.find(p => p.type === 'assignee')?.value).toBe('john');
		});

		it('should handle patterns in different orders', () => {
			const inputs = [
				'Task +alice [important] #high @today color:#ff0000',
				'@today Task +alice color:#ff0000 #high [important]',
				'#high color:#ff0000 Task @today [important] +alice',
			];
			
			inputs.forEach(input => {
				const result = parseTaskInput(input);
				
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].text).toBe('Task');
				expect(result.tasks[0].patterns).toHaveLength(5);
				
				// All patterns should be present regardless of order
				const patternTypes = result.tasks[0].patterns?.map(p => p.type) || [];
				expect(patternTypes).toContain('date');
				expect(patternTypes).toContain('priority');
				expect(patternTypes).toContain('color');
				expect(patternTypes).toContain('tag');
				expect(patternTypes).toContain('assignee');
		});
		});

		it('should handle multiple instances of same pattern type', () => {
			const input = 'Task @today @tomorrow #high #low [tag1] [tag2] +user1 +user2';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Task');
			
			// Should capture multiple instances of each pattern type
			const patterns = result.tasks[0].patterns || [];
			const datePatterns = patterns.filter(p => p.type === 'date');
			const priorityPatterns = patterns.filter(p => p.type === 'priority');
			const tagPatterns = patterns.filter(p => p.type === 'tag');
			const assigneePatterns = patterns.filter(p => p.type === 'assignee');
			
			expect(datePatterns).toHaveLength(2);
			expect(priorityPatterns).toHaveLength(2);
			expect(tagPatterns).toHaveLength(2);
			expect(assigneePatterns).toHaveLength(2);
			
			expect(datePatterns.map(p => p.value)).toContain('today');
			expect(datePatterns.map(p => p.value)).toContain('tomorrow');
			expect(priorityPatterns.map(p => p.value)).toContain('high');
			expect(priorityPatterns.map(p => p.value)).toContain('low');
		});
	});

	describe('Backward Compatibility', () => {
		it('should maintain exact same behavior for existing checkbox formats', () => {
			const legacyInputs = [
				'[x] Legacy completed task',
				'[X] Legacy uppercase completed',
				'[ ] Legacy uncompleted task',
				'[] Legacy empty checkbox'
			];

			legacyInputs.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				
				// Verify the exact same parsing behavior as before
				if (input.includes('[x]') || input.includes('[X]')) {
					expect(result.tasks[0].isComplete).toBe(true);
				} else {
					expect(result.tasks[0].isComplete).toBe(false);
				}
			});
		});

		it('should create single task with combined content from multiline input', () => {
			const multiTaskInput = `[x] First task
[ ] Second task
[X] Third task`;

			const result = parseTaskInput(multiTaskInput);
			// New behavior: Single task with combined content
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('First task Second task Third task');
			expect(result.tasks[0].isComplete).toBe(false); // Combined result
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle malformed checkbox patterns gracefully', () => {
			const malformedInputs = [
				'[xy] Invalid multiple chars',
				'[?] Invalid question mark',
				'[!] Invalid exclamation',
				'[@] Invalid at symbol'
			];

			malformedInputs.forEach(input => {
				// These should not be treated as checkboxes, but as regular tasks
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				// Should not parse as checkbox, so text should include brackets
				expect(result.tasks[0].text).toBe(input);
				expect(result.tasks[0].isComplete).toBe(false);
			});
		});

		it('should handle empty input gracefully', () => {
			const result = parseTaskInput('');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('New task');
			expect(result.tasks[0].isComplete).toBe(false);
		});

		it('should handle only checkbox without text', () => {
			const checkboxOnlyInputs = ['[x]', '[;]', '[,]', '[ ]', '[]'];

			checkboxOnlyInputs.forEach(input => {
				// This should not match the markdown task pattern since there's no text after
				const result = parseTaskInput(input);
				// Should create default task since no valid tasks were parsed
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].text).toBe('New task');
				expect(result.tasks[0].isComplete).toBe(false);
			});
		});

		it('should properly clean text while preserving word boundaries', () => {
			const input = 'Review @friday the #urgent [document] with +team members';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Review the with members');
			expect(result.tasks[0].patterns).toHaveLength(4);
		});

		it('should handle patterns at beginning, middle, and end', () => {
			const input = '@today Start task in middle #high and finish +user';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('Start task in middle and finish');
			expect(result.tasks[0].patterns).toHaveLength(3);
		});

		it('should handle empty patterns gracefully', () => {
			const input = 'Task with empty @ # [] + color: patterns';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			// Should not parse empty/malformed patterns
			expect(result.tasks[0].patterns || []).toHaveLength(0);
			expect(result.tasks[0].text).toBe('Task with empty @ # [] + color: patterns');
		});

		it('should preserve text integrity when patterns fail to parse', () => {
			const input = 'Important task @invaliddate #invalidpriority [valid] +validuser';
			const result = parseTaskInput(input);
			
			expect(result.tasks).toHaveLength(1);
			// Should still parse valid patterns
			const patterns = result.tasks[0].patterns || [];
			expect(patterns.some(p => p.type === 'tag' && p.value === 'valid')).toBe(true);
			expect(patterns.some(p => p.type === 'assignee' && p.value === 'validuser')).toBe(true);
		});
	});

	describe('Backwards Compatibility Legacy Fields', () => {
		it('should populate legacy fields from first matching pattern', () => {
			const input = 'Task @today @tomorrow #high #low [tag1] [tag2] +user1 +user2';
			const result = parseTaskInput(input);

			// Legacy fields should use first occurrence
			expect(result.dueDate).toBeDefined();
			expect(result.priority).toBe('high');
			expect(result.assignee).toBe('user1');
			expect(result.tags).toEqual(['tag1', 'tag2']);
		});

		it('should match exact user requirement', () => {
			const input = `Preview PR
@2025-10-10
#low  
[todo]
+frontend
color:#10b981`;

			const result = parseTaskInput(input);

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

			// Legacy fields should be populated for backwards compatibility
			expect(result.dueDate).toBeInstanceOf(Date);
			expect(result.priority).toBe('low');
			expect(result.assignee).toBe('frontend');
			expect(result.tags).toContain('todo');
		});
	});
});

describe('Date Parsing Edge Cases', () => {
	describe('Progressive Date Input', () => {
		it('should handle progressive typing without errors', () => {
			const progression = ['@', '@2', '@20', '@202', '@2024', '@2024-', '@2024-0', '@2024-01'];
			
			progression.forEach(input => {
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
			});
		});

		it('should handle partial date formats', () => {
			const partialDates = [
				'@1',
				'@12', 
				'@123',
				'@2024',
				'@2024-1',
				'@2024-01',
				'@2024-01-1'
			];

			partialDates.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				// Should create task with cleaned text or default text
				expect(result.tasks[0].text).toBeDefined();
			});
		});
	});

	describe('Date Format Validation', () => {
		it('should handle valid date formats', () => {
			const validDates = [
				'@today',
				'@tomorrow', 
				'@yesterday',
				'@2024-01-15',
				'@2024-1-1',
				'@monday',
				'@next'
			];

			validDates.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				const datePattern = result.tasks[0].patterns?.find(p => p.type === 'date');
				expect(datePattern).toBeDefined();
			});
		});

		it('should handle case variations', () => {
			const caseVariations = [
				'@TODAY',
				'@Today',
				'@ToMorrow',
				'@MONDAY'
			];

			caseVariations.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				const datePattern = result.tasks[0].patterns?.find(p => p.type === 'date');
				expect(datePattern).toBeDefined();
			});
		});
	});

	describe('Pattern Edge Cases', () => {
		it('should handle whitespace in patterns', () => {
			const whitespaceTests = [
				'Task @  today',
				'Task #  high',
				'Task [  tag  ]',
				'Task +  user'
			];

			whitespaceTests.forEach(input => {
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
			});
		});

		it('should handle special characters', () => {
			const specialChars = [
				'Task with @ symbol',
				'Task with # hashtag',
				'Email user@domain.com',
				'Price $100'
			];

			specialChars.forEach(input => {
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
			});
		});

		it('should handle unicode characters', () => {
			const unicodeInputs = [
				'Tâche @aujourd\'hui',
				'任务 @今天',
				'Задача @сегодня'
			];

			unicodeInputs.forEach(input => {
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
			});
		});
	});
});

describe('Performance and Memory', () => {
	describe('Large Input Handling', () => {
		it('should handle very long input efficiently', () => {
			const longInput = 'Task '.repeat(1000) + '@today #high [important] +user';
			
			const startTime = performance.now();
			const result = parseTaskInput(longInput);
			const endTime = performance.now();
			
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].patterns).toHaveLength(4);
		});

		it('should handle many patterns efficiently', () => {
			const manyPatterns = Array.from({length: 100}, (_, i) => `[tag${i}]`).join(' ');
			const input = `Task with many patterns ${manyPatterns}`;
			
			const startTime = performance.now();
			const result = parseTaskInput(input);
			const endTime = performance.now();
			
			expect(endTime - startTime).toBeLessThan(500);
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].patterns?.length).toBeGreaterThan(50);
		});
	});

	describe('Memory Management', () => {
		it('should not leak memory with repeated parsing', () => {
			// Run parsing many times to check for memory leaks
			for (let i = 0; i < 1000; i++) {
				parseTaskInput(`Test input ${i} @today #high [tag] +user`);
			}
			
			// If we reach here without running out of memory, test passes
			expect(true).toBe(true);
		});

		it('should handle rapid succession calls', () => {
			const inputs = Array.from({length: 100}, (_, i) => 
				`Task ${i} @today #high [tag${i}] +user${i}`
			);
			
			const startTime = performance.now();
			
			inputs.forEach(input => {
				parseTaskInput(input);
			});
			
			const endTime = performance.now();
			const averageTime = (endTime - startTime) / inputs.length;
			
			// Each parse should be very fast
			expect(averageTime).toBeLessThan(5); // Less than 5ms per parse
		});
	});
});