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
            title: 'Team - Tables'
        },
        children: [
            {
                path: ':id',
                name: 'team-tables-table',
                component: TeamTable
            },
            {
                name: 'team-tables-add',
                path: 'add',
                component: ChooseDatabase,
                meta: {
                    title: 'Team - Add Table'
                }
            },
            {
                name: 'team-tables-create',
                path: 'create/:type',
                component: CreateDatabase,
                meta: {
                    title: 'Team - Create Table'
                }
            }
        ]
    }
]
