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
                    {
                        name: 'admin-settings-sso',
                        path: 'sso',
                        redirect: { name: 'admin-settings-sso-list' },
                        children: [
                            { name: 'admin-settings-sso-list', path: 'list', component: AdminSettingsSSO }
                        ]
                    }
                ]
            },
            {
                path: '/admin/settings/sso/:id',
                name: 'admin-settings-sso-edit',
                component: AdminSettingsSSOEdit,
                meta: {
                    title: 'Admin - Settings - SSO Configuration',
                    menu: {
                        type: 'back',
                        backTo: {
                            label: 'Back to SSO',
                            to: { name: 'admin-settings-sso' }
                        }
                    }
                }
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
                    { name: 'admin-users-invitations', path: 'invitations', component: AdminUsersInvitations }
                ]
            },
            {
                name: 'admin-users-create',
                path: 'users/create',
                component: AdminCreateUser,
                meta: {
                    title: 'Admin - Create User',
                    menu: {
                        type: 'back',
                        backTo: {
                            label: 'Back to Users',
                            to: { name: 'admin-users' }
                        }
                    }
                }
            },
            {
                name: 'admin-users-user',
                path: 'users/:id',
                component: AdminUserDetails,
                meta: {
                    title: 'Admin - User',
                    menu: {
                        type: 'back',
                        backTo: {
                            label: 'Back to Users',
                            to: { name: 'admin-users' }
                        }
                    }
                }
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
                redirect: { name: 'admin-templates-list' },
                meta: {
                    title: 'Admin - Templates'
                },
                children: [
                    {
                        name: 'admin-templates-list',
                        path: 'list',
                        component: AdminTemplates
                    },
                    {
                        name: 'admin-templates-template',
                        path: ':id',
                        redirect: { name: 'admin-templates-template-settings' },
                        component: AdminTemplate,
                        meta: {
                            title: 'Admin - Template',
                            menu: {
                                type: 'back',
                                backTo: {
                                    label: 'Back to Templates',
                                    to: { name: 'admin-templates-list' }
                                }
                            }
                        },
                        children: [
                            { name: 'admin-templates-template-settings', path: 'settings', component: AdminTemplateSettings },
                            { name: 'admin-templates-template-security', path: 'security', component: AdminTemplateSecurity },
                            { name: 'admin-templates-template-environment', path: 'environment', component: AdminTemplateEnvironment },
                            { name: 'admin-templates-template-palette', path: 'palette', component: AdminTemplatePalette },
                            { name: 'admin-templates-template-alerts', path: 'alerts', component: AdminTemplateAlerts }
                        ]
                    }
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
