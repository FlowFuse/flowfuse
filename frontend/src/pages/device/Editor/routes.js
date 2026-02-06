import store from '../../../store/index.js'
import { children } from '../routes.js'

import DeviceEditor from './index.vue'

const renameRoute = (child) => {
    return {
        ...child,
        name: child.name.replace('device-', 'device-editor-'),
        ...(child.children ? { children: child.children.map(renameRoute) } : {})
    }
}

export default [
    {
        path: '/device/:id/editor',
        name: 'device-editor',
        component: DeviceEditor,
        meta: {
            title: 'Device - Editor',
            layout: 'plain'
        },
        redirect: to => {
            const name = store.getters['account/featuresCheck'].isExpertAssistantFeatureEnabled
                ? 'device-editor-expert'
                : 'device-editor-overview'
            return { name, params: { id: to.params.id } }
        },
        children: [
            ...children.map(child => renameRoute(child)),
            {
                path: 'expert',
                name: 'device-editor-expert',
                component: () => import('../../../components/expert/Expert.vue'),
                meta: {
                    title: 'Remote Instance - Expert'
                }
            }
        ]
    }
]
