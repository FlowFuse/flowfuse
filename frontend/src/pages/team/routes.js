import ensurePermission from '../../utils/ensurePermission.js'
import ApplicationRoutes from '../application/routes.js'

import TeamApplications from './Applications/index.vue'
import TeamAuditLog from './AuditLog.vue'
import TeamBillOfMaterials from './BOM/index.vue'
import TeamBilling from './Billing.vue'
import BrokersRoutes from './Brokers/routes.js'
import DeviceGroups from './DeviceGroups/index.vue'
import TeamDevices from './Devices/index.vue'
import TeamHome from './Home/index.vue'
import TeamInstances from './Instances.vue'
import Library from './Library/index.vue'
import LibraryRoutes from './Library/routes.js'
import TeamMembersMembers from './Members/General.vue'
import TeamMembersInvitations from './Members/Invitations.vue'
import TeamMembers from './Members/index.vue'
import TeamPerformance from './Performance/index.vue'
import TeamPipelines from './Pipelines/index.vue'
import TeamSettingsDanger from './Settings/Danger.vue'
import TeamSettingsDevices from './Settings/Devices.vue'
import TeamSettingsGeneral from './Settings/General.vue'
import TeamSettingsIntegrations from './Settings/Integrations.vue'
import TeamSettings from './Settings/index.vue'
import TablesRoutes from './Tables/routes.js'
import ChangeTeamType from './changeType.vue'
import CreateTeam from './create.vue'
import CreateApplication from './createApplication.vue'
import CreateInstance from './createInstance.vue'

import Team from './index.vue'

export default [
    {
        path: '/team',
        children: [
            {
                path: ':team_slug',
                redirect: { name: 'team-home' },
                name: 'Team',
                component: Team,
                meta: {
                    title: 'Team - Overview'
                },
                children: [
                    ...BrokersRoutes,
                    ...TablesRoutes,
                    {
                        path: 'overview',
                        name: 'team-home',
                        component: TeamHome
                    },
                    {
                        path: 'applications',
                        children: [
                            {
                                name: 'Applications',
                                path: '',
                                component: TeamApplications,
                                meta: {
                                    title: 'Team - Applications'
                                }
                            },
                            {
                                name: 'CreateTeamApplication',
                                path: 'create',
                                component: CreateApplication,
                                meta: {
                                    title: 'Team - Create Application',
                                    menu: 'back'
                                }
                            },
                            ...ApplicationRoutes
                        ]
                    },
                    {
                        path: 'instances',
                        children: [
                            {
                                name: 'Instances',
                                path: '',
                                component: TeamInstances,
                                meta: {
                                    title: 'Team - Instances'
                                }
                            },
                            {
                                name: 'CreateInstance',
                                path: 'create',
                                component: CreateInstance,
                                meta: {
                                    title: 'Team - Create Instance',
                                    menu: {
                                        type: 'back',
                                        backTo: (params) => {
                                            return {
                                                label: 'Back to Instances',
                                                to: { name: 'Instances', params }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    {
                        name: 'TeamDevices',
                        path: 'devices',
                        component: TeamDevices,
                        meta: {
                            title: 'Team - Devices'
                        }
                    },
                    {
                        name: 'TeamLibrary',
                        path: 'library',
                        component: Library,
                        meta: {
                            title: 'Team - Library'
                        },
                        redirect: { name: 'LibraryTeamLibrary' },
                        children: [...LibraryRoutes]
                    },
                    {
                        name: 'team-members',
                        path: 'members',
                        component: TeamMembers,
                        meta: {
                            title: 'Team - Members'
                        },
                        redirect: { name: 'team-members-members' },
                        children: [
                            { name: 'team-members-members', path: 'general', component: TeamMembersMembers },
                            { name: 'team-members-invitations', path: 'invitations', component: TeamMembersInvitations }
                        ]
                    },
                    {
                        name: 'AuditLog',
                        path: 'audit-log',
                        component: TeamAuditLog,
                        meta: {
                            title: 'Team - Audit Log'
                        }
                    },
                    {
                        path: 'settings',
                        children: [
                            {
                                name: 'TeamSettings',
                                path: '',
                                component: TeamSettings,
                                meta: {
                                    title: 'Team - Settings'
                                },
                                redirect: { name: 'team-settings-general' },
                                children: [
                                    { name: 'team-settings-general', path: 'general', component: TeamSettingsGeneral },
                                    { name: 'TeamSettingsDevices', path: 'devices', component: TeamSettingsDevices },
                                    { name: 'team-settings-integrations', path: 'integrations', component: TeamSettingsIntegrations },
                                    { name: 'team-settings-danger', path: 'danger', component: TeamSettingsDanger }

                                ]
                            },
                            {
                                name: 'TeamChangeType',
                                path: 'change-type',
                                component: ChangeTeamType,
                                meta: {
                                    title: 'Team - Change Type'
                                }
                            }
                        ]
                    },
                    {
                        name: 'Billing',
                        path: 'billing',
                        component: TeamBilling,
                        meta: {
                            title: 'Team - Billing'
                        }
                    },
                    {
                        name: 'team-pipelines',
                        path: 'pipelines',
                        component: TeamPipelines,
                        meta: {
                            title: 'Team - DevOps Pipelines'
                        }
                    },
                    {
                        name: 'team-bom',
                        path: 'bill-of-materials',
                        component: TeamBillOfMaterials,
                        meta: {
                            title: 'Team - Bill of Materials'
                        }
                    },
                    {
                        name: 'device-groups',
                        path: 'groups',
                        component: DeviceGroups,
                        meta: {
                            title: 'Team - Groups'
                        }
                    },
                    {
                        name: 'team-performance',
                        path: 'performance',
                        component: TeamPerformance,
                        meta: {
                            title: 'Team - Performance'
                        }
                    }
                ]
            },
            {
                name: 'CreateTeam',
                path: 'create',
                beforeEnter: ensurePermission('team:create'),
                component: CreateTeam,
                meta: {
                    title: 'Create Team',
                    menu: {
                        type: 'back',
                        backTo: ({ team }) => {
                            return {
                                label: 'Back to Dashboard',
                                to: { name: 'Team', params: { team_slug: team?.slug } }
                            }
                        }
                    }
                }
            }
        ]
    },
    {
        path: '/deploy/blueprint',
        component: CreateInstance,
        name: 'DeployBlueprint',
        meta: {
            title: 'Deploy Blueprint'
        }
    }
]
