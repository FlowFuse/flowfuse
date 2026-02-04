import store from '../../../store/index.js'
import { children } from '../routes.js'

import DeviceEditor from './index.vue'

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
            ...children.map(child => ({ ...child, name: child.name.replace('device-', 'device-editor-') })),
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
