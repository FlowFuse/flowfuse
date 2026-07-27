<template>
    <section class="ff-instance-step text-center flex flex-col gap-4 pt-6 max-w-md m-auto h-full">
        <h1>Registration Complete</h1>
        <template v-if="!deviceConnected">
            <p>
                Return to the Device Agent to complete the setup.
            </p>
            <p>
                Keep this window open to view your Remote Instance once it has connected.
            </p>
            <p class="flex flex-col gap-2">
                <ff-loading scale="small" message=" " />
            </p>
            <p>
                If prompted, enter the following One-Time Code (OTC) in the Device Agent to complete the registration
            </p>
            <!-- make this text larger and bold-->
            <p class="font-bold border border-gray-300 rounded-full p-1 bg-gray-100">
                <TextCopier :text="device.credentials.otc" />
            </p>
        </template>
        <template v-else>
            <p>
                Remote Instance Connected
            </p>
            <p>
                Starting Node-RED...
            </p>
            <p class="flex flex-col gap-2">
                <ff-loading scale="small" message=" " />
            </p>
        </template>
    </section>
</template>

<script>
import { mapState } from 'pinia'
import deviceApi from '@/api/devices.js'

import FfLoading from '@/components/Loading.vue'
import TextCopier from '@/components/TextCopier.vue'
import { createPollTimer } from '@/utils/timers.js'

import { useContextStore } from '@/stores/context.js'

// This isn't really a MultiStepForm step, but it is a step in the flow, so we are using the same pattern for consistency
export default {
    name: 'SuccessStep',
    components: {
        TextCopier,
        FfLoading
    },
    props: {
        device: {
            required: true,
            type: Object
        }
    },
    data () {
        return {
            pollTimer: null,
            polledDevice: null
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        deviceConnected () {
            return this.polledDevice?.lastSeenMs > 0
        },
        deviceNRRunning () {
            return this.deviceConnected && this.polledDevice?.status === 'running'
        }
    },
    mounted () {
        this.startPolling()
    },
    unmounted () {
        this.stopPolling()
    },
    beforeUnmount () {
        this.stopPolling()
    },
    methods: {
        async pollStatus () {
            try {
                const device = await deviceApi.getDevice(this.device.id)
                if (device.lastSeenMs > 0) {
                    // Only update the device now so we don't wipe the OTC as that isn't returned by the API after the first call
                    this.polledDevice = device
                }
                if (device.status === 'running') {
                    // Stop polling once NR is running
                    this.stopPolling()
                    await deviceApi.setMode(this.device.id, 'developer')
                    await deviceApi.enableEditorTunnel(this.device.id)
                    this.$router.push({
                        name: 'device-editor',
                        params: { id: this.device.id }
                    })
                }
            } catch (err) {
                console.error('Error polling device status', err)
            }
        },
        startPolling () {
            this.pollTimer = createPollTimer(this.pollStatus, 5000)
        },
        stopPolling () {
            if (this.pollTimer) {
                this.pollTimer.stop()
                this.pollTimer = null
            }
        }
    }
}
</script>

<style scoped lang="scss">
h1 {
        font-size: 1.5rem;
        line-height: 1.75rem;
        margin: auto;
        margin-top: 1.5rem;
        margin-bottom: 1rem;
        font-weight: 500;
        max-width: 450px;
}
img {
    text-align: center;
    margin: 2em auto;
    max-width: 180px;
}
</style>
