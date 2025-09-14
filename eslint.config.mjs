import { FlatCompat } from '@eslint/eslintrc';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript'),
	{
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			'padding-line-between-statements': [
				'warn',
				{ blankLine: 'always', prev: '*', next: 'block' },
				{ blankLine: 'always', prev: 'block', next: '*' },
				{ blankLine: 'always', prev: '*', next: 'block-like' },
				{ blankLine: 'always', prev: 'block-like', next: '*' },
			],
		},
	},
	{
		files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
		plugins: {
			react: reactPlugin,
		},
		rules: {
			...reactPlugin.configs.flat.recommended.rules,
			'react-hooks/exhaustive-deps': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/jsx-filename-extension': [
				1,
				{ extensions: ['.js', '.jsx', '.tsx', '.ts'] },
			],
			'react/jsx-newline': 'warn',
			'react/hook-use-state': 'warn',
			'no-unused-vars': ['warn', { args: 'none' }],
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
		languageOptions: {
			...reactPlugin.configs.flat.recommended.languageOptions,
			globals: {
				...globals.serviceworker,
				...globals.browser,
			},
		},
	},
];

export default eslintConfig;
