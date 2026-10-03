import stylistic from '@stylistic/eslint-plugin';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
	...nextVitals,
	...nextTypescript,
	{
		ignores: [
			'.next/**',
			'.worktrees/**',
			'node_modules/**',
			'next-env.d.ts',
			'globals.css',
			// Vendored third-party worker bundle (elkjs), synced from node_modules
			'public/elk-worker.min.js',
		],
	},
	{
		settings: {
			react: {
				version: '19.3',
			},
		},
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	stylistic.configs['disable-legacy'],
	{
		files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'@stylistic/jsx-newline': ['error', { prevent: false }],
			'@stylistic/lines-between-class-members': ['error', 'always'],
			'@stylistic/rest-spread-spacing': ['error', 'never'],
			'@stylistic/jsx-first-prop-new-line': ['error', 'multiline'],
			'@stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
			'@stylistic/jsx-sort-props': [
				'error',
				{
					noSortAlphabetically: true,
					shorthandFirst: true,
					multiline: 'last',
					ignoreCase: true,
				},
			],
		},
	},
	{
		files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
		rules: {
			'@stylistic/jsx-newline': 'off',
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
];

export default eslintConfig;
