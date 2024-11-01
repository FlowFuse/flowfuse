import { AdjustmentsIcon } from '@heroicons/vue/outline'

import ensureAdmin from '../../utils/ensureAdmin.js'

import PlatformAuditLog from './AuditLog.vue'
import AdminFlowBlueprints from './FlowBlueprints/index.vue'
import AdminInstanceTypes from './InstanceTypes/index.vue'
import AdminOverview from './Overview.vue'
import AdminSettingsEmail from './Settings/Email.vue'
import AdminSettingsGeneral from './Settings/General.vue'
import AdminSettingsLicense from './Settings/License.vue'
import AdminSettingsSSOEdit from './Settings/SSO/createEditProvider.vue'
import AdminSettingsSSO from './Settings/SSO/index.vue'
import AdminSettings from './Settings/index.vue'
import AdminStacks from './Stacks/index.vue'
import AdminTeamTypes from './TeamTypes/index.vue'
import AdminTeams from './Teams.vue'
import AdminTemplatePalette from './Template/Palette.vue'
import AdminTemplateSettings from './Template/Settings.vue'
import AdminTemplate from './Template/index.vue'
import AdminTemplateAlerts from './Template/sections/Alerts.vue'
import AdminTemplateEnvironment from './Template/sections/Environment.vue'
import AdminTemplateSecurity from './Template/sections/Security.vue'
import AdminTemplates from './Templates/index.vue'
import AdminUsersGeneral from './Users/General.vue'
import AdminUsersInvitations from './Users/Invitations.vue'
import AdminUserDetails from './Users/UserDetails.vue'
import AdminCreateUser from './Users/createUser.vue'
import AdminUsers from './Users/index.vue'

import Admin from './index.vue'

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
        path: '/admin/settings/sso/:id',
        name: 'AdminSettingsSSOEdit',
        beforeEnter: ensureAdmin,
        component: AdminSettingsSSOEdit,
        meta: {
            title: 'Admin - Settings - SSO Configuration'
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
            title: 'Admin - Overview',
            menu: 'admin'
        },
        children: [
            { name: 'admin-overview', path: 'overview', component: AdminOverview },
            {
                name: 'admin-settings',
                path: 'settings',
                component: AdminSettings,
                meta: {
                    title: 'Admin - Settings'
                },
                redirect: '/admin/settings/general',
                children: [
                    { name: 'admin-settings-general', path: 'general', component: AdminSettingsGeneral },
                    { name: 'admin-settings-license', path: 'license', component: AdminSettingsLicense },
                    { name: 'admin-settings-email', path: 'email', component: AdminSettingsEmail },
                    { name: 'AdminSettingsSSO', path: 'sso', component: AdminSettingsSSO }
                ]
            },
            {
                name: 'admin-users',
                path: 'users',
                component: AdminUsers,
                meta: {
                    title: 'Admin - Users'
                },
                redirect: '/admin/users/general',
                children: [
                    { name: 'admin-users-general', path: 'general', component: AdminUsersGeneral },
                    { name: 'admin-users-invitations', path: 'invitations', component: AdminUsersInvitations },
                    {
                        name: 'admin-users-user',
                        path: ':id',
                        component: AdminUserDetails,
                        meta: {
                            title: 'Admin - User'
                        }
                    }
                ]
            },

            {
                name: 'admin-teams',
                path: 'teams',
                component: AdminTeams,
                meta: {
                    title: 'Admin - Teams'
                }
            },
            {
                name: 'admin-team-types',
                path: 'team-types',
                component: AdminTeamTypes,
                meta: {
                    title: 'Admin - Team Types'
                }
            },
            {
                name: 'admin-instance-types',
                path: 'instance-types',
                component: AdminInstanceTypes,
                meta: {
                    title: 'Admin - Instance Types'
                }
            },
            {
                name: 'admin-stacks',
                path: 'stacks',
                component: AdminStacks,
                meta: {
                    title: 'Admin - Stacks'
                }
            },
            {
                name: 'admin-templates',
                path: 'templates',
                component: AdminTemplates,
                meta: {
                    title: 'Admin - Templates'
                }
            },
            {
                name: 'admin-templates-template',
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
                    { path: 'security', component: AdminTemplateSecurity },
                    { path: 'environment', component: AdminTemplateEnvironment },
                    { path: 'palette', component: AdminTemplatePalette },
                    { path: 'alerts', component: AdminTemplateAlerts }
                ]
            },
            {
                name: 'admin-flow-blueprints',
                path: 'flow-blueprints',
                component: AdminFlowBlueprints,
                meta: {
                    title: 'Admin - Flow Blueprints'
                }
            },
            {
                name: 'admin-audit-logs',
                path: 'audit-log',
                component: PlatformAuditLog,
                meta: {
                    title: 'Admin - Logs'
                }
            }
        ]
    }
]
