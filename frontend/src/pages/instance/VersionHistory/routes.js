import { t } from '../../../i18n.js'

import InstanceSnapshots from './Snapshots/index.vue'
import HistoryTimeline from './Timeline/index.vue'

export default [
    {
        path: 'timeline',
        name: 'instance-version-history-timeline',
        component: HistoryTimeline,
        meta: {
            title: t('ui.instanceVersionHistoryTimeline')
        }
    },
    {
        path: 'snapshots',
        name: 'instance-snapshots',
        component: InstanceSnapshots,
        meta: {
            title: t('ui.instanceSnapshots2')
        }
    }
]
