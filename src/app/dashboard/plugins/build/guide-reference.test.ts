/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pluginFieldSpecSchema } from '@/lib/plugins/manifest-schema';
import { FIELD_TYPE_ROWS, LIMIT_ROWS, UI_CALLS } from './guide-reference';

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
				{
					name: 'Requests',
					description: 'Only in refresh: 4 per refresh, each answer up to 256 KB and 10 s',
				},
			])
		);
	});
});

describe('build guide field types', () => {
	it('documents every field type a manifest can use', () => {
		const types = pluginFieldSpecSchema.options.flatMap((option) => {
			const type = option.shape.type;
			return 'options' in type ? [...type.options] : [type.value];
		});

		const documented = FIELD_TYPE_ROWS.flatMap((row) => row.name.split(', '));
		expect(documented.sort()).toEqual([...types].sort());
	});
});
