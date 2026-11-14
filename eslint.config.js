// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Screens go through API services; only app.config.ts and the mock layer wire mocks. */
const NO_MOCKS = {
  group: ['**/mocks/**', '@mocks/*'],
  message: 'Components must not import mocks; go through an API service.',
};
/** Cross-area imports use the @core/@shared/@layout/@features aliases. */
const NO_DEEP_RELATIVE = {
  group: ['../../../*'],
  message: 'Use an alias (@core/*, @shared/*, @layout/*, @features/*) instead of ../../../',
};

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', { patterns: [NO_MOCKS, NO_DEEP_RELATIVE] }],
    },
  },
  {
    // A feature never imports another feature: shared code goes up to shared/ or core/.
    files: ['src/app/features/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_MOCKS,
            NO_DEEP_RELATIVE,
            {
              group: ['@features/*'],
              message: 'A feature must not import another feature; move shared code to shared/.',
            },
          ],
        },
      ],
    },
  },
  {
    // core/ and shared/ sit below layout/ and features/.
    files: ['src/app/core/**/*.ts', 'src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_MOCKS,
            NO_DEEP_RELATIVE,
            {
              group: ['@features/*', '@layout/*'],
              message: 'core/ and shared/ must not depend on layout/ or features/.',
            },
          ],
        },
      ],
    },
  },
  {
    // core/ is the bottom layer: no UI from shared/.
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_MOCKS,
            NO_DEEP_RELATIVE,
            {
              group: ['@features/*', '@layout/*', '@shared/*'],
              message: 'core/ must not depend on shared/, layout/ or features/.',
            },
          ],
        },
      ],
    },
  },
  {
    // The mock layer and app bootstrap are the only places allowed to wire mocks.
    files: ['src/app/mocks/**/*.ts', 'src/app/app.config.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_DEEP_RELATIVE] }] },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
