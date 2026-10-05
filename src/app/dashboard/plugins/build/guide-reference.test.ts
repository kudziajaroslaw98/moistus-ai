/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIMIT_ROWS, UI_CALLS } from './guide-reference';

describe('build guide reference', () => {
	it('documents every view piece the runtime accepts', () => {
		const source = readFileSync(join(process.cwd(), 'src/lib/plugins/ui-tree.ts'), 'utf8');
		const schemaTypes = [...source.matchAll(/type: z\.literal\('([a-z]+)'\)/g)].map(
			(match) => match[1]
		);

		expect(schemaTypes.length).toBeGreaterThan(0);
		expect(UI_CALLS.map((call) => call.type).sort()).toEqual([...schemaTypes].sort());
	});

	it('shows the limits the sandbox enforces', () => {
		expect(LIMIT_ROWS).toEqual(
			expect.arrayContaining([
				{ name: 'plugin.js', description: '256 KB' },
				{ name: 'Memory', description: '16 MB per plugin' },
				{ name: 'render', description: '50 ms' },
			])
		);
	});
});
