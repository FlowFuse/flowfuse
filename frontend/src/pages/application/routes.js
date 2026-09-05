import { t } from '../../i18n.js'

import ApplicationActivity from './Activity.vue'
import ApplicationCreateInstanceMultiStep from './CreateInstanceMultiStep.vue'
import ApplicationDashboards from './Dashboards.vue'
import Dependencies from './Dependencies/Dependencies.vue'
import ApplicationDeviceGroupSettingsEnvironment from './DeviceGroup/Settings/Environment.vue'
import ApplicationDeviceGroupSettingsGeneral from './DeviceGroup/Settings/General.vue'
import ApplicationDeviceGroupSettings from './DeviceGroup/Settings/index.vue'
import ApplicationDeviceGroupDevices from './DeviceGroup/devices.vue'
import ApplicationDeviceGroupIndex from './DeviceGroup/index.vue'
import ApplicationDeviceGroups from './DeviceGroups.vue'
import ApplicationDevices from './Devices.vue'
import ApplicationLogs from './Logs.vue'
import ApplicationOverview from './Overview.vue'
import ApplicationPipelineCreate from './Pipeline/create.vue'
import ApplicationPipelineIndex from './Pipeline/index.vue'
import ApplicationPipelineStageCreate from './PipelineStage/create.vue'
import ApplicationPipelineStageEdit from './PipelineStage/edit.vue'
import ApplicationPipelines from './Pipelines.vue'
import ApplicationSettingsGeneral from './Settings/General.vue'
import ApplicationSettingsUserAccess from './Settings/UserAccess.vue'
import ApplicationSettings from './Settings/index.vue'
import ApplicationSnapshots from './Snapshots.vue'
import ApplicationIndex from './index.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default [
    {
        path: ':id',
        redirect: function () {
            const features = useAccountSettingsStore().featuresCheck
            if (features.isHostedInstancesEnabledForTeam) {
                return { name: 'application-instances' }
            } else {
                return { name: 'application-devices' }
            }
        },
        name: 'application',
        component: ApplicationIndex,
        meta: {
            title: t('ui.applicationOverview')
        },
        children: [
            {
                path: 'instances',
                name: 'application-instances',
                component: ApplicationOverview,
                meta: {
                    title: t('ui.applicationInstances2')
                }
            },
            {
                path: 'dashboards',
                name: 'application-dashboards',
                component: ApplicationDashboards,
                meta: {
                    title: t('ui.applicationDashboards')
                }
            },
            {
                path: 'devices',
                name: 'application-devices',
                component: ApplicationDevices,
                meta: {
                    title: t('ui.applicationDevices')
                }
            },
            {
                path: 'device-groups',
                name: 'application-device-groups',
                component: ApplicationDeviceGroups,
                meta: {
                    title: t('ui.applicationDevicesGroups')
                }
            },
            {
                path: 'snapshots',
                name: 'application-snapshots',
                component: ApplicationSnapshots,
                meta: {
                    title: t('ui.applicationSnapshots')
                }
            },
            {
                path: 'pipelines',
                name: 'application-pipelines',
                component: ApplicationPipelines,
                meta: {
                    title: t('ui.applicationPipelines')
                }
            },
            {
                name: 'application-settings',
                path: 'settings',
                redirect: { name: 'application-settings-general' },
                component: ApplicationSettings,
                children: [
                    {
                        path: '',
                        name: 'application-settings-general',
                        component: ApplicationSettingsGeneral,
                        meta: {
                            title: t('ui.applicationSettingsGeneral')
                        }
                    },
                    {
                        path: 'user-access',
                        name: 'application-settings-user-access',
                        component: ApplicationSettingsUserAccess,
                        meta: {
                            title: t('ui.applicationSettingsUserAccess')
                        }
                    }
                ]
            },
            {
                path: 'logs',
                component: ApplicationLogs,
                name: 'application-logs',
                meta: {
                    title: t('ui.applicationLogs'),
                    shouldPoll: true
                }
            },
            {
                path: 'activity',
                name: 'application-activity',
                component: ApplicationActivity,
                meta: {
                    title: t('ui.applicationActivity')
                }
            },
            // { path: 'debug', component: ApplicationDebug }

            {
                path: 'pipelines/create',
                name: 'application-pipeline-create',
                component: ApplicationPipelineCreate,
                meta: {
                    title: t('ui.pipelineCreate')
                }
            },

            {
                path: 'pipelines/:pipelineId',
                name: 'application-pipeline-edit',
                component: ApplicationPipelineIndex,
                meta: {
                    title: t('ui.pipeline')
                },
                redirect: { name: 'application-pipeline-stage-create' },
                children: [
                    {
                        path: 'stages/create',
                        name: 'application-pipeline-stage-create',
                        component: ApplicationPipelineStageCreate,
                        meta: {
                            title: t('ui.pipelineStageCreate')
                        }
                    },
                    {
                        path: 'stages/:stageId/edit',
                        name: 'application-pipeline-stage-edit',
                        component: ApplicationPipelineStageEdit,
                        meta: {
                            title: t('ui.pipelineStageEdit')
                        }
                    }
                ]
            },
            {
                path: 'dependencies',
                name: 'application-dependencies',
                component: Dependencies,
                meta: {
                    title: t('ui.dependencies')
                }
            }
        ]
    },
    {
        path: ':id/instances/create',
        name: 'application-create-instance',
        component: ApplicationCreateInstanceMultiStep,
        meta: {
            title: t('ui.applicationInstancesCreate'),
            menu: {
                type: 'back',
                backTo: ({ query, params }) => {
                    return {
                        label: t('ui.back'),
                        to: { name: 'application-instances', params, query }
                    }
                }
            }
        }
    },
    {
        path: ':applicationId/device-group/:deviceGroupId',
        name: 'application-device-group',
        component: ApplicationDeviceGroupIndex,
        meta: {
            title: t('ui.applicationDeviceGroup')
        },
        redirect: { name: 'application-device-group-devices' },
        children: [
            {
                path: 'devices',
                name: 'application-device-group-devices',
                component: ApplicationDeviceGroupDevices,
                meta: {
                    title: t('ui.applicationDeviceGroupMembers')
                }
            },
            {
                path: 'settings',
                name: 'application-device-group-settings',
                component: ApplicationDeviceGroupSettings,
                meta: {
                    title: t('ui.applicationDeviceGroupSettings')
                },
                redirect: {
                    name: 'application-device-group-settings-general'
                },
                children: [
                    {
                        path: 'general',
                        name: 'application-device-group-settings-general',
                        component: ApplicationDeviceGroupSettingsGeneral,
                        meta: {
                            title: t('ui.applicationDeviceGroupSettingsGeneral')
                        }
                    },
                    {
                        path: 'environment',
                        name: 'application-device-group-settings-environment',
                        component: ApplicationDeviceGroupSettingsEnvironment,
                        meta: {
                            title: t('ui.applicationDeviceGroupSettingsEnvironment')
                        }
                    }
                ]
            }
        ]
    }
]
