import { t } from '../../../i18n.js'

import TableExplorer from './Table/TableExplorer/index.vue'
import TableCredentials from './Table/components/TableCredentials.vue'
import TableSqlEditor from './Table/components/TableSqlEditor.vue'
import TeamTable from './Table/index.vue'
import ChooseDatabase from './components/ChooseDatabase.vue'
import CreateDatabase from './components/CreateDatabase.vue'
import TeamTables from './index.vue'

export default [
    {
        name: 'team-tables',
        path: 'tables',
        component: TeamTables,
        meta: {
            title: t('ui.teamTables')
        },
        children: [
            {
                name: 'team-tables-table',
                path: ':id',
                component: TeamTable,
                redirect: { name: 'team-tables-table-explorer' },
                children: [
                    {
                        name: 'team-tables-table-explorer',
                        path: 'explorer',
                        component: TableExplorer
                    },
                    {
                        name: 'team-tables-table-editor',
                        path: 'editor',
                        component: TableSqlEditor
                    },
                    {
                        name: 'team-tables-table-credentials',
                        path: 'credentials',
                        component: TableCredentials
                    }
                ]
            },
            {
                name: 'team-tables-add',
                path: 'add',
                component: ChooseDatabase,
                meta: {
                    title: t('ui.teamAddTable')
                }
            },
            {
                name: 'team-tables-create',
                path: 'create/:type',
                component: CreateDatabase,
                meta: {
                    title: t('ui.teamCreateTable')
                }
            }
        ]
    }
]
