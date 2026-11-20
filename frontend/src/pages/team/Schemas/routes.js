import SchemaEditor from './Schema/Editor.vue'
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
                        name: 'team-schema-versions',
                        path: 'versions',
                        component: SchemaVersions
                    }
                ]
            }
        ]
    }
]
