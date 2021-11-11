import Admin from "@/pages/admin/index.vue"
import AdminSettings from "@/pages/admin/Settings.vue"
import AdminUsers from "@/pages/admin/Users.vue"
import AdminTeams from "@/pages/admin/Teams.vue"
import AdminCreateUser from "@/pages/admin/createUser.vue"

import { AdjustmentsIcon } from '@heroicons/vue/outline'

import ensureAdmin from "@/utils/ensureAdmin"

export default [
    {
        path: '/admin/users/create',
        beforeEnter: ensureAdmin,
        name: 'AdminCreateUser',
        component: AdminCreateUser
    },
    {
        path: '/admin/',
        profileLink: true,
        adminOnly: true,
        beforeEnter: ensureAdmin,
        redirect: '/admin/settings',
        name: 'Admin',
        icon: AdjustmentsIcon,
        component: Admin,
        children: [
            { path: 'settings', component: AdminSettings },
            { path: 'users', component: AdminUsers },
            { path: 'teams', component: AdminTeams }
        ],
    },
]
