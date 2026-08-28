import teamApi from '../../api/team.js'
import { t } from '../../i18n.js'
import ensurePermission from '../../utils/ensurePermission.js'
import ApplicationRoutes from '../application/routes.js'

import TeamApplications from './Applications/index.vue'
import TeamAuditLog from './AuditLog.vue'
import TeamBillOfMaterials from './BOM/index.vue'
import TeamBilling from './Billing/index.vue'
import BrokersRoutes from './Brokers/routes.js'
import TeamDashboards from './Dashboards/index.vue'

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
import RegisterDevice from './registerDevice.vue'

import DashboardViewer from '@/components/dashboard/DashboardViewer.vue'

export default [
    {
        path: '/team',
        children: [
            {
                path: ':team_slug',
                redirect: { name: 'team-home' },
                name: 'team',
                component: Team,
                meta: {
                    title: t('ui.teamOverview')
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
                        name: 'team-dashboards',
                        path: 'dashboards',
                        component: TeamDashboards,
                        meta: {
                            title: t('ui.teamDashboards')
                        }
                    },
                    {
                        path: 'applications',
                        children: [
                            {
                                name: 'team-applications',
                                path: '',
                                component: TeamApplications,
                                meta: {
                                    title: t('ui.teamApplications')
                                }
                            },
                            {
                                name: 'team-application-create',
                                path: 'create',
                                component: CreateApplication,
                                meta: {
                                    title: t('ui.teamCreateApplication'),
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
                                name: 'team-hosted-instances',
                                path: '',
                                component: TeamInstances,
                                meta: {
                                    title: t('ui.teamInstances')
                                }
                            },
                            {
                                name: 'team-instance-create',
                                path: 'create',
                                component: CreateInstance,
                                meta: {
                                    title: t('ui.teamCreateInstance'),
                                    menu: {
                                        type: 'back',
                                        backTo: (params) => {
                                            return {
                                                label: t('ui.backToInstances'),
                                                to: { name: 'team-hosted-instances', params }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    {
                        name: 'team-remote-instances',
                        path: 'devices',
                        component: TeamDevices,
                        meta: {
                            title: t('ui.teamDevices')
                        }
                    },
                    {
                        name: 'team-library',
                        path: 'library',
                        component: Library,
                        meta: {
                            title: t('ui.teamLibrary2')
                        },
                        redirect: { name: 'team-library-files' },
                        children: [...LibraryRoutes]
                    },
                    {
                        name: 'team-members',
                        path: 'members',
                        component: TeamMembers,
                        meta: {
                            title: t('ui.teamMembers')
                        },
                        redirect: { name: 'team-members-members' },
                        children: [
                            { name: 'team-members-members', path: 'general', component: TeamMembersMembers },
                            { name: 'team-members-invitations', path: 'invitations', component: TeamMembersInvitations }
                        ]
                    },
                    {
                        name: 'team-audit-log',
                        path: 'audit-log',
                        component: TeamAuditLog,
                        meta: {
                            title: t('ui.teamAuditLog')
                        }
                    },
                    {
                        path: 'settings',
                        children: [
                            {
                                name: 'team-settings',
                                path: '',
                                component: TeamSettings,
                                meta: {
                                    title: t('ui.teamSettings')
                                },
                                redirect: { name: 'team-settings-general' },
                                children: [
                                    { name: 'team-settings-general', path: 'general', component: TeamSettingsGeneral },
                                    { name: 'team-settings-devices', path: 'devices', component: TeamSettingsDevices },
                                    { name: 'team-settings-integrations', path: 'integrations', component: TeamSettingsIntegrations },
                                    { name: 'team-settings-danger', path: 'danger', component: TeamSettingsDanger }

                                ]
                            },
                            {
                                name: 'team-change-type',
                                path: 'change-type',
                                component: ChangeTeamType,
                                meta: {
                                    title: t('ui.teamChangeType')
                                }
                            }
                        ]
                    },
                    {
                        name: 'team-billing',
                        path: 'billing',
                        component: TeamBilling,
                        meta: {
                            title: t('ui.teamBilling2')
                        }
                    },
                    {
                        name: 'team-pipelines',
                        path: 'pipelines',
                        component: TeamPipelines,
                        meta: {
                            title: t('ui.teamDevopsPipelines')
                        }
                    },
                    {
                        name: 'team-bom',
                        path: 'bill-of-materials',
                        component: TeamBillOfMaterials,
                        meta: {
                            title: t('ui.teamBillOfMaterials')
                        }
                    },
                    {
                        name: 'device-groups',
                        path: 'groups',
                        component: DeviceGroups,
                        meta: {
                            title: t('ui.teamGroups')
                        }
                    },
                    {
                        name: 'team-performance',
                        path: 'performance',
                        component: TeamPerformance,
                        meta: {
                            title: t('ui.teamPerformance')
                        }
                    }
                ]
            },
            {
                name: 'team-create',
                path: 'create',
                beforeEnter: ensurePermission('team:create'),
                component: CreateTeam,
                meta: {
                    title: t('ui.createTeam2'),
                    menu: {
                        type: 'back',
                        backTo: ({ team }) => {
                            return {
                                label: t('ui.backToDashboard'),
                                to: { name: 'team', params: { team_slug: team?.slug } }
                            }
                        }
                    }
                }
            }
        ]
    },
    {
        path: '/register/remote-instance/:sessionToken',
        component: RegisterDevice,
        name: 'register-device',
        meta: {
            title: t('ui.registerRemoteInstance'),
            layout: 'plain'
        }
    },
    {
        name: 'team-dashboards-view',
        path: '/team/:team_slug/dashboards/:instanceId',
        component: DashboardViewer,
        meta: {
            title: t('ui.teamDashboards'),
            layout: 'immersive',
            scope: 'team'
        }
    },
    {
        name: 'application-dashboards-view',
        path: '/team/:team_slug/applications/:id/dashboards/:instanceId',
        component: DashboardViewer,
        meta: {
            title: t('ui.applicationDashboards'),
            layout: 'immersive',
            scope: 'application'
        }
    },
    {
        path: '/deploy/blueprint',
        component: CreateInstance,
        name: 'deploy-blueprint',
        meta: {
            title: t('ui.deployBlueprint'),
            menu: {
                type: 'back',
                backTo: ({ team }) => {
                    return {
                        label: t('ui.backToDashboard'),
                        to: { name: 'team', params: { team_slug: team?.slug } }
                    }
                }
            }
        }
    },
    {
        name: 'team-by-id-brokers-clients',
        path: '/team-by-id/:teamid/brokers/:brokerId/client',
        beforeEnter: async function (to, from, next) {
            // Since instance/device settings have no awareness of the team slug (only the team ID),
            // this route provides a means of redirecting the user to the correct team broker clients page
            // when by way of a separate frontend route that understands the route is explicitly using a teamId
            // not a slug and can therefore redirect appropriately. For reference, this hyperlink is on the edit
            // dialog for the in/out nr-mqtt-nodes
            if (to.params.teamid) {
                const team = await teamApi.getTeam(to.params.teamid)
                next({
                    name: 'team-brokers-clients',
                    params: {
                        brokerId: to.params.brokerId,
                        team_slug: team.slug
                    },
                    query: to.query,
                    replace: true
                })
            } else {
                next({ name: 'home' })
            }
        },
        meta: {
            title: t('ui.teamMqttBrokerClients')
        }
    }
]
