<template>
    <NotificationMessage
        :notification="notification"
        :selections="selections"
        data-el="generic-notification" :to="to"
        @selected="onSelect"
        @deselected="onDeselect"
    >
        <template #icon>
            <component :is="notificationData.iconComponent" />
        </template>
        <template #title>
            {{ notificationData.title }}
        </template>
        <template #message>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="notificationData.message" />
        </template>
    </NotificationMessage>
</template>

<script>
import { defineAsyncComponent } from 'vue'

import IconDeviceSolid from '../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../components/icons/NodeRedSolid.js'
import NotificationMessageMixin from '../../mixins/NotificationMessage.js'

import NotificationMessage from './Notification.vue'

export default {
    name: 'GenericNotification',
    components: { NotificationMessage, IconNodeRedSolid },
    mixins: [NotificationMessageMixin],
    data () {
        return {
            knownEvents: {
                'instance-crashed': {
                    icon: 'instance',
                    title: 'Node-RED Instance Crashed',
                    message: '"<i>{{instance.name}}</i>" has crashed'
                },
                'instance-safe-mode': {
                    icon: 'instance',
                    title: 'Node-RED Instance Safe Mode',
                    message: '"<i>{{instance.name}}</i>" is running in safe mode'
                },
                'device-crashed': {
                    icon: 'device',
                    title: 'Node-RED Device Crashed',
                    message: '"<i>{{device.name}}</i>" has crashed'
                },
                'device-safe-mode': {
                    icon: 'device',
                    title: 'Node-RED Device Safe Mode',
                    message: '"<i>{{device.name}}</i>" is running in safe mode'
                },
                'instance-resource-cpu': {
                    icon: 'instance',
                    title: 'Node-RED Instance CPU Usage',
                    message: 'CPU usage of "<i>{{instance.name}}</i>" has spent more than 5 minutes at more than 75% of CPU limit. This instance may benefit from being upgraded to a larger Instance type'
                },
                'instance-resource-memory': {
                    icon: 'instance',
                    title: 'Node-RED Instance Memory Usage',
                    message: 'Memory usage of "<i>{{instance.name}}</i>" has spent more than 5 minutes at more than 75% of memory limit. This instance may benefit from being upgraded to a larger Instance type'
                }
            }
        }
    },
    computed: {
        to () {
            switch (true) {
            case this.notification.data?.to && typeof this.notification.data?.to === 'object':
                return this.notification.data.to

            case this.notification.data?.to && typeof this.notification.data?.to === 'string':
                try {
                    return JSON.parse(this.notification.data?.to)
                } catch (e) {
                    return { path: this.notification.data.to }
                }

            case typeof this.notification.data?.instance?.id === 'string':
                return {
                    name: 'instance-overview',
                    params: { id: this.notification.data.instance.id }
                }

            case typeof this.notification.data?.url === 'string':
                return { url: this.notification.data.url }

            default:
                return null // no link
            }
        },
        notificationData () {
            const event = this.knownEvents[this.notification.type] || {}
            event.createdAt = new Date(this.notification.createdAt).toLocaleString()
            // get title and message
            if (!event.title) {
                event.title = this.notification.data?.title || this.notification.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }
            if (!event.message) {
                event.message = this.notification.data?.message || `Event occurred at ${event.createdAt}`
            }

            // icon handling
            event.icon = event.icon || this.notification.data?.icon
            if (event.icon === 'instance' || event.icon === 'project') {
                event.iconComponent = IconNodeRedSolid
            } else if (event.icon === 'device') {
                event.iconComponent = IconDeviceSolid
            } else {
                event.iconComponent = defineAsyncComponent(() => import('@heroicons/vue/solid').then(x => x[event.icon] || x.BellIcon))
            }

            // Perform known substitutions
            event.title = this.substitutions(event.title)
            event.message = this.substitutions(event.message)
            return event
        }
    },
    methods: {
        substitutions (str) {
            let result = str
            const regex = /{{([^}]+)}}/g // find all {{key}} occurrences
            let match = regex.exec(result)
            while (match) {
                const key = match[1]
                const value = this.getObjectProperty(this.notification.data || {}, key) || key.split('.')[0].replace(/\b\w/g, l => l.toUpperCase())
                result = result.replace(match[0], value)
                match = regex.exec(result)
            }
            return result
        },
        getObjectProperty (obj, path) {
            return (path || '').trim().split('.').reduce((acc, part) => acc && acc[part], obj)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
