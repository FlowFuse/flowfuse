import Admin from '@/pages/admin/index.vue'
import AdminOverview from '@/pages/admin/Overview.vue'
import AdminSettings from '@/pages/admin/Settings/index.vue'
import AdminSettingsGeneral from '@/pages/admin/Settings/General.vue'
import AdminSettingsLicense from '@/pages/admin/Settings/License.vue'
import AdminSettingsEmail from '@/pages/admin/Settings/Email.vue'
// import AdminSettingsPermissions from '@/pages/admin/Settings/Permissions.vue'
import AdminUsers from '@/pages/admin/Users/index.vue'
import AdminUsersGeneral from '@/pages/admin/Users/General.vue'
import AdminUsersInvitations from '@/pages/admin/Users/Invitations.vue'
import AdminTeams from '@/pages/admin/Teams.vue'
import AdminProjectTypes from '@/pages/admin/ProjectTypes/index.vue'
import AdminStacks from '@/pages/admin/Stacks/index.vue'
import AdminTemplates from '@/pages/admin/Templates/index.vue'
import AdminTemplate from '@/pages/admin/Template/index.vue'
import AdminTemplateSettings from '@/pages/admin/Template/Settings.vue'
import AdminTemplateEnvironment from '@/pages/admin/Template/sections/Environment.vue'
import AdminTemplatePalette from '@/pages/admin/Template/sections/Palette.vue'
import AdminCreateUser from '@/pages/admin/Users/createUser.vue'
import PlatformAuditLog from '@/pages/admin/AuditLog.vue'
import { AdjustmentsIcon } from '@heroicons/vue/outline'

import ensureAdmin from '@/utils/ensureAdmin'

export default [
    {
        path: '/admin/users/create',
        beforeEnter: ensureAdmin,
        name: 'AdminCreateUser',
        component: AdminCreateUser,
        meta: {
            title: 'Admin - Create User'
        }
    },
    {
        path: '/admin/',
        profileLink: true,
        profileMenuIndex: 50,
        adminOnly: true,
        beforeEnter: ensureAdmin,
        redirect: '/admin/overview',
        name: 'Admin Settings',
        icon: AdjustmentsIcon,
        component: Admin,
        meta: {
            title: 'Admin - Overview'
        },
        children: [
            { path: 'overview', component: AdminOverview },
            {
                path: 'settings',
                component: AdminSettings,
                meta: {
                    title: 'Admin - Settings'
                },
                redirect: '/admin/settings/general',
                children: [
                    { path: 'general', component: AdminSettingsGeneral },
                    // { path: 'permissions', component: AdminSettingsPermissions },
                    { path: 'license', component: AdminSettingsLicense },
                    { path: 'email', component: AdminSettingsEmail }
                ]
            },
            {
                path: 'users',
                component: AdminUsers,
                meta: {
                    title: 'Admin - Users'
                },
                redirect: '/admin/users/general',
                children: [
                    { path: 'general', component: AdminUsersGeneral, name: 'AdminUsersGeneral' },
                    { path: 'invitations', component: AdminUsersInvitations }
                ]
            },
            {
                path: 'teams',
                component: AdminTeams,
                meta: {
                    title: 'Admin - Teams'
                }
            },
            {
                path: 'project-types',
                component: AdminProjectTypes,
                meta: {
                    title: 'Admin - Project Types'
                }
            },
            {
                path: 'stacks',
                component: AdminStacks,
                meta: {
                    title: 'Admin - Stacks'
                }
            },
            {
                name: 'Admin Templates',
                path: 'templates',
                component: AdminTemplates,
                meta: {
                    title: 'Admin - Templates'
                }
            },
            {
                name: 'Admin Template',
                path: 'templates/:id',
                redirect: to => {
                    return `/admin/templates/${to.params.id}/settings`
                },
                component: AdminTemplate,
                meta: {
                    title: 'Admin - Template'
                },
                children: [
                    { path: 'settings', component: AdminTemplateSettings },
                    { path: 'environment', component: AdminTemplateEnvironment },
                    { path: 'palette', component: AdminTemplatePalette }
                ]
            },
            {
                path: 'audit-log',
                component: PlatformAuditLog,
                meta: {
                    title: 'Admin - Logs'
                }
            }
        ]
    }
]
