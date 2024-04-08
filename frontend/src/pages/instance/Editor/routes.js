import InstanceSettings from '../Settings/index.vue'
import InstanceSettingsRoutes from '../Settings/routes.js'
import { children } from '../routes.js'

import InstanceEditor from './index.vue'

export default [
    {
        path: '/instance/:id/editor',
        name: 'instance-editor',
        component: InstanceEditor,
        meta: {
            title: 'Instance - Editor',
            layout: 'plain'
        },
        redirect: to => {
            return { name: 'instance-editor-overview', params: { id: to.params.id } }
        },
        children: [
            ...children.filter(child => !['settings'].includes(child.path)).map(child => {
                return {
                    ...child,
                    name: child.name.replace('instance-', 'instance-editor-')
                }
            }),
            {
                path: 'settings',
                name: 'instance-editor-settings',
                component: InstanceSettings,
                meta: {
                    title: 'Instance - Settings'
                },
                redirect: to => {
                    return { name: 'instance-editor-settings-general', params: { id: to.params.id } }
                },
                children: [...InstanceSettingsRoutes.map(child => {
                    return {
                        ...child,
                        name: child.name.replace('instance-settings', 'instance-editor-settings')
                    }
                })]
            }]
    }
]
