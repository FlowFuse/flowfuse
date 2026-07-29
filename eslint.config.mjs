import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import cypressPlugin from 'eslint-plugin-cypress'
import { flatConfigs as importXConfigs } from 'eslint-plugin-import-x'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import vuePlugin from 'eslint-plugin-vue'
import globals from 'globals'
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

export default [
    // ignorePatterns (also honour .gitignore, like the other repos' configs)
    {
        ignores: [
            ...resolveIgnoresFromGitignore(),
            'frontend/dist/',
            'var/',
            '**/*.svg',
            '**/*.xml',
            '**/*.d.ts',
            'frontend/src/types/generated.ts'
        ]
    },

    // extends: standard, plugin:import/recommended, plugin:promise/recommended, plugin:n/recommended
    // neostandard is the flat-config successor to eslint-config-standard and registers
    // (globally) the n and promise plugins plus @stylistic, subsuming the old promise/n
    // recommended extends.
    // NB: neostandard bundled eslint-plugin-import-x through 0.12.2 but DROPPED it in 0.12.7+
    // (and 0.13.x), so plugin:import/recommended is NOT covered by neostandard any more — we
    // register eslint-plugin-import-x explicitly below. Original `import/*` rules map to
    // `import-x/*` (the eslint-plugin-import-x fork neostandard historically used).
    js.configs.recommended,
    ...neostandard(),
    // plugin:import/recommended — registers the `import-x` plugin globally and enables
    // no-unresolved, named, namespace, default, export, no-duplicates, etc.
    importXConfigs.recommended,

    // Root config — env: { es2022: true, commonjs: true }
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.commonjs
            }
        },
        settings: {
            'import-x/core-modules': ['lottie-web-vue', '@heroicons/vue'],
            n: {
                allowModules: [
                    'flowforge-test-utils', // exists at test/node_modules/flowforge-test-utils
                    'promptly',
                    'lottie-web-vue',
                    '@heroicons/vue'
                ]
            }
        },
        plugins: {
            // @stylistic, import-x, n and promise are already registered globally by neostandard
            'no-only-tests': noOnlyTests
        },
        rules: {
            // Inbuilt
            // SwitchCase: 0 matches the old core `indent: ['error', 4]` default
            // (@stylistic/indent defaults SwitchCase to 1); the codebase aligns `case`
            // with `switch`, so without this every switch statement is flagged.
            '@stylistic/indent': ['error', 4, { SwitchCase: 0 }],
            'object-shorthand': ['error'],
            'sort-imports': [
                'error',
                {
                    ignoreDeclarationSort: true
                }
            ],
            'no-console': ['error', { allow: ['debug', 'info', 'warn', 'error'] }],

            // plugin:import (import-x under neostandard)
            'import-x/order': [
                'error',
                {
                    alphabetize: {
                        order: 'asc'
                    },
                    'newlines-between': 'always-and-inside-groups'
                }
            ],
            'import-x/no-unresolved': 'error',

            // plugin:n
            'n/file-extension-in-import': 'error',
            'n/no-missing-import': 'error',
            'n/no-missing-require': 'error',

            // plugin:no-only-tests
            'no-only-tests/no-only-tests': 'error',

            // plugin:promise
            'promise/catch-or-return': ['error', { allowFinally: true }]
        }
    },

    // ESM config/tooling files (e.g. this eslint.config.mjs) — the root block sets
    // sourceType: 'commonjs' for everything, which mis-parses .mjs import/export.
    {
        files: ['**/*.mjs'],
        languageOptions: {
            sourceType: 'module'
        }
    },

    // Frontend runs in the browser and builds with webpack
    // extends: plugin:vue/vue3-recommended
    // Scope every Vue config object to frontend/** — eslint-plugin-vue's flat base
    // config has no `files` key and sets sourceType: 'module' globally, which would
    // otherwise force the CommonJS forge/** backend into module (strict) mode. The
    // original .eslintrc only applied the Vue rules under frontend/**.
    ...vuePlugin.configs['flat/recommended'].map(config => ({
        ...config,
        files: ['frontend/**']
    })),
    {
        files: ['frontend/**/*.js', 'frontend/**/*.vue'],
        languageOptions: {
            sourceType: 'module',
            globals: {
                ...globals.browser
            },
            parserOptions: {
                parser: {
                    ts: tsParser
                }
            }
        },
        rules: {
            // plugin:vue
            'vue/html-indent': ['warn', 4],

            // plugin:vue - style rules
            'vue/max-attributes-per-line': 'off',
            'vue/attribute-hyphenation': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/component-definition-name-casing': 'off',

            // plugin:promise
            'promise/always-return': 'off', // common Vue.js pattern

            // Frontend runs through webpack, not Node — Node-based resolution rules
            // do not understand webpack aliases (@/) or .vue file resolution
            'import-x/no-unresolved': 'off',
            'n/no-missing-import': 'off',
            'n/no-missing-require': 'off',
            // webpack resolves extensions, not Node; frontend import style is deliberately
            // mixed (some with .js, some bare) so don't enforce Node's extension rule here
            'n/file-extension-in-import': 'off'
        }
    },

    // TypeScript files in the frontend — must come after the Vue/frontend block so
    // @typescript-eslint/parser wins for .ts files (later configs take precedence)
    // extends: plugin:@typescript-eslint/recommended
    {
        files: ['frontend/src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            sourceType: 'module',
            globals: {
                ...globals.browser
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            ...tsPlugin.configs['eslint-recommended'].overrides?.[0]?.rules,
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'warn',
            'import-x/no-unresolved': 'off',
            'n/no-missing-import': 'off',
            'n/no-missing-require': 'off',
            // webpack/ts resolve extensions, not Node; .ts files were never linted by the
            // v8 lint script (its globs omitted *.ts), so this Node rule shouldn't apply here
            'n/file-extension-in-import': 'off'
        }
    },

    // UI components use kebab-case
    {
        files: ['frontend/src/ui-components/**'],
        rules: {
            'vue/component-definition-name-casing': ['error', 'kebab-case'],
            'vue/first-attribute-linebreak': 'off',
            'vue/html-self-closing': 'off'
        }
    },

    // System, unit, and E2E tests run using Mocha
    {
        files: ['test/**'],
        languageOptions: {
            globals: {
                ...globals.mocha
            }
        }
    },

    // Cypress is used for E2E
    // extends: eslint-plugin-cypress recommended (v6 — flat config is the package's main
    // entry; the deprecated `/flat` subpath was removed in v6)
    // Keep ecmaVersion pinned to 2022 (matches the root parserOptions.ecmaVersion) so modern
    // syntax parses. v6's recommended no longer pins ecmaVersion, but this stays defensive.
    {
        files: ['test/e2e/**'],
        plugins: cypressPlugin.configs.recommended.plugins,
        languageOptions: {
            ...cypressPlugin.configs.recommended.languageOptions,
            ecmaVersion: 2022
        },
        rules: {
            ...cypressPlugin.configs.recommended.rules,

            // plugin:cypress
            'cypress/require-data-selectors': 'warn',
            'cypress/assertion-before-screenshot': 'error',
            'cypress/no-force': 'warn',
            'cypress/no-pause': 'error',

            // plugin:promise
            'promise/always-return': 'off',
            'promise/catch-or-return': 'off'
        }
    },

    // Front end tests are modules and run in jsdom (browser globals available)
    {
        files: ['test/unit/frontend/**', 'test/e2e/frontend/**'],
        languageOptions: {
            sourceType: 'module',
            globals: {
                ...globals.browser
            }
        }
    },

    // Ignore unresolved @ imports and Node import errors only for test stores files, has issues with aliases
    {
        files: ['test/unit/frontend/stores/**/*'],
        rules: {
            'import-x/no-unresolved': [2, { ignore: ['^@/'] }],
            'n/no-missing-import': 'off'
        }
    },

    // ==========================================================================
    // Auto-generated rule overrides for old files that fail on newly introduced rules
    // ==========================================================================
    {
        files: [
            'test/e2e/frontend/cypress/tests/admin.spec.js',
            'test/e2e/frontend/cypress/tests/admin/instance-types.spec.js',
            'test/e2e/frontend/cypress/tests/admin/stacks.spec.js',
            'test/e2e/frontend/cypress/tests/admin/templates.spec.js',
            'test/e2e/frontend/cypress/tests/applications.spec.js',
            'test/e2e/frontend/cypress/tests/auth.spec.js',
            'test/e2e/frontend/cypress/tests/devices.spec.js',
            'test/e2e/frontend/cypress/tests/instances.spec.js',
            'test/e2e/frontend/cypress/tests/instances/devices.spec.js',
            'test/e2e/frontend/cypress/tests/instances/snapshots.spec.js',
            'test/e2e/frontend/cypress/tests/instances/staging.spec.js',
            'test/e2e/frontend/cypress/tests/invitations.spec.js',
            'test/e2e/frontend/cypress/tests/team/team.spec.js',
            'test/e2e/frontend/cypress/tests/team/audit-log.spec.js',
            'test/e2e/frontend/cypress/tests/team/team-membership.spec.js',
            'test/e2e/frontend/cypress/tests/terms-and-conditions.spec.js'
        ],
        rules: {
            'cypress/require-data-selectors': 'off'
        }
    },
    {
        files: [
            'frontend/src/pages/instance/Overview.vue'
        ],
        rules: {
            'promise/catch-or-return': 'off'
        }
    },
    {
        files: [
            'frontend/src/components/auth/UpdateExpiredPassword.vue',
            'frontend/src/components/FormRow.vue',
            'frontend/src/components/NavItem.vue',
            'frontend/src/components/PageHeader.vue',
            'frontend/src/components/SectionTopMenu.vue',
            'frontend/src/components/TeamSelection.vue',
            'frontend/src/pages/device/Overview.vue',
            'frontend/src/pages/device/Settings/Danger.vue',
            'frontend/src/pages/device/Settings/dialogs/ConfirmDeviceDeleteDialog.vue',
            'frontend/src/pages/device/Settings/Environment.vue',
            'frontend/src/pages/device/Settings/General.vue',
            'frontend/src/pages/team/components/MemberSummaryList.vue',
            'frontend/src/pages/team/components/ProjectSummaryList.vue',
            'frontend/src/pages/team/Devices/dialogs/CreateProvisioningTokenDialog.vue'
        ],
        rules: {
            'vue/attributes-order': 'off'
        }
    },
    {
        files: [
            'frontend/src/components/Accordion.vue',
            'frontend/src/components/CodePreviewer.vue',
            'frontend/src/components/Loading.vue',
            'frontend/src/layouts/Box.vue',
            'frontend/src/layouts/Platform.vue',
            'frontend/src/main.js'
        ],
        rules: {
            'vue/component-definition-name-casing': 'off'
        }
    },
    {
        files: [
            'frontend/src/components/audit-log/AuditEntry.vue',
            'frontend/src/components/audit-log/AuditEntryIcon.vue',
            'frontend/src/components/audit-log/AuditEntryVerbose.vue',
            'frontend/src/components/audit-log/AuditLog.vue',
            'frontend/src/components/auth/UpdateExpiredPassword.vue',
            'frontend/src/components/DropdownMenu.vue',
            'frontend/src/components/FormRow.vue',
            'frontend/src/components/PageHeader.vue',
            'frontend/src/components/SectionTopMenu.vue',
            'frontend/src/components/tables/cells/InviteUserCell.vue',
            'frontend/src/components/TeamSelection.vue',
            'frontend/src/pages/device/components/DeviceLastSeenBadge.vue',
            'frontend/src/pages/device/Overview.vue',
            'frontend/src/pages/device/Settings/Danger.vue',
            'frontend/src/pages/device/Settings/dialogs/ConfirmDeviceDeleteDialog.vue',
            'frontend/src/pages/device/Settings/Environment.vue',
            'frontend/src/pages/device/Settings/General.vue',
            'frontend/src/pages/device/Settings/index.vue',
            'frontend/src/pages/team/components/LibraryEntryTypeIcon.vue',
            'frontend/src/pages/team/components/MemberSummaryList.vue',
            'frontend/src/pages/team/components/ProjectSummaryList.vue',
            'frontend/src/pages/team/components/TeamUserEditButton.vue',
            'frontend/src/pages/team/create.vue',
            'frontend/src/pages/team/Devices/dialogs/CreateProvisioningTokenDialog.vue',
            'frontend/src/pages/team/Devices/dialogs/DeviceCredentialsDialog.vue',
            'frontend/src/pages/team/Devices/dialogs/ProvisioningCredentialsDialog.vue',
            'frontend/src/pages/team/dialogs/ChangeTeamRoleDialog.vue',
            'frontend/src/pages/team/dialogs/ConfirmTeamDeleteDialog.vue',
            'frontend/src/pages/team/dialogs/ConfirmTeamUserRemoveDialog.vue'
        ],
        rules: {
            'vue/order-in-components': 'off'
        }
    },
    {
        files: [
            'frontend/src/components/DropdownMenu.vue',
            'frontend/src/components/FormRow.vue',
            'frontend/src/components/SectionSideMenu.vue',
            'frontend/src/components/SideNavigation.vue',
            'frontend/src/components/tables/cells/InviteUserCell.vue',
            'frontend/src/components/tables/cells/TeamCell.vue',
            'frontend/src/components/tables/cells/TeamTypeCell.vue',
            'frontend/src/components/tables/cells/UserCell.vue',
            'frontend/src/components/tables/cells/UserRoleCell.vue',
            'frontend/src/pages/application/Debug.vue',
            'frontend/src/pages/device/components/DeviceLastSeenBadge.vue',
            'frontend/src/pages/device/Overview.vue',
            'frontend/src/pages/device/Settings/Danger.vue',
            'frontend/src/pages/device/Settings/Environment.vue',
            'frontend/src/pages/device/Settings/General.vue',
            'frontend/src/pages/device/Settings/index.vue',
            'frontend/src/pages/instance/components/ExportInstanceComponents.vue',
            'frontend/src/pages/instance/components/ImportInstanceComponents.vue',
            'frontend/src/pages/team/components/MemberSummaryList.vue',
            'frontend/src/pages/team/components/ProjectSummaryList.vue',
            'frontend/src/pages/team/components/ProjectTypeSummary.vue',
            'frontend/src/pages/team/components/TeamUserEditButton.vue',
            'frontend/src/pages/team/Devices/dialogs/CreateProvisioningTokenDialog.vue',
            'frontend/src/pages/team/Devices/dialogs/DeviceCredentialsDialog.vue',
            'frontend/src/pages/team/Devices/dialogs/ProvisioningCredentialsDialog.vue'
        ],
        rules: {
            'vue/require-prop-types': 'off'
        }
    }
]
