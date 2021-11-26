import Admin from "@/pages/admin/index.vue"
import AdminOverview from "@/pages/admin/Overview.vue"
import AdminSettings from "@/pages/admin/Settings/index.vue"
import AdminSettingsGeneral from "@/pages/admin/Settings/General.vue"
import AdminUsers from "@/pages/admin/Users/index.vue"
import AdminUsersGeneral from "@/pages/admin/Users/General.vue"
import AdminUsersInvitations from "@/pages/admin/Users/Invitations.vue"
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
        redirect: '/admin/overview',
        name: 'Admin',
        icon: AdjustmentsIcon,
        component: Admin,
        children: [
            { path: 'overview', component: AdminOverview },
            {
                path: 'settings', component: AdminSettings, redirect: `/admin/settings/general`,
                children: [
                    { path: 'general', component: AdminSettingsGeneral },
                ]
            },
            {
                path: 'users', component: AdminUsers, redirect: `/admin/users/general`,
                children: [
                    { path: 'general', component: AdminUsersGeneral },
                    { path: 'invitations', component: AdminUsersInvitations },
                ]
            },
            { path: 'teams', component: AdminTeams }
        ],
    },
]
