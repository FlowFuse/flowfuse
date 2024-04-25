<template>
    <div class="ff-application-list--app gap-x-4 flex flex-col gap-2 sm:gap-0 justify-between sm:flex-row sm:items-center" data-action="view-application" @click="openApplication(application)">
        <div class="flex items-cente flex-wrap">
            <span class="ff-application-list--icon flex flex-shrink-0 flex-grow-0 whitespace-nowrap gap-2 w-full"><TemplateIcon class="ff-icon text-gray-600" />{{ application.name }}</span>
            <span class="!inline-block !flex-shrink !flex-grow italic text-gray-500 dark:text-gray-400 truncate"> {{ application.description }} </span>
        </div>
        <ApplicationSummaryLabel :application="application" />
    </div>

    <ul v-if="application.instances.size > 0" class="ff-applications-list-instances" data-el="application-instances">
        <label>Instances</label>
        <li
            v-for="instance in instances"
            :key="instance.id"
            data-el="application-instance-item"
            @click.stop="openInstance(instance)"
        >
            <ApplicationInstance :instance="instance" />
        </li>
    </ul>
    <div v-else class="ff-no-data">
        This Application currently has no <router-link :to="`/application/${application.id}/instances`" class="ff-link">attached Node-RED Instances</router-link>.
    </div>
    <div v-if="application.instanceCount > application.instances.size" class="ff-applications-list--details">
        Only the {{ application.instances.size }} <router-link :to="`/application/${application.id}/instances`" class="ff-link">instances</router-link>  with the most recent activity are being displayed.
    </div>

    <ul v-if="application.devices.size > 0" class="ff-applications-list-instances" data-el="application-devices">
        <label>Devices</label>
        <li v-for="device in Array.from(application.devices.values())" :key="device.id" @click.stop="openDevice(device)">
            <ApplicationDevice :device="device" />
        </li>
    </ul>
    <div v-else class="ff-no-data">
        This Application currently has no <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>.
    </div>

    <div v-if="application.deviceCount > application.devices.size" class="ff-applications-list--details">
        Only the {{ application.devices.size }} <router-link :to="`/application/${application.id}/devices`" class="ff-link">devices</router-link> with the most recent activity are being displayed.
    </div>
</template>

<script>
import { TemplateIcon } from '@heroicons/vue/outline'

import ApplicationSummaryLabel from '../../components/ApplicationSummaryLabel.vue'

import ApplicationDevice from './ApplicationDevice.vue'

import ApplicationInstance from './ApplicationInstance.vue'

export default {
    name: 'ApplicationListItem',
    components: {
        ApplicationDevice,
        ApplicationInstance,
        ApplicationSummaryLabel,
        TemplateIcon
    },
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    computed: {
        instances () {
            return Array.from(this.application.instances.values())
        }
    },
    methods: {
        openApplication (application) {
            this.$router.push({
                name: 'Application',
                params: {
                    id: application.id
                }
            })
        },
        openInstance (instance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: instance.id
                }
            })
        },
        openDevice (device) {
            this.$router.push({
                name: 'Device',
                params: {
                    id: device.id
                }
            })
        }
    }
}
</script>
