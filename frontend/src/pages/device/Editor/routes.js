import { t } from '../../../i18n.js'
import { children } from '../routes.js'

import DeviceEditor from './index.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

const renameRoute = (child) => {
    return {
        ...child,
        name: child.name.replace('device-', 'device-editor-'),
        meta: { ...child.meta, layout: 'immersive' },
        ...(child.children ? { children: child.children.map(renameRoute) } : {})
    }
}

export default [
    {
        path: '/device/:id/editor',
        name: 'device-editor',
        component: DeviceEditor,
        meta: {
            title: t('ui.deviceEditor'),
            layout: 'immersive'
        },
        redirect: to => {
            const fc = useAccountSettingsStore().featuresCheck
            const name = (fc.isExpertAssistantFeatureEnabled || fc.isExpertInsightsFeatureEnabled)
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
                    title: t('ui.remoteInstanceExpert'),
                    layout: 'immersive'
                }
            }
        ]
    }
]
