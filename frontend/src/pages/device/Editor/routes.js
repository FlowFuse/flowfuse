import DeviceEditor from './index.vue'

export default [
    {
        path: '/device/:id/editor',
        name: 'device-editor',
        component: DeviceEditor,
        meta: {
            title: 'Device - Editor',
            layout: 'plain'
        }
    }
]
