import DeviceSnapshots from './Snapshots/index.vue'
import HistoryTimeline from './Timeline/index.vue'

export default [
    {
        path: 'timeline',
        name: 'device-version-history-timeline',
        component: HistoryTimeline,
        meta: {
            title: 'Device - Version History Timeline'
        }
    },
    {
        path: 'snapshots',
        name: 'device-snapshots',
        component: DeviceSnapshots,
        meta: {
            title: 'Device - Version History Snapshots'
        }
    }
]
