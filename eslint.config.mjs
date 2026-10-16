// @ts-check
import prettierConfig from 'eslint-config-prettier'
import promisePlugin from 'eslint-plugin-promise'
import sonarjs from 'eslint-plugin-sonarjs'
import vuePlugin from 'eslint-plugin-vue'
// @ts-ignore - Type definitions issue with flat config
import vuejsAccessibility from 'eslint-plugin-vuejs-accessibility'

import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // =============================================================================
  // IGNORE PATTERNS - Files to skip linting
  // =============================================================================
  {
    ignores: ['app/components/ui/**', '.nuxt-test/**', '.mail-outbox/**'],
  },

  // =============================================================================
  // SONARJS - Code quality and bug detection
  // =============================================================================
  sonarjs.configs.recommended,

  // =============================================================================
  // VUE CONFIGURATION
  // =============================================================================
  {
    files: ['**/*.vue'],
    plugins: {
      vue: vuePlugin,
    },
    processor: vuePlugin.processors['.vue'],
    rules: {
      // Vue component structure
      'vue/multi-word-component-names': 'off',
      'vue/block-order': [
        'error',
        {
          order: ['template', 'script', 'style'],
        },
      ],
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts',
          },
        },
      ],
      'vue/attributes-order': [
        'error',
        {
          order: [
            'DEFINITION',
            'LIST_RENDERING',
            'CONDITIONALS',
            'RENDER_MODIFIERS',
            'GLOBAL',
            ['UNIQUE', 'SLOT'],
            'TWO_WAY_BINDING',
            'OTHER_DIRECTIVES',
            'OTHER_ATTR',
            'EVENTS',
            'CONTENT',
          ],
          alphabetical: false,
        },
      ],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineProps', 'defineEmits'],
        },
      ],

      // Vue component rules
      'vue/require-default-prop': 'error',
      'vue/require-prop-types': 'error',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/custom-event-name-casing': ['error', 'camelCase'],
      'vue/no-v-html': 'warn',
      'vue/require-v-for-key': 'error',
      'vue/no-unused-vars': 'error',
      'vue/v-slot-style': ['error', 'shorthand'],
      'vue/prefer-template': 'error',

      // Vue formatting
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: 3,
          multiline: 1,
        },
      ],
      'vue/first-attribute-linebreak': [
        'error',
        {
          singleline: 'ignore',
          multiline: 'below',
        },
      ],
      'vue/html-indent': ['error', 2],
      'vue/html-closing-bracket-newline': [
        'error',
        {
          singleline: 'never',
          multiline: 'always',
        },
      ],
    },
  },

  // =============================================================================
  // ACCESSIBILITY
  // =============================================================================
  {
    plugins: {
      'vuejs-accessibility': vuejsAccessibility,
    },
    rules: {
      'vuejs-accessibility/alt-text': 'error',
      'vuejs-accessibility/anchor-has-content': 'error',
      'vuejs-accessibility/click-events-have-key-events': 'error',
      'vuejs-accessibility/form-control-has-label': 'error',
      'vuejs-accessibility/heading-has-content': 'error',
      'vuejs-accessibility/iframe-has-title': 'error',
      'vuejs-accessibility/interactive-supports-focus': 'error',
      'vuejs-accessibility/label-has-for': 'error',
      'vuejs-accessibility/media-has-caption': 'error',
      'vuejs-accessibility/mouse-events-have-key-events': 'error',
      'vuejs-accessibility/no-access-key': 'error',
      'vuejs-accessibility/no-autofocus': 'error',
      'vuejs-accessibility/no-distracting-elements': 'error',
      'vuejs-accessibility/no-onchange': 'error',
      'vuejs-accessibility/no-redundant-roles': 'error',
      'vuejs-accessibility/role-has-required-aria-props': 'error',
      'vuejs-accessibility/tabindex-no-positive': 'error',
    },
  },

  // =============================================================================
  // PROMISES
  // =============================================================================
  // @ts-ignore - Type definitions issue with flat config
  promisePlugin.configs['flat/recommended'],

  // =============================================================================
  // TYPESCRIPT
  // =============================================================================
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      // Type safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-shadow': 'error',

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
      ],
    },
  },

  // =============================================================================
  // CLEAN CODE RULES
  // =============================================================================
  {
    rules: {
      // Trailing commas (virgules finales)
      'comma-dangle': ['error', 'always-multiline'],

      // File and function size limits
      'max-lines': ['error', { max: 350, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 3],
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 3],
      complexity: ['warn', 15],

      // Code quality
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-useless-return': 'error',
      'no-unreachable': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-shadow': 'off', // Use @typescript-eslint/no-shadow instead

      // Function quality - Force arrow functions only
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],

      // Import organization
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // Nuxt auto-imports
      'import/named': 'off', // Nuxt auto-imports

      // Console and debugging
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-alert': 'error',

      // Code clarity
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-param-reassign': ['error', { props: false }],

      // Performance
      'no-await-in-loop': 'warn',
    },
  },

  // =============================================================================
  // CONFIG FILES EXCEPTIONS
  // =============================================================================
  {
    files: ['*.config.{js,ts,mjs,cjs}', '*.config.*.{js,ts,mjs,cjs}'],
    rules: {
      'no-magic-numbers': 'off',
      'no-console': 'off',
    },
  },

  // =============================================================================
  // PRETTIER INTEGRATION (must be last to disable conflicting ESLint rules)
  // =============================================================================
  prettierConfig,
)
