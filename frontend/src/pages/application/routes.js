/**
 * WARNING: There is ongoing work to move Application functionality up into applications
 * or down into instances.
 *
 * No new functionality should be added here.
 */
import ApplicationActivity from './Activity.vue'
import ApplicationLogs from './Logs.vue'
import ApplicationOverview from './Overview.vue'
import ApplicationPipelineCreate from './Pipeline/create.vue'
import ApplicationPipelineIndex from './Pipeline/index.vue'
import ApplicationPipelineStageCreate from './PipelineStage/create.vue'
import ApplicationPipelines from './Pipelines.vue'
import ApplicationSettings from './Settings.vue'
import ApplicationCreateInstance from './createInstance.vue'
import ApplicationIndex from './index.vue'

export default [
    {
        path: '/application/:id',
        redirect: to => {
            return `/application/${to.params.id}/instances`
        },
        name: 'Application',
        component: ApplicationIndex,
        meta: {
            title: 'Application - Overview'
        },
        children: [
            {
                path: 'instances',
                name: 'ApplicationInstances',
                component: ApplicationOverview,
                meta: {
                    title: 'Application - Instances'
                }
            },
            {
                path: 'instances/create',
                name: 'ApplicationCreateInstance',
                component: ApplicationCreateInstance,
                props: route => ({
                    sourceInstanceId: route.query.sourceInstanceId
                }),
                meta: {
                    title: 'Application - Instances - Create'
                }
            },
            {
                path: 'pipelines',
                name: 'ApplicationPipelines',
                component: ApplicationPipelines,
                meta: {
                    title: 'Application - Pipelines'
                }
            },
            {
                path: 'settings',
                component: ApplicationSettings,
                meta: {
                    title: 'Application - Settings'
                }
            },
            {
                path: 'logs',
                component: ApplicationLogs,
                meta: {
                    title: 'Application - Logs'
                }
            },
            {
                path: 'activity',
                component: ApplicationActivity,
                meta: {
                    title: 'Application - Activity'
                }
            },
            // { path: 'debug', component: ApplicationDebug }

            {
                path: 'pipelines/create',
                name: 'CreatePipeline',
                component: ApplicationPipelineCreate,
                meta: {
                    title: 'Pipeline - Create'
                }
            },

            {
                path: 'pipelines/:pipelineId',
                name: 'EditPipeline',
                component: ApplicationPipelineIndex,
                meta: {
                    title: 'Pipeline'
                },
                redirect: to => {
                    return `/application/${to.params.applicationId}/pipelines/${to.params.pipelineId}/stages/create`
                },
                children: [
                    {
                        path: 'stages/create',
                        name: 'CreatePipelineStage',
                        component: ApplicationPipelineStageCreate,
                        meta: {
                            title: 'Pipeline Stage - Create'
                        }
                    }
                ]
            }
        ]
    }

]
