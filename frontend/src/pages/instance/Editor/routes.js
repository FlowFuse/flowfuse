import InstanceSettings from '../Settings/index.vue'
import InstanceSettingsRoutes from '../Settings/routes.js'
import VersionHistory from '../VersionHistory/index.vue'
import VersionHistoryRoutes from '../VersionHistory/routes.js'
import { children } from '../routes.js'

import InstanceEditor from './index.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default [
    {
        path: '/instance/:id/editor',
        name: 'instance-editor',
        component: InstanceEditor,
        meta: {
            title: 'Instance - Editor',
            layout: 'immersive'
        },
        redirect: to => {
            const name = useAccountSettingsStore().featuresCheck.isExpertAssistantFeatureEnabled
                ? 'instance-editor-expert'
                : 'instance-editor-overview'
            return { name, params: { id: to.params.id } }
        },
        children: [
            ...children.filter(child => !['settings', 'version-history'].includes(child.path)).map(child => {
                return {
                    ...child,
                    name: child.name.replace('instance-', 'instance-editor-'),
                    meta: { ...child.meta, layout: 'immersive' }
                }
            }),
            {
                path: 'settings',
                name: 'instance-editor-settings',
                component: InstanceSettings,
                meta: {
                    title: 'Instance - Settings',
                    layout: 'immersive'
                },
                redirect: to => {
                    return { name: 'instance-editor-settings-general', params: { id: to.params.id } }
                },
                children: [
                    ...InstanceSettingsRoutes.map(child => {
                        return {
                            ...child,
                            name: child.name.replace('instance-settings', 'instance-editor-settings'),
                            meta: { ...child.meta, layout: 'immersive' }
                        }
                    })
                ]
            },
            {
                path: 'version-history',
                name: 'instance-editor-version-history',
                component: VersionHistory,
                meta: {
                    title: 'Instance - Version History',
                    layout: 'immersive'
                },
                redirect: to => {
                    return { name: 'instance-editor-version-history-timeline', params: { id: to.params.id } }
                },
                children: [
                    ...VersionHistoryRoutes.map(child => {
                        return {
                            ...child,
                            name: child.name.replace('instance-', 'instance-editor-'),
                            meta: { ...child.meta, layout: 'immersive' }
                        }
                    })
                ]
            },
            {
                path: 'expert',
                name: 'instance-editor-expert',
                component: () => import('../../../components/expert/Expert.vue'),
                meta: {
                    title: 'Hosted Instance - Expert',
                    layout: 'immersive'
                }
            }
        ]
    }
]
