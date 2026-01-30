import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    js.configs.recommended,
    {
        ignores: ['dist/**', 'node_modules/**', '*.config.js', '*.config.ts'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
        },
        rules: {
            // File and function size rules
            'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
            'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],

            // Function complexity rules
            complexity: ['error', 10],
            'max-params': ['error', 6],
            'max-depth': ['error', 4],

            // Code style
            semi: ['error', 'always'],
            quotes: ['error', 'single'],

            // TypeScript strictness
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/prefer-as-const': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'error',
            'consistent-return': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-var-requires': 'error',

            // Clean code
            'no-unused-vars': 'off',
        },
    },
    {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            'max-lines-per-function': 'off',
        },
    },
];
