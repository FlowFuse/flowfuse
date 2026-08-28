import { t } from '../../../i18n.js'

import DeviceSnapshots from './Snapshots/index.vue'
import HistoryTimeline from './Timeline/index.vue'

export default [
    {
        path: 'timeline',
        name: 'device-version-history-timeline',
        component: HistoryTimeline,
        meta: {
            title: t('ui.deviceVersionHistoryTimeline')
        }
    },
    {
        path: 'snapshots',
        name: 'device-snapshots',
        component: DeviceSnapshots,
        meta: {
            title: t('ui.deviceVersionHistorySnapshots')
        }
    }
]
