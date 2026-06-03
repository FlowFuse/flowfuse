<template>
    <ff-button :kind="kind" data-action="finish-setup" @click="finishSetup">
        <template #icon-left><ExclamationTriangleIcon class="ff-icon" /></template>
        Finish Setup
    </ff-button>
    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
</template>

<script>
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

import DeviceActions from '../mixins/DeviceActions.js'
import DeviceCredentialsDialog from '../pages/team/Devices/dialogs/DeviceCredentialsDialog.vue'

export default {
    name: 'FinishSetupButton',
    components: { ExclamationTriangleIcon, DeviceCredentialsDialog },
    mixins: [DeviceActions],
    props: {
        device: {
            type: Object,
            required: true
        },
        minimalView: {
            type: Boolean,
            default: false
        },
        isPrimary: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        kind () {
            switch (true) {
            case this.isPrimary:
                return 'primary'
            case this.minimalView:
                return 'tertiary'
            default:
                return 'secondary'
            }
        }
    },
    methods: {
        finishSetup () {
            const device = this.device
            this.deviceAction('updateCredentials', device.id, device)
        }
    }
}
</script>
