import SchemaCompare from './Schema/Compare.vue'
import SchemaEditor from './Schema/Editor.vue'
import SchemaValidate from './Schema/Validate.vue'
import SchemaVersion from './Schema/Version.vue'
import SchemaVersions from './Schema/Versions.vue'
import TeamSchema from './Schema/index.vue'
import TeamSchemas from './index.vue'

export default [
    {
        path: 'schemas',
        children: [
            {
                name: 'team-schemas',
                path: '',
                component: TeamSchemas,
                meta: {
                    title: 'Team - Schemas'
                }
            },
            {
                name: 'team-schema',
                path: ':schemaId',
                component: TeamSchema,
                redirect: { name: 'team-schema-editor' },
                meta: {
                    title: 'Team - Schema'
                },
                children: [
                    {
                        name: 'team-schema-editor',
                        path: 'editor',
                        component: SchemaEditor
                    },
                    {
                        name: 'team-schema-validate',
                        path: 'validate',
                        component: SchemaValidate
                    },
                    {
                        // one version is a page under the list, which keeps the Versions tab lit while it is open
                        path: 'versions',
                        children: [
                            {
                                name: 'team-schema-versions',
                                path: '',
                                component: SchemaVersions
                            },
                            {
                                name: 'team-schema-compare',
                                path: 'compare',
                                component: SchemaCompare
                            },
                            {
                                name: 'team-schema-version',
                                path: ':version',
                                component: SchemaVersion
                            }
                        ]
                    }
                ]
            }
        ]
    }
]
