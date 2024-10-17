import InstanceSnapshots from './Snapshots/index.vue'
import HistoryTimeline from './Timeline/index.vue'

export default [
    {
        path: 'timeline',
        name: 'instance-version-history-timeline',
        component: HistoryTimeline,
        meta: {
            title: 'Instance - Version History Timeline'
        }
    },
    {
        path: 'snapshots',
        name: 'instance-snapshots',
        component: InstanceSnapshots,
        meta: {
            title: 'Instance - Snapshots'
        }
    }
]
